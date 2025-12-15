#!/usr/bin/env python3
"""
Script to reset the admin user password for the handwork marketplace platform.
"""

import sys
import os
from sqlalchemy.orm import Session

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import get_db
from app.db.models import User, UserRole
from app.core.security import get_password_hash

def reset_admin_password(new_password=None):
    """Reset admin user password"""
    db = next(get_db())
    
    # Find admin user
    admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if not admin_user:
        print("No admin user found! Run create_admin_user.py first.")
        return
    
    # Set new password
    if new_password is None:
        new_password = input("Enter new admin password: ")
    
    admin_user.password_hash = get_password_hash(new_password)
    db.commit()
    
    print(f"Admin password reset successfully!")
    print(f"Email: {admin_user.email}")
    print(f"New Password: {new_password}")
    print("Please change this password after login!")
    
    db.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Reset admin password')
    parser.add_argument('--password', help='New password (if not provided, will prompt)')
    args = parser.parse_args()
    
    reset_admin_password(args.password)
