from bitnbulid.db.engine import get_session
from bitnbulid.db.models import ManeuverPlanDB, CoordinationDecisionDB
from bitnbulid.agents.base import BaseAgent
from datetime import datetime, timezone
import logging

log = logging.getLogger(__name__)

class CoordinationAgent(BaseAgent):
    def resolve(self, conjunction_event_id: int) -> CoordinationDecisionDB:
        """
        Load all PENDING ManeuverPlans for this conjunction event.
        Apply conflict-resolution rules. Write CoordinationDecision to DB.
        Update ManeuverPlan statuses to ACCEPTED or REJECTED.
        """
        with get_session() as session:
            plans = (session.query(ManeuverPlanDB)
                     .filter_by(conjunction_event_id=conjunction_event_id, status="PENDING")
                     .all())

            if not plans:
                raise ValueError(f"No pending plans for event {conjunction_event_id}")

            operators = [p.operator_id for p in plans]
            conflict = len(plans) > 1

            if not conflict:
                accepted = [plans[0].operator_id]
                rejected = []
                rationale = "Single proposal - accepted without conflict."
                plans[0].status = "ACCEPTED"
                primary_plan_id = plans[0].id
            else:
                # Rule: lowest delta-V wins (tie-break by earliest submission)
                plans.sort(key=lambda p: (p.delta_v_magnitude_m_s, p.created_at))
                winner = plans[0]
                losers = plans[1:]
                accepted = [winner.operator_id]
                rejected = [p.operator_id for p in losers]
                winner.status = "ACCEPTED"
                for p in losers:
                    p.status = "REJECTED"
                primary_plan_id = winner.id
                rationale = (
                    f"Conflict detected between {len(plans)} proposals. "
                    f"Accepted {winner.operator_id} (lowest delta-V: {winner.delta_v_magnitude_m_s:.2f} m/s). "
                    f"Rejected: {', '.join(rejected)}."
                )

            decision = CoordinationDecisionDB(
                maneuver_plan_id=primary_plan_id,
                conjunction_event_id=conjunction_event_id,
                proposals_received_json=operators,
                accepted_operator_ids_json=accepted,
                rejected_operator_ids_json=rejected,
                conflict_detected=conflict,
                resolution_rationale=rationale,
                decided_at=datetime.now(timezone.utc),
            )
            session.add(decision)
            session.flush()
            decision_id = decision.id

        with get_session() as session:
            saved_decision = session.get(CoordinationDecisionDB, decision_id)
            self.log.info("Coordination decision for event %d: %s", conjunction_event_id, rationale)
            return saved_decision
