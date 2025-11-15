"""Schemas for task comments"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from backend.schemas.user import UserSummary


class TaskCommentCreate(BaseModel):
    task_id: int
    content: str = Field(..., min_length=1)
    parent_comment_id: Optional[int] = None
    mentions: List[int] = Field(default_factory=list)


class TaskCommentResolve(BaseModel):
    is_resolved: bool


class TaskCommentResponse(BaseModel):
    id: int
    task_id: int
    parent_comment_id: Optional[int]
    content: str
    is_resolved: bool
    created_at: datetime
    updated_at: datetime
    author: UserSummary
    resolved_by: Optional[UserSummary]
    mentions: List[UserSummary]
    replies: List["TaskCommentResponse"] = []

    class Config:
        from_attributes = True


TaskCommentResponse.model_rebuild()
