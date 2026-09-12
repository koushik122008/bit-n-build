import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from bitnbulid.db.models import Base
from unittest.mock import patch

# Real ISS TLE (stable for testing)
ISS_LINE1 = "1 25544U 98067A   24001.50000000  .00002182  00000-0  40768-4 0  9997"
ISS_LINE2 = "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.50919022439452"

# Simulated debris on converging path
DEB_LINE1 = "1 99001U 00001A   24001.50000000  .00000000  00000-0  00000-0 0  9990"
DEB_LINE2 = "2 99001  51.6416 247.4627 0001000 130.5360 325.0288 15.50919022000001"

@pytest.fixture(scope="function")
def test_engine():
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)

@pytest.fixture(scope="function")
def session(test_engine):
    Session = sessionmaker(bind=test_engine, autocommit=False, autoflush=False, expire_on_commit=False)
    s = Session()
    yield s
    s.close()

@pytest.fixture(scope="function", autouse=True)
def patch_db(test_engine):
    """Patch bitnbulid.db.engine.SessionLocal to point to isolated in-memory test_engine."""
    TestSessionLocal = sessionmaker(bind=test_engine, autocommit=False, autoflush=False, expire_on_commit=False)

    with patch("bitnbulid.db.engine.SessionLocal", TestSessionLocal):
        yield
