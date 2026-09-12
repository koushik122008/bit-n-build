from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from bitnbulid.api.deps import get_db, get_current_user, require_role
from bitnbulid.api.models_auth import UserDB
from bitnbulid.db.models import CoordinationDecisionDB
from bitnbulid.api.schemas import CoordinationDecisionResponse
from typing import List

router = APIRouter()

@router.get("", response_model=List[CoordinationDecisionResponse], dependencies=[Depends(require_role(["coordinator", "admin", "operator"]))])
def list_decisions(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    decisions = db.query(CoordinationDecisionDB).order_by(CoordinationDecisionDB.decided_at.desc()).all()
    return [CoordinationDecisionResponse.model_validate(d) for d in decisions]
