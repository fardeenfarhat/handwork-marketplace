"""add_bank_account_and_payout_fields

Revision ID: 45295c71aa2d
Revises: 216d114926fa
Create Date: 2025-11-16 16:57:01.988744

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '45295c71aa2d'
down_revision = '216d114926fa'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add bank account fields to worker_profiles
    op.add_column('worker_profiles', sa.Column('bank_account_holder_name', sa.String(), nullable=True))
    op.add_column('worker_profiles', sa.Column('bank_name', sa.String(), nullable=True))
    op.add_column('worker_profiles', sa.Column('bank_account_number', sa.String(), nullable=True))
    op.add_column('worker_profiles', sa.Column('bank_routing_number', sa.String(), nullable=True))
    op.add_column('worker_profiles', sa.Column('bank_country', sa.String(), nullable=True))
    op.add_column('worker_profiles', sa.Column('bank_currency', sa.String(), nullable=True))
    op.add_column('worker_profiles', sa.Column('bank_account_verified', sa.Boolean(), nullable=True))
    
    # Add auto_process_at field to worker_payouts
    op.add_column('worker_payouts', sa.Column('auto_process_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_worker_payouts_auto_process_at', 'worker_payouts', ['auto_process_at'])


def downgrade() -> None:
    # Remove index
    op.drop_index('ix_worker_payouts_auto_process_at', table_name='worker_payouts')
    
    # Remove auto_process_at from worker_payouts
    op.drop_column('worker_payouts', 'auto_process_at')
    
    # Remove bank account fields from worker_profiles
    op.drop_column('worker_profiles', 'bank_account_verified')
    op.drop_column('worker_profiles', 'bank_currency')
    op.drop_column('worker_profiles', 'bank_country')
    op.drop_column('worker_profiles', 'bank_routing_number')
    op.drop_column('worker_profiles', 'bank_account_number')
    op.drop_column('worker_profiles', 'bank_name')
    op.drop_column('worker_profiles', 'bank_account_holder_name')