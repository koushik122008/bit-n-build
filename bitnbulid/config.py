from dataclasses import dataclass
from dotenv import load_dotenv
import os

load_dotenv()

@dataclass
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///data/bitnbulid.db")
    use_celestrak: bool = os.getenv("USE_CELESTRAK", "true").lower() == "true"
    spacetrack_user: str | None = os.getenv("SPACETRACK_USER")
    spacetrack_pass: str | None = os.getenv("SPACETRACK_PASS")
    screening_distance_km: float = float(os.getenv("SCREENING_DISTANCE_KM", "5.0"))
    screening_horizon_hours: float = float(os.getenv("SCREENING_HORIZON_HOURS", "24.0"))
    pc_alert_threshold: float = float(os.getenv("PC_ALERT_THRESHOLD", "1e-4"))

settings = Settings()
