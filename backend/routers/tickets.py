from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from database.db import get_db
from models.models import Ticket, Comment, User, Helper, AuditLog
from schemas.schemas import (
    TicketCreate, TicketOut, TicketStatusUpdate,
    TicketPriorityUpdate, TicketAssign, CommentCreate, CommentOut,
    AuditLogOut
)
from utils.auth import get_current_user, require_admin
from utils.audit import log_action
from utils.email import (
    send_ticket_created_email,
    send_ticket_status_email,
    send_ticket_assigned_email,
    send_comment_added_email,
    send_priority_changed_email,
    # ── NEW ──────────────────────────────────────────────
    send_task_assigned_email,
    send_task_completed_email,
)

router = APIRouter(prefix="/tickets", tags=["Tickets"])


# ── Get All Tickets (Admin) ───────────────────────────────────────────────────
@router.get("", response_model=List[TicketOut])
def get_all_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(Ticket).filter(Ticket.is_deleted == False).all()

@router.get("/{ticket_id}/activity", response_model=List[AuditLogOut])
def get_ticket_activity(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == False
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role != "admin" and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.ticket_id == ticket_id)
        .order_by(AuditLog.created_at.desc())
        .all()
    )
    return logs


# ── Get My Tickets (User) ─────────────────────────────────────────────────────
@router.get("/my", response_model=List[TicketOut])
def get_my_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Ticket).filter(
        Ticket.user_id == current_user.id,
        Ticket.is_deleted == False
    ).all()


# ── Get Single Ticket ─────────────────────────────────────────────────────────
@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == False
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role != "admin" and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return ticket


from utils.auto_assign import auto_assign_ticket

@router.post("", response_model=TicketOut)
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Ticket).filter(
        Ticket.user_id == current_user.id,
        Ticket.is_deleted == False,
        Ticket.title.ilike(payload.title.strip())
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"You already have a ticket with this title (Ticket #{existing.id})."
        )

    ticket = Ticket(
        title=payload.title.strip(),
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        user_id=current_user.id
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    priority_val = ticket.priority.value if hasattr(ticket.priority, "value") else str(ticket.priority)
    log_action(
        db=db,
        ticket_id=ticket.id,
        action="TICKET_CREATED",
        description=f"Ticket '{ticket.title}' created | Category: {ticket.category} | Priority: {priority_val}.",
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    auto_assign_ticket(db=db, ticket=ticket)
    apply_sla_due_date(db=db, ticket=ticket)

    try:
        send_ticket_created_email(
            to=current_user.email,
            user_name=current_user.name,
            ticket_title=ticket.title,
            ticket_id=ticket.id,
        )
    except Exception as e:
        print(f"Email error: {e}")

    db.refresh(ticket)
    return ticket


# ── Update Status ─────────────────────────────────────────────────────────────
@router.patch("/{ticket_id}/status", response_model=TicketOut)
def update_status(
    ticket_id: int,
    payload: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == False
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_status = ticket.status
    ticket.status = payload.status
    if payload.status == "resolved" and ticket.resolved_at is None:
        ticket.resolved_at = datetime.now(timezone.utc)
    elif payload.status != "resolved":
        ticket.resolved_at = None
    db.commit()
    db.refresh(ticket)

    log_action(
        db=db,
        ticket_id=ticket.id,
        action="STATUS_CHANGED",
        description=f"Status changed from '{old_status}' to '{payload.status}'.",
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    owner = db.query(User).filter(User.id == ticket.user_id).first()

    # ── Email: notify ticket owner of status change (existing) ───────────────
    try:
        if owner:
            send_ticket_status_email(
                to=owner.email,
                user_name=owner.name,
                ticket_title=ticket.title,
                ticket_id=ticket.id,
                status=payload.status,
            )
    except Exception as e:
        print(f"Email error (status→owner): {e}")

    # ── Email: notify assigned agent when ticket is completed ─────────────────
    if payload.status == "resolved" and ticket.assigned_agent_id:
        try:
            agent = db.query(User).filter(User.id == ticket.assigned_agent_id).first()
            if agent:
                # Resolve team name if ticket belongs to a team
                team_name = "Support Team"
                if ticket.team_id:
                    from models.models import Team
                    team = db.query(Team).filter(Team.id == ticket.team_id).first()
                    if team:
                        team_name = team.team_name

                send_task_completed_email(
                    to=agent.email,
                    user_name=agent.name,
                    ticket_title=ticket.title,
                    ticket_id=ticket.id,
                    resolved_by=current_user.name,
                    team_name=team_name,
                )
        except Exception as e:
            print(f"Email error (status→agent): {e}")

    return ticket


# ── Update Priority ───────────────────────────────────────────────────────────
@router.patch("/{ticket_id}/priority", response_model=TicketOut)
def update_priority(
    ticket_id: int,
    payload: TicketPriorityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == False
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_priority = ticket.priority
    ticket.priority = payload.priority
    db.commit()
    db.refresh(ticket)

    log_action(
        db=db,
        ticket_id=ticket.id,
        action="PRIORITY_CHANGED",
        description=f"Priority changed from '{old_priority}' to '{payload.priority}'.",
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    owner = db.query(User).filter(User.id == ticket.user_id).first()
    try:
        if owner:
            send_priority_changed_email(
                to=owner.email,
                user_name=owner.name,
                ticket_title=ticket.title,
                ticket_id=ticket.id,
                priority=payload.priority,
            )
    except Exception as e:
        print(f"Email error: {e}")

    return ticket


# ── Assign Ticket to Helper ───────────────────────────────────────────────────
@router.patch("/{ticket_id}/assign", response_model=TicketOut)
def assign_ticket(
    ticket_id: int,
    payload: TicketAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == False
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.helper_id = payload.helper_id
    db.commit()
    db.refresh(ticket)

    helper = db.query(Helper).filter(Helper.id == payload.helper_id).first()
    helper_name = helper.name if helper else f"Helper #{payload.helper_id}"

    log_action(
        db=db,
        ticket_id=ticket.id,
        action="HELPER_ASSIGNED",
        description=f"Ticket assigned to helper '{helper_name}'.",
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    owner = db.query(User).filter(User.id == ticket.user_id).first()

    # ── Email: notify ticket owner (existing behaviour) ───────────────────────
    try:
        if owner and helper:
            send_ticket_assigned_email(
                to=owner.email,
                user_name=owner.name,
                ticket_title=ticket.title,
                ticket_id=ticket.id,
                helper_name=helper_name,
            )
    except Exception as e:
        print(f"Email error (assign→owner): {e}")

    # ── Email: notify the assigned agent ─────────────────────────────────────
    if ticket.assigned_agent_id:
        try:
            agent = db.query(User).filter(User.id == ticket.assigned_agent_id).first()
            if agent:
                team_name = "Support Team"
                if ticket.team_id:
                    from models.models import Team
                    team = db.query(Team).filter(Team.id == ticket.team_id).first()
                    if team:
                        team_name = team.team_name

                send_task_assigned_email(
                    to=agent.email,
                    agent_name=agent.name,
                    ticket_title=ticket.title,
                    ticket_id=ticket.id,
                    assigned_by=current_user.name,
                    team_name=team_name,
                )
        except Exception as e:
            print(f"Email error (assign→agent): {e}")

    return ticket


# ── Add Comment ───────────────────────────────────────────────────────────────
@router.post("/{ticket_id}/comments", response_model=CommentOut)
def add_comment(
    ticket_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == False
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    comment = Comment(
        comment=payload.comment,
        ticket_id=ticket_id,
        user_id=current_user.id
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    log_action(
        db=db,
        ticket_id=ticket.id,
        action="COMMENT_ADDED",
        description=f"Comment added by '{current_user.name}': \"{payload.comment[:80]}{'...' if len(payload.comment) > 80 else ''}\"",
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    owner = db.query(User).filter(User.id == ticket.user_id).first()
    try:
        if owner and owner.id != current_user.id:
            send_comment_added_email(
                to=owner.email,
                user_name=owner.name,
                ticket_title=ticket.title,
                ticket_id=ticket.id,
                comment=payload.comment,
            )
        elif owner and owner.id == current_user.id:
            admin = db.query(User).filter(User.role == "admin").first()
            if admin:
                send_comment_added_email(
                    to=admin.email,
                    user_name=admin.name,
                    ticket_title=ticket.title,
                    ticket_id=ticket.id,
                    comment=payload.comment,
                )
    except Exception as e:
        print(f"Email error: {e}")

    return comment


# ── Delete Comment ────────────────────────────────────────────────────────────
@router.delete("/{ticket_id}/comments/{comment_id}")
def delete_comment(
    ticket_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.ticket_id == ticket_id
    ).first()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")

    log_action(
        db=db,
        ticket_id=ticket_id,
        action="COMMENT_DELETED",
        description=f"Comment deleted by '{current_user.name}': \"{comment.comment[:80]}{'...' if len(comment.comment) > 80 else ''}\"",
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}


# ── Soft Delete Ticket (Admin) ────────────────────────────────────────────────
@router.delete("/{ticket_id}")
def soft_delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == False
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.is_deleted = True
    db.commit()

    log_action(
        db=db,
        ticket_id=ticket_id,
        action="TICKET_DELETED",
        description=f"Ticket '{ticket.title}' soft deleted by admin.",
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    return {"message": "Ticket deleted successfully"}


# ── Restore Soft Deleted Ticket (Admin) ───────────────────────────────────────
@router.patch("/{ticket_id}/restore")
def restore_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == True
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Deleted ticket not found")

    ticket.is_deleted = False
    db.commit()

    log_action(
        db=db,
        ticket_id=ticket_id,
        action="TICKET_RESTORED",
        description=f"Ticket '{ticket.title}' restored by admin.",
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    return {"message": "Ticket restored successfully"}


# ── Get Audit Logs for a Ticket (Admin) ───────────────────────────────────────
@router.get("/{ticket_id}/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    logs = (
        db.query(AuditLog)
        .filter(AuditLog.ticket_id == ticket_id)
        .order_by(AuditLog.created_at.desc())
        .all()
    )
    return logs


# ── Permanent Delete Ticket (Admin) ───────────────────────────────────────────
@router.delete("/{ticket_id}/permanent")
def permanent_delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    db.delete(ticket)
    db.commit()
    return {"message": f"Ticket '{ticket.title}' permanently deleted"}


# ── Assign / Unassign Team ────────────────────────────────────────────────────
@router.patch("/{ticket_id}/assign-team")
def assign_team_to_ticket(
    ticket_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == False
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    team_id = payload.get("team_id")

    if team_id is None:
        old_team = None
        if ticket.team_id:
            from models.models import Team
            old_team = db.query(Team).filter(Team.id == ticket.team_id).first()

        ticket.team_id = None
        db.commit()

        log_action(
            db=db,
            ticket_id=ticket_id,
            action="TEAM_UNASSIGNED",
            description=f"Ticket unassigned from team '{old_team.team_name if old_team else 'Unknown'}'.",
            performed_by=current_user.name,
            performed_by_role=current_user.role,
        )
        return {"message": "Team unassigned", "team_id": None}

    from models.models import Team
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    ticket.team_id = team_id
    db.commit()
    db.refresh(ticket)

    log_action(
        db=db,
        ticket_id=ticket_id,
        action="TEAM_ASSIGNED",
        description=f"Ticket assigned to team '{team.team_name}' by {current_user.name}.",
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    return {
        "message": f"Assigned to team '{team.team_name}'",
        "team_id": team_id
    }


# ── SLA ───────────────────────────────────────────────────────────────────────
from pydantic import BaseModel as PydanticBase
from typing import Optional as Opt
from datetime import datetime as dt

class DueDateUpdate(PydanticBase):
    due_date: Opt[dt] = None

SLA_HOURS = {"high": 4, "medium": 24, "low": 72}

@router.patch("/{ticket_id}/due-date", response_model=TicketOut)
def set_due_date(
    ticket_id: int,
    payload: DueDateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == False
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.due_date = payload.due_date
    db.commit()
    db.refresh(ticket)

    log_action(
        db=db,
        ticket_id=ticket_id,
        action="SLA_UPDATED",
        description=f"Due date set to {payload.due_date.strftime('%Y-%m-%d %H:%M') if payload.due_date else 'None'} by {current_user.name}.",
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )
    return ticket


def apply_sla_due_date(db: Session, ticket: Ticket):
    from datetime import timedelta
    priority_val = ticket.priority.value if hasattr(ticket.priority, "value") else str(ticket.priority)
    hours = SLA_HOURS.get(priority_val, 24)
    ticket.due_date = (
        ticket.created_at.replace(tzinfo=timezone.utc) + timedelta(hours=hours)
        if ticket.created_at.tzinfo
        else datetime.now(timezone.utc) + timedelta(hours=hours)
    )
    db.commit()
    db.refresh(ticket)


@router.get("/overdue", response_model=List[TicketOut])
def get_overdue_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    now = datetime.now(timezone.utc)
    return db.query(Ticket).filter(
        Ticket.is_deleted == False,
        Ticket.status != "resolved",
        Ticket.due_date != None,
        Ticket.due_date < now
    ).order_by(Ticket.due_date.asc()).all()