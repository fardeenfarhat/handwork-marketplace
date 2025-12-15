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
    connection = op.get_bind()
    
    # Cast role to text, update it, then cast back
    # We need to temporarily allow the cast
    connection.execute(sa.text("""
        UPDATE users 
        SET role = LOWER(role::text)::userrole
        WHERE role::text IN ('CLIENT', 'WORKER', 'ADMIN')
    """))


def downgrade():
    # Update back to uppercase if needed
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE users 
        SET role = UPPER(role::text)::userrole
        WHERE role::text IN ('client', 'worker', 'admin')
    """))
