"""
Invitation Model
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base


class Invitation(Base):
    __tablename__ = "invitations"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    is_accepted = Column(Boolean, default=False, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    project = relationship("Project")
    inviter = relationship("User", back_populates="sent_invitations", foreign_keys=[inviter_id])

