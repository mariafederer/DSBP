"""Comment mention model"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database import Base


class CommentMention(Base):
    __tablename__ = "comment_mentions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    comment_id = Column(Integer, ForeignKey("task_comments.id"), nullable=False)
    mentioned_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    comment = relationship("TaskComment", back_populates="mentions")
    mentioned_user = relationship("User", back_populates="comment_mentions")
