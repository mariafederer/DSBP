"""DSBP Database Models"""
from backend.models.user import User
from backend.models.project import Project
from backend.models.task_board import TaskBoard
from backend.models.task import Task
from backend.models.task_comment import TaskComment
from backend.models.comment_mention import CommentMention
from backend.models.notification import Notification
from backend.models.project_member import ProjectMember
from backend.models.invitation import Invitation
from backend.models.license import License
from backend.utils.primary_keys import register_integer_pk_listener

__all__ = [
    "User",
    "Project",
    "TaskBoard",
    "Task",
    "TaskComment",
    "CommentMention",
    "Notification",
    "ProjectMember",
    "Invitation",
    "License",
]


for _model in (
    User,
    Project,
    TaskBoard,
    Task,
    TaskComment,
    CommentMention,
    Notification,
    ProjectMember,
    Invitation,
    License,
):
    register_integer_pk_listener(_model)


