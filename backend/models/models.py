from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.db import Base
import enum


class RoleEnum(str, enum.Enum):
    admin = "admin"
    user = "user"

class PriorityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"

class StatusEnum(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    resolved = "resolved"

class User(Base):
    __tablename__ = "users"
    id                    = Column(Integer, primary_key=True, index=True)
    name                  = Column(String(100), nullable=False)
    email                 = Column(String(100), unique=True, nullable=False)
    password              = Column(String(255), nullable=False)
    role                  = Column(Enum(RoleEnum), default=RoleEnum.user)
    is_active             = Column(Boolean, default=True)
    is_deleted            = Column(Boolean, default=False)
    last_login            = Column(DateTime(timezone=True), nullable=True)
    last_logout           = Column(DateTime(timezone=True), nullable=True)
    is_online             = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    is_blocked            = Column(Boolean, default=False)
    blocked_until         = Column(DateTime(timezone=True), nullable=True)
    agent_level           = Column(Enum("junior", "mid", "senior",
                              name="agent_level_enum"), nullable=True)
    created_at            = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships — foreign_keys required because multiple FKs link to users
    tickets          = relationship("Ticket", foreign_keys="Ticket.user_id",     back_populates="user")
    assigned_tickets = relationship("Ticket", foreign_keys="Ticket.assigned_agent_id", back_populates="assigned_agent")
    comments         = relationship("Comment", back_populates="user")
    team_memberships = relationship("TeamMember", back_populates="user")
    created_teams    = relationship("Team", foreign_keys="Team.created_by",      back_populates="creator")
    led_teams        = relationship("Team", foreign_keys="Team.team_lead_id",    back_populates="team_lead")


class Helper(Base):
    __tablename__ = "helpers"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), nullable=False)
    email      = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    tickets    = relationship("Ticket", back_populates="helper")


class Team(Base):
    __tablename__ = "teams"
    id           = Column(Integer, primary_key=True, index=True)
    team_name    = Column(String(100), unique=True, nullable=False)
    created_by   = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_lead_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    creator      = relationship("User", foreign_keys=[created_by],   back_populates="created_teams")
    team_lead    = relationship("User", foreign_keys=[team_lead_id], back_populates="led_teams")
    members      = relationship("TeamMember", back_populates="team", cascade="all, delete")
    tickets      = relationship("Ticket", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"
    id        = Column(Integer, primary_key=True, index=True)
    team_id   = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    user_id   = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    team      = relationship("Team", back_populates="members")
    user      = relationship("User", back_populates="team_memberships")


class Ticket(Base):
    __tablename__ = "tickets"
    id                = Column(Integer, primary_key=True, index=True)
    title             = Column(String(200), nullable=False)
    description       = Column(Text, nullable=False)
    category          = Column(String(50), default="General")
    priority          = Column(Enum(PriorityEnum), default=PriorityEnum.low)
    status            = Column(Enum(StatusEnum), default=StatusEnum.pending)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False)
    helper_id         = Column(Integer, ForeignKey("helpers.id"), nullable=True)
    team_id           = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    assigned_agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    auto_assigned     = Column(Boolean, default=False)
    due_date          = Column(DateTime(timezone=True), nullable=True)   # ← SLA
    resolved_at       = Column(DateTime(timezone=True), nullable=True)   # ← SLA
    is_deleted        = Column(Boolean, default=False)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())

    user           = relationship("User",   foreign_keys=[user_id],           back_populates="tickets")
    assigned_agent = relationship("User",   foreign_keys=[assigned_agent_id], back_populates="assigned_tickets")
    helper         = relationship("Helper", back_populates="tickets")
    team           = relationship("Team",   back_populates="tickets")
    comments       = relationship("Comment",  back_populates="ticket")
    audit_logs     = relationship("AuditLog", back_populates="ticket", cascade="all, delete")


class Comment(Base):
    __tablename__ = "comments"
    id         = Column(Integer, primary_key=True, index=True)
    comment    = Column(Text, nullable=False)
    ticket_id  = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ticket     = relationship("Ticket", back_populates="comments")
    user       = relationship("User",   back_populates="comments")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id                = Column(Integer, primary_key=True, index=True)
    ticket_id         = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    action            = Column(String(100), nullable=False)
    description       = Column(String(500), nullable=False)
    performed_by      = Column(String(100), nullable=False)
    performed_by_role = Column(String(20), nullable=False)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    ticket            = relationship("Ticket", back_populates="audit_logs")


class LoginLog(Base):
    __tablename__ = "login_logs"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    email        = Column(String(100), nullable=False)
    status       = Column(Enum("success", "failed", "blocked", name="login_status"), nullable=False)
    reason       = Column(String(255), nullable=True)
    ip_address   = Column(String(50), nullable=True)
    attempted_at = Column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ticket_id  = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    message    = Column(String(500), nullable=False)
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())