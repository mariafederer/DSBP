"""Notification endpoints"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models import Notification, TaskComment, Task, TaskBoard, User
from backend.schemas import NotificationResponse, NotificationUpdate, UserSummary

router = APIRouter()


def _notification_query(db: Session):
    return db.query(Notification).options(
        selectinload(Notification.comment)
        .selectinload(TaskComment.author),
        selectinload(Notification.comment)
        .selectinload(TaskComment.task)
        .selectinload(Task.board)
        .selectinload(TaskBoard.project),
    )


def _serialize_notification(notification: Notification) -> NotificationResponse:
    comment = notification.comment
    task = comment.task
    project = task.board.project
    return NotificationResponse(
        id=notification.id,
        comment_id=notification.comment_id,
        task_id=task.id,
        project_id=project.id,
        message=notification.message,
        is_read=notification.is_read,
        created_at=notification.created_at,
        read_at=notification.read_at,
        resolved_at=notification.resolved_at,
        comment_author=UserSummary.from_orm(comment.author),
        task_title=task.title,
        project_name=project.name,
    )


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = Query(False, description="Return only unread notifications"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List notifications for the current user."""
    query = _notification_query(db).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))

    notifications = query.order_by(Notification.created_at.desc()).all()
    return [_serialize_notification(notification) for notification in notifications]


@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: int,
    update_data: NotificationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read or unread."""
    notification = (
        _notification_query(db)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    now = datetime.utcnow()

    if update_data.is_read:
        notification.is_read = True
        if notification.read_at is None:
            notification.read_at = now
    else:
        notification.is_read = False
        notification.read_at = None

    db.commit()
    db.refresh(notification)

    return _serialize_notification(notification)
