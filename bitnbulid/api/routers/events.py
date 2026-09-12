from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from bitnbulid.api.deps import get_db, get_current_user
from bitnbulid.api.models_auth import UserDB
from bitnbulid.db.models import ConjunctionEventDB
from bitnbulid.api.schemas import ConjunctionEventResponse
from typing import List, Optional

router = APIRouter()

@router.get("", response_model=List[ConjunctionEventResponse])
def list_events(
    active: Optional[bool] = None,
    risk_level: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    q = db.query(ConjunctionEventDB).options(
        joinedload(ConjunctionEventDB.object_a),
        joinedload(ConjunctionEventDB.object_b)
    )
    if active is not None:
        q = q.filter(ConjunctionEventDB.resolved == (not active))
    if risk_level:
        q = q.filter(ConjunctionEventDB.risk_level == risk_level.upper())

    events = q.order_by(ConjunctionEventDB.created_at.desc()).limit(limit).all()
    return [ConjunctionEventResponse.model_validate(e) for e in events]

@router.get("/{event_id}", response_model=ConjunctionEventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    event = (db.query(ConjunctionEventDB)
             .options(joinedload(ConjunctionEventDB.object_a), joinedload(ConjunctionEventDB.object_b))
             .filter_by(id=event_id)
             .first())
    if not event:
        raise HTTPException(status_code=404, detail=f"Conjunction event {event_id} not found")
    return ConjunctionEventResponse.model_validate(event)

@router.post("/scan", response_model=List[ConjunctionEventResponse])
def trigger_screening(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    from bitnbulid.agents.tracking import TrackingAgent
    tracker = TrackingAgent()
    events = tracker.step()
    return [ConjunctionEventResponse.model_validate(e) for e in events]

@router.post("/simulate", response_model=ConjunctionEventResponse)
def simulate_conjunction_event(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    import random
    from datetime import datetime, timezone, timedelta
    from bitnbulid.db.models import TrackedObjectDB
    from bitnbulid.api.ws import manager

    objects = db.query(TrackedObjectDB).all()
    if len(objects) < 2:
        raise HTTPException(status_code=400, detail="Insufficient catalog objects to simulate encounter")

    satellites = [o for o in objects if not o.is_debris]
    debris_objs = [o for o in objects if o.is_debris]

    obj_a = random.choice(satellites) if satellites else objects[0]
    obj_b = random.choice(debris_objs) if debris_objs else objects[1]

    # Generate realistic conjunction values
    miss_distance = round(random.uniform(0.015, 0.450), 3)
    relative_vel = round(random.uniform(7.5, 14.2), 2)
    pc_val = float(f"{random.uniform(1.2, 9.8):.2f}e-{random.randint(2, 4)}")
    tca_dt = datetime.now(timezone.utc) + timedelta(hours=random.uniform(1.5, 18.0))

    if pc_val > 1.0e-3:
        risk = "CRITICAL"
    elif pc_val > 1.0e-4:
        risk = "HIGH"
    elif pc_val > 1.0e-5:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    evt = ConjunctionEventDB(
        object_a_norad_id=obj_a.norad_id,
        object_b_norad_id=obj_b.norad_id,
        tca=tca_dt,
        miss_distance_km=miss_distance,
        relative_velocity_km_s=relative_vel,
        pc=pc_val,
        risk_level=risk,
        data_quality="SIMULATED",
        created_at=datetime.now(timezone.utc),
    )
    db.add(evt)
    db.commit()
    db.refresh(evt)

    # Broadcast real-time WebSocket alert
    manager.broadcast({
        "type": "NEW_ALERT",
        "event_id": evt.id,
        "risk_level": evt.risk_level,
        "miss_distance_km": evt.miss_distance_km,
        "pc": evt.pc,
        "object_a_norad_id": evt.object_a_norad_id,
        "object_b_norad_id": evt.object_b_norad_id,
        "tca": evt.tca.isoformat(),
    })

    return ConjunctionEventResponse.model_validate(evt)

