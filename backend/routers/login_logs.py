from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database.db import get_db
from models.models import LoginLog
from schemas.schemas import LoginLogOut
from utils.auth import require_admin

router = APIRouter(prefix="/login-logs", tags=["Login Logs"])


@router.get("", response_model=List[LoginLogOut])
def get_login_logs(
    status: Optional[str] = Query(None),   # filter: success | failed | blocked
    email: Optional[str] = Query(None),     # filter by email
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    query = db.query(LoginLog).order_by(LoginLog.attempted_at.desc())

    if status:
        query = query.filter(LoginLog.status == status)
    if email:
        query = query.filter(LoginLog.email.ilike(f"%{email}%"))

    return query.limit(limit).all()


@router.get("/summary")
def get_login_summary(
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    total      = db.query(LoginLog).count()
    success    = db.query(LoginLog).filter(LoginLog.status == "success").count()
    failed     = db.query(LoginLog).filter(LoginLog.status == "failed").count()
    blocked    = db.query(LoginLog).filter(LoginLog.status == "blocked").count()

    return {
        "total":   total,
        "success": success,
        "failed":  failed,
        "blocked": blocked,
    }