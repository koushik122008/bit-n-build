from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import String
from sqlalchemy.orm import Session
from bitnbulid.api.deps import get_db, get_current_user
from bitnbulid.api.models_auth import UserDB
from bitnbulid.db.models import TrackedObjectDB
from bitnbulid.api.schemas import TrackedObjectResponse
from typing import List, Optional

router = APIRouter()

@router.get("", response_model=List[TrackedObjectResponse])
def list_objects(
    is_debris: Optional[bool] = None,
    query: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    q = db.query(TrackedObjectDB)
    if is_debris is not None:
        q = q.filter(TrackedObjectDB.is_debris == is_debris)
    if query:
        search_pattern = f"%{query}%"
        q = q.filter(
            (TrackedObjectDB.name.ilike(search_pattern)) |
            (TrackedObjectDB.norad_id.cast(String).ilike(search_pattern))
        )
    objects = q.limit(limit).all()
    return [TrackedObjectResponse.model_validate(o) for o in objects]

@router.get("/{norad_id}", response_model=TrackedObjectResponse)
def get_object(
    norad_id: int,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    obj = db.query(TrackedObjectDB).filter_by(norad_id=norad_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"Tracked object {norad_id} not found")
    return TrackedObjectResponse.model_validate(obj)
