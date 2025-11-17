import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.api.routes as routes
import app.models as models
import app.schemas as schemas
import app.services.auth as auth
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


def test_user_registration_creates_hashed_password(db_session: Session):
    user = _register_user(db_session, "alice", "alice@example.com", password="secret123")
    assert user.username == "alice"
    assert user.email == "alice@example.com"
    assert user.hashed_password != "secret123"
    assert auth.verify_password("secret123", user.hashed_password)


def test_user_registration_prevents_duplicate_usernames(db_session: Session):
    _register_user(db_session, "bob", "bob@example.com")

    with pytest.raises(HTTPException) as exc:
        _register_user(db_session, "bob", "bob2@example.com")
    assert exc.value.status_code == 400
    assert exc.value.detail == "Username already registered"


def test_user_registration_prevents_duplicate_emails(db_session: Session):
    _register_user(db_session, "carol", "carol@example.com")

    with pytest.raises(HTTPException) as exc:
        _register_user(db_session, "carol2", "carol@example.com")
    assert exc.value.status_code == 400
    assert exc.value.detail == "Email already registered"


def test_user_login_returns_bearer_token(db_session: Session):
    _register_user(db_session, "dave", "dave@example.com", password="strongpass")

    token = routes.login(schemas.UserLogin(username="dave", password="strongpass"), db_session)
    assert token.access_token
    assert token.token_type == "bearer"


def test_user_login_rejects_invalid_password(db_session: Session):
    _register_user(db_session, "erin", "erin@example.com", password="strongpass")

    with pytest.raises(HTTPException) as exc:
        routes.login(schemas.UserLogin(username="erin", password="wrong"), db_session)
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid credentials"


def test_user_login_rejects_unknown_user(db_session: Session):
    _register_user(db_session, "frank", "frank@example.com", password="strongpass")

    with pytest.raises(HTTPException) as exc:
        routes.login(schemas.UserLogin(username="ghost", password="whatever"), db_session)
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid credentials"


def test_dependency_map_returns_chains_and_edges(db_session: Session):
    owner = _register_user(db_session, "grace", "grace@example.com")
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


def test_dependency_map_returns_empty_structure_when_user_has_no_tasks(db_session: Session):
    owner = _register_user(db_session, "henry", "henry@example.com")

    dependency_map = routes.dependency_map(db_session, owner)

    assert dependency_map.tasks == []
    assert dependency_map.edges == []
    assert dependency_map.chains == []
    assert dependency_map.convergences == []


def test_dependency_map_identifies_convergences(db_session: Session):
    owner = _register_user(db_session, "irene", "irene@example.com")
    project = _create_project(db_session, owner, name="Infra")

    task_a = _create_task(db_session, owner, project, "Plan")
    task_b = _create_task(db_session, owner, project, "Build")
    task_c = _create_task(db_session, owner, project, "Review")

    dep_inputs = [
        schemas.TaskDependencyCreate(depends_on_task_id=task_a.id, dependent_task_id=task_c.id),
        schemas.TaskDependencyCreate(depends_on_task_id=task_b.id, dependent_task_id=task_c.id),
    ]
    for dependency_in in dep_inputs:
        routes.create_task_dependency(dependency_in, db_session, owner)

    dependency_map = routes.dependency_map(db_session, owner)

    assert len(dependency_map.convergences) == 1
    convergence = dependency_map.convergences[0]
    assert convergence.target.title == "Review"
    assert sorted(task.title for task in convergence.sources) == ["Build", "Plan"]


def test_notifications_created_from_mentions(db_session: Session):
    owner = _register_user(db_session, "jack", "jack@example.com")
    guest = _register_user(db_session, "kate", "kate@example.com")

    project = _create_project(db_session, owner, name="Docs")
    task = _create_task(db_session, owner, project, "Write docs")

    comment_in = schemas.CommentCreate(task_id=task.id, content=f"Heads up @{guest.username}")
    routes.create_comment(comment_in, db_session, owner)

    notifications = routes.list_notifications(db_session, guest)
    assert len(notifications) == 1
    notification = notifications[0]
    assert notification.message.startswith(f"{owner.username} mentioned you")
    assert notification.task_id == task.id

    updated = routes.mark_notification_read(notification.id, db_session, guest)
    assert updated.read is True


def test_notifications_ignore_self_mentions(db_session: Session):
    owner = _register_user(db_session, "liam", "liam@example.com")

    project = _create_project(db_session, owner, name="Website")
    task = _create_task(db_session, owner, project, "Deploy")

    comment_in = schemas.CommentCreate(task_id=task.id, content="Reminder for @liam")
    routes.create_comment(comment_in, db_session, owner)

    notifications = routes.list_notifications(db_session, owner)
    assert notifications == []


def test_mark_notification_read_restricted_to_recipient(db_session: Session):
    owner = _register_user(db_session, "maria", "maria@example.com")
    guest = _register_user(db_session, "nate", "nate@example.com")
    outsider = _register_user(db_session, "oliver", "oliver@example.com")

    project = _create_project(db_session, owner, name="Handbook")
    task = _create_task(db_session, owner, project, "Draft")

    comment_in = schemas.CommentCreate(task_id=task.id, content="Ping @nate")
    routes.create_comment(comment_in, db_session, owner)

    notification = routes.list_notifications(db_session, guest)[0]

    with pytest.raises(HTTPException) as exc:
        routes.mark_notification_read(notification.id, db_session, outsider)
    assert exc.value.status_code == 404
    assert exc.value.detail == "Notification not found"


def test_project_private_visibility_ignores_shared_users(db_session: Session):
    owner = _register_user(db_session, "paula", "paula@example.com")
    guest = _register_user(db_session, "quentin", "quentin@example.com")

    project_in = schemas.ProjectCreate(
        name="Roadmap",
        description="",
        visibility="private",
        shared_usernames=[guest.username],
    )
    project = routes.create_project(project_in, db_session, owner)

    assert project.visibility == "private"
    assert project.shared_users == []

    guest_projects = routes.list_projects(db_session, guest)
    assert guest_projects == []


def test_project_selected_visibility_requires_known_users(db_session: Session):
    owner = _register_user(db_session, "rachel", "rachel@example.com")

    project_in = schemas.ProjectCreate(
        name="Playbook",
        description="",
        visibility="selected",
        shared_usernames=["unknown"],
    )

    with pytest.raises(HTTPException) as exc:
        routes.create_project(project_in, db_session, owner)
    assert exc.value.status_code == 400
    assert "Unknown users" in exc.value.detail


def test_project_visibility_update_clears_shared_users_when_opening_access(db_session: Session):
    owner = _register_user(db_session, "sara", "sara@example.com")
    guest = _register_user(db_session, "tom", "tom@example.com")

    project = routes.create_project(
        schemas.ProjectCreate(
            name="Campaign",
            description="",
            visibility="selected",
            shared_usernames=[guest.username],
        ),
        db_session,
        owner,
    )

    assert len(project.shared_users) == 1

    updated = routes.update_project(
        project.id,
        schemas.ProjectUpdate(visibility="all"),
        db_session,
        owner,
    )

    assert updated.visibility == "all"
    assert updated.shared_users == []
