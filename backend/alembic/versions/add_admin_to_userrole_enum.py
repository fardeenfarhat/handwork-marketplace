"""add admin to userrole enum

Revision ID: add_admin_role
Revises: 232c2bf8d221
Create Date: 2025-12-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_admin_role'
down_revision = 'ff9cee65dc59'  # Latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Add 'admin' value to userrole enum (lowercase to match existing values)
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin'")


def downgrade():
    # Note: PostgreSQL doesn't support removing enum values
    # You would need to recreate the enum type to remove a value
    pass
