"""
task_management.py
──────────────────
New router that adds:
  1. Task Revocation  — Team Lead revokes an assigned ticket
  2. Task Transfer    — Team Lead transfers a ticket to another team member
  3. Team Dashboard   — Team-wise stats (count, pending, completed, overdue, workload)

Mount in main.py:
    from routers import task_management
    app.include_router(task_management.router)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from database.db import get_db
from models.models import Ticket, Team, TeamMember, User, Notification
from schemas.schemas import TicketOut
from utils.auth import get_current_user
from utils.audit import log_action
from utils.email import (
    send_task_assigned_email,
    send_task_reassigned_email,
    send_task_revoked_email,
    send_task_completed_email,
)

router = APIRouter(prefix="/task-management", tags=["Task Management"])


# ─────────────────────────────────────────────────────────────────────────────
# Helper: verify caller is team lead of the ticket's team
# ─────────────────────────────────────────────────────────────────────────────
def _require_team_lead(ticket: Ticket, current_user: User, db: Session) -> Team:
    """Raises 403 if current_user is not the team lead for ticket's team."""
    if not ticket.team_id:
        raise HTTPException(status_code=400, detail="Ticket is not assigned to any team")

    team = db.query(Team).filter(Team.id == ticket.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Admin always allowed; otherwise must be the team lead
    if current_user.role != "admin" and team.team_lead_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the team lead (or admin) can perform this action",
        )
    return team


def _push_notification(db: Session, user_id: int, ticket: Ticket, message: str):
    """Create an in-app notification for a user."""
    notif = Notification(
        user_id=user_id,
        ticket_id=ticket.id,
        message=message,
        is_read=False,
    )
    db.add(notif)


# ─────────────────────────────────────────────────────────────────────────────
# 1. REVOKE TASK
#    PATCH /task-management/tickets/{ticket_id}/revoke
# ─────────────────────────────────────────────────────────────────────────────
@router.patch("/tickets/{ticket_id}/revoke", response_model=TicketOut)
def revoke_task(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Team Lead revokes (un-assigns) a ticket from its currently assigned agent.
    The ticket stays in the team but assigned_agent_id is cleared and status
    resets to 'pending'.
    """
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == False,
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    team = _require_team_lead(ticket, current_user, db)

    if not ticket.assigned_agent_id:
        raise HTTPException(status_code=400, detail="Ticket has no assigned agent to revoke")

    # Capture previous agent before clearing
    prev_agent = db.query(User).filter(User.id == ticket.assigned_agent_id).first()
    prev_agent_name = prev_agent.name if prev_agent else f"Agent #{ticket.assigned_agent_id}"

    ticket.assigned_agent_id = None
    ticket.status = "pending"
    db.commit()
    db.refresh(ticket)

    # Audit log
    log_action(
        db=db,
        ticket_id=ticket.id,
        action="TASK_REVOKED",
        description=(
            f"Task revoked from '{prev_agent_name}' by team lead "
            f"'{current_user.name}' (Team: {team.team_name})."
        ),
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    # In-app notification for the ex-agent
    if prev_agent:
        _push_notification(
            db, prev_agent.id, ticket,
            f"Your assignment to ticket #{ticket.id} — '{ticket.title}' has been revoked by team lead {current_user.name}.",
        )
        db.commit()

    # Email notification
    try:
        if prev_agent:
            send_task_revoked_email(
                to=prev_agent.email,
                agent_name=prev_agent.name,
                ticket_title=ticket.title,
                ticket_id=ticket.id,
                revoked_by=current_user.name,
                team_name=team.team_name,
            )
    except Exception as e:
        print(f"Email error (revoke): {e}")

    return ticket


# ─────────────────────────────────────────────────────────────────────────────
# 2. TRANSFER TASK
#    PATCH /task-management/tickets/{ticket_id}/transfer
# ─────────────────────────────────────────────────────────────────────────────
class TransferRequest(BaseModel):
    new_agent_id: int
    reason: Optional[str] = None


@router.patch("/tickets/{ticket_id}/transfer", response_model=TicketOut)
def transfer_task(
    ticket_id: int,
    payload: TransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Team Lead transfers a ticket from one member to another within the same team.
    """
    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == False,
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    team = _require_team_lead(ticket, current_user, db)

    # New agent must be a member of this team
    membership = db.query(TeamMember).filter(
        TeamMember.team_id == team.id,
        TeamMember.user_id == payload.new_agent_id,
    ).first()
    if not membership:
        raise HTTPException(
            status_code=400,
            detail="New agent must be a member of the ticket's team",
        )

    new_agent = db.query(User).filter(
        User.id == payload.new_agent_id,
        User.is_deleted == False,
        User.is_active == True,
    ).first()
    if not new_agent:
        raise HTTPException(status_code=404, detail="New agent not found or inactive")

    prev_agent = None
    prev_agent_name = "Unassigned"
    if ticket.assigned_agent_id:
        prev_agent = db.query(User).filter(User.id == ticket.assigned_agent_id).first()
        prev_agent_name = prev_agent.name if prev_agent else f"Agent #{ticket.assigned_agent_id}"

    ticket.assigned_agent_id = payload.new_agent_id
    # Keep status at in_progress if it already was; otherwise set to pending
    if ticket.status == "resolved":
        ticket.status = "in_progress"
    db.commit()
    db.refresh(ticket)

    reason_str = f" Reason: {payload.reason}." if payload.reason else ""
    log_action(
        db=db,
        ticket_id=ticket.id,
        action="TASK_TRANSFERRED",
        description=(
            f"Task transferred from '{prev_agent_name}' to '{new_agent.name}' "
            f"by '{current_user.name}' (Team: {team.team_name}).{reason_str}"
        ),
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    # In-app notifications
    _push_notification(
        db, new_agent.id, ticket,
        f"Ticket #{ticket.id} — '{ticket.title}' has been transferred to you by team lead {current_user.name}.",
    )
    if prev_agent:
        _push_notification(
            db, prev_agent.id, ticket,
            f"Ticket #{ticket.id} — '{ticket.title}' has been transferred from you to {new_agent.name}.",
        )
    db.commit()

    # Email notifications
    try:
        send_task_reassigned_email(
            to=new_agent.email,
            agent_name=new_agent.name,
            ticket_title=ticket.title,
            ticket_id=ticket.id,
            transferred_by=current_user.name,
            team_name=team.team_name,
            prev_agent=prev_agent_name,
            reason=payload.reason,
        )
        if prev_agent:
            send_task_revoked_email(
                to=prev_agent.email,
                agent_name=prev_agent.name,
                ticket_title=ticket.title,
                ticket_id=ticket.id,
                revoked_by=current_user.name,
                team_name=team.team_name,
            )
    except Exception as e:
        print(f"Email error (transfer): {e}")

    return ticket


# ─────────────────────────────────────────────────────────────────────────────
# 3. TEAM DASHBOARD APIs
# ─────────────────────────────────────────────────────────────────────────────

# ── 3a. Team-wise task count ──────────────────────────────────────────────────
@router.get("/dashboard/team-task-count")
def team_task_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns total ticket count per team.
    Team leads see only their own team; admins see all.
    """
    teams = _get_accessible_teams(db, current_user)
    result = []
    for team in teams:
        count = db.query(func.count(Ticket.id)).filter(
            Ticket.team_id == team.id,
            Ticket.is_deleted == False,
        ).scalar()
        result.append({
            "team_id": team.id,
            "team_name": team.team_name,
            "total_tickets": count,
        })
    return result


# ── 3b. Pending tasks per team ────────────────────────────────────────────────
@router.get("/dashboard/pending-tasks")
def pending_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    teams = _get_accessible_teams(db, current_user)
    result = []
    for team in teams:
        tickets = db.query(Ticket).filter(
            Ticket.team_id == team.id,
            Ticket.is_deleted == False,
            Ticket.status == "pending",
        ).all()
        result.append({
            "team_id": team.id,
            "team_name": team.team_name,
            "pending_count": len(tickets),
            "tickets": [_ticket_summary(t) for t in tickets],
        })
    return result


# ── 3c. Completed tasks per team ──────────────────────────────────────────────
@router.get("/dashboard/completed-tasks")
def completed_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    teams = _get_accessible_teams(db, current_user)
    result = []
    for team in teams:
        tickets = db.query(Ticket).filter(
            Ticket.team_id == team.id,
            Ticket.is_deleted == False,
            Ticket.status == "resolved",
        ).all()
        result.append({
            "team_id": team.id,
            "team_name": team.team_name,
            "completed_count": len(tickets),
            "tickets": [_ticket_summary(t) for t in tickets],
        })
    return result


# ── 3d. Overdue tasks per team ────────────────────────────────────────────────
@router.get("/dashboard/overdue-tasks")
def overdue_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    teams = _get_accessible_teams(db, current_user)
    result = []
    for team in teams:
        tickets = db.query(Ticket).filter(
            Ticket.team_id == team.id,
            Ticket.is_deleted == False,
            Ticket.status != "resolved",
            Ticket.due_date != None,
            Ticket.due_date < now,
        ).all()
        result.append({
            "team_id": team.id,
            "team_name": team.team_name,
            "overdue_count": len(tickets),
            "tickets": [_ticket_summary(t) for t in tickets],
        })
    return result


# ── 3e. Team member workload ───────────────────────────────────────────────────
@router.get("/dashboard/member-workload")
def member_workload(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Per-member breakdown of assigned tickets (total / pending / in_progress / resolved / overdue).
    """
    now = datetime.now(timezone.utc)
    teams = _get_accessible_teams(db, current_user)
    result = []

    for team in teams:
        members_data = []
        members = db.query(TeamMember).filter(TeamMember.team_id == team.id).all()

        for membership in members:
            user = db.query(User).filter(User.id == membership.user_id).first()
            if not user:
                continue

            assigned = db.query(Ticket).filter(
                Ticket.assigned_agent_id == user.id,
                Ticket.team_id == team.id,
                Ticket.is_deleted == False,
            ).all()

            overdue = [
                t for t in assigned
                if t.due_date and t.status != "resolved"
                and t.due_date.replace(tzinfo=timezone.utc) < now
            ]

            members_data.append({
                "user_id": user.id,
                "name": user.name,
                "email": user.email,
                "is_lead": team.team_lead_id == user.id,
                "agent_level": user.agent_level,
                "total_assigned": len(assigned),
                "pending": sum(1 for t in assigned if t.status == "pending"),
                "in_progress": sum(1 for t in assigned if t.status == "in_progress"),
                "resolved": sum(1 for t in assigned if t.status == "resolved"),
                "overdue": len(overdue),
            })

        result.append({
            "team_id": team.id,
            "team_name": team.team_name,
            "members": members_data,
        })

    return result


# ── 3f. Full team dashboard summary (single call) ─────────────────────────────
@router.get("/dashboard/summary")
def team_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Aggregated summary for all accessible teams: counts + member workload.
    Useful as a single API call for the dashboard page.
    """
    now = datetime.now(timezone.utc)
    teams = _get_accessible_teams(db, current_user)
    result = []

    for team in teams:
        all_tickets = db.query(Ticket).filter(
            Ticket.team_id == team.id,
            Ticket.is_deleted == False,
        ).all()

        overdue = [
            t for t in all_tickets
            if t.due_date and t.status != "resolved"
            and t.due_date.replace(tzinfo=timezone.utc) < now
        ]

        members = db.query(TeamMember).filter(TeamMember.team_id == team.id).all()
        member_list = []
        for m in members:
            u = db.query(User).filter(User.id == m.user_id).first()
            if not u:
                continue
            user_tickets = [t for t in all_tickets if t.assigned_agent_id == u.id]
            user_overdue = [
                t for t in user_tickets
                if t.due_date and t.status != "resolved"
                and t.due_date.replace(tzinfo=timezone.utc) < now
            ]
            member_list.append({
                "user_id": u.id,
                "name": u.name,
                "is_lead": team.team_lead_id == u.id,
                "agent_level": u.agent_level,
                "total_assigned": len(user_tickets),
                "pending": sum(1 for t in user_tickets if t.status == "pending"),
                "in_progress": sum(1 for t in user_tickets if t.status == "in_progress"),
                "resolved": sum(1 for t in user_tickets if t.status == "resolved"),
                "overdue": len(user_overdue),
            })

        result.append({
            "team_id": team.id,
            "team_name": team.team_name,
            "total_tickets": len(all_tickets),
            "pending": sum(1 for t in all_tickets if t.status == "pending"),
            "in_progress": sum(1 for t in all_tickets if t.status == "in_progress"),
            "completed": sum(1 for t in all_tickets if t.status == "resolved"),
            "overdue": len(overdue),
            "member_count": len(members),
            "members": member_list,
        })

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────
def _get_accessible_teams(db: Session, current_user: User) -> List[Team]:
    """Admins see all teams; team leads see only their own team."""
    if current_user.role == "admin":
        return db.query(Team).all()

    # Team lead: find teams where this user is lead
    led = db.query(Team).filter(Team.team_lead_id == current_user.id).all()
    if not led:
        raise HTTPException(
            status_code=403,
            detail="You are not a team lead of any team",
        )
    return led


def _ticket_summary(ticket: Ticket) -> dict:
    return {
        "id": ticket.id,
        "title": ticket.title,
        "priority": ticket.priority,
        "status": ticket.status,
        "assigned_agent_id": ticket.assigned_agent_id,
        "due_date": ticket.due_date.isoformat() if ticket.due_date else None,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
    }