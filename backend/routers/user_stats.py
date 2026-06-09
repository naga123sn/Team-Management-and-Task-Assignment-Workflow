from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from database.db import get_db
from models.models import User, Ticket, Comment, AuditLog
from utils.auth import require_admin
import csv
import io

router = APIRouter(prefix="/user-stats", tags=["User Stats"])


# ── User Statistics ───────────────────────────────────────────────────────────
@router.get("/summary")
def get_user_summary(
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    all_users = db.query(User).filter(
        User.role == "user",
        User.is_deleted == False
    ).all()

    total = len(all_users)
    active = sum(1 for u in all_users if u.is_active)
    inactive = sum(1 for u in all_users if not u.is_active)
    online = sum(1 for u in all_users if u.is_online)
    blocked = sum(1 for u in all_users if u.is_blocked)

    # New users last 7 days
    new_users = db.query(User).filter(
        User.role == "user",
        User.is_deleted == False,
        User.created_at >= seven_days_ago
    ).count()

    # New users per day (last 7 days)
    new_per_day = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
        count = db.query(User).filter(
            User.role == "user",
            User.created_at >= day_start,
            User.created_at <= day_end
        ).count()
        new_per_day.append({
            "date": day.strftime("%b %d"),
            "count": count
        })

    # Most active users (by ticket count)
    most_active = []
    for u in all_users:
        ticket_count = db.query(Ticket).filter(
            Ticket.user_id == u.id,
            Ticket.is_deleted == False
        ).count()
        comment_count = db.query(Comment).filter(
            Comment.user_id == u.id
        ).count()
        most_active.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "tickets": ticket_count,
            "comments": comment_count,
            "total_activity": ticket_count + comment_count,
            "is_online": u.is_online,
            "last_login": u.last_login.isoformat() if u.last_login else None,
        })

    # Sort by total activity
    most_active.sort(key=lambda x: x["total_activity"], reverse=True)

    return {
        "total": total,
        "active": active,
        "inactive": inactive,
        "online": online,
        "blocked": blocked,
        "new_last_7_days": new_users,
        "new_per_day": new_per_day,
        "most_active": most_active[:10],  # top 10
    }