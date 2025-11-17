import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.api.routes as routes
import app.models as models
import app.schemas as schemas
from app.core.database import Base

TEST_DATABASE_URL = "sqlite://"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def db_session() -> Session:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def _register_user(session: Session, username: str, email: str, password: str = "secret123") -> models.User:
    user_in = schemas.UserCreate(username=username, email=email, password=password)
    return routes.register(user_in, session)


def _create_project(session: Session, owner: models.User, name: str = "Demo Project"):
    project_in = schemas.ProjectCreate(name=name, description="", visibility="all", shared_usernames=[])
    return routes.create_project(project_in, session, owner)


def _create_task(session: Session, owner: models.User, project: models.Project, title: str):
    task_in = schemas.TaskCreate(
        title=title,
        description="",
        status="new_task",
        project_id=project.id,
        assignee_ids=[],
    )
    return routes.create_task(task_in, session, owner)


def test_user_registration_prevents_duplicates(db_session: Session):
    user = _register_user(db_session, "alice", "alice@example.com")
    assert user.username == "alice"
    assert user.email == "alice@example.com"

    with pytest.raises(HTTPException) as exc:
        _register_user(db_session, "alice", "alice2@example.com")
    assert exc.value.status_code == 400
    assert exc.value.detail == "Username already registered"


def test_user_login_returns_access_token(db_session: Session):
    _register_user(db_session, "bob", "bob@example.com", password="strongpass")

    token = routes.login(schemas.UserLogin(username="bob", password="strongpass"), db_session)
    assert token.access_token
    assert token.token_type == "bearer"

    with pytest.raises(HTTPException) as exc:
        routes.login(schemas.UserLogin(username="bob", password="wrong"), db_session)
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid credentials"


def test_dependency_map_returns_chains_and_edges(db_session: Session):
    owner = _register_user(db_session, "carol", "carol@example.com")
    project = _create_project(db_session, owner, name="Backend")

    task_setup = _create_task(db_session, owner, project, "Setup")
    task_build = _create_task(db_session, owner, project, "Build")
    task_test = _create_task(db_session, owner, project, "Test")

    dep_inputs = [
        schemas.TaskDependencyCreate(depends_on_task_id=task_setup.id, dependent_task_id=task_build.id),
        schemas.TaskDependencyCreate(depends_on_task_id=task_build.id, dependent_task_id=task_test.id),
    ]
    for dependency_in in dep_inputs:
        routes.create_task_dependency(dependency_in, db_session, owner)

    dependency_map = routes.dependency_map(db_session, owner)

    assert len(dependency_map.tasks) == 3
    assert len(dependency_map.edges) == 2
    assert dependency_map.chains
    chain_titles = [task.title for task in dependency_map.chains[0].tasks]
    assert chain_titles == ["Setup", "Build", "Test"]


def test_notifications_created_from_mentions(db_session: Session):
    owner = _register_user(db_session, "owner", "owner@example.com")
    guest = _register_user(db_session, "guest", "guest@example.com")

    project = _create_project(db_session, owner, name="Docs")
    task = _create_task(db_session, owner, project, "Write docs")

    comment_in = schemas.CommentCreate(task_id=task.id, content="Heads up @guest")
    routes.create_comment(comment_in, db_session, owner)

    notifications = routes.list_notifications(db_session, guest)
    assert len(notifications) == 1
    notification = notifications[0]
    assert notification.message.startswith("owner mentioned you")
    assert notification.task_id == task.id

    updated = routes.mark_notification_read(notification.id, db_session, guest)
    assert updated.read is True
