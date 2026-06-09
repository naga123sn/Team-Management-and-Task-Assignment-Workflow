from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database.db import get_db
from models.models import Ticket, User
from schemas.schemas import DeletedTicketOut, DeletedUserOut
from utils.auth import require_admin

router = APIRouter(prefix="/deleted", tags=["Deleted"])


@router.get("/tickets", response_model=List[DeletedTicketOut])
def get_deleted_tickets(
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    return db.query(Ticket).filter(Ticket.is_deleted == True).all()


@router.get("/users", response_model=List[DeletedUserOut])
def get_deleted_users(
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    return db.query(User).filter(
        User.is_deleted == True,
        User.role == "user"
    ).all()