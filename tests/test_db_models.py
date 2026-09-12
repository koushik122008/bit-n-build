from bitnbulid.db.models import TrackedObjectDB, ConjunctionEventDB, ManeuverPlanDB, CoordinationDecisionDB
from datetime import datetime, timezone

def test_db_models_crud(session):
    obj1 = TrackedObjectDB(
        norad_id=25544,
        name="ISS",
        tle_line1="1 25544...",
        tle_line2="2 25544...",
        is_debris=False
    )
    obj2 = TrackedObjectDB(
        norad_id=99001,
        name="DEBRIS",
        tle_line1="1 99001...",
        tle_line2="2 99001...",
        is_debris=True
    )
    session.add_all([obj1, obj2])
    session.flush()

    assert obj1.id is not None
    assert obj2.id is not None

    event = ConjunctionEventDB(
        object_a_norad_id=obj1.norad_id,
        object_b_norad_id=obj2.norad_id,
        tca=datetime.now(timezone.utc),
        miss_distance_km=1.2,
        relative_velocity_km_s=7.5,
        pc=2.5e-4,
        risk_level="MEDIUM",
        data_quality="GOOD"
    )
    session.add(event)
    session.flush()
    assert event.id is not None

    plan = ManeuverPlanDB(
        conjunction_event_id=event.id,
        operator_id="OPERATOR-A",
        options_json={"test": 1},
        recommended_option_json={"dv": 1.0},
        rationale="Avoid collision",
        delta_v_magnitude_m_s=1.0,
        burn_time=datetime.now(timezone.utc),
        predicted_pc_after=1.0e-6,
        status="PENDING"
    )
    session.add(plan)
    session.flush()
    assert plan.id is not None

    decision = CoordinationDecisionDB(
        maneuver_plan_id=plan.id,
        conjunction_event_id=event.id,
        proposals_received_json=["OPERATOR-A"],
        accepted_operator_ids_json=["OPERATOR-A"],
        rejected_operator_ids_json=[],
        conflict_detected=False,
        resolution_rationale="Single proposal approved",
    )
    session.add(decision)
    session.flush()
    assert decision.id is not None
