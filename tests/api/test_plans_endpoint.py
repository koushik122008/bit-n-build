from fastapi.testclient import TestClient
from bitnbulid.api.main import app
from bitnbulid.db.models import TrackedObjectDB, ConjunctionEventDB
from bitnbulid.api.models_auth import UserDB
from bitnbulid.api.auth import hash_password, create_access_token
from bitnbulid.db.engine import get_session
from tests.conftest import ISS_LINE1, ISS_LINE2, DEB_LINE1, DEB_LINE2
from datetime import datetime, timezone

client = TestClient(app)

def test_plans_endpoint():
    event_id = None
    with get_session() as session:
        user = UserDB(email="coordinator_user@bitnbulid.local", hashed_password=hash_password("P1!"), role="coordinator")
        obj1 = TrackedObjectDB(norad_id=25544, name="ISS", tle_line1=ISS_LINE1, tle_line2=ISS_LINE2, is_debris=False)
        obj2 = TrackedObjectDB(norad_id=99001, name="DEB", tle_line1=DEB_LINE1, tle_line2=DEB_LINE2, is_debris=True)
        session.add_all([user, obj1, obj2])
        session.flush()

        event = ConjunctionEventDB(
            object_a_norad_id=25544, object_b_norad_id=99001,
            tca=datetime.now(timezone.utc), miss_distance_km=0.85, relative_velocity_km_s=10.0,
            pc=1.5e-3, risk_level="HIGH", data_quality="GOOD"
        )
        session.add(event)
        session.flush()
        event_id = event.id

    token = create_access_token("coordinator_user@bitnbulid.local", "coordinator")
    headers = {"Authorization": f"Bearer {token}"}

    # Generate plan
    plan_resp = client.post("/plans", json={
        "conjunction_event_id": event_id,
        "operator_id": "OPERATOR-ALPHA",
        "max_delta_v_m_s": 2.0
    }, headers=headers)
    assert plan_resp.status_code == 200
    plan_data = plan_resp.json()
    assert plan_data["status"] == "PENDING"

    # List plans
    list_resp = client.get(f"/plans?conjunction_event_id={event_id}", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # Resolve plan as coordinator
    resolve_resp = client.post(f"/plans/{event_id}/resolve", headers=headers)
    assert resolve_resp.status_code == 200
    resolve_data = resolve_resp.json()
    assert resolve_data["accepted_operator_ids_json"] == ["OPERATOR-ALPHA"]
