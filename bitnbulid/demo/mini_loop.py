"""
End-to-end demo — run with: python -m bitnbulid.demo.mini_loop

Requires: scripts/setup.py already run (DB seeded).
"""
import logging, sys
from bitnbulid.agents.tracking import TrackingAgent
from bitnbulid.agents.planning import ManeuverPlanningAgent
from bitnbulid.agents.coordination import CoordinationAgent
from bitnbulid.db.engine import get_session
from bitnbulid.db.models import ConjunctionEventDB, TrackedObjectDB
from bitnbulid.config import settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("mini_loop")

def ensure_test_conjunction_if_needed():
    """Ensure at least one conjunction event exists for demo purposes if catalog screening yielded 0 events."""
    with get_session() as session:
        existing = session.query(ConjunctionEventDB).first()
        if existing:
            return existing

        objects = session.query(TrackedObjectDB).all()
        if len(objects) < 2:
            obj1 = TrackedObjectDB(
                norad_id=25544, name="ISS (ZARYA)",
                tle_line1="1 25544U 98067A   24001.50000000  .00002182  00000-0  40768-4 0  9997",
                tle_line2="2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.50919022439452",
                is_debris=False
            )
            obj2 = TrackedObjectDB(
                norad_id=99001, name="COSMOS DEBRIS",
                tle_line1="1 99001U 00001A   24001.50000000  .00000000  00000-0  00000-0 0  9990",
                tle_line2="2 99001  51.6416 247.4627 0001000 130.5360 325.0288 15.50919022000001",
                is_debris=True
            )
            session.add(obj1)
            session.add(obj2)
            session.flush()
            id1, id2 = obj1.norad_id, obj2.norad_id
        else:
            id1, id2 = objects[0].norad_id, objects[1].norad_id

        from datetime import datetime, timezone
        mock_event = ConjunctionEventDB(
            object_a_norad_id=id1,
            object_b_norad_id=id2,
            tca=datetime.now(timezone.utc),
            miss_distance_km=0.85,
            relative_velocity_km_s=10.2,
            pc=1.5e-3,
            risk_level="HIGH",
            data_quality="GOOD",
            created_at=datetime.now(timezone.utc)
        )
        session.add(mock_event)
        session.flush()
        event_id = mock_event.id

    with get_session() as session:
        return session.get(ConjunctionEventDB, event_id)

def run():
    print("\n=== Bit-N-Bulid Mini Loop Demo ===\n")

    print("Step 1: Tracking agent -- propagate all objects, screen for conjunctions...")
    tracker = TrackingAgent()
    events = tracker.step()
    print(f"  -> {len(events)} conjunction event(s) found above Pc threshold\n")

    if not events:
        print("  -> Seeded catalog screened cleanly; creating synthetic high-risk conjunction for demo...")
        event = ensure_test_conjunction_if_needed()
    else:
        # Pick highest-risk event
        event = sorted(events, key=lambda e: -e.pc)[0]

    print(f"Step 2: Highest-risk event selected:")
    print(f"  Objects:       {event.object_a_norad_id} vs {event.object_b_norad_id}")
    print(f"  TCA:           {event.tca}")
    print(f"  Miss distance: {event.miss_distance_km:.3f} km")
    print(f"  Pc (before):   {event.pc:.2e}")
    print(f"  Risk level:    {event.risk_level}\n")

    print("Step 3: Maneuver planning agent -- generating avoidance options...")
    planner = ManeuverPlanningAgent()
    plan = planner.plan(
        conjunction_event_id=event.id,
        operator_id="OPERATOR-ALPHA",
        max_delta_v_m_s=2.0,
        maneuver_window_hours=12.0,
    )
    rec = plan.recommended_option_json
    print(f"  Recommended: {rec['rationale']}")
    print(f"  Delta-V:     {rec['delta_v_m_s']:.2f} m/s")
    print(f"  Pc (after):  {plan.predicted_pc_after:.2e}")
    print(f"  Plan saved to DB (id={plan.id})\n")

    print("Step 4: Coordination agent -- reviewing proposal...")
    coordinator = CoordinationAgent()
    decision = coordinator.resolve(conjunction_event_id=event.id)
    print(f"  Conflict detected: {decision.conflict_detected}")
    print(f"  Accepted:  {decision.accepted_operator_ids_json}")
    print(f"  Rationale: {decision.resolution_rationale}")
    print(f"  Decision saved to DB (id={decision.id})\n")

    print("Step 5: Verifying Pc improvement...")
    pc_before = event.pc
    pc_after  = plan.predicted_pc_after
    improved  = pc_after < pc_before
    print(f"  Pc before maneuver: {pc_before:.2e}")
    print(f"  Pc after maneuver:  {pc_after:.2e}")
    print(f"  Improvement:        {'YES [OK]' if improved else 'NO - check planning logic'}\n")

    if not improved:
        print("WARNING: Pc did not improve. Check propagation and planning logic.")
        sys.exit(1)

    print("=== Mini loop complete -- all steps passed ===")
    sys.exit(0)

if __name__ == "__main__":
    run()
