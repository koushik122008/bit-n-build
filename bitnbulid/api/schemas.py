from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str = "operator"  # operator | coordinator | admin
    operator_id: Optional[str] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    operator_id: Optional[str] = None
    is_active: bool
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TrackedObjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    norad_id: int
    name: str
    tle_line1: str
    tle_line2: str
    pos_x_km: Optional[float] = None
    pos_y_km: Optional[float] = None
    pos_z_km: Optional[float] = None
    vel_x_km_s: Optional[float] = None
    vel_y_km_s: Optional[float] = None
    vel_z_km_s: Optional[float] = None
    state_epoch: Optional[datetime] = None
    last_updated: datetime
    is_debris: bool

class ConjunctionEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    object_a_norad_id: int
    object_b_norad_id: int
    tca: datetime
    miss_distance_km: float
    relative_velocity_km_s: float
    pc: float
    risk_level: str
    data_quality: str
    notes: str
    created_at: datetime
    resolved: bool
    object_a: Optional[TrackedObjectResponse] = None
    object_b: Optional[TrackedObjectResponse] = None

class ManeuverPlanRequest(BaseModel):
    conjunction_event_id: int
    operator_id: str = "OPERATOR-ALPHA"
    max_delta_v_m_s: float = 2.0
    maneuver_window_hours: float = 12.0

class ManeuverPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conjunction_event_id: int
    operator_id: str
    options_json: List[Dict[str, Any]] | Dict[str, Any]
    recommended_option_json: Dict[str, Any]
    rationale: str
    delta_v_magnitude_m_s: float
    burn_time: datetime
    predicted_pc_after: float
    status: str
    created_at: datetime

class CoordinationDecisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    maneuver_plan_id: int
    conjunction_event_id: int
    proposals_received_json: List[str]
    accepted_operator_ids_json: List[str]
    rejected_operator_ids_json: List[str]
    conflict_detected: bool
    resolution_rationale: str
    decided_at: datetime

class SystemStatusResponse(BaseModel):
    db_status: str
    objects_count: int
    active_events_count: int
    last_tracking_step: Optional[datetime] = None
