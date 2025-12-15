"""add admin to userrole enum

Revision ID: add_admin_role
Revises: stripe_connect_001
Create Date: 2025-12-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_admin_role'
down_revision = 'stripe_connect_001'
branch_labels = None
depends_on = None


def upgrade():
    # Add lowercase values to userrole enum to match code expectations
    # The enum was created with uppercase values but code uses lowercase
    # Note: This must run outside a transaction
    connection = op.get_bind()
    connection.execute(sa.text("COMMIT"))  # End current transaction
    connection.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'client'"))
    connection.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'worker'"))
    connection.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin'"))


def downgrade():
    # Note: PostgreSQL doesn't support removing enum values
    # You would need to recreate the enum type to remove a value
    pass
