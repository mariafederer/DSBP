"""Task comment endpoints"""
import re
from datetime import datetime
from typing import List, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from backend.database import get_db
from backend.dependencies import get_current_user
from backend.models import (
    User,
    Task,
    TaskBoard,
    ProjectMember,
    TaskComment,
    CommentMention,
    Notification,
)
from backend.schemas import TaskCommentCreate, TaskCommentResponse, TaskCommentResolve, UserSummary

router = APIRouter()

MENTION_PATTERN = re.compile(r"@([A-Za-z0-9_.-]+)")


def _comment_query(db: Session):
    return db.query(TaskComment).options(
        selectinload(TaskComment.author),
        selectinload(TaskComment.resolved_by),
        selectinload(TaskComment.mentions).selectinload(CommentMention.mentioned_user),
        selectinload(TaskComment.task).selectinload(Task.board).selectinload(TaskBoard.project),
    )


def _serialize_comment(comment: TaskComment, replies: Optional[List[TaskCommentResponse]] = None) -> TaskCommentResponse:
    return TaskCommentResponse(
        id=comment.id,
        task_id=comment.task_id,
        parent_comment_id=comment.parent_comment_id,
        content=comment.content,
        is_resolved=comment.is_resolved,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author=UserSummary.from_orm(comment.author),
        resolved_by=UserSummary.from_orm(comment.resolved_by) if comment.resolved_by else None,
        mentions=[UserSummary.from_orm(m.mentioned_user) for m in comment.mentions],
        replies=replies or [],
    )


def _build_comment_tree(comments: List[TaskComment]) -> List[TaskCommentResponse]:
    comments_by_parent: Dict[Optional[int], List[TaskComment]] = {}
    for comment in comments:
        comments_by_parent.setdefault(comment.parent_comment_id, []).append(comment)

    def build_nodes(parent_id: Optional[int]) -> List[TaskCommentResponse]:
        nodes: List[TaskCommentResponse] = []
        for item in sorted(comments_by_parent.get(parent_id, []), key=lambda c: c.created_at):
            replies = build_nodes(item.id)
            nodes.append(_serialize_comment(item, replies))
        return nodes

    return build_nodes(None)


def _extract_usernames_from_content(content: str) -> List[str]:
    return list({match.group(1) for match in MENTION_PATTERN.finditer(content or "")})


def _ensure_task_access(task: Task, current_user: User, db: Session):
    project = task.board.project
    if project.owner_id == current_user.id:
        return

    membership = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == current_user.id,
    ).first()
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this task",
        )


def _allowed_project_user_ids(task: Task, db: Session) -> List[int]:
    project = task.board.project
    member_rows = db.query(ProjectMember.user_id).filter(ProjectMember.project_id == project.id).all()
    member_ids = [row[0] for row in member_rows]
    member_ids.append(project.owner_id)
    return list(set(member_ids))


def _load_comment(db: Session, comment_id: int) -> TaskComment:
    comment = _comment_query(db).filter(TaskComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return comment


def _serialize_single_comment(comment: TaskComment) -> TaskCommentResponse:
    return _serialize_comment(comment, [])


@router.post("", response_model=TaskCommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: TaskCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a comment for a task and notify mentioned users."""
    task = db.query(Task).options(
        selectinload(Task.board).selectinload(TaskBoard.project)
    ).filter(Task.id == comment_data.task_id).first()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    _ensure_task_access(task, current_user, db)

    content = comment_data.content.strip()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comment content cannot be empty")

    parent_comment = None
    if comment_data.parent_comment_id is not None:
        parent_comment = db.query(TaskComment).filter(TaskComment.id == comment_data.parent_comment_id).first()
        if parent_comment is None or parent_comment.task_id != task.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent comment not found for this task",
            )

    allowed_user_ids = set(_allowed_project_user_ids(task, db))

    raw_mentions = set(comment_data.mentions or [])
    username_mentions = _extract_usernames_from_content(content)
    if username_mentions:
        username_users = db.query(User).filter(User.username.in_(username_mentions)).all()
        raw_mentions.update(user.id for user in username_users)

    mentioned_users = []
    if raw_mentions:
        mentioned_users = db.query(User).filter(User.id.in_(raw_mentions)).all()
        invalid_users = [user.username for user in mentioned_users if user.id not in allowed_user_ids]
        if invalid_users:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot mention users outside the project: {', '.join(invalid_users)}",
            )

    comment = TaskComment(
        task_id=task.id,
        author_id=current_user.id,
        parent_comment_id=parent_comment.id if parent_comment else None,
        content=content,
    )
    db.add(comment)
    db.flush()

    notification_message = f"{current_user.username} mentioned you on task '{task.title}'"
    for user in mentioned_users:
        if user.id == current_user.id:
            continue
        db.add(CommentMention(comment_id=comment.id, mentioned_user_id=user.id))
        db.add(Notification(user_id=user.id, comment_id=comment.id, message=notification_message))

    db.commit()

    created_comment = _load_comment(db, comment.id)
    return _serialize_single_comment(created_comment)


@router.get("/task/{task_id}", response_model=List[TaskCommentResponse])
async def list_task_comments(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all comments for a task as a threaded conversation."""
    task = db.query(Task).options(
        selectinload(Task.board).selectinload(TaskBoard.project)
    ).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    _ensure_task_access(task, current_user, db)

    comments = _comment_query(db).filter(TaskComment.task_id == task_id).order_by(TaskComment.created_at.asc()).all()
    return _build_comment_tree(comments)


@router.patch("/{comment_id}/resolve", response_model=TaskCommentResponse)
async def resolve_comment(
    comment_id: int,
    resolve_data: TaskCommentResolve,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a comment as resolved or reopen it."""
    comment = _load_comment(db, comment_id)
    task = comment.task
    _ensure_task_access(task, current_user, db)

    project = task.board.project
    allowed_resolvers = {comment.author_id, project.owner_id}
    allowed_resolvers.update(m.mentioned_user_id for m in comment.mentions)

    if current_user.id not in allowed_resolvers:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to update this comment",
        )

    now = datetime.utcnow()

    if resolve_data.is_resolved:
        comment.is_resolved = True
        comment.resolved_by_id = current_user.id
        comment.resolved_at = now

        notifications = db.query(Notification).filter(
            Notification.comment_id == comment.id,
            Notification.user_id == current_user.id,
        ).all()
        for notification in notifications:
            notification.is_read = True
            notification.read_at = now
            notification.resolved_at = now
    else:
        if current_user.id not in {comment.author_id, project.owner_id}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the author or project owner can reopen the comment",
            )
        comment.is_resolved = False
        comment.resolved_by_id = None
        comment.resolved_at = None

        notifications = db.query(Notification).filter(
            Notification.comment_id == comment.id
        ).all()
        for notification in notifications:
            notification.resolved_at = None

    db.commit()

    updated_comment = _load_comment(db, comment.id)
    return _serialize_single_comment(updated_comment)
