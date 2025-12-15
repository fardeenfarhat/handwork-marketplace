"""make_payment_method_last4_nullable

Revision ID: 216d114926fa
Revises: dcf4b6c64589
Create Date: 2025-11-15 17:42:03.201582

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '216d114926fa'
down_revision = 'dcf4b6c64589'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN, so we need to use batch operations
    with op.batch_alter_table('payment_methods', schema=None) as batch_op:
        batch_op.alter_column('last4',
                              existing_type=sa.String(length=4),
                              nullable=True)


def downgrade() -> None:
    # Revert last4 column to not nullable
    with op.batch_alter_table('payment_methods', schema=None) as batch_op:
        batch_op.alter_column('last4',
                              existing_type=sa.String(length=4),
                              nullable=False)