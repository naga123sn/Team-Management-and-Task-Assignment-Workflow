from sqlalchemy.orm import Session
from models.models import AuditLog


def log_action(
    db: Session,
    ticket_id: int,
    action: str,
    description: str,
    performed_by: str,
    performed_by_role: str,
):
    """
    action examples:
      TICKET_CREATED, STATUS_CHANGED, PRIORITY_CHANGED,
      HELPER_ASSIGNED, COMMENT_ADDED, COMMENT_DELETED
    """
    log = AuditLog(
        ticket_id=ticket_id,
        action=action,
        description=description,
        performed_by=performed_by,
        performed_by_role=performed_by_role,
    )
    db.add(log)
    db.commit()