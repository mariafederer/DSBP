# DSBP - Development Software Board Platform

DSBP is a web-based software development management workflow platform, similar to a Kanban board system. It provides Task Decomposition Board functionality to help teams collaborate and manage project tasks.

## Key Features

- ✅ **User Authentication and License Management**
  - Free users can use up to 3 task boards
  - Paid users have unlimited task boards
  - JWT-based authentication system

- ✅ **Project Space Management**
  - Create and manage projects
  - Invite team members to project spaces via email
  - Project member permission management

- ✅ **Task Decomposition Board**
  - Three states: TODO, In Progress, DONE
  - Users within the same project space can add, delete, and update tasks
  - Tasks can be assigned to team members

- ✅ **PostgreSQL Database**
  - Complete user information management
  - Persistent storage for projects, task boards, and tasks

- ✅ **Clean User Interface**
  - Modern React-based frontend
  - Responsive design

## Tech Stack

### Backend
- **Python 3.9+**
- **FastAPI** - Modern, fast web framework
- **SQLAlchemy** - ORM
- **PostgreSQL** - Database
- **Alembic** - Database migrations
- **JWT** - Authentication

### Frontend
- **React 18**
- **Vite** - Build tool
- **Redux** - State management
- **React Router** - Routing

## Project Structure

```
DSBP/
├── backend/                 # Python backend
│   ├── api/                 # API routes
│   │   └── v1/              # API v1 version
│   ├── models/               # Database models
│   ├── schemas/              # Pydantic schemas
│   ├── utils/                # Utility functions
│   ├── db/                   # Database utilities
│   ├── config.py             # Configuration
│   ├── database.py           # Database connection
│   └── main.py               # Application entry point
├── client/                   # React frontend
│   └── src/
│       ├── api/              # API client
│       ├── components/       # React components
│       └── ...
├── alembic/                  # Database migrations
├── requirements.txt          # Python dependencies
├── env.example               # Environment variables example
└── README.md                 # This document
```

## Installation and Configuration

### Prerequisites

- Python 3.9 or higher
- Node.js 16 or higher
- PostgreSQL 12 or higher
- npm or yarn

### 1. Clone the Project

```bash
cd DSBP
```

### 2. Set Up Python Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Database

Create PostgreSQL database:

```sql
CREATE DATABASE dsbp_db;
CREATE USER dsbp_user WITH PASSWORD 'dsbp_password';
GRANT ALL PRIVILEGES ON DATABASE dsbp_db TO dsbp_user;
```

### 4. Configure Environment Variables

Copy the environment variables example file:

```bash
cp env.example .env
```

Edit the `.env` file and set the following configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://dsbp_user:dsbp_password@localhost:5432/dsbp_db

# JWT Secret Key (use a strong key in production)
JWT_SECRET_KEY=your-secret-key-change-this-in-production

# Application Configuration
DEBUG=True
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Email Configuration (for sending invitations)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@dsbp.com
```

### 5. Initialize Database

```bash
# Create database tables
python -m backend.db.init_db

# Create admin user (optional)
python -m backend.db.create_admin admin@example.com admin password123
```

### 6. Set Up Frontend

```bash
cd client

# Install dependencies
npm install

# Create environment variables file
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
```

## Running the Application

### Development Mode

**Backend:**

```bash
# In the project root directory
python run.py
```

Backend will run at `http://localhost:8000`

**Frontend:**

```bash
cd client
npm run dev
```

Frontend will run at `http://localhost:5173`

### Production Mode

**Build Frontend:**

```bash
cd client
npm run build
```

**Run Backend (Production Mode):**

```bash
# Set environment variable
export DEBUG=False

# Run
python run.py
```

## API Documentation

After starting the backend, visit the following URLs to view API documentation:

- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

## Main API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user information

### Projects

- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create a project
- `GET /api/projects/{id}` - Get project details
- `PATCH /api/projects/{id}` - Update a project
- `DELETE /api/projects/{id}` - Delete a project

### Task Boards

- `GET /api/task-boards/project/{project_id}` - Get all task boards for a project
- `POST /api/task-boards` - Create a task board
- `GET /api/task-boards/{id}` - Get task board details
- `PATCH /api/task-boards/{id}` - Update a task board
- `DELETE /api/task-boards/{id}` - Delete a task board

### Tasks

- `GET /api/tasks/board/{board_id}` - Get all tasks for a board
- `POST /api/tasks` - Create a task
- `GET /api/tasks/{id}` - Get task details
- `PATCH /api/tasks/{id}` - Update a task
- `DELETE /api/tasks/{id}` - Delete a task

### Invitations

- `POST /api/invitations` - Create and send an invitation
- `GET /api/invitations/project/{project_id}` - Get all invitations for a project
- `POST /api/invitations/accept/{token}` - Accept an invitation

## User Guide

### 1. Registration and Login

1. Visit the frontend application
2. Click "Register" to create a new account
3. Fill in email, username, and password
4. Automatically logged in after successful registration

### 2. Create a Project

1. After logging in, click "Create Project"
2. Enter project name and description
3. Click "Create"

### 3. Create a Task Board

1. On the project page, click "Create Task Board"
2. Enter task board name
3. Note: Free users can create up to 3 task boards

### 4. Add Tasks

1. In the task board, click "Add Task"
2. Enter task title and description
3. Select task status (TODO, In Progress, DONE)
4. Optional: Assign to team members

### 5. Invite Team Members

1. In project settings, click "Invite Member"
2. Enter the email address to invite
3. The system will send an invitation email
4. The invited user clicks the link in the email to accept the invitation

### 6. Manage Tasks

- **Move task status**: Drag task cards to different status columns
- **Edit task**: Click on task card to edit
- **Delete task**: Click delete in task details

## License Management

### Free Users

- Can create up to 3 task boards
- Can join unlimited projects (as a member)
- All basic features available

### Paid Users

- Unlimited task board creation
- All features available
- Priority support

To upgrade to the paid version, please contact the administrator.

## Database Migrations

Use Alembic for database migrations:

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Troubleshooting

### Database Connection Errors

- Check if PostgreSQL service is running
- Verify `DATABASE_URL` configuration in `.env` file
- Confirm database user permissions

### Authentication Errors

- Check if JWT_SECRET_KEY is set
- Confirm token is not expired
- Clear token from browser localStorage

### Email Sending Failures

- Check SMTP configuration
- For Gmail, use an app-specific password
- Check firewall settings

## Development Guide

### Adding New API Endpoints

1. Create a new route file in `backend/api/v1/`
2. Define request/response models in `backend/schemas/`
3. Define database models in `backend/models/` (if needed)
4. Register routes in `backend/api/v1/__init__.py`

### Frontend Development

Frontend code is located in the `client/` directory. Main structure:

- `src/api/` - API client
- `src/components/` - React components
- `src/store/` - Redux store and reducers

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

If you have questions or suggestions, please create an Issue.

## Changelog

### v1.0.0 (2024)

- Initial release
- User authentication and license management
- Project space management
- Task decomposition board functionality
- Email invitation feature
