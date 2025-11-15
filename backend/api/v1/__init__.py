"""
API v1 routes
"""
from fastapi import APIRouter
from backend.api.v1 import auth, projects, task_boards, tasks, invitations, comments, notifications

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(task_boards.router, prefix="/task-boards", tags=["Task Boards"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(invitations.router, prefix="/invitations", tags=["Invitations"])
api_router.include_router(comments.router, prefix="/comments", tags=["Comments"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

