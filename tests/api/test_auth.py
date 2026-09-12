from fastapi.testclient import TestClient
from bitnbulid.api.main import app
from bitnbulid.api.auth import hash_password
from bitnbulid.api.models_auth import UserDB
from bitnbulid.db.engine import get_session

client = TestClient(app)

def test_login_and_me():
    with get_session() as session:
        user = UserDB(
            email="operator@bitnbulid.local",
            hashed_password=hash_password("OperatorPass123!"),
            role="operator",
            operator_id="OP-TEST-01"
        )
        session.add(user)

    # Test Login
    login_resp = client.post("/auth/login", json={
        "email": "operator@bitnbulid.local",
        "password": "OperatorPass123!"
    })
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "operator@bitnbulid.local"
    token = data["access_token"]

    # Test /auth/me
    me_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "operator@bitnbulid.local"
    assert me_data["role"] == "operator"

def test_invalid_login():
    resp = client.post("/auth/login", json={
        "email": "nonexistent@bitnbulid.local",
        "password": "wrongpassword"
    })
    assert resp.status_code == 401
