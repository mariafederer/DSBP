# Digital Software Building System

A full-stack web application with a FastAPI backend and a vanilla JavaScript frontend. The app supports user registration, login, project and task management, threaded comments with @mentions, and per-user notifications. Data is stored in an SQL (SQLite) database. 

## Features

- User registration and JWT-based login
- Create and delete projects
- Project visibility controls (public, private, or selected collaborators)
- Create, update, and delete tasks within projects
- Threaded task comments with support for `@username` mentions
- Notifications panel where mentioned users can mark notifications as read
- Mark comments as solved

## Project Structure

```
app/            # FastAPI application
frontend/       # Static frontend assets (HTML, CSS, JS)
data/           # SQLite database location
requirements.txt
```

Then open http://localhost:8000/login in your browser to sign in (or /register to create a new account).

## Development


```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The frontend is served automatically from the `frontend/` directory by FastAPI's static files support.
