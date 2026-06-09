from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.db import get_db
from models.models import Ticket, User, Helper, StatusEnum, PriorityEnum
from utils.auth import require_admin

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/")
def get_stats(
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    tickets = db.query(Ticket).all()

    return {
        "total_tickets": len(tickets),
        "pending": sum(1 for t in tickets if t.status == StatusEnum.pending),
        "in_progress": sum(1 for t in tickets if t.status == StatusEnum.in_progress),
        "resolved": sum(1 for t in tickets if t.status == StatusEnum.resolved),
        "low": sum(1 for t in tickets if t.priority == PriorityEnum.low),
        "medium": sum(1 for t in tickets if t.priority == PriorityEnum.medium),
        "high": sum(1 for t in tickets if t.priority == PriorityEnum.high),
        "total_users": db.query(User).filter(User.role == "user").count(),
        "total_helpers": db.query(Helper).count(),
    }
