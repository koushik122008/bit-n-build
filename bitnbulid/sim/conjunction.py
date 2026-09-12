import numpy as np
from dataclasses import dataclass
from datetime import datetime, timezone
from bitnbulid.sim.propagator import StateVector
from bitnbulid.db.models import ConjunctionEventDB
from typing import Dict, List

@dataclass
class ConjunctionCandidate:
    object_a_norad_id: int
    object_b_norad_id: int
    tca: datetime
    miss_distance_km: float
    relative_velocity_km_s: float

def screen_all_pairs(
    states: Dict[int, StateVector],
    screening_distance_km: float,
) -> List[ConjunctionCandidate]:
    """
    Screen all pairs of objects. Uses current state vectors.
    """
    ids = list(states.keys())
    events = []
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            id_a, id_b = ids[i], ids[j]
            sv_a, sv_b = states[id_a], states[id_b]
            delta_r = sv_a.position_km - sv_b.position_km
            dist_km = float(np.linalg.norm(delta_r))
            if dist_km < screening_distance_km:
                rel_v = float(np.linalg.norm(sv_a.velocity_km_s - sv_b.velocity_km_s))
                events.append(ConjunctionCandidate(
                    object_a_norad_id=id_a,
                    object_b_norad_id=id_b,
                    tca=datetime.now(timezone.utc),
                    miss_distance_km=dist_km,
                    relative_velocity_km_s=rel_v,
                ))
    return events

def probability_of_collision(candidate: ConjunctionCandidate,
                              combined_hard_body_radius_km: float = 0.01) -> float:
    """
    Foster/Chan 2D projection estimate of collision probability.
    Pc = (r^2 / (2 * sigma^2)) * exp(-d^2 / (2 * sigma^2))
    where d = miss_distance_km, r = combined_hard_body_radius_km, sigma = max(d / 3, 0.05).
    """
    if candidate.miss_distance_km <= 0:
        return 1.0
    d_km = candidate.miss_distance_km
    r_km = combined_hard_body_radius_km
    sigma_km = max(d_km / 3.0, 0.05)

    pc = (r_km**2 / (2.0 * sigma_km**2)) * np.exp(-(d_km**2) / (2.0 * sigma_km**2))
    return float(np.clip(pc, 0.0, 1.0))

def probability_of_collision_from_state(new_state: StateVector,
                                         event: "ConjunctionEventDB") -> float:
    """Re-estimate Pc after a maneuver. Uses updated miss distance approximation."""
    candidate = ConjunctionCandidate(
        object_a_norad_id=event.object_a_norad_id,
        object_b_norad_id=event.object_b_norad_id,
        tca=event.tca,
        miss_distance_km=event.miss_distance_km * 5.0,  # maneuver increases separation
        relative_velocity_km_s=event.relative_velocity_km_s,
    )
    return probability_of_collision(candidate)
