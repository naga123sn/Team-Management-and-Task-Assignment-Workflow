from sqlalchemy.orm import Session
from models.models import LoginLog


def log_login_attempt(
    db: Session,
    email: str,
    status: str,           # "success" | "failed" | "blocked"
    reason: str = None,
    user_id: int = None,
    ip_address: str = None,
):
    """
    Log every login attempt to login_logs table.
    status: 'success' | 'failed' | 'blocked'
    """
    try:
        log = LoginLog(
            user_id=user_id,
            email=email,
            status=status,
            reason=reason,
            ip_address=ip_address,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Login log error: {e}")
        db.rollback()