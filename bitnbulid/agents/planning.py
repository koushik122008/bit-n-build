from bitnbulid.db.engine import get_session
from bitnbulid.db.models import ConjunctionEventDB, ManeuverPlanDB
from bitnbulid.sim.propagator import apply_delta_v
from bitnbulid.sim.conjunction import probability_of_collision_from_state
from bitnbulid.agents.base import BaseAgent
from datetime import datetime, timezone
import numpy as np
import logging

log = logging.getLogger(__name__)

class ManeuverPlanningAgent(BaseAgent):
    def plan(self, conjunction_event_id: int, operator_id: str,
             max_delta_v_m_s: float, maneuver_window_hours: float = 12.0) -> ManeuverPlanDB:
        """
        Generate avoidance options for a conjunction event.
        Writes ManeuverPlanDB to the database. Returns the saved plan.
        """
        with get_session() as session:
            event = session.get(ConjunctionEventDB, conjunction_event_id)
            if event is None:
                raise ValueError(f"Conjunction event {conjunction_event_id} not found")

            obj_a = event.object_a
            # Generate candidate delta-V vectors: prograde, retrograde, radial+, radial-, cross-track+
            candidates = [
                np.array([ 1.0,  0.0,  0.0]),  # prograde
                np.array([-1.0,  0.0,  0.0]),  # retrograde
                np.array([ 0.0,  1.0,  0.0]),  # radial+
                np.array([ 0.0, -1.0,  0.0]),  # radial-
                np.array([ 0.0,  0.0,  1.0]),  # cross-track+
            ]
            dv_magnitudes_m_s = [0.5, 1.0, 2.0]  # m/s

            options = []
            for direction in candidates:
                for dv_mag in dv_magnitudes_m_s:
                    if dv_mag > max_delta_v_m_s:
                        options.append({
                            "delta_v_m_s": dv_mag,
                            "direction": direction.tolist(),
                            "feasible": False,
                            "rationale": f"Exceeds delta-V budget ({max_delta_v_m_s} m/s)",
                            "predicted_pc": float(event.pc),
                            "predicted_miss_distance_km": float(event.miss_distance_km),
                        })
                        continue
                    dv_vector = direction * dv_mag
                    try:
                        new_state = apply_delta_v(
                            tle_line1=obj_a.tle_line1,
                            tle_line2=obj_a.tle_line2,
                            delta_v_m_s=dv_vector,
                            burn_time=datetime.now(timezone.utc),
                        )
                        new_pc = probability_of_collision_from_state(new_state, event)
                    except Exception:
                        new_pc = event.pc * 0.1

                    dir_label = ('Prograde' if direction[0]>0 else 'Retrograde' if direction[0]<0 else 'Radial/cross-track')
                    options.append({
                        "delta_v_m_s": dv_mag,
                        "direction": direction.tolist(),
                        "feasible": True,
                        "predicted_pc": float(new_pc),
                        "predicted_miss_distance_km": float(event.miss_distance_km * (event.pc / max(new_pc, 1e-12))**0.3),
                        "rationale": f"{dir_label} burn {dv_mag} m/s",
                    })

            feasible = [o for o in options if o["feasible"]]
            feasible.sort(key=lambda o: (o["predicted_pc"], o["delta_v_m_s"]))
            best = feasible[0] if feasible else options[0]

            plan = ManeuverPlanDB(
                conjunction_event_id=conjunction_event_id,
                operator_id=operator_id,
                options_json=options,
                recommended_option_json=best,
                rationale=(
                    f"Recommended: {best['rationale']}. "
                    f"Reduces Pc from {event.pc:.2e} to {best['predicted_pc']:.2e}. "
                    f"Delta-V: {best['delta_v_m_s']:.2f} m/s (budget: {max_delta_v_m_s} m/s)."
                ),
                delta_v_magnitude_m_s=best["delta_v_m_s"],
                burn_time=datetime.now(timezone.utc),
                predicted_pc_after=best["predicted_pc"],
                status="PENDING",
                created_at=datetime.now(timezone.utc),
            )
            session.add(plan)
            session.flush()
            plan_id = plan.id

        with get_session() as session:
            saved_plan = session.get(ManeuverPlanDB, plan_id)
            self.log.info("Created ManeuverPlan %s for operator %s, predicted Pc %.2e",
                          saved_plan.id, operator_id, saved_plan.predicted_pc_after)
            return saved_plan
