from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.db import get_db
from models.models import User, Ticket, Comment, AuditLog
from schemas.schemas import UserOut, UserUpdate, UserStatusUpdate, ChangePasswordRequest
from utils.auth import get_current_user, require_admin, hash_password, verify_password

router = APIRouter(prefix="/users", tags=["Users"])


# ── Get All Users ─────────────────────────────────────────────────────────────
@router.get("", response_model=List[UserOut])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return db.query(User).filter(
        User.role == "user",
        User.is_deleted == False
    ).all()


# ── Update Profile ────────────────────────────────────────────────────────────
@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.name is not None:
        user.name = payload.name
    if payload.email is not None:
        user.email = payload.email
    db.commit()
    db.refresh(user)
    return user
# ── Change Password ───────────────────────────────────────────────────────────
@router.patch("/me/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(payload.old_password, current_user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    if verify_password(payload.new_password, current_user.password):
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    current_user.password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ── Activate / Deactivate ─────────────────────────────────────────────────────
@router.patch("/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user


# ── Restore Soft-Deleted User ─────────────────────────────────────────────────
@router.patch("/{user_id}/restore", response_model=dict)
def restore_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == True
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Deleted user not found")
    user.is_deleted = False
    user.is_active = True
    db.commit()
    return {"message": "User restored successfully"}


# ── Permanent Delete — must be BEFORE soft delete ─────────────────────────────
@router.delete("/{user_id}/permanent")
def permanent_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete an admin account")

    try:
        from models.models import LoginLog

        db.query(LoginLog).filter(LoginLog.user_id == user_id).delete()
        db.query(Comment).filter(Comment.user_id == user_id).delete()

        tickets = db.query(Ticket).filter(Ticket.user_id == user_id).all()
        for ticket in tickets:
            db.query(AuditLog).filter(AuditLog.ticket_id == ticket.id).delete()
            db.query(Comment).filter(Comment.ticket_id == ticket.id).delete()
        db.query(Ticket).filter(Ticket.user_id == user_id).delete()

        db.delete(user)
        db.commit()
        return {"message": f"User '{user.name}' permanently deleted from database"}

    except Exception as e:
        db.rollback()
        print(f"Permanent delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Soft Delete — must be AFTER permanent delete ──────────────────────────────
@router.delete("/{user_id}", response_model=dict)
def soft_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_deleted = True
    user.is_active = False
    db.commit()
    return {"message": "User deleted successfully"}

from schemas.schemas import AgentLevelUpdate

# ── Update agent level ────────────────────────────────────────────────────────
@router.patch("/{user_id}/agent-level")
def update_agent_level(
    user_id: int,
    payload: AgentLevelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    valid_levels = ["junior", "mid", "senior", None]
    if payload.agent_level not in valid_levels:
        raise HTTPException(
            status_code=400,
            detail="agent_level must be 'junior', 'mid', 'senior' or null"
        )

    user.agent_level = payload.agent_level
    db.commit()
    db.refresh(user)
    return {
        "message": f"Agent level updated to '{payload.agent_level}'",
        "user_id": user_id,
        "agent_level": payload.agent_level
    }