from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Float, DateTime, Boolean, ForeignKey, Text, JSON
from datetime import datetime

class Base(DeclarativeBase):
    pass

class TrackedObjectDB(Base):
    __tablename__ = "tracked_objects"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    norad_id: Mapped[int] = mapped_column(unique=True, index=True)
    name: Mapped[str] = mapped_column(String(64))
    tle_line1: Mapped[str] = mapped_column(String(70))
    tle_line2: Mapped[str] = mapped_column(String(70))

    # latest propagated state (nullable until first propagation)
    pos_x_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    pos_y_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    pos_z_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    vel_x_km_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    vel_y_km_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    vel_z_km_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    state_epoch: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_debris: Mapped[bool] = mapped_column(Boolean, default=False)

    conjunction_events_a: Mapped[list["ConjunctionEventDB"]] = relationship(
        "ConjunctionEventDB", foreign_keys="ConjunctionEventDB.object_a_norad_id", back_populates="object_a"
    )
    conjunction_events_b: Mapped[list["ConjunctionEventDB"]] = relationship(
        "ConjunctionEventDB", foreign_keys="ConjunctionEventDB.object_b_norad_id", back_populates="object_b"
    )

class ConjunctionEventDB(Base):
    __tablename__ = "conjunction_events"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    object_a_norad_id: Mapped[int] = mapped_column(ForeignKey("tracked_objects.norad_id"), index=True)
    object_b_norad_id: Mapped[int] = mapped_column(ForeignKey("tracked_objects.norad_id"), index=True)
    tca: Mapped[datetime] = mapped_column(DateTime) # time of closest approach
    miss_distance_km: Mapped[float] = mapped_column(Float)
    relative_velocity_km_s: Mapped[float] = mapped_column(Float)
    pc: Mapped[float] = mapped_column(Float) # probability of collision
    risk_level: Mapped[str] = mapped_column(String(16)) # LOW / MEDIUM / HIGH / CRITICAL
    data_quality: Mapped[str] = mapped_column(String(16)) # GOOD / STALE / UNCERTAIN
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)

    object_a: Mapped["TrackedObjectDB"] = relationship("TrackedObjectDB", foreign_keys=[object_a_norad_id], back_populates="conjunction_events_a")
    object_b: Mapped["TrackedObjectDB"] = relationship("TrackedObjectDB", foreign_keys=[object_b_norad_id], back_populates="conjunction_events_b")
    maneuver_plans: Mapped[list["ManeuverPlanDB"]] = relationship("ManeuverPlanDB", back_populates="conjunction_event")

class ManeuverPlanDB(Base):
    __tablename__ = "maneuver_plans"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    conjunction_event_id: Mapped[int] = mapped_column(ForeignKey("conjunction_events.id"), index=True)
    operator_id: Mapped[str] = mapped_column(String(64))
    options_json: Mapped[dict] = mapped_column(JSON) # list of ManeuverOption dicts
    recommended_option_json: Mapped[dict] = mapped_column(JSON)
    rationale: Mapped[str] = mapped_column(Text)
    delta_v_magnitude_m_s: Mapped[float] = mapped_column(Float)
    burn_time: Mapped[datetime] = mapped_column(DateTime)
    predicted_pc_after: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(16), default="PENDING") # PENDING/ACCEPTED/REJECTED
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    conjunction_event: Mapped["ConjunctionEventDB"] = relationship("ConjunctionEventDB", back_populates="maneuver_plans")
    coordination_decision: Mapped["CoordinationDecisionDB | None"] = relationship("CoordinationDecisionDB", back_populates="maneuver_plan")

class CoordinationDecisionDB(Base):
    __tablename__ = "coordination_decisions"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    maneuver_plan_id: Mapped[int] = mapped_column(ForeignKey("maneuver_plans.id"), unique=True)
    conjunction_event_id: Mapped[int] = mapped_column(ForeignKey("conjunction_events.id"), index=True)
    proposals_received_json: Mapped[list] = mapped_column(JSON)
    accepted_operator_ids_json: Mapped[list] = mapped_column(JSON)
    rejected_operator_ids_json: Mapped[list] = mapped_column(JSON)
    conflict_detected: Mapped[bool] = mapped_column(Boolean)
    resolution_rationale: Mapped[str] = mapped_column(Text)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    maneuver_plan: Mapped["ManeuverPlanDB"] = relationship("ManeuverPlanDB", back_populates="coordination_decision")
