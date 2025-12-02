<div align="center">

# TaskFlow

**Multi-User Task Management Application**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://docker.com/)

</div>

---

## About

TaskFlow is a containerized full-stack task management application featuring multi-user authentication, role-based access control, and RESTful API design. The project demonstrates modern web development practices including JWT authentication, input validation, database ORM patterns, and Docker orchestration.

---

## Features

### Core Functionality
- Full CRUD operations for task management
- Task organization with priority levels, status tracking, and categories
- Date-based scheduling with start and end dates
- User-specific task isolation

### Authentication & Security
- User registration and login with JWT-based authentication
- Password hashing using bcrypt
- Role-based access control (Admin / User)
- Input validation via Pydantic schemas
- Request logging middleware

### Administration
- User management dashboard
- System-wide statistics
- Role assignment capabilities
- User deletion with cascade

### Infrastructure
- Containerized microservices architecture
- Nginx reverse proxy for request routing
- PostgreSQL database with persistent volumes
- Environment-based configuration

---

## Architecture

```
                              ┌─────────────────┐
                              │     Client      │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │      Nginx      │
                              │    (Port 80)    │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
           ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
           │   Frontend    │  │    Backend    │  │  API Docs     │
           │  (React SPA)  │  │   (FastAPI)   │  │  (/docs)      │
           └───────────────┘  └───────┬───────┘  └───────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │  PostgreSQL   │
                              │  (Port 5432)  │
                              └───────────────┘
```

### Request Routing
| Path | Destination |
|------|-------------|
| `/api/*` | FastAPI Backend |
| `/docs`, `/redoc` | API Documentation |
| `/*` | React Frontend |

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register a new user account |
| `POST` | `/auth/login` | Authenticate and retrieve JWT token |
| `GET` | `/auth/me` | Retrieve current user profile |

### Task Endpoints (Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/todos` | Retrieve all tasks for authenticated user |
| `GET` | `/todos/{id}` | Retrieve a specific task by ID |
| `POST` | `/todos` | Create a new task |
| `PUT` | `/todos/{id}` | Update an existing task |
| `DELETE` | `/todos/{id}` | Delete a task |
| `GET` | `/stats` | Retrieve task statistics |

### Admin Endpoints (Admin Role Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/users` | Retrieve all registered users |
| `GET` | `/admin/users/{id}` | Retrieve user details by ID |
| `GET` | `/admin/users/{id}/todos` | Retrieve tasks for a specific user |
| `DELETE` | `/admin/users/{id}` | Delete a user account |
| `PUT` | `/admin/users/{id}/role` | Toggle administrator role |
| `GET` | `/admin/stats` | Retrieve system-wide statistics |

### Documentation Endpoints

| Endpoint | Description |
|----------|-------------|
| `/docs` | Swagger UI interactive documentation |
| `/redoc` | ReDoc API documentation |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ToDoAPI
   ```

2. **Configure environment variables**
   
   Create a `.env` file in the project root:
   ```env
   DB_USER=todouser
   DB_PASSWORD=todopass
   DB_NAME=tododb
   SECRET_KEY=<generate-a-secure-key>
   ALGORITHM=HS256
   ```

   **Generating values:**
   | Variable | How to set |
   |----------|------------|
   | `DB_USER` | Choose any username for the database |
   | `DB_PASSWORD` | Choose a strong password for the database |
   | `DB_NAME` | Choose any name for the database |
   | `SECRET_KEY` | Generate using command below |
   | `ALGORITHM` | Keep as `HS256` (JWT signing algorithm) |

   **Generate a secure SECRET_KEY:**
   ```bash
   # Using OpenSSL (recommended)
   openssl rand -hex 32

   # Or using Python
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
   Copy the output and paste it as the `SECRET_KEY` value.

3. **Build and start the containers**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   | Service | URL |
   |---------|-----|
   | Frontend | http://localhost |
   | API Documentation | http://localhost/docs |
   | Backend (Direct) | http://localhost:8000 |

### Shutdown

```bash
# Stop containers
docker-compose down

# Stop containers and remove volumes
docker-compose down -v
```

---

## Project Structure

```
TaskFlow/
├── backend/
│   ├── main.py              # Application entry point, routes, middleware
│   ├── models.py            # SQLAlchemy ORM models
│   ├── database.py          # Database connection configuration
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Root React component
│   │   ├── components/      # UI components
│   │   ├── context/         # Authentication context provider
│   │   └── services/        # API service layer
│   └── Dockerfile
├── nginx/
│   ├── nginx.conf           # Reverse proxy configuration
│   └── Dockerfile
├── docker-compose.yml       # Container orchestration
└── .env                     # Environment variables
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React, TypeScript | User interface |
| Styling | TailwindCSS | Utility-first CSS framework |
| Backend | FastAPI | High-performance Python web framework |
| Validation | Pydantic | Data validation and serialization |
| ORM | SQLAlchemy | Database abstraction layer |
| Database | PostgreSQL | Relational data storage |
| Authentication | python-jose, bcrypt | JWT tokens and password hashing |
| Proxy | Nginx | Reverse proxy and static file serving |
| Containerization | Docker, Docker Compose | Service orchestration |

---


