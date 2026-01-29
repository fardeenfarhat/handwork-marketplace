"""Verify user roles are lowercase"""
from app.db.database import SessionLocal
from app.db.models import User

db = SessionLocal()
users = db.query(User).all()
print("Current user roles:")
for user in users[:5]:
    print(f"  {user.email}: {user.role}")
db.close()
