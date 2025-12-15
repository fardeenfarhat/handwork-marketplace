"""update existing role values to lowercase

Revision ID: update_role_case
Revises: add_admin_role
Create Date: 2025-12-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'update_role_case'
down_revision = 'add_admin_role'
branch_labels = None
depends_on = None


def upgrade():
    # Update existing users with uppercase roles to lowercase
    # Strategy: Change column to TEXT, update values, change back to enum
    connection = op.get_bind()
    
    # Step 1: Change role column to TEXT
    connection.execute(sa.text("ALTER TABLE users ALTER COLUMN role TYPE TEXT"))
    
    # Step 2: Update values to lowercase
    connection.execute(sa.text("""
        UPDATE users 
        SET role = LOWER(role)
        WHERE role IN ('CLIENT', 'WORKER', 'ADMIN')
    """))
    
    # Step 3: Change back to enum type
    connection.execute(sa.text("ALTER TABLE users ALTER COLUMN role TYPE userrole USING role::userrole"))


def downgrade():
    # Update back to uppercase if needed
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE users 
        SET role = UPPER(role::text)::userrole
        WHERE role::text IN ('client', 'worker', 'admin')
    """))
