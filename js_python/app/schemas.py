from datetime import datetime
from typing import List, Literal, Optional

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
    visibility: Literal["all", "private", "selected"] = "all"


class ProjectCreate(ProjectBase):
    shared_usernames: List[str] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[Literal["all", "private", "selected"]] = None
    shared_usernames: Optional[List[str]] = None


class ProjectOut(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime
    shared_users: List["UserOut"] = Field(default_factory=list)

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
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    task_id: Optional[int] = None
    task_title: Optional[str] = None

    class Config:
        orm_mode = True
