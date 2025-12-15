#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.db.models import User, VerificationToken

def check_user_verification_status():
    db = SessionLocal()
    try:
        # Check all test users we created
        test_emails = ['test6digit@example.com', 'test6digit2@example.com']
        
        for email in test_emails:
            user = db.query(User).filter(User.email == email).first()
            if user:
                print(f"\n✅ User: {user.email}")
                print(f"   ID: {user.id}")
                print(f"   Email Verified: {user.email_verified}")
                print(f"   Phone Verified: {user.phone_verified}")
                print(f"   Is Verified: {user.is_verified}")
                print(f"   Is Active: {user.is_active}")
                
                # Check verification tokens
                tokens = db.query(VerificationToken).filter(
                    VerificationToken.user_id == user.id
                ).order_by(VerificationToken.created_at.desc()).all()
                
                print(f"   Verification Tokens: {len(tokens)}")
                for i, token in enumerate(tokens[:3]):  # Show last 3 tokens
                    print(f"     Token {i+1}: {token.token} (Used: {token.is_used}, Type: {token.token_type})")
            else:
                print(f"❌ User not found: {email}")
                
    finally:
        db.close()

if __name__ == "__main__":
    check_user_verification_status()