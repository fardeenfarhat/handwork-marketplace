"""add_working_hours_hourly_rate_and_payment_methods

Revision ID: dcf4b6c64589
Revises: 20fcf890e9d4
Create Date: 2025-11-15 15:28:06.789402

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'dcf4b6c64589'
down_revision = '20fcf890e9d4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add working_hours and hourly_rate columns to payments table
    op.add_column('payments', sa.Column('working_hours', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('payments', sa.Column('hourly_rate', sa.Numeric(precision=10, scale=2), nullable=True))
    
    # Create payment_methods table
    op.create_table(
        'payment_methods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('stripe_payment_method_id', sa.String(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('brand', sa.String(length=50), nullable=True),
        sa.Column('last4', sa.String(length=4), nullable=False),
        sa.Column('expiry_month', sa.Integer(), nullable=True),
        sa.Column('expiry_year', sa.Integer(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for payment_methods table
    op.create_index(op.f('ix_payment_methods_id'), 'payment_methods', ['id'], unique=False)
    op.create_index(op.f('ix_payment_methods_user_id'), 'payment_methods', ['user_id'], unique=False)
    op.create_index(op.f('ix_payment_methods_stripe_payment_method_id'), 'payment_methods', ['stripe_payment_method_id'], unique=True)
    op.create_index(op.f('ix_payment_methods_is_default'), 'payment_methods', ['is_default'], unique=False)
    op.create_index(op.f('ix_payment_methods_created_at'), 'payment_methods', ['created_at'], unique=False)
    op.create_index('idx_payment_methods_user_default', 'payment_methods', ['user_id', 'is_default'], unique=False)


def downgrade() -> None:
    # Drop payment_methods table and its indexes
    op.drop_index('idx_payment_methods_user_default', table_name='payment_methods')
    op.drop_index(op.f('ix_payment_methods_created_at'), table_name='payment_methods')
    op.drop_index(op.f('ix_payment_methods_is_default'), table_name='payment_methods')
    op.drop_index(op.f('ix_payment_methods_stripe_payment_method_id'), table_name='payment_methods')
    op.drop_index(op.f('ix_payment_methods_user_id'), table_name='payment_methods')
    op.drop_index(op.f('ix_payment_methods_id'), table_name='payment_methods')
    op.drop_table('payment_methods')
    
    # Drop columns from payments table
    op.drop_column('payments', 'hourly_rate')
    op.drop_column('payments', 'working_hours')