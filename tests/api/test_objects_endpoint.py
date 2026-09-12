from fastapi.testclient import TestClient
from bitnbulid.api.main import app
from bitnbulid.db.models import TrackedObjectDB
from bitnbulid.api.models_auth import UserDB
from bitnbulid.api.auth import hash_password, create_access_token
from bitnbulid.db.engine import get_session

client = TestClient(app)

def test_objects_endpoint():
    with get_session() as session:
        user = UserDB(
            email="test_obj_user@bitnbulid.local",
            hashed_password=hash_password("Pass123!"),
            role="operator"
        )
        obj1 = TrackedObjectDB(
            norad_id=25544, name="ISS (ZARYA)",
            tle_line1="1 25544U...", tle_line2="2 25544...",
            is_debris=False
        )
        session.add_all([user, obj1])

    token = create_access_token("test_obj_user@bitnbulid.local", "operator")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/objects", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert any(o["norad_id"] == 25544 for o in data)

    resp_single = client.get("/objects/25544", headers=headers)
    assert resp_single.status_code == 200
    assert resp_single.json()["name"] == "ISS (ZARYA)"
