from sgp4.api import Satrec, jday
from dataclasses import dataclass
from datetime import datetime, timezone
import numpy as np

@dataclass
class StateVector:
    position_km: np.ndarray    # [x, y, z] ECI km
    velocity_km_s: np.ndarray  # [vx, vy, vz] ECI km/s
    epoch: datetime

def propagate_tle(line1: str, line2: str,
                  horizon_hours: float = 24.0,
                  dt_minutes: float = 1.0) -> StateVector:
    """Propagate to the end of the horizon. Returns final StateVector."""
    sat = Satrec.twoline2rv(line1, line2)
    now = datetime.now(timezone.utc)
    t_minutes = horizon_hours * 60.0
    jd, fr = jday(now.year, now.month, now.day, now.hour, now.minute,
                  now.second + now.microsecond / 1e6)
    fr2 = fr + t_minutes / 1440.0
    e, r, v = sat.sgp4(jd, fr2)
    if e != 0:
        raise RuntimeError(f"SGP4 error code {e} for {line1[:24]}")
    return StateVector(
        position_km=np.array(r),
        velocity_km_s=np.array(v),
        epoch=now,
    )

def propagate_tle_trajectory(line1: str, line2: str,
                              horizon_hours: float = 24.0,
                              dt_minutes: float = 1.0) -> list[StateVector]:
    """Propagate in time steps. Returns list of StateVectors for trajectory screening."""
    sat = Satrec.twoline2rv(line1, line2)
    now = datetime.now(timezone.utc)
    jd0, fr0 = jday(now.year, now.month, now.day, now.hour, now.minute,
                    now.second + now.microsecond / 1e6)
    steps = int(horizon_hours * 60 / dt_minutes)
    results = []
    for i in range(steps + 1):
        fr = fr0 + (i * dt_minutes) / 1440.0
        e, r, v = sat.sgp4(jd0, fr)
        if e == 0:
            results.append(StateVector(np.array(r), np.array(v), now))
    return results

def apply_delta_v(tle_line1: str, tle_line2: str,
                  delta_v_m_s: np.ndarray,
                  burn_time: datetime) -> StateVector:
    """
    Propagate to burn_time, add delta-V, return new state.
    delta_v_m_s is in ECI frame (m/s), converted to km/s internally.
    """
    sat = Satrec.twoline2rv(tle_line1, tle_line2)
    jd, fr = jday(burn_time.year, burn_time.month, burn_time.day,
                  burn_time.hour, burn_time.minute,
                  burn_time.second + burn_time.microsecond / 1e6)
    e, r, v = sat.sgp4(jd, fr)
    if e != 0:
        raise RuntimeError(f"SGP4 error {e} at burn time")
    new_v = np.array(v) + delta_v_m_s / 1000.0  # m/s -> km/s
    return StateVector(position_km=np.array(r), velocity_km_s=new_v, epoch=burn_time)
