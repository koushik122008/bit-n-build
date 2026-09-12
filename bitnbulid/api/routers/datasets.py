"""
Dataset API endpoints for serving pre-loaded contextual data to the frontend.
These complement the live database endpoints with curated reference data.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from bitnbulid.api.deps import get_db, get_current_user
from bitnbulid.api.models_auth import UserDB
from bitnbulid.db.models import TrackedObjectDB, ConjunctionEventDB
import json
from pathlib import Path
from typing import List, Dict, Any
import logging

log = logging.getLogger(__name__)

router = APIRouter(tags=["datasets"])

# Path to datasets directory - try multiple strategies
FILE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = FILE_DIR.parent.parent.parent
DATASETS_DIR = PROJECT_ROOT / "data" / "datasets"

# Fallback: if that doesn't exist, try relative to CWD
if not DATASETS_DIR.exists():
    alt_path = Path.cwd() / "data" / "datasets"
    if alt_path.exists():
        DATASETS_DIR = alt_path
        print(f"Using alternative datasets path: {DATASETS_DIR}")
    else:
        # Last resort: try common locations
        for base in [Path.cwd(), PROJECT_ROOT, Path(__file__).resolve().parents[2]]:
            test_path = base / "data" / "datasets"
            if test_path.exists():
                DATASETS_DIR = test_path
                break

print(f"DATASETS_DIR resolved to: {DATASETS_DIR} (exists: {DATASETS_DIR.exists()})")


@router.get("/conjunction-events")
def get_conjunction_events(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get conjunction events from both database and supplemental dataset.
    Returns combined view with database events first, then dataset events.
    """
    # Get live events from database
    db_events = (
        db.query(ConjunctionEventDB)
        .options(
            joinedload(ConjunctionEventDB.object_a),
            joinedload(ConjunctionEventDB.object_b),
        )
        .filter_by(resolved=False)
        .order_by(ConjunctionEventDB.pc.desc())
        .limit(50)
        .all()
    )
    
    # Format database events
    formatted_db_events = []
    for event in db_events:
        formatted_db_events.append({
            "id": event.id,
            "object_a": {
                "norad_id": event.object_a_norad_id,
                "name": event.object_a.name if event.object_a else f"NORAD {event.object_a_norad_id}",
                "type": "DEBRIS" if (event.object_a and event.object_a.is_debris) else "SATELLITE",
            },
            "object_b": {
                "norad_id": event.object_b_norad_id,
                "name": event.object_b.name if event.object_b else f"NORAD {event.object_b_norad_id}",
                "type": "DEBRIS" if (event.object_b and event.object_b.is_debris) else "SATELLITE",
            },
            "miss_distance_km": event.miss_distance_km,
            "relative_velocity_km_s": event.relative_velocity_km_s,
            "pc": event.pc,
            "risk_level": event.risk_level,
            "tca": event.tca.isoformat() if event.tca else None,
            "data_quality": event.data_quality,
        })
    
    # Load supplemental dataset events if available
    dataset_events = []
    dataset_path = DATASETS_DIR / "active_conjunctions.json"
    if dataset_path.exists():
        try:
            with open(dataset_path, 'r', encoding='utf-8') as f:
                dataset_data = json.load(f)
                dataset_events = dataset_data.get("conjunctions", [])
        except Exception as e:
            log.warning(f"Failed to load conjunction dataset: {e}")
    
    return {
        "metadata": {
            "database_events_count": len(formatted_db_events),
            "dataset_events_count": len(dataset_events),
            "total_events": len(formatted_db_events) + len(dataset_events),
            "source": "database + datasets/active_conjunctions.json"
        },
        "database_events": formatted_db_events,
        "dataset_events": dataset_events,
        "all_events": formatted_db_events + dataset_events
    }


@router.get("/communication-satellites")
def get_communication_satellites(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get communication satellites from database and supplemental dataset.
    """
    # Get from database
    comm_satellites = (
        db.query(TrackedObjectDB)
        .filter_by(is_debris=False)
        .limit(300)
        .all()
    )
    
    formatted_db_sats = []
    for sat in comm_satellites:
        formatted_db_sats.append({
            "norad_id": sat.norad_id,
            "name": sat.name,
            "tle_line1": sat.tle_line1,
            "tle_line2": sat.tle_line2,
            "pos_x_km": sat.pos_x_km,
            "pos_y_km": sat.pos_y_km,
            "pos_z_km": sat.pos_z_km,
            "is_debris": sat.is_debris,
        })
    
    # Load dataset
    dataset_sats = []
    dataset_path = DATASETS_DIR / "communication_constellations.json"
    if dataset_path.exists():
        try:
            with open(dataset_path, 'r', encoding='utf-8') as f:
                dataset_data = json.load(f)
                for constellation in dataset_data.get("constellations", []):
                    for sat in constellation.get("satellites", []):
                        dataset_sats.append({
                            **sat,
                            "constellation": constellation["name"],
                            "operator": constellation["operator"],
                            "importance": constellation.get("importance", ""),
                        })
        except Exception as e:
            log.warning(f"Failed to load communication constellations dataset: {e}")
    
    # Constellation summary from dataset
    constellations_summary = []
    if dataset_path.exists():
        try:
            with open(dataset_path, 'r', encoding='utf-8') as f:
                dataset_data = json.load(f)
                for const in dataset_data.get("constellations", []):
                    constellations_summary.append({
                        "name": const["name"],
                        "operator": const["operator"],
                        "description": const["description"],
                        "importance": const["importance"],
                        "satellites_count": const["count"],
                        "orbit_type": const["orbit_type"],
                        "altitude_km": const["altitude_km"],
                    })
        except Exception as e:
            log.warning(f"Failed to load constellation summary: {e}")
    
    return {
        "metadata": {
            "database_satellites_count": len(formatted_db_sats),
            "dataset_satellites_count": len(dataset_sats),
            "source": "database + datasets/communication_constellations.json"
        },
        "database_satellites": formatted_db_sats,
        "dataset_satellites": dataset_sats,
        "constellations_summary": constellations_summary,
        "total_satellites": len(formatted_db_sats) + len(dataset_sats)
    }


@router.get("/debris-clouds")
def get_debris_clouds(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get debris clouds information from dataset.
    """
    dataset_path = DATASETS_DIR / "debris_clouds.json"
    debris_data = {}
    
    if dataset_path.exists():
        try:
            with open(dataset_path, 'r', encoding='utf-8') as f:
                debris_data = json.load(f)
        except Exception as e:
            log.warning(f"Failed to load debris clouds dataset: {e}")
    
    # Get from database
    debris_objects = (
        db.query(TrackedObjectDB)
        .filter_by(is_debris=True)
        .limit(350)
        .all()
    )
    
    formatted_debris = []
    for obj in debris_objects:
        formatted_debris.append({
            "norad_id": obj.norad_id,
            "name": obj.name,
            "tle_line1": obj.tle_line1,
            "tle_line2": obj.tle_line2,
            "pos_x_km": obj.pos_x_km,
            "pos_y_km": obj.pos_y_km,
            "pos_z_km": obj.pos_z_km,
            "is_debris": obj.is_debris,
        })
    
    return {
        "metadata": {
            "database_debris_count": len(formatted_debris),
            "dataset_events_count": len(debris_data.get("debris_clouds", [])),
            "source": "database + datasets/debris_clouds.json"
        },
        "database_debris": formatted_debris,
        "dataset": debris_data,
        "total_debris": len(formatted_debris) + sum(
            len(cloud.get("fragments", [])) for cloud in debris_data.get("debris_clouds", [])
        )
    }


@router.get("/tracking-telemetry")
def get_tracking_telemetry(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get real-time tracking telemetry combining live metrics with dataset reference data.
    """
    # Live metrics from database
    objects_count = db.query(TrackedObjectDB).count()
    debris_count = db.query(TrackedObjectDB).filter_by(is_debris=True).count()
    comm_count = db.query(TrackedObjectDB).filter_by(is_debris=False).count()
    active_events_count = db.query(ConjunctionEventDB).filter_by(resolved=False).count()
    total_events_count = db.query(ConjunctionEventDB).count()
    # plans_count = db.query().count()  # Commented out - requires ManeuverPlanDB import
    
    # Load dataset for reference/context data
    telemetry_data = {}
    dataset_path = DATASETS_DIR / "tracking_telemetry.json"
    if dataset_path.exists():
        try:
            with open(dataset_path, 'r', encoding='utf-8') as f:
                telemetry_data = json.load(f)
        except Exception as e:
            log.warning(f"Failed to load tracking telemetry dataset: {e}")
    
    # Combine live + dataset
    live_data = {
        "timestamp": None,  # Would use datetime.now(timezone.utc).isoformat()
        "system_status": {
            "database_status": "NOMINAL",
            "total_objects_tracked": objects_count,
            "debris_count": debris_count,
            "communication_satellites": comm_count,
            "active_events": active_events_count,
            "total_events": total_events_count,
        }
    }
    
    return {
        "metadata": {
            "source": "live database + datasets/tracking_telemetry.json",
            "live_data": True,
            "dataset_available": dataset_path.exists()
        },
        "live_metrics": live_data,
        "dataset_context": telemetry_data,
        "combined": {
            "system_status": live_data["system_status"],
            "visualization_data": telemetry_data.get("visualization_data", {}),
            "mission_metrics": telemetry_data.get("mission_metrics", {}),
            "recent_activity": telemetry_data.get("recent_activity_feed", []),
        }
    }


@router.get("/problem-context")
def get_problem_context(current_user: UserDB = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get problem statement context and background information.
    This is static reference data, no database query needed.
    """
    dataset_path = DATASETS_DIR / "problem_context.json"
    context_data = {}
    
    if dataset_path.exists():
        try:
            with open(dataset_path, 'r', encoding='utf-8') as f:
                context_data = json.load(f)
        except Exception as e:
            log.warning(f"Failed to load problem context dataset: {e}")
    
    return {
        "metadata": {
            "source": "datasets/problem_context.json",
            "problem_statement": context_data.get("metadata", {}).get("problem_statement", "")
        },
        "context": context_data
    }


@router.get("/all-datasets")
def get_all_datasets_info(current_user: UserDB = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get information about all available datasets and their status.
    """
    datasets_info = []
    dataset_files = [
        ("communication_constellations.json", "Communication Constellations"),
        ("debris_clouds.json", "Debris Clouds"),
        ("active_conjunctions.json", "Active Conjunctions"),
        ("tracking_telemetry.json", "Tracking Telemetry"),
        ("problem_context.json", "Problem Context"),
    ]
    
    for filename, description in dataset_files:
        filepath = DATASETS_DIR / filename
        info = {
            "filename": filename,
            "description": description,
            "available": filepath.exists(),
            "size_bytes": filepath.stat().st_size if filepath.exists() else 0,
        }
        
        if filepath.exists():
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    meta = data.get("metadata", {})
                    info["metadata_name"] = meta.get("name", "")
                    info["metadata_description"] = meta.get("description", "")
                    info["generated"] = meta.get("generated", "")
                    
                    # Count items
                    count = 0
                    if "satellites" in data:
                        count = len(data["satellites"])
                    elif "conjunctions" in data:
                        count = len(data["conjunctions"])
                    elif "debris_clouds" in data:
                        count = len(data["debris_clouds"])
                    elif "fragments" in data:
                        count = len(data["fragments"])
                    info["item_count"] = count
            except Exception as e:
                info["load_error"] = str(e)
        
        datasets_info.append(info)
    
    return {
        "datasets": datasets_info,
        "total_datasets": len(datasets_info),
        "datasets_available": sum(1 for d in datasets_info if d["available"])
    }
