from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.db import get_db
from models.models import Helper
from schemas.schemas import HelperCreate, HelperOut
from utils.auth import require_admin

router = APIRouter(prefix="/helpers", tags=["Helpers"])


@router.get("/", response_model=List[HelperOut])
def get_all_helpers(
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    return db.query(Helper).all()


@router.post("/", response_model=HelperOut)
def add_helper(
    payload: HelperCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    existing = db.query(Helper).filter(Helper.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Helper with this email already exists")
    helper = Helper(name=payload.name, email=payload.email)
    db.add(helper)
    db.commit()
    db.refresh(helper)
    return helper
