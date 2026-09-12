from fastapi.testclient import TestClient
from bitnbulid.api.main import app

client = TestClient(app)

def test_websocket_alerts():
    with client.websocket_connect("/ws/alerts") as websocket:
        # Connection succeeds cleanly
        assert websocket is not None
