from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from models.models import Notification, Ticket
from schemas.schemas import NotificationOut
from utils.auth import get_current_user
from models.models import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ── Get all notifications for current user ────────────────────────────────────
@router.get("", response_model=List[NotificationOut])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )


# ── Get unread count ──────────────────────────────────────────────────────────
@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"unread": count}


# ── Mark single notification as read ─────────────────────────────────────────
@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}


# ── Mark all as read ──────────────────────────────────────────────────────────
@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


# ── Admin views ticket — notify the user ─────────────────────────────────────
@router.post("/ticket-viewed/{ticket_id}")
def notify_ticket_viewed(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only admin triggers this
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    time_str = now.strftime("%d %b %Y at %I:%M %p")

    notif = Notification(
        user_id=ticket.user_id,
        ticket_id=ticket_id,
        message=f"Your ticket '#{ticket_id} — {ticket.title}' was reviewed by the admin on {time_str}.",
        is_read=False,
    )
    db.add(notif)
    db.commit()
    return {"message": "User notified"}