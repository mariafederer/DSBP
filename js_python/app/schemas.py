from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(..., max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = ""


class ProjectCreate(ProjectBase):
    pass


class ProjectOut(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        orm_mode = True


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = ""
    status: str = "todo"
    assignee_id: Optional[int] = None


class TaskCreate(TaskBase):
    project_id: int


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[int] = None


class TaskOut(TaskBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        orm_mode = True


class CommentCreate(BaseModel):
    task_id: int
    content: str
    parent_id: Optional[int] = None


class CommentOut(BaseModel):
    id: int
    content: str
    created_at: datetime
    solved: bool
    task_id: int
    author: UserOut
    parent_id: Optional[int]
    replies: List["CommentOut"] = Field(default_factory=list)

    class Config:
        orm_mode = True


CommentOut.update_forward_refs()


class NotificationOut(BaseModel):
    id: int
    comment_id: int
    message: str
    read: bool
    created_at: datetime

    class Config:
        orm_mode = True
