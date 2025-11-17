from datetime import datetime
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


project_shared_users = Table(
    "project_shared_users",
    Base.metadata,
    Column("project_id", ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)

task_assignees = Table(
    "task_assignees",
    Base.metadata,
    Column("task_id", ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author")
    notifications = relationship(
        "Notification",
        back_populates="recipient",
        cascade="all, delete-orphan",
        foreign_keys="Notification.recipient_id",
    )
    shared_projects = relationship(
        "Project",
        secondary=project_shared_users,
        back_populates="shared_users",
    )
    assigned_tasks = relationship(
        "Task",
        secondary=task_assignees,
        back_populates="assignees",
    )
    task_activities = relationship("TaskActivity", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, default="")
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    visibility = Column(String(20), default="all", nullable=False)

    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    shared_users = relationship(
        "User",
        secondary=project_shared_users,
        back_populates="shared_projects",
    )
    task_activities = relationship("TaskActivity", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, default="")
    status = Column(String(50), default="new_task")
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="tasks")
    assignees = relationship(
        "User",
        secondary=task_assignees,
        back_populates="assigned_tasks",
    )
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
    dependencies = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.dependent_task_id",
        back_populates="dependent_task",
        cascade="all, delete-orphan",
    )
    dependents = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.depends_on_task_id",
        back_populates="depends_on_task",
        cascade="all, delete-orphan",
    )


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    dependent_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    depends_on_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    dependent_task = relationship(
        "Task",
        foreign_keys=[dependent_task_id],
        back_populates="dependencies",
    )
    depends_on_task = relationship(
        "Task",
        foreign_keys=[depends_on_task_id],
        back_populates="dependents",
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    solved = Column(Boolean, default=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"))

    task = relationship("Task", back_populates="comments")
    author = relationship("User", back_populates="comments")
    parent = relationship("Comment", remote_side=[id], backref="replies")
    notifications = relationship("Notification", back_populates="comment", cascade="all, delete-orphan")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"), nullable=False)
    message = Column(String(255), nullable=False)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    recipient = relationship("User", back_populates="notifications", foreign_keys=[recipient_id])
    comment = relationship("Comment", back_populates="notifications")

    @property
    def task_id(self):
        return self.comment.task_id if self.comment else None

    @property
    def task_title(self):
        return self.comment.task.title if self.comment and self.comment.task else None

    @property
    def project_id(self):
        if self.comment and self.comment.task:
            return self.comment.task.project_id
        return None

    @property
    def project_name(self):
        if self.comment and self.comment.task and self.comment.task.project:
            return self.comment.task.project.name
        return None


class TaskActivity(Base):
    __tablename__ = "task_activities"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(50), nullable=False)
    status = Column(String(50), nullable=True)
    task_title = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", back_populates="task_activities")
    project = relationship("Project", back_populates="task_activities")
    task = relationship("Task")