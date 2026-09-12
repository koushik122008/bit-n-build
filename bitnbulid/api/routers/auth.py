from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from bitnbulid.api.deps import get_db, get_current_user, require_role
from bitnbulid.api.models_auth import UserDB
from bitnbulid.api.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from bitnbulid.api.auth import verify_password, hash_password, create_access_token

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter_by(email=req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )
    token = create_access_token(subject=user.email, role=user.role, operator_id=user.operator_id)
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))

@router.post("/register", response_model=UserResponse, dependencies=[Depends(require_role(["admin"]))])
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(UserDB).filter_by(email=req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )
    user = UserDB(
        email=req.email,
        hashed_password=hash_password(req.password),
        role=req.role,
        operator_id=req.operator_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserDB = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    users = db.query(UserDB).order_by(UserDB.created_at.desc()).all()
    return [UserResponse.model_validate(u) for u in users]

