from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta
from database.db import get_db
from models.models import Ticket, User, StatusEnum
from utils.auth import require_admin

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
def get_analytics(
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    tickets = db.query(Ticket).all()

    # ── Tickets per day (last 14 days) ────────────────────────────
    today = datetime.utcnow().date()
    last_14 = [today - timedelta(days=i) for i in range(13, -1, -1)]

    tickets_per_day = []
    for day in last_14:
        count = sum(
            1 for t in tickets
            if t.created_at and t.created_at.date() == day
        )
        tickets_per_day.append({
            "date": day.strftime("%b %d"),
            "count": count
        })

    # ── Status-wise breakdown (for pie/donut chart) ───────────────
    status_breakdown = [
        {"status": "Pending",     "count": sum(1 for t in tickets if t.status == StatusEnum.pending)},
        {"status": "In Progress", "count": sum(1 for t in tickets if t.status == StatusEnum.in_progress)},
        {"status": "Resolved",    "count": sum(1 for t in tickets if t.status == StatusEnum.resolved)},
    ]

    # ── Avg resolution time + resolved ticket list ────────────────
    resolved_tickets = [t for t in tickets if t.status == StatusEnum.resolved]

    resolution_list = []
    total_hours = 0
    for t in resolved_tickets:
        if t.created_at:
            # Use updated_at if available, else fallback to now
            resolved_at = getattr(t, "updated_at", None) or datetime.utcnow()
            diff = resolved_at - t.created_at
            hours = round(diff.total_seconds() / 3600, 1)
            total_hours += hours

            # Get user name
            owner = db.query(User).filter(User.id == t.user_id).first()
            resolution_list.append({
                "ticket_id": t.id,
                "title": t.title,
                "user": owner.name if owner else f"User #{t.user_id}",
                "priority": t.priority,
                "resolution_hours": hours,
            })

    avg_resolution_hours = (
        round(total_hours / len(resolved_tickets), 1)
        if resolved_tickets else 0
    )

    # ── User-wise ticket count ─────────────────────────────────────
    user_stats = {}
    for t in tickets:
        owner = db.query(User).filter(User.id == t.user_id).first()
        name = owner.name if owner else f"User #{t.user_id}"
        if name not in user_stats:
            user_stats[name] = {"name": name, "total": 0, "resolved": 0, "pending": 0}
        user_stats[name]["total"] += 1
        if t.status == StatusEnum.resolved:
            user_stats[name]["resolved"] += 1
        if t.status == StatusEnum.pending:
            user_stats[name]["pending"] += 1

    return {
        "tickets_per_day": tickets_per_day,
        "status_breakdown": status_breakdown,
        "avg_resolution_hours": avg_resolution_hours,
        "resolution_list": resolution_list,
        "user_stats": list(user_stats.values()),
    }