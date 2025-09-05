from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import logging

# Import User model for type hints and queries
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.db.models import User

logger = logging.getLogger(__name__)

# Optimized database engine configuration
engine_kwargs = {
    "pool_pre_ping": True,  # Verify connections before use
    "pool_recycle": 300,    # Recycle connections every 5 minutes
    "echo": False,          # Disable SQL logging for performance
}

# SQLite specific optimizations
if "sqlite" in settings.DATABASE_URL:
    engine_kwargs["connect_args"] = {
        "check_same_thread": False,
        "timeout": 10,  # 10 second timeout for SQLite operations
    }
else:
    # PostgreSQL/MySQL optimizations
    engine_kwargs.update({
        "pool_size": 10,        # Connection pool size
        "max_overflow": 20,     # Additional connections beyond pool_size
        "pool_timeout": 5,      # Timeout when getting connection from pool
    })

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_user_for_login(db: sessionmaker, email: str):
    """Optimized user lookup for login with minimal data transfer"""
    try:
        # Import here to avoid circular imports
        from app.db.models import User
        
        # Only select fields needed for authentication
        user = db.query(User).filter(User.email == email).first()
        
        return user
    except Exception as e:
        logger.error(f"Database error during user lookup for {email}: {str(e)}")
        raise