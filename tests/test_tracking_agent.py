from bitnbulid.agents.tracking import TrackingAgent
from bitnbulid.db.models import TrackedObjectDB
from bitnbulid.db.engine import get_session
from tests.conftest import ISS_LINE1, ISS_LINE2, DEB_LINE1, DEB_LINE2

def test_tracking_agent_step():
    with get_session() as session:
        obj1 = TrackedObjectDB(norad_id=25544, name="ISS", tle_line1=ISS_LINE1, tle_line2=ISS_LINE2, is_debris=False)
        obj2 = TrackedObjectDB(norad_id=99001, name="DEB", tle_line1=DEB_LINE1, tle_line2=DEB_LINE2, is_debris=True)
        session.add_all([obj1, obj2])

    agent = TrackingAgent()
    events = agent.step()

    with get_session() as session:
        o1 = session.query(TrackedObjectDB).filter_by(norad_id=25544).first()
        assert o1 is not None
        assert o1.pos_x_km is not None

    assert isinstance(events, list)
