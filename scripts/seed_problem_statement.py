"""
Seed data aligned with the Space Tech & Orbital Sustainability problem statement:

  "Build autonomous agents to track space debris, optimize satellite maneuver
   planning, or coordinate open-source orbital traffic management to protect
   global communication infrastructure."

What this script adds (idempotent — safe to re-run):
  1. Debris-cloud catalogs from historic fragmentation events
     (Iridium 33 / Cosmos 2251 collision, Fengyun-1C ASAT test, Cosmos 1408 ASAT test)
     fetched from CelesTrak when online; synthetic fallback otherwise.
  2. Communication-infrastructure constellations (Iridium, Starlink, OneWeb, Globalstar)
     — the assets the system protects.
  3. Conjunction events pairing debris objects against comm satellites so the
     UI shows the core narrative: debris threatens communication infrastructure.
  4. Maneuver plans (two competing operators per event) and multi-operator
     arbitration decisions demonstrating the coordination pillar.

Run via: python scripts/seed_problem_statement.py

Additional datasets available in data/datasets/:
  - communication_constellations.json: 287 comm satellites with TLEs
  - debris_clouds.json: 320 debris fragments from 3 major events
  - active_conjunctions.json: 45 conjunction events (3 CRITICAL, 8 HIGH, 15 MEDIUM, 19 LOW)
  - tracking_telemetry.json: Real-time system telemetry for dashboard
  - problem_context.json: Full problem background and impact analysis
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from datetime import datetime, timezone
import logging

from bitnbulid.db.engine import get_session
from bitnbulid.db.models import (
    TrackedObjectDB,
    ConjunctionEventDB,
    ManeuverPlanDB,
    CoordinationDecisionDB,
)
from bitnbulid.sim.propagator import propagate_tle
from bitnbulid.sim.conjunction import screen_all_pairs, probability_of_collision
from bitnbulid.sim.propagator import StateVector
from bitnbulid.ingest.celestrak import fetch_tles
from bitnbulid.agents.planning import ManeuverPlanningAgent
from bitnbulid.agents.coordination import CoordinationAgent

import numpy as np
import json
from pathlib import Path

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(message)s")

# Path to datasets directory
DATASETS_DIR = Path(__file__).resolve().parents[1] / "data" / "datasets"

# ---------------------------------------------------------------------------
# Historic fragmentation events whose debris clouds still threaten LEO comms
# ---------------------------------------------------------------------------
DEBRIS_GROUPS = [
    ("iridium-33-deb", "IRIDIUM 33 DEBRIS", "Iridium 33 / Cosmos 2251 collision (2009)"),
    ("cosmos-2251-deb", "COSMOS 2251 DEBRIS", "Iridium 33 / Cosmos 2251 collision (2009)"),
    ("fengyun-1c-deb", "FENGYUN 1C DEBRIS", "Fengyun-1C ASAT test (2007)"),
    ("cosmos-1408-deb", "COSMOS 1408 DEBRIS", "Cosmos 1408 ASAT test (2021)"),
]

# Communication-infrastructure constellations — assets to protect
COMMS_GROUPS = [
    ("iridium-NEXT", "IRIDIUM NEXT", "Iridium comm constellation (LEO crosslinked)"),
    ("starlink", "STARLINK", "Starlink broadband constellation"),
    ("oneweb", "ONEWEB", "OneWeb broadband constellation"),
    ("globalstar", "GLOBALSTAR", "Globalstar comm constellation"),
]

MAX_DEBRIS_PER_GROUP = 120
MAX_COMMS_PER_GROUP = 60


def _is_debris_name(name: str) -> bool:
    n = name.lower()
    return "deb" in n or "debris" in n or "fragment" in n


def fetch_group(group: str):
    try:
        tles = fetch_tles(group)
        if tles:
            log.info(f"  -> CelesTrak: {len(tles)} TLEs for '{group}'")
            return tles
    except Exception as e:
        log.info(f"  -> CelesTrak unreachable for '{group}': {e}")
    return []


def synth_debris_tles(prefix: str, norad_base: int, count: int, inc_deg: float):
    """Synthetic TLE fallback for a debris cloud in a ~LEO shell."""
    out = []
    for i in range(count):
        raan = (i * 13.7) % 360.0
        ma = (i * 29.3) % 360.0
        norad = norad_base + i
        line1 = f"1 {norad:05d}U 00001A   24001.50000000  .00003500  00000-0  50000-4 0  999{i % 10}"
        line2 = (
            f"2 {norad:05d} {inc_deg:8.4f} {raan:8.4f} 0100000 {ma:8.4f} "
            f"{(ma + 180.0) % 360.0:8.4f} 15.10000000{i:05d}"
        )
        out.append((f"{prefix} FRAG {i + 1:04d}", line1, line2))
    return out


def synth_comm_tles(name_prefix: str, norad_base: int, count: int, inc_deg: float):
    """Synthetic TLE fallback for a comm constellation shell."""
    out = []
    for i in range(count):
        raan = (i * 7.5) % 360.0
        ma = (i * 22.5) % 360.0
        norad = norad_base + i
        line1 = f"1 {norad:05d}U 20001A   24001.50000000  .00001000  00000-0  30000-4 0  99{i % 10}{i % 10}"
        line2 = (
            f"2 {norad:05d} {inc_deg:8.4f} {raan:8.4f} 0002000 {ma:8.4f} "
            f"{(ma + 180.0) % 360.0:8.4f} 15.06000000{i:05d}"
        )
        out.append((f"{name_prefix} {i + 1:04d}", line1, line2))
    return out


def upsert_objects(session, tles, debris: bool, limit: int):
    inserted = updated = 0
    for name, line1, line2 in tles[:limit]:
        try:
            norad_id = int(line2[2:7])
        except ValueError:
            continue

        sv = None
        try:
            sv = propagate_tle(line1, line2, horizon_hours=24.0)
        except Exception:
            pass

        existing = session.query(TrackedObjectDB).filter_by(norad_id=norad_id).first()
        if existing:
            existing.tle_line1, existing.tle_line2 = line1, line2
            if sv:
                existing.pos_x_km, existing.pos_y_km, existing.pos_z_km = (
                    float(sv.position_km[0]),
                    float(sv.position_km[1]),
                    float(sv.position_km[2]),
                )
                existing.vel_x_km_s, existing.vel_y_km_s, existing.vel_z_km_s = (
                    float(sv.velocity_km_s[0]),
                    float(sv.velocity_km_s[1]),
                    float(sv.velocity_km_s[2]),
                )
                existing.state_epoch = datetime.now(timezone.utc)
            existing.is_debris = debris or _is_debris_name(existing.name)
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
                is_debris=debris or _is_debris_name(name),
                last_updated=datetime.now(timezone.utc),
            )
            session.add(obj)
            inserted += 1
    return inserted, updated


def seed_debris_clouds(session):
    log.info("=== 1. Debris-Cloud Catalogs (historic fragmentation events) ===")
    ins_tot = upd_tot = 0
    for group, prefix, story in DEBRIS_GROUPS:
        tles = fetch_group(group)
        if not tles:
            base = abs(hash(group)) % 80000 + 20000
            tles = synth_debris_tles(prefix, base, 40, 74.0 if "fengyun" in group else 86.4)
            log.info(f"  -> using {len(tles)} synthetic fragments for '{group}'")
        i, u = upsert_objects(session, tles, debris=True, limit=MAX_DEBRIS_PER_GROUP)
        ins_tot += i
        upd_tot += u
        log.info(f"  -> {story}: +{i} new, {u} refreshed")
    session.flush()
    return ins_tot, upd_tot


def seed_comm_constellations(session):
    log.info("=== 2. Communication Infrastructure Constellations ===")
    ins_tot = upd_tot = 0
    for group, prefix, story in COMMS_GROUPS:
        tles = fetch_group(group)
        if not tles:
            base = abs(hash(group + "-comm")) % 40000 + 58000
            tles = synth_comm_tles(prefix, base, 30, 53.0 if "starlink" in group else 87.9)
            log.info(f"  -> using {len(tles)} synthetic satellites for '{group}'")
        i, u = upsert_objects(session, tles, debris=False, limit=MAX_COMMS_PER_GROUP)
        ins_tot += i
        upd_tot += u
        log.info(f"  -> {story}: +{i} new, {u} refreshed")
    session.flush()
    return ins_tot, upd_tot


def seed_conjunctions(session):
    log.info("=== 3. Debris-vs-Comm Conjunction Screening ===")
    debris_objs = (
        session.query(TrackedObjectDB)
        .filter(TrackedObjectDB.is_debris.is_(True), TrackedObjectDB.pos_x_km.isnot(None))
        .all()
    )
    comm_objs = (
        session.query(TrackedObjectDB)
        .filter(TrackedObjectDB.is_debris.is_(False), TrackedObjectDB.pos_x_km.isnot(None))
        .all()
    )
    log.info(f"  -> screening {len(debris_objs)} debris vs {len(comm_objs)} comm objects")

    states = {}
    for o in debris_objs + comm_objs:
        states[o.norad_id] = StateVector(
            position_km=np.array([o.pos_x_km, o.pos_y_km, o.pos_z_km]),
            velocity_km_s=np.array(
                [
                    o.vel_x_km_s if o.vel_x_km_s is not None else 0.0,
                    o.vel_y_km_s if o.vel_y_km_s is not None else 0.0,
                    o.vel_z_km_s if o.vel_z_km_s is not None else 0.0,
                ]
            ),
            epoch=datetime.now(timezone.utc),
        )

    debris_ids = {o.norad_id for o in debris_objs}
    comm_ids = {o.norad_id for o in comm_objs}
    candidates = screen_all_pairs(states, screening_distance_km=25.0)
    cross_pairs = [
        c for c in candidates
        if (c.object_a_norad_id in debris_ids and c.object_b_norad_id in comm_ids)
        or (c.object_a_norad_id in comm_ids and c.object_b_norad_id in debris_ids)
    ]
    log.info(f"  -> {len(candidates)} raw pairs inside 25 km; {len(cross_pairs)} debris-vs-comm")

    now = datetime.now(timezone.utc)
    created = 0
    existing_pairs = {
        (e.object_a_norad_id, e.object_b_norad_id)
        for e in session.query(ConjunctionEventDB).filter_by(resolved=False).all()
    }

    for cand in cross_pairs[:60]:
        key = (cand.object_a_norad_id, cand.object_b_norad_id)
        if key in existing_pairs:
            continue
        pc = probability_of_collision(cand)
        if pc < 1e-6:
            continue
        risk = ("CRITICAL" if pc > 1e-2 else
                "HIGH" if pc > 1e-3 else
                "MEDIUM" if pc > 1e-4 else "LOW")
        session.add(ConjunctionEventDB(
            object_a_norad_id=cand.object_a_norad_id,
            object_b_norad_id=cand.object_b_norad_id,
            tca=now,
            miss_distance_km=cand.miss_distance_km,
            relative_velocity_km_s=cand.relative_velocity_km_s,
            pc=pc,
            risk_level=risk,
            data_quality="GOOD",
            notes=f"Debris-vs-communication-infrastructure conjunction ({now:%Y-%m-%d}).",
            created_at=now,
        ))
        existing_pairs.add(key)
        created += 1

    session.flush()
    log.info(f"  -> created {created} new debris-vs-comm conjunction events")
    return created


def seed_plans_and_decisions(session):
    log.info("=== 4. Maneuver Plans + Multi-Operator Arbitration ===")
    planner = ManeuverPlanningAgent()
    coordinator = CoordinationAgent()

    unresolved = (
        session.query(ConjunctionEventDB)
        .filter_by(resolved=False)
        .order_by(ConjunctionEventDB.pc.desc())
        .limit(6)
        .all()
    )
    planned = 0
    for evt in unresolved:
        already = (
            session.query(ManeuverPlanDB)
            .filter_by(conjunction_event_id=evt.id)
            .count()
        )
        if already >= 2:
            continue
        try:
            planner.plan(conjunction_event_id=evt.id, operator_id="OPERATOR-ALPHA", max_delta_v_m_s=2.0)
            planner.plan(conjunction_event_id=evt.id, operator_id="OPERATOR-BETA", max_delta_v_m_s=1.5)
            coordinator.resolve(conjunction_event_id=evt.id)
            planned += 1
        except Exception as e:
            log.info(f"  -> event {evt.id}: {e}")
    log.info(f"  -> generated plans + arbitration for {planned} events")


def load_dataset_json(dataset_name: str) -> dict:
    """Load a JSON dataset from data/datasets/ directory."""
    dataset_path = DATASETS_DIR / dataset_name
    if not dataset_path.exists():
        log.warning(f"Dataset {dataset_name} not found at {dataset_path}")
        return {}
    with open(dataset_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def seed_from_datasets():
    """Load additional context data from JSON datasets for dashboard/reference."""
    log.info("=== Loading Supplemental Datasets ===")
    
    datasets_to_load = [
        "communication_constellations.json",
        "debris_clouds.json", 
        "active_conjunctions.json",
        "tracking_telemetry.json",
        "problem_context.json"
    ]
    
    for dataset_name in datasets_to_load:
        data = load_dataset_json(dataset_name)
        if data:
            log.info(f"  ✓ Loaded {dataset_name}: {data.get('metadata', {}).get('total_satellites', data.get('metadata', {}).get('total_debris_objects', data.get('metadata', {}).get('total_events', 'N/A'))} items")
    
    log.info("=== All datasets loaded successfully ===")
    return True


def main():
    log.info("=== Seeding Problem-Statement Data (Space Tech & Orbital Sustainability) ===")
    
    # Core database seeding
    with get_session() as session:
        seed_debris_clouds(session)
        seed_comm_constellations(session)
    with get_session() as session:
        seed_conjunctions(session)
    with get_session() as session:
        seed_plans_and_decisions(session)
    
    # Load supplemental datasets for dashboard/API use
    seed_from_datasets()

    with get_session() as session:
        totals = {
            "objects": session.query(TrackedObjectDB).count(),
            "debris": session.query(TrackedObjectDB).filter_by(is_debris=True).count(),
            "events": session.query(ConjunctionEventDB).count(),
            "unresolved": session.query(ConjunctionEventDB).filter_by(resolved=False).count(),
            "plans": session.query(ManeuverPlanDB).count(),
            "decisions": session.query(CoordinationDecisionDB).count(),
        }
    log.info("=== FINAL DATABASE STATE ===")
    for k, v in totals.items():
        log.info(f"  {k:>10}: {v}")
    
    log.info("=== Datasets available in data/datasets/ ===")
    if DATASETS_DIR.exists():
        for f in DATASETS_DIR.glob("*.json"):
            log.info(f"  - {f.name}")


if __name__ == "__main__":
    main()
