from bitnbulid.db.engine import get_session
from bitnbulid.db.models import TrackedObjectDB, ConjunctionEventDB
from bitnbulid.sim.propagator import propagate_tle
from bitnbulid.sim.conjunction import screen_all_pairs, probability_of_collision
from bitnbulid.config import settings
from bitnbulid.agents.base import BaseAgent
from datetime import datetime, timezone
import logging

log = logging.getLogger(__name__)

from sqlalchemy.orm import joinedload

class TrackingAgent(BaseAgent):
    def step(self) -> list[ConjunctionEventDB]:
        """
        One full cycle:
        1. Load all objects from DB
        2. Propagate each forward settings.screening_horizon_hours
        3. Write updated state vectors back to DB
        4. Screen all pairs for conjunctions
        5. Compute Pc for each conjunction
        6. Write new ConjunctionEvent rows to DB for events above threshold
        7. Return the new events
        """
        new_event_ids = []
        with get_session() as session:
            objects = session.query(TrackedObjectDB).all()
            self.log.info("Tracking step: %d objects", len(objects))

            # propagate + update states
            states = {}
            for obj in objects:
                try:
                    sv = propagate_tle(obj.tle_line1, obj.tle_line2,
                                       horizon_hours=settings.screening_horizon_hours)
                    obj.pos_x_km, obj.pos_y_km, obj.pos_z_km = float(sv.position_km[0]), float(sv.position_km[1]), float(sv.position_km[2])
                    obj.vel_x_km_s, obj.vel_y_km_s, obj.vel_z_km_s = float(sv.velocity_km_s[0]), float(sv.velocity_km_s[1]), float(sv.velocity_km_s[2])
                    obj.state_epoch = datetime.now(timezone.utc)
                    states[obj.norad_id] = sv
                except Exception as e:
                    self.log.warning("Propagation failed for %s: %s", obj.name, e)

            # screen pairs
            pairs = screen_all_pairs(states, settings.screening_distance_km)
            for pair in pairs:
                pc = probability_of_collision(pair)
                if pc >= settings.pc_alert_threshold:
                    risk = ("CRITICAL" if pc > 1e-2 else
                            "HIGH"     if pc > 1e-3 else
                            "MEDIUM"   if pc > 1e-4 else "LOW")
                    event = ConjunctionEventDB(
                        object_a_norad_id=pair.object_a_norad_id,
                        object_b_norad_id=pair.object_b_norad_id,
                        tca=pair.tca,
                        miss_distance_km=pair.miss_distance_km,
                        relative_velocity_km_s=pair.relative_velocity_km_s,
                        pc=pc,
                        risk_level=risk,
                        data_quality="GOOD",
                        created_at=datetime.now(timezone.utc),
                    )
                    session.add(event)
                    session.flush()
                    new_event_ids.append(event.id)

            self.log.info("Found %d new conjunction events above threshold", len(new_event_ids))

        # Re-fetch populated DB objects in fresh session with eager-loaded relationships
        with get_session() as session:
            events = (session.query(ConjunctionEventDB)
                      .options(joinedload(ConjunctionEventDB.object_a), joinedload(ConjunctionEventDB.object_b))
                      .filter(ConjunctionEventDB.id.in_(new_event_ids))
                      .all()) if new_event_ids else []
            return events
