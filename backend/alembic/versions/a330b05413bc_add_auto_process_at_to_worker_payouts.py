"""add_auto_process_at_to_worker_payouts

Revision ID: a330b05413bc
Revises: stripe_connect_001
Create Date: 2025-11-26 15:43:18.290908

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a330b05413bc'
down_revision = 'stripe_connect_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add auto_process_at column to worker_payouts table
    op.add_column('worker_payouts', sa.Column('auto_process_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_worker_payouts_auto_process_at'), 'worker_payouts', ['auto_process_at'], unique=False)


def downgrade() -> None:
    # Remove auto_process_at column
    op.drop_index(op.f('ix_worker_payouts_auto_process_at'), table_name='worker_payouts')
    op.drop_column('worker_payouts', 'auto_process_at')