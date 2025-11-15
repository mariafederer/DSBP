"""Task comment model"""
from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database import Base


class TaskComment(Base):
    __tablename__ = "task_comments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parent_comment_id = Column(Integer, ForeignKey("task_comments.id"), nullable=True)
    content = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False)
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    task = relationship("Task", back_populates="comments")
    author = relationship("User", foreign_keys=[author_id], back_populates="comments")
    resolved_by = relationship("User", foreign_keys=[resolved_by_id], back_populates="resolved_comments")
    parent = relationship("TaskComment", remote_side=[id], back_populates="replies")
    replies = relationship("TaskComment", back_populates="parent", cascade="all, delete-orphan")
    mentions = relationship("CommentMention", back_populates="comment", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="comment", cascade="all, delete-orphan")
