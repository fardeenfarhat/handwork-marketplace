import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import get_db
from app.db.models import Base, User, UserRole
from app.core.security import get_password_hash, create_access_token

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client():
    return TestClient(app)

def create_test_user(db_session, email="test@example.com", role=UserRole.CLIENT, **kwargs):
    """Helper function to create test users"""
    from app.db.models import ClientProfile, WorkerProfile
    
    user_data = {
        "email": email,
        "password_hash": get_password_hash("testpassword123"),
        "role": role,
        "first_name": "Test",
        "last_name": "User",
        "is_verified": True,
        "is_active": True,
        "email_verified": True,
        "phone_verified": True,
        **kwargs
    }
    
    user = User(**user_data)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    # Create corresponding profile based on role
    if role == UserRole.CLIENT:
        profile = ClientProfile(
            user_id=user.id,
            company_name="Test Company",
            description="Test company description",
            location="New York, NY"
        )
        db_session.add(profile)
    elif role == UserRole.WORKER:
        from app.db.models import KYCStatus
        profile = WorkerProfile(
            user_id=user.id,
            bio="Test worker bio",
            skills=["plumbing", "electrical"],
            hourly_rate=50.0,
            location="New York, NY",
            kyc_status=KYCStatus.APPROVED
        )
        db_session.add(profile)
    
    db_session.commit()
    return user

def get_auth_headers(user_id: int):
    """Helper function to get authentication headers"""
    access_token = create_access_token(subject=str(user_id))
    return {"Authorization": f"Bearer {access_token}"}

@pytest.fixture
def authenticated_client(client, db_session):
    """Create an authenticated test client"""
    # Create a test user
    user = create_test_user(db_session, email="auth_test@example.com")
    
    # Get auth headers
    headers = get_auth_headers(user.id)
    
    # Create a wrapper class that includes headers by default
    class AuthenticatedClient:
        def __init__(self, client, headers):
            self.client = client
            self.headers = headers
        
        def get(self, url, **kwargs):
            kwargs.setdefault('headers', {}).update(self.headers)
            return self.client.get(url, **kwargs)
        
        def post(self, url, **kwargs):
            kwargs.setdefault('headers', {}).update(self.headers)
            return self.client.post(url, **kwargs)
        
        def put(self, url, **kwargs):
            kwargs.setdefault('headers', {}).update(self.headers)
            return self.client.put(url, **kwargs)
        
        def delete(self, url, **kwargs):
            kwargs.setdefault('headers', {}).update(self.headers)
            return self.client.delete(url, **kwargs)
    
    return AuthenticatedClient(client, headers)