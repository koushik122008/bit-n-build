"""Initial schema creation

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-12 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'tracked_objects',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('norad_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('tle_line1', sa.String(length=70), nullable=False),
        sa.Column('tle_line2', sa.String(length=70), nullable=False),
        sa.Column('pos_x_km', sa.Float(), nullable=True),
        sa.Column('pos_y_km', sa.Float(), nullable=True),
        sa.Column('pos_z_km', sa.Float(), nullable=True),
        sa.Column('vel_x_km_s', sa.Float(), nullable=True),
        sa.Column('vel_y_km_s', sa.Float(), nullable=True),
        sa.Column('vel_z_km_s', sa.Float(), nullable=True),
        sa.Column('state_epoch', sa.DateTime(), nullable=True),
        sa.Column('last_updated', sa.DateTime(), nullable=False),
        sa.Column('is_debris', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tracked_objects_norad_id'), 'tracked_objects', ['norad_id'], unique=True)

    op.create_table(
        'conjunction_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('object_a_norad_id', sa.Integer(), nullable=False),
        sa.Column('object_b_norad_id', sa.Integer(), nullable=False),
        sa.Column('tca', sa.DateTime(), nullable=False),
        sa.Column('miss_distance_km', sa.Float(), nullable=False),
        sa.Column('relative_velocity_km_s', sa.Float(), nullable=False),
        sa.Column('pc', sa.Float(), nullable=False),
        sa.Column('risk_level', sa.String(length=16), nullable=False),
        sa.Column('data_quality', sa.String(length=16), nullable=False),
        sa.Column('notes', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('resolved', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['object_a_norad_id'], ['tracked_objects.norad_id'], ),
        sa.ForeignKeyConstraint(['object_b_norad_id'], ['tracked_objects.norad_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conjunction_events_object_a_norad_id'), 'conjunction_events', ['object_a_norad_id'], unique=False)
    op.create_index(op.f('ix_conjunction_events_object_b_norad_id'), 'conjunction_events', ['object_b_norad_id'], unique=False)

    op.create_table(
        'maneuver_plans',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('conjunction_event_id', sa.Integer(), nullable=False),
        sa.Column('operator_id', sa.String(length=64), nullable=False),
        sa.Column('options_json', sa.JSON(), nullable=False),
        sa.Column('recommended_option_json', sa.JSON(), nullable=False),
        sa.Column('rationale', sa.Text(), nullable=False),
        sa.Column('delta_v_magnitude_m_s', sa.Float(), nullable=False),
        sa.Column('burn_time', sa.DateTime(), nullable=False),
        sa.Column('predicted_pc_after', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['conjunction_event_id'], ['conjunction_events.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_maneuver_plans_conjunction_event_id'), 'maneuver_plans', ['conjunction_event_id'], unique=False)

    op.create_table(
        'coordination_decisions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('maneuver_plan_id', sa.Integer(), nullable=False),
        sa.Column('conjunction_event_id', sa.Integer(), nullable=False),
        sa.Column('proposals_received_json', sa.JSON(), nullable=False),
        sa.Column('accepted_operator_ids_json', sa.JSON(), nullable=False),
        sa.Column('rejected_operator_ids_json', sa.JSON(), nullable=False),
        sa.Column('conflict_detected', sa.Boolean(), nullable=False),
        sa.Column('resolution_rationale', sa.Text(), nullable=False),
        sa.Column('decided_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['conjunction_event_id'], ['conjunction_events.id'], ),
        sa.ForeignKeyConstraint(['maneuver_plan_id'], ['maneuver_plans.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('maneuver_plan_id')
    )
    op.create_index(op.f('ix_coordination_decisions_conjunction_event_id'), 'coordination_decisions', ['conjunction_event_id'], unique=False)

def downgrade() -> None:
    op.drop_table('coordination_decisions')
    op.drop_table('maneuver_plans')
    op.drop_table('conjunction_events')
    op.drop_table('tracked_objects')
