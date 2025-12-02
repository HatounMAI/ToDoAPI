from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List, Dict
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import time
import logging
import secrets

# Database imports
from database import get_db, engine
import models

# ============= LOGGING CONFIGURATION =============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# ============= AUTHENTICATION CONFIGURATION =============
SECRET_KEY = "your-secret-key-change-in-production-use-openssl-rand-hex-32"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Bearer token
security = HTTPBearer()


# ============= AUTH UTILITIES =============
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    # Bcrypt has a 72-byte limit, truncate if necessary
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    # Convert sub to string if it's an integer (JWT spec requires string)
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        logger.info(f"[AUTH] Token decoded successfully, payload: {payload}")
        return payload
    except JWTError as e:
        logger.error(f"[AUTH] Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============= MIDDLEWARE =============
class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging all API requests"""
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        logger.info(f"Request: {request.method} {request.url.path}")
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            logger.info(f"Response: {response.status_code} | Time: {process_time:.4f}s")
            response.headers["X-Process-Time"] = str(process_time)
            return response
        except Exception as e:
            logger.error(f"Error: {str(e)}")
            raise


# ============= USER AUTHENTICATION MODELS =============
class UserCreate(BaseModel):
    """Model for user registration"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)


class UserLogin(BaseModel):
    """Model for user login"""
    username: str
    password: str


class UserResponse(BaseModel):
    """Model for user response"""
    id: int
    username: str
    email: str
    is_admin: bool
    is_active: bool
    email_verified: bool
    created_at: datetime


class TokenResponse(BaseModel):
    """Model for JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserInDB(BaseModel):
    """Internal user model with hashed password"""
    id: int
    username: str
    email: str
    hashed_password: str
    is_admin: bool = False
    is_active: bool = True
    email_verified: bool = True  # Auto-verified for mock
    created_at: datetime
    email_verification_token: Optional[str] = None


# ============= TODO MODELS (VALIDATION) =============
class TodoBase(BaseModel):
    """Base Pydantic model for Todo with validation"""
    title: str = Field(..., min_length=1, max_length=200, description="Todo title (required)")
    description: Optional[str] = Field(None, max_length=1000, description="Todo description (optional)")
    completed: bool = Field(default=False, description="Completion status")
    status: str = Field(default='todo', description="Status: todo, in-progress, done, blocked")
    priority: str = Field(default='medium', description="Priority: low, medium, high")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    category: str = Field(default='General', description="Category/tag for the todo")

    @validator('title')
    def title_must_not_be_empty(cls, v):
        if not v or v.strip() == "":
            raise ValueError('Title cannot be empty')
        return v.strip()


class TodoCreate(TodoBase):
    """Model for creating a new Todo"""
    pass


class TodoUpdate(BaseModel):
    """Model for updating a Todo - all fields optional"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    completed: Optional[bool] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    category: Optional[str] = None

    @validator('title')
    def title_must_not_be_empty(cls, v):
        if v is not None and (not v or v.strip() == ""):
            raise ValueError('Title cannot be empty')
        return v.strip() if v else v


class TodoResponse(BaseModel):
    """Model for Todo response"""
    id: int
    user_id: int
    title: str
    description: Optional[str]
    completed: bool
    status: str
    priority: str
    start_date: Optional[str]
    end_date: Optional[str]
    category: str
    created_at: datetime
    updated_at: datetime


# ============= DATABASE INITIALIZATION =============
logger.info("Database connection configured")


# ============= FASTAPI APP =============
app = FastAPI(
    title="Todo API",
    description="Simple Todo API with CRUD operations, validation, logging, and auto-generated docs",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add logging middleware
app.add_middleware(LoggingMiddleware)


# ============= DATABASE STARTUP EVENT =============
@app.on_event("startup")
def startup_event():
    """Initialize database tables on startup"""
    models.Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")


# ============= AUTHENTICATION DEPENDENCIES =============
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """Get the current authenticated user from JWT token"""
    try:
        token = credentials.credentials
        logger.info(f"[AUTH] Validating token: {token[:20]}...")
        payload = verify_token(token)
        user_id_str = payload.get("sub")
        user_id: int = int(user_id_str) if user_id_str else None
        logger.info(f"[AUTH] Token decoded, user_id: {user_id}")
        
        if user_id is None:
            logger.error("[AUTH] No user_id in token payload")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no user_id",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Query user from database
        user = db.query(models.User).filter(models.User.id == user_id).first()
        
        if not user:
            logger.error(f"[AUTH] User {user_id} not found in database")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"[AUTH] User authenticated: {user.username}")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[AUTH] Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Get current active and verified user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    if not current_user.email_verified:
        raise HTTPException(status_code=400, detail="Email not verified")
    return current_user


async def get_admin_user(current_user: models.User = Depends(get_current_active_user)) -> models.User:
    """Verify current user is an admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin access required."
        )
    return current_user


# ============= AUTHENTICATION ENDPOINTS =============

@app.post("/auth/register", response_model=TokenResponse, status_code=201, tags=["Authentication"])
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user. 
    IMPORTANT: The first user to register automatically becomes an admin.
    """
    # Check if username already exists
    existing_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # First user becomes admin
    user_count = db.query(models.User).count()
    is_admin = user_count == 0
    
    # Generate mock verification token
    verification_token = secrets.token_urlsafe(32)
    
    # Create user
    hashed_pw = hash_password(user_data.password)
    
    db_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pw,
        is_admin=is_admin,
        is_active=True,
        email_verified=True,  # Auto-verified for mock
        email_verification_token=verification_token
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Mock email verification log
    logger.info(f"[MOCK EMAIL] Verification link for {db_user.email}: /auth/verify-email/{verification_token}")
    if is_admin:
        logger.info(f"🎉 First user registered! {db_user.username} is now an ADMIN")
    
    # Create access token
    access_token = create_access_token(data={"sub": db_user.id})
    
    # Prepare response
    user_response = UserResponse(
        id=db_user.id,
        username=db_user.username,
        email=db_user.email,
        is_admin=db_user.is_admin,
        is_active=db_user.is_active,
        email_verified=db_user.email_verified,
        created_at=db_user.created_at
    )
    
    logger.info(f"User registered: {db_user.username} (ID: {db_user.id}, Admin: {is_admin})")
    
    return TokenResponse(access_token=access_token, user=user_response)


@app.post("/auth/login", response_model=TokenResponse, tags=["Authentication"])
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with username and password to get JWT token"""
    # Find user by username
    user = db.query(models.User).filter(models.User.username == credentials.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    # Prepare response
    user_response = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_admin=user.is_admin,
        is_active=user.is_active,
        email_verified=user.email_verified,
        created_at=user.created_at
    )
    
    logger.info(f"User logged in: {user.username}")
    
    return TokenResponse(access_token=access_token, user=user_response)


@app.get("/auth/me", response_model=UserResponse, tags=["Authentication"])
def get_me(current_user: models.User = Depends(get_current_active_user)):
    """Get current user profile"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_admin=current_user.is_admin,
        is_active=current_user.is_active,
        email_verified=current_user.email_verified,
        created_at=current_user.created_at
    )


@app.get("/", tags=["Root"])
def read_root():
    """Welcome endpoint"""
    return {
        "message": "Welcome to Todo API",
        "docs": "/docs",
        "endpoints": {
            "GET /todos": "Get all todos",
            "GET /todos/{id}": "Get todo by ID",
            "POST /todos": "Create new todo",
            "PUT /todos/{id}": "Update todo",
            "DELETE /todos/{id}": "Delete todo"
        }
    }


@app.post("/todos", response_model=TodoResponse, status_code=201, tags=["Todos"])
def create_todo(
    todo: TodoCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new todo item (requires authentication)"""
    db_todo = models.Todo(
        user_id=current_user.id,
        title=todo.title,
        description=todo.description,
        completed=todo.completed,
        status=todo.status,
        priority=todo.priority,
        start_date=todo.start_date,
        end_date=todo.end_date,
        category=todo.category
    )
    
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    
    logger.info(f"User {current_user.username} created todo: {db_todo.id}")
    return db_todo


@app.get("/todos", response_model=List[TodoResponse], tags=["Todos"])
def get_todos(
    completed: Optional[bool] = None,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all todos for the authenticated user with optional filtering"""
    # Query user's todos
    query = db.query(models.Todo).filter(models.Todo.user_id == current_user.id)
    
    if completed is not None:
        query = query.filter(models.Todo.completed == completed)
    
    # Sort by created_at descending
    todos = query.order_by(models.Todo.created_at.desc()).all()
    
    logger.info(f"User {current_user.username} retrieved {len(todos)} todos")
    return todos


@app.get("/todos/{todo_id}", response_model=TodoResponse, tags=["Todos"])
def get_todo(
    todo_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a single todo by ID (must be owned by user)"""
    todo = db.query(models.Todo).filter(
        models.Todo.id == todo_id,
        models.Todo.user_id == current_user.id
    ).first()
    
    if not todo:
        logger.warning(f"Todo {todo_id} not found for user {current_user.username}")
        raise HTTPException(status_code=404, detail="Todo not found")
    
    logger.info(f"User {current_user.username} retrieved todo: {todo_id}")
    return todo


@app.put("/todos/{todo_id}", response_model=TodoResponse, tags=["Todos"])
def update_todo(
    todo_id: int,
    todo_update: TodoUpdate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a todo item (must be owned by user)"""
    todo = db.query(models.Todo).filter(
        models.Todo.id == todo_id,
        models.Todo.user_id == current_user.id
    ).first()
    
    if not todo:
        logger.warning(f"Todo {todo_id} not found for user {current_user.username}")
        raise HTTPException(status_code=404, detail="Todo not found")
    
    update_data = todo_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(todo, field, value)
    
    todo.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(todo)
    
    logger.info(f"User {current_user.username} updated todo: {todo_id}")
    return todo


@app.delete("/todos/{todo_id}", tags=["Todos"])
def delete_todo(
    todo_id: int,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a todo item (must be owned by user)"""
    todo = db.query(models.Todo).filter(
        models.Todo.id == todo_id,
        models.Todo.user_id == current_user.id
    ).first()
    
    if not todo:
        logger.warning(f"Todo {todo_id} not found for user {current_user.username}")
        raise HTTPException(status_code=404, detail="Todo not found")
    
    db.delete(todo)
    db.commit()
    logger.info(f"User {current_user.username} deleted todo: {todo_id}")
    
    return {"message": "Todo deleted successfully", "id": todo_id}


@app.get("/stats", tags=["Stats"])
def get_stats(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get statistics about user's todos"""
    total = db.query(models.Todo).filter(models.Todo.user_id == current_user.id).count()
    completed = db.query(models.Todo).filter(
        models.Todo.user_id == current_user.id,
        models.Todo.completed == True
    ).count()
    pending = total - completed
    
    return {
        "total": total,
        "completed": completed,
        "pending": pending,
        "user": current_user.username
    }


# ============= ADMIN ENDPOINTS =============

@app.get("/admin/users", response_model=List[UserResponse], tags=["Admin"])
def get_all_users(
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    users = db.query(models.User).all()
    
    users_response = [
        UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_admin=user.is_admin,
            is_active=user.is_active,
            email_verified=user.email_verified,
            created_at=user.created_at
        )
        for user in users
    ]
    
    logger.info(f"Admin {admin.username} retrieved all users")
    return users_response


@app.get("/admin/users/{user_id}", response_model=UserResponse, tags=["Admin"])
def get_user_by_id(
    user_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get a specific user by ID (admin only)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_admin=user.is_admin,
        is_active=user.is_active,
        email_verified=user.email_verified,
        created_at=user.created_at
    )


@app.get("/admin/users/{user_id}/todos", response_model=List[TodoResponse], tags=["Admin"])
def get_user_todos(
    user_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all todos for a specific user (admin only)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    todos = db.query(models.Todo).filter(
        models.Todo.user_id == user_id
    ).order_by(models.Todo.created_at.desc()).all()
    
    logger.info(f"Admin {admin.username} viewed todos for user {user.username}")
    
    return todos


@app.delete("/admin/users/{user_id}", tags=["Admin"])
def delete_user(
    user_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a user and all their todos (admin only)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot delete yourself
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    username = user.username
    
    # Count todos before deletion (cascade will delete them)
    todo_count = db.query(models.Todo).filter(models.Todo.user_id == user_id).count()
    
    # Delete user (cascade will delete todos)
    db.delete(user)
    db.commit()
    
    logger.info(f"Admin {admin.username} deleted user {username} and {todo_count} todos")
    
    return {
        "message": "User deleted successfully",
        "user_id": user_id,
        "username": username,
        "todos_deleted": todo_count
    }


@app.put("/admin/users/{user_id}/role", response_model=UserResponse, tags=["Admin"])
def toggle_admin_role(
    user_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Toggle admin role for a user (admin only)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot change your own role
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own admin role"
        )
    
    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)
    
    action = "granted" if user.is_admin else "revoked"
    logger.info(f"Admin {admin.username} {action} admin role for user {user.username}")
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_admin=user.is_admin,
        is_active=user.is_active,
        email_verified=user.email_verified,
        created_at=user.created_at
    )


@app.get("/admin/stats", tags=["Admin"])
def get_system_stats(
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get system-wide statistics (admin only)"""
    total_users = db.query(models.User).count()
    admin_users = db.query(models.User).filter(models.User.is_admin == True).count()
    active_users = db.query(models.User).filter(models.User.is_active == True).count()
    
    total_todos = db.query(models.Todo).count()
    completed_todos = db.query(models.Todo).filter(models.Todo.completed == True).count()
    
    return {
        "users": {
            "total": total_users,
            "admins": admin_users,
            "active": active_users
        },
        "todos": {
            "total": total_todos,
            "completed": completed_todos,
            "pending": total_todos - completed_todos
        }
    }


# ============= RUN SERVER =============
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
