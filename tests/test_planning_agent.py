import pytest
from bitnbulid.agents.planning import ManeuverPlanningAgent
from bitnbulid.db.models import TrackedObjectDB, ConjunctionEventDB
from bitnbulid.db.engine import get_session
from bitnbulid.sim.conjunction import ConjunctionCandidate, probability_of_collision
from tests.conftest import ISS_LINE1, ISS_LINE2, DEB_LINE1, DEB_LINE2
from datetime import datetime, timezone

def test_maneuver_planning_agent():
    event_id = None
    with get_session() as session:
        obj1 = TrackedObjectDB(norad_id=25544, name="ISS", tle_line1=ISS_LINE1, tle_line2=ISS_LINE2, is_debris=False)
        obj2 = TrackedObjectDB(norad_id=99001, name="DEB", tle_line1=DEB_LINE1, tle_line2=DEB_LINE2, is_debris=True)
        session.add_all([obj1, obj2])
        session.flush()

        candidate = ConjunctionCandidate(
            object_a_norad_id=25544, object_b_norad_id=99001,
            tca=datetime.now(timezone.utc), miss_distance_km=0.05, relative_velocity_km_s=8.0
        )
        initial_pc = probability_of_collision(candidate)

        event = ConjunctionEventDB(
            object_a_norad_id=obj1.norad_id,
            object_b_norad_id=obj2.norad_id,
            tca=datetime.now(timezone.utc),
            miss_distance_km=0.05,
            relative_velocity_km_s=8.0,
            pc=initial_pc,
            risk_level="HIGH",
            data_quality="GOOD"
        )
        session.add(event)
        session.flush()
        event_id = event.id

    agent = ManeuverPlanningAgent()
    plan = agent.plan(
        conjunction_event_id=event_id,
        operator_id="OPERATOR-ALPHA",
        max_delta_v_m_s=2.0
    )

    assert plan is not None
    assert plan.operator_id == "OPERATOR-ALPHA"
    assert plan.status == "PENDING"
    assert plan.predicted_pc_after < initial_pc
