"""
Fetch live TLEs, propagate orbits, screen conjunctions, generate maneuver plans, and seed full telemetry data.
Run via: python scripts/seed_catalog.py
"""
import sys
from pathlib import Path

# Add project root to python path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from bitnbulid.config import settings
from bitnbulid.db.engine import get_session
from bitnbulid.db.models import TrackedObjectDB, ConjunctionEventDB, ManeuverPlanDB, CoordinationDecisionDB
from bitnbulid.sim.propagator import propagate_tle
from bitnbulid.agents.tracking import TrackingAgent
from bitnbulid.agents.planning import ManeuverPlanningAgent
from bitnbulid.agents.coordination import CoordinationAgent
from datetime import datetime, timezone
import logging

log = logging.getLogger(__name__)

def seed() -> int:
    print("=== Ingesting Orbital Catalog TLE Data ===")
    from bitnbulid.ingest.celestrak import fetch_tles

    groups = ["stations", "starlink", "geo", "gps-ops", "weather", "resource", "cosmos-1408-deb", "1999-025"]
    all_tles = []
    for g in groups:
        try:
            t = fetch_tles(g)
            if t:
                all_tles.extend(t)
                print(f"  -> Fetched {len(t)} TLEs for group '{g}'")
        except Exception as e:
            print(f"  -> Notice for group '{g}': {e}")

    if not all_tles:
        # Fallback stable TLE set
        all_tles = [
            ("ISS (ZARYA)", "1 25544U 98067A   24001.50000000  .00002182  00000-0  40768-4 0  9997", "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.50919022439452"),
            ("TIANGONG", "1 48274U 21035A   24001.50000000  .00005000  00000-0  10000-3 0  9991", "2 48274  41.4700 210.1200 0004000 120.0000 240.0000 15.60000000100001"),
            ("COSMOS 1408 DEBRIS A", "1 99001U 00001A   24001.50000000  .00000000  00000-0  00000-0 0  9990", "2 99001  51.6416 247.4627 0001000 130.5360 325.0288 15.50919022000001"),
            ("STARLINK-1007", "1 44713U 19074A   24001.50000000  .00001000  00000-0  50000-4 0  9995", "2 44713  53.0500 180.2000 0001500 100.0000 260.0000 15.06000000200001"),
            ("FENGYUN 1C DEBRIS", "1 99002U 00002A   24001.50000000  .00000000  00000-0  00000-0 0  9992", "2 99002  98.6000 150.0000 0010000 110.0000 250.0000 14.80000000300001"),
        ]

    print(f"Total TLE records collected: {len(all_tles)}")

    total_objects = 0
    seen_norad_ids = set()
    with get_session() as session:
        inserted = 0
        updated = 0
        for name, line1, line2 in all_tles:
            try:
                norad_id = int(line2[2:7])
            except ValueError:
                continue

            if norad_id in seen_norad_ids:
                continue
            seen_norad_ids.add(norad_id)

            # Compute SGP4 state vector
            sv = None
            try:
                sv = propagate_tle(line1, line2, horizon_hours=24.0)
            except Exception:
                pass

            existing = session.query(TrackedObjectDB).filter_by(norad_id=norad_id).first()
            if existing:
                existing.tle_line1 = line1
                existing.tle_line2 = line2
                if sv:
                    existing.pos_x_km, existing.pos_y_km, existing.pos_z_km = float(sv.position_km[0]), float(sv.position_km[1]), float(sv.position_km[2])
                    existing.vel_x_km_s, existing.vel_y_km_s, existing.vel_z_km_s = float(sv.velocity_km_s[0]), float(sv.velocity_km_s[1]), float(sv.velocity_km_s[2])
                    existing.state_epoch = datetime.now(timezone.utc)
                existing.last_updated = datetime.now(timezone.utc)
                updated += 1
            else:
                obj = TrackedObjectDB(
                    norad_id=norad_id,
                    name=name,
                    tle_line1=line1,
                    tle_line2=line2,
                    pos_x_km=float(sv.position_km[0]) if sv else None,
                    pos_y_km=float(sv.position_km[1]) if sv else None,
                    pos_z_km=float(sv.position_km[2]) if sv else None,
                    vel_x_km_s=float(sv.velocity_km_s[0]) if sv else None,
                    vel_y_km_s=float(sv.velocity_km_s[1]) if sv else None,
                    vel_z_km_s=float(sv.velocity_km_s[2]) if sv else None,
                    state_epoch=datetime.now(timezone.utc) if sv else None,
                    is_debris=("deb" in name.lower() or "debris" in name.lower() or "cosmos" in name.lower()),
                    last_updated=datetime.now(timezone.utc),
                )
                session.add(obj)
                inserted += 1
        total_objects = inserted + updated
        print(f"Catalog Seed Summary: {inserted} new objects, updated {updated} existing (Total: {total_objects})")

    # Run TrackingAgent screening to populate Conjunction Events
    print("=== Running Tracking Agent Screening ===")
    tracker = TrackingAgent()
    events = tracker.step()
    print(f"  -> Generated {len(events)} Conjunction Events from screening.")

    # Ensure demo conjunction events across risk levels exist
    with get_session() as session:
        evt_count = session.query(ConjunctionEventDB).count()
        if evt_count < 3:
            objects = session.query(TrackedObjectDB).all()
            if len(objects) >= 2:
                id1, id2 = objects[0].norad_id, objects[1].norad_id
                demo_events = [
                    ConjunctionEventDB(
                        object_a_norad_id=id1, object_b_norad_id=id2,
                        tca=datetime.now(timezone.utc), miss_distance_km=0.045, relative_velocity_km_s=10.2,
                        pc=2.4e-2, risk_level="CRITICAL", data_quality="GOOD", created_at=datetime.now(timezone.utc)
                    ),
                    ConjunctionEventDB(
                        object_a_norad_id=id1, object_b_norad_id=id2,
                        tca=datetime.now(timezone.utc), miss_distance_km=0.350, relative_velocity_km_s=8.7,
                        pc=1.8e-3, risk_level="HIGH", data_quality="GOOD", created_at=datetime.now(timezone.utc)
                    ),
                    ConjunctionEventDB(
                        object_a_norad_id=id1, object_b_norad_id=id2,
                        tca=datetime.now(timezone.utc), miss_distance_km=1.420, relative_velocity_km_s=7.4,
                        pc=3.5e-4, risk_level="MEDIUM", data_quality="GOOD", created_at=datetime.now(timezone.utc)
                    ),
                ]
                session.add_all(demo_events)
                session.flush()
                print("  -> Created synthetic demonstration conjunction events across CRITICAL, HIGH, and MEDIUM risk levels.")

    # Generate Avoidance Maneuver Plans & Coordination Decisions
    print("=== Generating Maneuver Plans & Coordination Decisions ===")
    planner = ManeuverPlanningAgent()
    coordinator = CoordinationAgent()

    with get_session() as session:
        active_events = session.query(ConjunctionEventDB).filter_by(resolved=False).limit(5).all()
        for evt in active_events:
            try:
                # Generate two proposals from different operators for multi-operator conflict simulation
                p1 = planner.plan(conjunction_event_id=evt.id, operator_id="OPERATOR-ALPHA", max_delta_v_m_s=2.0)
                p2 = planner.plan(conjunction_event_id=evt.id, operator_id="OPERATOR-BETA", max_delta_v_m_s=1.5)
                # Resolve conflict
                coordinator.resolve(conjunction_event_id=evt.id)
            except Exception as e:
                log.info("Plan/Resolve notice for event %d: %s", evt.id, e)

    print("=== Data Seeding Complete ===")
    return total_objects

if __name__ == "__main__":
    seed()
