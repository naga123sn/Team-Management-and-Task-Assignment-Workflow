from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from models.models import Team, TeamMember, User, Ticket
from schemas.schemas import (
    TeamCreate, TeamOut, TeamLeadUpdate,
    AddMemberRequest, TeamMemberOut
)
from utils.auth import require_admin, get_current_user
from utils.audit import log_action

router = APIRouter(prefix="/teams", tags=["Teams"])


# ── Get all teams ─────────────────────────────────────────────────────────────
@router.get("", response_model=List[TeamOut])
def get_all_teams(
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    return db.query(Team).all()


# ── Get single team ───────────────────────────────────────────────────────────
@router.get("/{team_id}", response_model=TeamOut)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


# ── Create team ───────────────────────────────────────────────────────────────
@router.post("", response_model=TeamOut)
def create_team(
    payload: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing = db.query(Team).filter(
        Team.team_name.ilike(payload.team_name.strip())
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="A team with this name already exists")

    team = Team(
        team_name=payload.team_name.strip(),
        created_by=current_user.id,
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


# ── Delete team ───────────────────────────────────────────────────────────────
@router.delete("/{team_id}")
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Unassign tickets from this team
    db.query(Ticket).filter(Ticket.team_id == team_id).update({"team_id": None})
    db.delete(team)
    db.commit()
    return {"message": f"Team '{team.team_name}' deleted successfully"}


# ── Assign team lead ──────────────────────────────────────────────────────────
@router.patch("/{team_id}/lead")
def assign_team_lead(
    team_id: int,
    payload: TeamLeadUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Lead must be a member of the team
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == payload.team_lead_id
    ).first()
    if not member:
        raise HTTPException(
            status_code=400,
            detail="User must be a team member before being assigned as lead"
        )

    team.team_lead_id = payload.team_lead_id
    db.commit()
    db.refresh(team)
    return {"message": "Team lead assigned successfully", "team_lead_id": payload.team_lead_id}


# ── Add member ────────────────────────────────────────────────────────────────
@router.post("/{team_id}/members")
def add_member(
    team_id: int,
    payload: AddMemberRequest,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    user = db.query(User).filter(
        User.id == payload.user_id,
        User.is_deleted == False
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == payload.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member of this team")

    member = TeamMember(team_id=team_id, user_id=payload.user_id)
    db.add(member)
    db.commit()
    return {"message": f"User added to team '{team.team_name}'"}


# ── Remove member ─────────────────────────────────────────────────────────────
@router.delete("/{team_id}/members/{user_id}")
def remove_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="User is not a member of this team")

    # If removing team lead, clear lead
    if team.team_lead_id == user_id:
        team.team_lead_id = None

    db.delete(member)
    db.commit()
    return {"message": "Member removed from team"}


# ── Get team members ──────────────────────────────────────────────────────────
@router.get("/{team_id}/members")
def get_team_members(
    team_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    members = db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        result.append({
            "member_id": m.id,
            "user_id": m.user_id,
            "name": user.name if user else f"User #{m.user_id}",
            "email": user.email if user else "",
            "is_lead": team.team_lead_id == m.user_id,
            "joined_at": m.joined_at,
        })
    return result


# ── Assign ticket to team ─────────────────────────────────────────────────────
@router.patch("/{team_id}/assign-ticket/{ticket_id}")
def assign_ticket_to_team(
    team_id: int,
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id,
        Ticket.is_deleted == False
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.team_id = team_id
    db.commit()
    db.refresh(ticket)

    log_action(
        db=db,
        ticket_id=ticket_id,
        action="TEAM_ASSIGNED",
        description=f"Ticket assigned to team '{team.team_name}'",
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    return {
        "message": f"Ticket #{ticket_id} assigned to team '{team.team_name}'",
        "team_id": team_id,
        "ticket_id": ticket_id
    }


# ── Unassign ticket from team ─────────────────────────────────────────────────
@router.patch("/remove-ticket/{ticket_id}")
def unassign_ticket_from_team(
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

    # Get team name before clearing it
    old_team = db.query(Team).filter(Team.id == ticket.team_id).first()
    old_team_name = old_team.team_name if old_team else "Unknown"

    ticket.team_id = None
    db.commit()

    log_action(
        db=db,
        ticket_id=ticket_id,
        action="TEAM_REMOVED",
        description=f"Team '{old_team_name}' removed from ticket",
        performed_by=current_user.name,
        performed_by_role=current_user.role,
    )

    return {"message": f"Ticket #{ticket_id} unassigned from team"}