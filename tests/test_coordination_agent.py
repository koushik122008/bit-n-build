from bitnbulid.agents.coordination import CoordinationAgent
from bitnbulid.db.models import ConjunctionEventDB, ManeuverPlanDB, TrackedObjectDB
from bitnbulid.db.engine import get_session
from tests.conftest import ISS_LINE1, ISS_LINE2, DEB_LINE1, DEB_LINE2
from datetime import datetime, timezone

def test_coordination_single_proposal():
    event_id = None
    with get_session() as session:
        obj1 = TrackedObjectDB(norad_id=25544, name="ISS", tle_line1=ISS_LINE1, tle_line2=ISS_LINE2, is_debris=False)
        obj2 = TrackedObjectDB(norad_id=99001, name="DEB", tle_line1=DEB_LINE1, tle_line2=DEB_LINE2, is_debris=True)
        session.add_all([obj1, obj2])
        session.flush()

        event = ConjunctionEventDB(
            object_a_norad_id=obj1.norad_id, object_b_norad_id=obj2.norad_id,
            tca=datetime.now(timezone.utc), miss_distance_km=0.5, relative_velocity_km_s=8.0,
            pc=2.0e-3, risk_level="HIGH", data_quality="GOOD"
        )
        session.add(event)
        session.flush()
        event_id = event.id

        plan = ManeuverPlanDB(
            conjunction_event_id=event_id, operator_id="OP-1", options_json={},
            recommended_option_json={}, rationale="Prograde burn", delta_v_magnitude_m_s=1.0,
            burn_time=datetime.now(timezone.utc), predicted_pc_after=1.0e-5, status="PENDING"
        )
        session.add(plan)

    agent = CoordinationAgent()
    decision = agent.resolve(conjunction_event_id=event_id)

    assert decision is not None
    assert decision.conflict_detected is False
    assert decision.accepted_operator_ids_json == ["OP-1"]

def test_coordination_multi_proposal_conflict():
    event_id = None
    with get_session() as session:
        obj1 = TrackedObjectDB(norad_id=25544, name="ISS", tle_line1=ISS_LINE1, tle_line2=ISS_LINE2, is_debris=False)
        obj2 = TrackedObjectDB(norad_id=99001, name="DEB", tle_line1=DEB_LINE1, tle_line2=DEB_LINE2, is_debris=True)
        session.add_all([obj1, obj2])
        session.flush()

        event = ConjunctionEventDB(
            object_a_norad_id=obj1.norad_id, object_b_norad_id=obj2.norad_id,
            tca=datetime.now(timezone.utc), miss_distance_km=0.5, relative_velocity_km_s=8.0,
            pc=2.0e-3, risk_level="HIGH", data_quality="GOOD"
        )
        session.add(event)
        session.flush()
        event_id = event.id

        plan1 = ManeuverPlanDB(
            conjunction_event_id=event_id, operator_id="OP-HIGH-DV", options_json={},
            recommended_option_json={}, rationale="Large burn", delta_v_magnitude_m_s=2.5,
            burn_time=datetime.now(timezone.utc), predicted_pc_after=1.0e-6, status="PENDING"
        )
        plan2 = ManeuverPlanDB(
            conjunction_event_id=event_id, operator_id="OP-LOW-DV", options_json={},
            recommended_option_json={}, rationale="Optimal burn", delta_v_magnitude_m_s=0.8,
            burn_time=datetime.now(timezone.utc), predicted_pc_after=1.0e-5, status="PENDING"
        )
        session.add_all([plan1, plan2])

    agent = CoordinationAgent()
    decision = agent.resolve(conjunction_event_id=event_id)

    assert decision.conflict_detected is True
    assert decision.accepted_operator_ids_json == ["OP-LOW-DV"]
    assert decision.rejected_operator_ids_json == ["OP-HIGH-DV"]
