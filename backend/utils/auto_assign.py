from sqlalchemy.orm import Session
from models.models import User, Notification, Ticket
from utils.audit import log_action
from utils.email import send_ticket_assigned_email


# Priority → required agent level
PRIORITY_LEVEL_MAP = {
    "high":   "senior",
    "medium": "mid",
    "low":    "junior",
}


def auto_assign_ticket(db: Session, ticket: Ticket) -> User | None:
    """
    Automatically assign ticket to an agent based on priority.
    high   → senior agent
    medium → mid agent
    low    → junior agent
    Falls back to any available agent if exact level not found.
    """
    priority_val = ticket.priority.value if hasattr(ticket.priority, "value") else str(ticket.priority)
    required_level = PRIORITY_LEVEL_MAP.get(priority_val)

    # Find available agent with exact level
    agent = db.query(User).filter(
        User.role == "user",
        User.is_active == True,
        User.is_deleted == False,
        User.agent_level == required_level
    ).first()

    # Fallback — any active agent
    if not agent:
        agent = db.query(User).filter(
            User.role == "user",
            User.is_active == True,
            User.is_deleted == False,
            User.agent_level != None
        ).first()

    if not agent:
        return None

    # Assign
    ticket.assigned_agent_id = agent.id
    ticket.auto_assigned = True
    db.commit()
    db.refresh(ticket)

    # Audit log
    log_action(
        db=db,
        ticket_id=ticket.id,
        action="AUTO_ASSIGNED",
        description=f"Ticket auto-assigned to {agent.name} ({required_level} agent) based on '{priority_val}' priority.",
        performed_by="System",
        performed_by_role="admin",
    )

    # In-app notification to ticket owner
    try:
        owner = db.query(User).filter(User.id == ticket.user_id).first()
        if owner:
            notif = Notification(
                user_id=owner.id,
                ticket_id=ticket.id,
                message=f"Your ticket '#{ticket.id} — {ticket.title}' has been automatically assigned to {agent.name} ({required_level} level agent).",
                is_read=False,
            )
            db.add(notif)
            db.commit()
    except Exception as e:
        print(f"Notification error: {e}")

    # Email notification
    try:
        owner = db.query(User).filter(User.id == ticket.user_id).first()
        if owner:
            send_ticket_assigned_email(
                to=owner.email,
                user_name=owner.name,
                ticket_title=ticket.title,
                ticket_id=ticket.id,
                helper_name=f"{agent.name} ({required_level} agent)",
            )
    except Exception as e:
        print(f"Email error: {e}")

    return agent