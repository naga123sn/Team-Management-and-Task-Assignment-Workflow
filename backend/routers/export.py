from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database.db import get_db
from models.models import User, Ticket, Comment, AuditLog
from utils.auth import require_admin
import csv
import io

router = APIRouter(prefix="/export", tags=["Export"])


def make_csv_response(filename: str, headers: list, rows: list) -> StreamingResponse:
    """Helper to create a CSV StreamingResponse."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ── Export Users ──────────────────────────────────────────────────────────────
@router.get("/users")
def export_users(
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    users = db.query(User).filter(User.role == "user").all()

    headers = ["ID", "Name", "Email", "Role", "Active", "Online",
               "Blocked", "Failed Attempts", "Last Login", "Last Logout", "Created At"]

    rows = [
        [
            u.id, u.name, u.email, u.role,
            "Yes" if u.is_active else "No",
            "Yes" if u.is_online else "No",
            "Yes" if u.is_blocked else "No",
            u.failed_login_attempts or 0,
            u.last_login.strftime("%Y-%m-%d %H:%M:%S") if u.last_login else "Never",
            u.last_logout.strftime("%Y-%m-%d %H:%M:%S") if u.last_logout else "Never",
            u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else "",
        ]
        for u in users
    ]

    return make_csv_response("users_export.csv", headers, rows)


# ── Export Tickets ────────────────────────────────────────────────────────────
@router.get("/tickets")
def export_tickets(
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    tickets = db.query(Ticket).filter(Ticket.is_deleted == False).all()

    headers = ["ID", "Title", "Description", "Priority", "Status",
               "User ID", "Helper ID", "Created At", "Updated At"]

    rows = [
        [
            t.id, t.title,
            t.description.replace("\n", " "),
            t.priority, t.status,
            t.user_id, t.helper_id or "Unassigned",
            t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
            t.updated_at.strftime("%Y-%m-%d %H:%M:%S") if t.updated_at else "",
        ]
        for t in tickets
    ]

    return make_csv_response("tickets_export.csv", headers, rows)


# ── Export Audit Logs ─────────────────────────────────────────────────────────
@router.get("/audit-logs")
def export_audit_logs(
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()

    headers = ["ID", "Ticket ID", "Action", "Description",
               "Performed By", "Role", "Timestamp"]

    rows = [
        [
            l.id, l.ticket_id, l.action,
            l.description,
            l.performed_by, l.performed_by_role,
            l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "",
        ]
        for l in logs
    ]

    return make_csv_response("audit_logs_export.csv", headers, rows)


# ── Export Login Logs ─────────────────────────────────────────────────────────
@router.get("/login-logs")
def export_login_logs(
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    from models.models import LoginLog
    logs = db.query(LoginLog).order_by(LoginLog.attempted_at.desc()).all()

    headers = ["ID", "User ID", "Email", "Status", "Reason", "IP Address", "Timestamp"]

    rows = [
        [
            l.id, l.user_id or "—", l.email,
            l.status, l.reason or "—",
            l.ip_address or "—",
            l.attempted_at.strftime("%Y-%m-%d %H:%M:%S") if l.attempted_at else "",
        ]
        for l in logs
    ]

    return make_csv_response("login_logs_export.csv", headers, rows)