"""API routes for the DSBP Kanban backend."""

import re
from datetime import timedelta
from typing import Dict, Iterable, List, Optional, Set

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

import app.models as models
import app.schemas as schemas
from app.core.config import FRONTEND_PUBLIC_DIR
from app.core.database import get_db
from app.services import auth

router = APIRouter()

# mention pattern for @username for find users
MENTION_PATTERN = re.compile(r"@(?P<username>[A-Za-z0-9_\.\-]+)")


def parse_mentions(content: str, db: Session) -> List[models.User]:
    """Extract all mentioned users from the supplied content string."""
    usernames = {match.group("username") for match in MENTION_PATTERN.finditer(content)}
    if not usernames:
        return []
    return db.query(models.User).filter(models.User.username.in_(usernames)).all()


def user_can_access_project(project: models.Project, user: models.User) -> bool:
    """Return True if the provided user may view the given project."""
    if project.owner_id == user.id:
        return True
    if project.visibility == "all":
        return True
    if project.visibility == "selected":
        return any(shared_user.id == user.id for shared_user in project.shared_users)
    return False


def ensure_project_access(project_id: int, db: Session, user: models.User) -> models.Project:
    """Fetch a project and ensure the current user is allowed to access it."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if not user_can_access_project(project, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this project")
    return project


def accessible_projects_filter(user: models.User):
    """SQLAlchemy filter expression for all projects accessible to a user."""
    return or_(
        models.Project.owner_id == user.id,
        models.Project.visibility == "all",
        models.Project.shared_users.any(models.User.id == user.id),
    )


def ensure_task_access(task_id: int, db: Session, user: models.User) -> models.Task:
    """Fetch a task and verify the current user is allowed to interact with it."""
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if not user_can_access_project(task.project, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this task")
    return task


def apply_project_visibility(
    project: models.Project, visibility: str, shared_usernames: Optional[Iterable[str]], db: Session
) -> None:
    """Update a project's visibility mode and synchronize shared users."""
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


# --- Authentication endpoints -------------------------------------------------

@router.post("/auth/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """Create a new user after confirming username and email uniqueness."""
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


@router.post("/auth/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate a user and return a freshly minted access token."""
    user = db.query(models.User).filter(models.User.username == credentials.username).first()
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = auth.create_access_token(data={"sub": user.username}, expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES))
    return schemas.Token(access_token=access_token)


# --- User endpoints -----------------------------------------------------------

@router.get("/users/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(auth.get_current_user)):
    """Return the profile for the currently authenticated user."""
    return current_user


@router.get("/users", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """List all registered users, ordered alphabetically."""
    return (
        db.query(models.User)
        .order_by(models.User.username.asc())
        .all()
    )


# --- Project endpoints --------------------------------------------------------

@router.get("/projects", response_model=List[schemas.ProjectOut])
def list_projects(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Return the projects visible to the current user."""
    projects = (
        db.query(models.Project)
        .filter(accessible_projects_filter(current_user))
        .distinct()
        .order_by(models.Project.created_at.desc())
        .all()
    )
    return projects


@router.post("/projects", response_model=schemas.ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Create a project owned by the current user with the requested visibility."""
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


@router.patch("/projects/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int,
    project_update: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Update mutable project fields and optionally its visibility scope."""
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


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Remove a project that belongs to the current user."""
    project = db.query(models.Project).filter(models.Project.id == project_id, models.Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    db.delete(project)
    db.commit()


# --- Task endpoints -----------------------------------------------------------

@router.get("/projects/{project_id}/tasks", response_model=List[schemas.TaskOut])
def list_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """List all tasks for a project, enforcing project access control."""
    project = ensure_project_access(project_id, db, current_user)
    return db.query(models.Task).filter(models.Task.project_id == project.id).all()


@router.get("/tasks", response_model=List[schemas.TaskOut])
def list_all_accessible_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Return every task across projects the user is allowed to see."""
    tasks = (
        db.query(models.Task)
        .join(models.Project)
        .filter(accessible_projects_filter(current_user))
        .distinct()
        .order_by(models.Task.created_at.desc())
        .all()
    )
    return tasks


@router.post("/tasks", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Create a task inside a project the user can access and set assignees."""
    project = ensure_project_access(task_in.project_id, db, current_user)
    task = models.Task(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        project_id=project.id,
        due_date=task_in.due_date,
    )
    db.add(task)
    db.flush()
    
    # Add assignees
    if task_in.assignee_ids:
        assignees = db.query(models.User).filter(models.User.id.in_(task_in.assignee_ids)).all()
        task.assignees = assignees
    
    db.commit()
    db.refresh(task)
    return task


@router.patch("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    task_update: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Apply partial updates to a task and optionally reset its assignees."""
    task = ensure_task_access(task_id, db, current_user)
    
    update_data = task_update.dict(exclude_unset=True)
    assignee_ids = update_data.pop("assignee_ids", None)
    
    for field, value in update_data.items():
        setattr(task, field, value)
    
    # Update assignees if provided
    if assignee_ids is not None:
        assignees = db.query(models.User).filter(models.User.id.in_(assignee_ids)).all()
        task.assignees = assignees
    
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Remove a task after verifying the user may access it."""
    task = ensure_task_access(task_id, db, current_user)
    db.delete(task)
    db.commit()


def _dependency_summary(task: models.Task) -> schemas.TaskSummary:
    """Build a display-friendly summary object for the provided task."""
    project_name = task.project.name if task.project else "Unknown"
    return schemas.TaskSummary(
        id=task.id,
        title=task.title,
        project_id=task.project_id,
        project_name=project_name,
    )


def _build_dependency_map(tasks: List[models.Task], dependencies: List[models.TaskDependency]):
    """Assemble nodes, edges, linear chains, and convergences for the graph view."""
    summaries: Dict[int, schemas.TaskSummary] = {task.id: _dependency_summary(task) for task in tasks}
    indegree: Dict[int, int] = {task.id: 0 for task in tasks}
    outdegree: Dict[int, int] = {task.id: 0 for task in tasks}
    adjacency: Dict[int, List[int]] = {task.id: [] for task in tasks}
    reverse_adj: Dict[int, List[int]] = {task.id: [] for task in tasks}
    edges: List[schemas.DependencyEdgeOut] = []

    for dep in dependencies:
        if dep.depends_on_task_id not in summaries or dep.dependent_task_id not in summaries:
            continue
        # Prevent adding duplicate edges if data is dirty, though DB constraint should handle this
        if dep.dependent_task_id not in adjacency[dep.depends_on_task_id]:
            adjacency[dep.depends_on_task_id].append(dep.dependent_task_id)
            reverse_adj[dep.dependent_task_id].append(dep.depends_on_task_id)
            outdegree[dep.depends_on_task_id] += 1
            indegree[dep.dependent_task_id] += 1
            
        edges.append(
            schemas.DependencyEdgeOut(
                id=dep.id,
                depends_on=summaries[dep.depends_on_task_id],
                dependent=summaries[dep.dependent_task_id],
            )
        )

    # --- START: FIXED CHAIN-FINDING LOGIC ---
    
    chains: List[schemas.DependencyChainOut] = []
    visited_nodes: Set[int] = set()  # Tracks nodes *already part of a chain*

    for task in tasks:
        task_id = task.id
        if task_id in visited_nodes:
            continue  # This node is already part of a chain we found

        # A "chain head" is a node that is NOT a "middle" link.
        # A "middle" link is: indegree == 1 AND its predecessor also has outdegree == 1
        is_middle_link = False
        if indegree.get(task_id, 0) == 1:
            predecessor_id = reverse_adj[task_id][0]
            if outdegree.get(predecessor_id, 0) == 1:
                is_middle_link = True

        # We only start tracing from a "true" head, not a middle link.
        # We also must have an outdegree of 1 to start a chain.
        if not is_middle_link and outdegree.get(task_id, 0) == 1:
            chain_ids = [task_id]
            visited_nodes.add(task_id)
            current = task_id

            # Start tracing the chain
            while outdegree.get(current, 0) == 1:
                nxt = adjacency[current][0]
                
                # The chain continues *only if* the next node is also a linear link
                if indegree.get(nxt, 0) == 1:
                    if nxt in chain_ids:
                         break # Cycle detected, though your create endpoint should prevent this
                    chain_ids.append(nxt)
                    visited_nodes.add(nxt)
                    current = nxt
                else:
                    # Next node is a convergence (indegree > 1) or end (indegree = 0, impossible)
                    # so the linear chain ends here.
                    break 

            if len(chain_ids) > 1:
                chains.append(
                    schemas.DependencyChainOut(tasks=[summaries[node_id] for node_id in chain_ids])
                )
    
    # --- END: FIXED CHAIN-FINDING LOGIC ---

    # Your convergence logic was already correct and requires no changes.
    convergences: List[schemas.DependencyConvergenceOut] = []
    for task in tasks:
        task_id = task.id
        sources = reverse_adj.get(task_id, [])
        if len(sources) > 1:
            convergences.append(
                schemas.DependencyConvergenceOut(
                    target=summaries[task_id],
                    sources=[summaries[source_id] for source_id in sources],
                )
            )

    return schemas.DependencyMapOut(
        tasks=list(summaries.values()),
        edges=edges,
        chains=chains,
        convergences=convergences,
    )


def _creates_dependency_cycle(
    db: Session, depends_on_task_id: int, dependent_task_id: int
) -> bool:
    """Depth-first search to ensure new dependency edges do not form a cycle."""
    stack = [dependent_task_id]
    visited: Set[int] = set()
    while stack:
        current = stack.pop()
        if current == depends_on_task_id:
            return True
        if current in visited:
            continue
        visited.add(current)
        next_tasks = (
            db.query(models.TaskDependency.dependent_task_id)
            .filter(models.TaskDependency.depends_on_task_id == current)
            .all()
        )
        stack.extend(dep_id for (dep_id,) in next_tasks)
    return False


# --- Dependency graph endpoints ----------------------------------------------

@router.post("/task-dependencies", response_model=schemas.TaskDependencyOut, status_code=status.HTTP_201_CREATED)
def create_task_dependency(
    dependency_in: schemas.TaskDependencyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Create a dependency edge after validating access, uniqueness, and acyclicity."""
    dependent_task = ensure_task_access(dependency_in.dependent_task_id, db, current_user)
    depends_on_task = ensure_task_access(dependency_in.depends_on_task_id, db, current_user)

    if dependent_task.id == depends_on_task.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task cannot depend on itself")

    existing = (
        db.query(models.TaskDependency)
        .filter(
            models.TaskDependency.dependent_task_id == dependent_task.id,
            models.TaskDependency.depends_on_task_id == depends_on_task.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dependency already exists")

    if _creates_dependency_cycle(db, depends_on_task.id, dependent_task.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dependency would create a cycle")

    dependency = models.TaskDependency(
        dependent_task_id=dependent_task.id,
        depends_on_task_id=depends_on_task.id,
    )
    db.add(dependency)
    db.commit()
    db.refresh(dependency)
    return dependency


@router.delete("/task-dependencies/{dependency_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_dependency(
    dependency_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Delete a dependency edge if it exists and the user can access both tasks."""
    dependency = db.query(models.TaskDependency).filter(models.TaskDependency.id == dependency_id).first()
    if not dependency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dependency not found")

    ensure_task_access(dependency.dependent_task_id, db, current_user)
    ensure_task_access(dependency.depends_on_task_id, db, current_user)

    db.delete(dependency)
    db.commit()


@router.get("/dependency-map", response_model=schemas.DependencyMapOut)
def dependency_map(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Return the dependency graph focused on tasks accessible to the user."""
    tasks = (
        db.query(models.Task)
        .join(models.Project)
        .filter(accessible_projects_filter(current_user))
        .distinct()
        .all()
    )
    if not tasks:
        return schemas.DependencyMapOut(tasks=[], edges=[], chains=[], convergences=[])

    dependencies = (
        db.query(models.TaskDependency)
        .join(models.Task, models.TaskDependency.dependent_task)
        .join(models.Project)
        .filter(accessible_projects_filter(current_user))
        .all()
    )
    return _build_dependency_map(tasks, dependencies)


# --- Comment and notification endpoints --------------------------------------

@router.get("/tasks/{task_id}/comments", response_model=List[schemas.CommentOut])
def list_comments(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Return the top-level comments for a task the user can access."""
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


@router.post("/comments", response_model=schemas.CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(
    comment_in: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Create a comment (optionally threaded) and notify mentioned users."""
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


@router.post("/comments/{comment_id}/solve", response_model=schemas.CommentOut)
def solve_comment(comment_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Mark a comment thread as resolved if the user has sufficient rights."""
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


@router.get("/notifications", response_model=List[schemas.NotificationOut])
def list_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """List notifications for the current user in reverse chronological order."""
    notifications = (
        db.query(models.Notification)
        .filter(models.Notification.recipient_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .all()
    )
    return notifications


@router.post("/notifications/{notification_id}/read", response_model=schemas.NotificationOut)
def mark_notification_read(notification_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Mark an individual notification as read."""
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


# --- Frontend routes ---------------------------------------------------------

@router.get("/", include_in_schema=False)
def serve_frontend():
    """Serve the compiled SPA index page."""
    index_path = FRONTEND_PUBLIC_DIR / "index.html"
    return FileResponse(index_path)


@router.get("/login", include_in_schema=False)
def serve_login():
    """Serve the standalone login HTML page."""
    return FileResponse(FRONTEND_PUBLIC_DIR / "login.html")


@router.get("/register", include_in_schema=False)
def serve_register():
    """Serve the standalone registration HTML page."""
    return FileResponse(FRONTEND_PUBLIC_DIR / "register.html")