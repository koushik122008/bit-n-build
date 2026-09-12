import pytest
from bitnbulid.sim.propagator import propagate_tle, propagate_tle_trajectory, apply_delta_v, StateVector
from tests.conftest import ISS_LINE1, ISS_LINE2
from datetime import datetime, timezone
import numpy as np

def test_propagate_tle():
    sv = propagate_tle(ISS_LINE1, ISS_LINE2, horizon_hours=1.0)
    assert isinstance(sv, StateVector)
    assert len(sv.position_km) == 3
    assert len(sv.velocity_km_s) == 3
    assert np.linalg.norm(sv.position_km) > 6000 # LEO orbital radius > 6000 km

def test_propagate_tle_trajectory():
    traj = propagate_tle_trajectory(ISS_LINE1, ISS_LINE2, horizon_hours=1.0, dt_minutes=15.0)
    assert len(traj) >= 4
    for step in traj:
        assert len(step.position_km) == 3

def test_apply_delta_v():
    now = datetime.now(timezone.utc)
    dv = np.array([1.0, 0.0, 0.0]) # 1 m/s prograde
    sv_burn = apply_delta_v(ISS_LINE1, ISS_LINE2, delta_v_m_s=dv, burn_time=now)
    assert isinstance(sv_burn, StateVector)
