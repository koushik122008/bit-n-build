import requests
from typing import List, Tuple
import logging

log = logging.getLogger(__name__)

CELESTRAK_TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle"
CELESTRAK_FALLBACK_URL = "https://celestrak.org/SATCAT/tle.php?GROUP={group}&FORMAT=tle"

def fetch_tles(group: str = "stations") -> List[Tuple[str, str, str]]:
    """
    Fetch TLEs from Celestrak for a named group.
    Returns list of (name, line1, line2).
    No API key required.
    Groups: 'stations', 'active', 'cosmos-1408-deb', 'iridium-33-deb', 'fengyun-1c-deb'
    """
    urls = [
        CELESTRAK_TLE_URL.format(group=group),
        CELESTRAK_FALLBACK_URL.format(group=group),
    ]

    for url in urls:
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code == 200 and resp.text.strip():
                lines = [l.strip() for l in resp.text.splitlines() if l.strip()]
                result = []
                for i in range(0, len(lines) - 2, 3):
                    name = lines[i]
                    line1 = lines[i + 1]
                    line2 = lines[i + 2]
                    if line1.startswith("1 ") and line2.startswith("2 "):
                        result.append((name, line1, line2))
                if result:
                    return result
        except Exception as e:
            log.warning("Celestrak fetch failed for %s using %s: %s", group, url, e)

    log.warning("No TLEs returned from Celestrak for group %s", group)
    return []
