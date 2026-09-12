from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging
from datetime import datetime, timezone

from bitnbulid.api.routers.auth import router as auth_router
from bitnbulid.api.routers.objects import router as objects_router
from bitnbulid.api.routers.events import router as events_router
from bitnbulid.api.routers.plans import router as plans_router
from bitnbulid.api.routers.decisions import router as decisions_router
from bitnbulid.api.routers.ws import router as ws_router
from bitnbulid.api.routers.datasets import router as datasets_router
from bitnbulid.api.routers.ws import broadcast_new_event
from bitnbulid.agents.tracking import TrackingAgent
from bitnbulid.db.engine import get_session
from bitnbulid.db.models import TrackedObjectDB, ConjunctionEventDB
from bitnbulid.api.schemas import SystemStatusResponse

log = logging.getLogger(__name__)

last_tracking_epoch: datetime | None = None

async def tracking_scheduler_loop():
    global last_tracking_epoch
    await asyncio.sleep(5) # Delay initial run on startup
    while True:
        try:
            log.info("Running background tracking step...")
            tracker = TrackingAgent()
            # Run tracking step in thread pool to avoid blocking asyncio loop
            events_list = await asyncio.to_thread(tracker.step)
            last_tracking_epoch = datetime.now(timezone.utc)
            for e in events_list:
                payload = {
                    "id": e.id,
                    "object_a_norad_id": e.object_a_norad_id,
                    "object_b_norad_id": e.object_b_norad_id,
                    "tca": e.tca.isoformat() if e.tca else None,
                    "miss_distance_km": e.miss_distance_km,
                    "pc": e.pc,
                    "risk_level": e.risk_level,
                }
                await broadcast_new_event(payload)
        except Exception as err:
            log.warning("Background tracking loop exception: %s", err)
        await asyncio.sleep(60) # Interval

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(tracking_scheduler_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(title="Bit-N-Bulid API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows Next.js frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers with explicit prefixes
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(objects_router, prefix="/objects", tags=["objects"])
app.include_router(events_router, prefix="/events", tags=["events"])
app.include_router(plans_router, prefix="/plans", tags=["plans"])
app.include_router(decisions_router, prefix="/decisions", tags=["decisions"])
app.include_router(ws_router, tags=["realtime"])
app.include_router(datasets_router, prefix="/datasets", tags=["datasets"])

@app.get("/status", response_model=SystemStatusResponse)
def get_system_status():
    db_ok = "NOMINAL"
    objects_count = 0
    events_count = 0
    try:
        with get_session() as session:
            objects_count = session.query(TrackedObjectDB).count()
            events_count = session.query(ConjunctionEventDB).filter_by(resolved=False).count()
    except Exception:
        db_ok = "DEGRADED"

    return SystemStatusResponse(
        db_status=db_ok,
        objects_count=objects_count,
        active_events_count=events_count,
        last_tracking_step=last_tracking_epoch,
    )
