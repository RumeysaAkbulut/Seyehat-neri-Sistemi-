"""add friendships table

Revision ID: 0002_add_friendships
Revises: 0001_initial_schema
Create Date: 2026-05-26 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0002_add_friendships'
down_revision = '0001_initial_schema'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'friendships',
        sa.Column('id',           sa.Integer(),  nullable=False),
        sa.Column('follower_id',  sa.Integer(),  nullable=False),
        sa.Column('following_id', sa.Integer(),  nullable=False),
        sa.Column('created_at',   sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['follower_id'],  ['users.id']),
        sa.ForeignKeyConstraint(['following_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('follower_id', 'following_id'),
    )


def downgrade():
    op.drop_table('friendships')
