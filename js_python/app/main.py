import re
from datetime import timedelta
from pathlib import Path
from typing import Iterable, List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from . import auth, models, schemas
from .database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Kanban Web App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

MENTION_PATTERN = re.compile(r"@(?P<username>[A-Za-z0-9_\.\-]+)")


def parse_mentions(content: str, db: Session) -> List[models.User]:
    usernames = {match.group("username") for match in MENTION_PATTERN.finditer(content)}
    if not usernames:
        return []
    return db.query(models.User).filter(models.User.username.in_(usernames)).all()


def user_can_access_project(project: models.Project, user: models.User) -> bool:
    if project.owner_id == user.id:
        return True
    if project.visibility == "all":
        return True
    if project.visibility == "selected":
        return any(shared_user.id == user.id for shared_user in project.shared_users)
    return False


def ensure_project_access(project_id: int, db: Session, user: models.User) -> models.Project:
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not user_can_access_project(project, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this project")
    return project


def apply_project_visibility(
    project: models.Project, visibility: str, shared_usernames: Optional[Iterable[str]], db: Session
) -> None:
    project.visibility = visibility
    if visibility != "selected":
        project.shared_users.clear()
        return

    if shared_usernames is None:
        return

    clean_usernames = {username.strip() for username in shared_usernames if username and username.strip()}
    if not clean_usernames:
        project.shared_users.clear()
        return

    users = db.query(models.User).filter(models.User.username.in_(clean_usernames)).all()
    found_usernames = {user.username for user in users}
    missing = clean_usernames - found_usernames
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown users: {', '.join(sorted(missing))}",
        )

    project.shared_users = sorted(
        (user for user in users if user.id != project.owner_id),
        key=lambda user: user.username.lower(),
    )


@app.post("/auth/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=auth.get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == credentials.username).first()
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = auth.create_access_token(data={"sub": user.username}, expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES))
    return schemas.Token(access_token=access_token)


@app.get("/users/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.get("/users", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return (
        db.query(models.User)
        .order_by(models.User.username.asc())
        .all()
    )


@app.get("/projects", response_model=List[schemas.ProjectOut])
def list_projects(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    projects = (
        db.query(models.Project)
        .filter(
            or_(
                models.Project.owner_id == current_user.id,
                models.Project.visibility == "all",
                models.Project.shared_users.any(models.User.id == current_user.id),
            )
        )
        .distinct()
        .order_by(models.Project.created_at.desc())
        .all()
    )
    return projects


@app.post("/projects", response_model=schemas.ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    project = models.Project(
        name=project_in.name,
        description=project_in.description,
        owner_id=current_user.id,
        visibility=project_in.visibility,
    )
    db.add(project)
    db.flush()
    apply_project_visibility(project, project.visibility, project_in.shared_usernames, db)
    db.commit()
    db.refresh(project)
    return project


@app.patch("/projects/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int,
    project_update: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id, models.Project.owner_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    update_data = project_update.dict(exclude_unset=True)
    shared_usernames = update_data.pop("shared_usernames", None)

    for field, value in update_data.items():
        setattr(project, field, value)

    if "visibility" in update_data or shared_usernames is not None:
        apply_project_visibility(project, project.visibility, shared_usernames, db)

    db.commit()
    db.refresh(project)
    return project


@app.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id, models.Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    db.delete(project)
    db.commit()


@app.get("/projects/{project_id}/tasks", response_model=List[schemas.TaskOut])
def list_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    project = ensure_project_access(project_id, db, current_user)
    return db.query(models.Task).filter(models.Task.project_id == project.id).all()


@app.post("/tasks", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    project = ensure_project_access(task_in.project_id, db, current_user)
    task = models.Task(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        project_id=project.id,
        assignee_id=task_in.assignee_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.patch("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    task_update: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not user_can_access_project(task.project, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to modify this task")
    for field, value in task_update.dict(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not user_can_access_project(task.project, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to modify this task")
    db.delete(task)
    db.commit()


@app.get("/tasks/{task_id}/comments", response_model=List[schemas.CommentOut])
def list_comments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not user_can_access_project(task.project, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access comments for this task")
    comments = (
        db.query(models.Comment)
        .filter(models.Comment.task_id == task_id, models.Comment.parent_id.is_(None))
        .all()
    )
    return comments


@app.post("/comments", response_model=schemas.CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(
    comment_in: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == comment_in.task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not user_can_access_project(task.project, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to comment on this task")
    parent = None
    if comment_in.parent_id:
        parent = db.query(models.Comment).filter(models.Comment.id == comment_in.parent_id).first()
        if not parent or parent.task_id != task.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent comment not found")
    comment = models.Comment(
        content=comment_in.content,
        task_id=task.id,
        author_id=current_user.id,
        parent_id=parent.id if parent else None,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    mentioned_users = parse_mentions(comment.content, db)
    task = comment.task
    project = task.project if task else None
    for user in mentioned_users:
        if user.id == current_user.id:
            continue
        location_bits = []
        if project:
            location_bits.append(f"project '{project.name}'")
        if task:
            location_bits.append(f"task '{task.title}'")
        location = " in " + ", ".join(location_bits) if location_bits else ""
        notification = models.Notification(
            recipient_id=user.id,
            comment_id=comment.id,
            message=f"{current_user.username} mentioned you{location}",
        )
        db.add(notification)
    db.commit()
    db.refresh(comment)
    return comment


@app.post("/comments/{comment_id}/solve", response_model=schemas.CommentOut)
def solve_comment(comment_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    comment = (
        db.query(models.Comment)
        .join(models.Task)
        .join(models.Project)
        .filter(models.Comment.id == comment_id)
        .first()
    )
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    project: models.Project = comment.task.project
    if not user_can_access_project(project, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update this comment")
    is_owner = project.owner_id == current_user.id
    is_author = comment.author_id == current_user.id
    mentioned_user_ids = {n.recipient_id for n in comment.notifications}
    is_mentioned = current_user.id in mentioned_user_ids

    if not (is_owner or is_author or is_mentioned):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to resolve this comment")

    comment.solved = True
    for notification in comment.notifications:
        notification.read = True
    db.commit()
    db.refresh(comment)
    return comment


@app.get("/notifications", response_model=List[schemas.NotificationOut])
def list_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    notifications = (
        db.query(models.Notification)
        .filter(models.Notification.recipient_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .all()
    )
    return notifications


@app.post("/notifications/{notification_id}/read", response_model=schemas.NotificationOut)
def mark_notification_read(notification_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    notification = (
        db.query(models.Notification)
        .filter(models.Notification.id == notification_id, models.Notification.recipient_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.read = True
    db.commit()
    db.refresh(notification)
    return notification


@app.get("/", include_in_schema=False)
def serve_frontend():
    index_path = frontend_dir / "index.html"
    return FileResponse(index_path)


@app.get("/login", include_in_schema=False)
def serve_login():
    return FileResponse(frontend_dir / "login.html")


@app.get("/register", include_in_schema=False)
def serve_register():
    return FileResponse(frontend_dir / "register.html")
