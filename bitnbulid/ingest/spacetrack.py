import requests, time
from typing import List, Tuple
from bitnbulid.config import settings
import logging

log = logging.getLogger(__name__)

SPACETRACK_BASE = "https://www.space-track.org"
LOGIN_URL = f"{SPACETRACK_BASE}/ajaxauth/login"
TLE_URL = f"{SPACETRACK_BASE}/basicspacedata/query/class/gp/EPOCH/>now-30/orderby/NORAD_CAT_ID/limit/200/format/tle"

def fetch_tles_spacetrack() -> List[Tuple[str, str, str]]:
    """
    Auto-login to Space-Track.org using credentials from .env.
    Returns list of (name, line1, line2).
    Falls back to Celestrak if credentials missing or login fails.
    """
    if not settings.spacetrack_user or not settings.spacetrack_pass:
        from bitnbulid.ingest.celestrak import fetch_tles
        return fetch_tles("active")

    try:
        session = requests.Session()
        login_resp = session.post(LOGIN_URL, data={
            "identity": settings.spacetrack_user,
            "password": settings.spacetrack_pass,
        }, timeout=30)
        login_resp.raise_for_status()

        time.sleep(1) # Space-Track rate limit
        tle_resp = session.get(TLE_URL, timeout=60)
        tle_resp.raise_for_status()

        lines = [l.strip() for l in tle_resp.text.splitlines() if l.strip()]
        result = []
        for i in range(0, len(lines) - 1, 2):
            line1 = lines[i]
            line2 = lines[i + 1]
            if line1.startswith("1 ") and line2.startswith("2 "):
                norad = line2[2:7].strip()
                result.append((f"OBJECT-{norad}", line1, line2))
        return result
    except Exception as e:
        log.warning("Space-Track fetch failed: %s. Falling back to Celestrak.", e)
        from bitnbulid.ingest.celestrak import fetch_tles
        return fetch_tles("active")
