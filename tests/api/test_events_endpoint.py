from fastapi.testclient import TestClient
from bitnbulid.api.main import app
from bitnbulid.db.models import TrackedObjectDB, ConjunctionEventDB
from bitnbulid.api.models_auth import UserDB
from bitnbulid.api.auth import hash_password, create_access_token
from bitnbulid.db.engine import get_session
from datetime import datetime, timezone

client = TestClient(app)

def test_events_endpoint():
    with get_session() as session:
        user = UserDB(email="test_event_user@bitnbulid.local", hashed_password=hash_password("P1!"), role="operator")
        obj1 = TrackedObjectDB(norad_id=25544, name="ISS", tle_line1="1...", tle_line2="2...", is_debris=False)
        obj2 = TrackedObjectDB(norad_id=99001, name="DEB", tle_line1="1...", tle_line2="2...", is_debris=True)
        session.add_all([user, obj1, obj2])
        session.flush()

        event = ConjunctionEventDB(
            object_a_norad_id=25544, object_b_norad_id=99001,
            tca=datetime.now(timezone.utc), miss_distance_km=0.85, relative_velocity_km_s=10.0,
            pc=1.5e-3, risk_level="HIGH", data_quality="GOOD"
        )
        session.add(event)

    token = create_access_token("test_event_user@bitnbulid.local", "operator")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/events", headers=headers)
    assert resp.status_code == 200
    events = resp.json()
    assert len(events) >= 1

    event_id = events[0]["id"]
    detail_resp = client.get(f"/events/{event_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["risk_level"] == "HIGH"
