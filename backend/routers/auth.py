from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from database.db import get_db
from models.models import User
from schemas.schemas import LoginRequest, TokenResponse, UserOut, RegisterRequest
from utils.auth import verify_password, create_access_token, hash_password, get_current_user
from utils.login_logger import log_login_attempt

router = APIRouter(prefix="/auth", tags=["Auth"])

MAX_FAILED_ATTEMPTS = 5
BLOCK_DURATION_MINUTES = 30


# ── Register ──────────────────────────────────────────────────────────────────
@router.post("/register", response_model=UserOut)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        user = User(
            name=payload.name,
            email=payload.email,
            password=hash_password(payload.password),
            role="user",
            is_active=True,
            is_deleted=False,
            is_online=False,
            failed_login_attempts=0,
            is_blocked=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        print(f"Register error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    # Get IP address
    ip = request.client.host if request.client else "unknown"

    user = db.query(User).filter(User.email == payload.email).first()

    # User not found
    if not user:
        log_login_attempt(
            db=db,
            email=payload.email,
            status="failed",
            reason="Email not found",
            ip_address=ip,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Soft deleted
    if user.is_deleted:
        log_login_attempt(
            db=db,
            email=payload.email,
            status="failed",
            reason="Account deleted",
            user_id=user.id,
            ip_address=ip,
        )
        raise HTTPException(status_code=403, detail="Account no longer exists.")

    # Deactivated
    if not user.is_active:
        log_login_attempt(
            db=db,
            email=payload.email,
            status="failed",
            reason="Account deactivated",
            user_id=user.id,
            ip_address=ip,
        )
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact admin.")

    # ── Check if currently blocked ────────────────────────────────────────────
    if user.is_blocked:
        if user.blocked_until and datetime.now(timezone.utc) < user.blocked_until:
            remaining = user.blocked_until - datetime.now(timezone.utc)
            remaining_mins = int(remaining.total_seconds() // 60)
            remaining_secs = int(remaining.total_seconds() % 60)
            log_login_attempt(
                db=db,
                email=payload.email,
                status="blocked",
                reason=f"Account blocked — {remaining_mins}m {remaining_secs}s remaining",
                user_id=user.id,
                ip_address=ip,
            )
            raise HTTPException(
                status_code=429,
                detail=f"Account temporarily blocked. Try again in {remaining_mins}m {remaining_secs}s."
            )
        else:
            # Block expired — auto unblock
            user.is_blocked = False
            user.failed_login_attempts = 0
            user.blocked_until = None
            db.commit()

    # ── Verify password ───────────────────────────────────────────────────────
    if not verify_password(payload.password, user.password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1

        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.is_blocked = True
            user.blocked_until = datetime.now(timezone.utc) + timedelta(minutes=BLOCK_DURATION_MINUTES)
            db.commit()
            log_login_attempt(
                db=db,
                email=payload.email,
                status="blocked",
                reason=f"Blocked after {MAX_FAILED_ATTEMPTS} failed attempts",
                user_id=user.id,
                ip_address=ip,
            )
            raise HTTPException(
                status_code=429,
                detail=f"Account blocked after {MAX_FAILED_ATTEMPTS} failed attempts. "
                       f"Try again after {BLOCK_DURATION_MINUTES} minutes."
            )

        attempts_left = MAX_FAILED_ATTEMPTS - user.failed_login_attempts
        db.commit()
        log_login_attempt(
            db=db,
            email=payload.email,
            status="failed",
            reason=f"Wrong password — attempt {user.failed_login_attempts}/{MAX_FAILED_ATTEMPTS}",
            user_id=user.id,
            ip_address=ip,
        )
        raise HTTPException(
            status_code=401,
            detail=f"Invalid email or password. {attempts_left} attempt(s) remaining before account is blocked."
        )

    # ── Login success ─────────────────────────────────────────────────────────
    log_login_attempt(
        db=db,
        email=payload.email,
        status="success",
        reason="Login successful",
        user_id=user.id,
        ip_address=ip,
    )

    try:
        user.failed_login_attempts = 0
        user.is_blocked = False
        user.blocked_until = None
        user.last_login = datetime.now(timezone.utc)
        user.is_online = True
        db.commit()
        db.refresh(user)
    except Exception as e:
        print(f"Session tracking error: {e}")
        db.rollback()

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserOut.model_validate(user),
    )


# ── Logout ────────────────────────────────────────────────────────────────────
@router.post("/logout")
def logout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        current_user.last_logout = datetime.now(timezone.utc)
        current_user.is_online = False
        db.commit()
    except Exception as e:
        print(f"Logout error: {e}")
        db.rollback()
    return {"message": "Logged out successfully"}


# ── Get Current User ──────────────────────────────────────────────────────────
@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Admin: Unblock User ───────────────────────────────────────────────────────
@router.patch("/unblock/{user_id}")
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_blocked = False
    user.failed_login_attempts = 0
    user.blocked_until = None
    db.commit()
    return {"message": f"User '{user.name}' unblocked successfully"}