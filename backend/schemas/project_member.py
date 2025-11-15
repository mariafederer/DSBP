"""Schemas for project members"""
from datetime import datetime

from pydantic import BaseModel

from backend.schemas.user import UserSummary


class ProjectMemberResponse(BaseModel):
    id: int
    project_id: int
    role: str
    created_at: datetime
    user: UserSummary

    class Config:
        from_attributes = True
