"""Schemas for user notifications"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from backend.schemas.user import UserSummary


class NotificationUpdate(BaseModel):
    is_read: bool = True


class NotificationResponse(BaseModel):
    id: int
    comment_id: int
    task_id: int
    project_id: int
    message: str
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime]
    resolved_at: Optional[datetime]
    comment_author: UserSummary
    task_title: str
    project_name: str

    class Config:
        from_attributes = True
