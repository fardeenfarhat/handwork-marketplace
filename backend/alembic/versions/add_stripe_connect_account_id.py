"""add stripe connect account id

Revision ID: stripe_connect_001
Revises: 4b2ba5586a87
Create Date: 2025-11-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'stripe_connect_001'
down_revision = '4b2ba5586a87'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add stripe_account_id column to worker_profiles
    op.add_column('worker_profiles', sa.Column('stripe_account_id', sa.String(), nullable=True))
    op.create_index('ix_worker_profiles_stripe_account_id', 'worker_profiles', ['stripe_account_id'], unique=False)


def downgrade() -> None:
    # Remove index and column
    op.drop_index('ix_worker_profiles_stripe_account_id', table_name='worker_profiles')
    op.drop_column('worker_profiles', 'stripe_account_id')
