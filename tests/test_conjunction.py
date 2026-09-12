import pytest
import numpy as np
from datetime import datetime, timezone
from bitnbulid.sim.propagator import StateVector
from bitnbulid.sim.conjunction import screen_all_pairs, probability_of_collision, ConjunctionCandidate

def test_screen_all_pairs():
    now = datetime.now(timezone.utc)
    states = {
        25544: StateVector(position_km=np.array([7000.0, 0.0, 0.0]), velocity_km_s=np.array([0.0, 7.5, 0.0]), epoch=now),
        99001: StateVector(position_km=np.array([7002.0, 0.0, 0.0]), velocity_km_s=np.array([0.0, -7.5, 0.0]), epoch=now), # 2 km distance
        99002: StateVector(position_km=np.array([8000.0, 0.0, 0.0]), velocity_km_s=np.array([0.0, 7.5, 0.0]), epoch=now), # 1000 km distance
    }
    candidates = screen_all_pairs(states, screening_distance_km=5.0)
    assert len(candidates) == 1
    assert candidates[0].miss_distance_km == pytest.approx(2.0)

def test_probability_of_collision():
    candidate_close = ConjunctionCandidate(
        object_a_norad_id=1, object_b_norad_id=2, tca=datetime.now(timezone.utc),
        miss_distance_km=0.01, relative_velocity_km_s=10.0
    )
    pc_high = probability_of_collision(candidate_close)

    candidate_far = ConjunctionCandidate(
        object_a_norad_id=1, object_b_norad_id=2, tca=datetime.now(timezone.utc),
        miss_distance_km=5.0, relative_velocity_km_s=10.0
    )
    pc_low = probability_of_collision(candidate_far)

    assert pc_high > pc_low
    assert 0.0 <= pc_high <= 1.0
    assert 0.0 <= pc_low <= 1.0
