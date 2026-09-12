from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from bitnbulid.api.deps import get_db, get_current_user, require_role
from bitnbulid.api.models_auth import UserDB
from bitnbulid.db.models import ManeuverPlanDB, ConjunctionEventDB
from bitnbulid.api.schemas import ManeuverPlanRequest, ManeuverPlanResponse, CoordinationDecisionResponse
from bitnbulid.agents.planning import ManeuverPlanningAgent
from bitnbulid.agents.coordination import CoordinationAgent
from typing import List, Optional

router = APIRouter()

@router.get("", response_model=List[ManeuverPlanResponse])
def list_plans(
    conjunction_event_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    q = db.query(ManeuverPlanDB)
    if conjunction_event_id:
        q = q.filter(ManeuverPlanDB.conjunction_event_id == conjunction_event_id)
    if status:
        q = q.filter(ManeuverPlanDB.status == status.upper())

    plans = q.order_by(ManeuverPlanDB.created_at.desc()).all()
    return [ManeuverPlanResponse.model_validate(p) for p in plans]

@router.post("", response_model=ManeuverPlanResponse)
def create_plan(
    req: ManeuverPlanRequest,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    event = db.query(ConjunctionEventDB).filter_by(id=req.conjunction_event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail=f"Conjunction event {req.conjunction_event_id} not found")

    operator = current_user.operator_id or req.operator_id or f"OPERATOR-{current_user.id}"
    planner = ManeuverPlanningAgent()
    plan_db = planner.plan(
        conjunction_event_id=req.conjunction_event_id,
        operator_id=operator,
        max_delta_v_m_s=req.max_delta_v_m_s,
        maneuver_window_hours=req.maneuver_window_hours,
    )
    return ManeuverPlanResponse.model_validate(plan_db)

@router.post("/{event_id}/resolve", response_model=CoordinationDecisionResponse, dependencies=[Depends(require_role(["coordinator", "admin"]))])
def resolve_event_plans(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    coordinator = CoordinationAgent()
    try:
        decision_db = coordinator.resolve(conjunction_event_id=event_id)
        return CoordinationDecisionResponse.model_validate(decision_db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
