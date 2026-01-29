"""Fix user roles from uppercase to lowercase"""
from app.db.database import SessionLocal
from app.db.models import User

def fix_roles():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        updated_count = 0
        
        for user in users:
            if user.role and user.role.isupper():
                old_role = user.role
                user.role = user.role.lower()
                print(f"Updated user {user.email}: {old_role} -> {user.role}")
                updated_count += 1
        
        db.commit()
        print(f"\n✅ Successfully updated {updated_count} user roles to lowercase")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_roles()
