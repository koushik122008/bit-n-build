from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import logging
import json
from pathlib import Path
from typing import Optional

log = logging.getLogger(__name__)

router = APIRouter()
_connections: set[WebSocket] = set()

# Path resolution for datasets (same strategy as datasets.py)
FILE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = FILE_DIR.parent.parent.parent
DATASETS_DIR = PROJECT_ROOT / "data" / "datasets"

if not DATASETS_DIR.exists():
    alt_path = Path.cwd() / "data" / "datasets"
    if alt_path.exists():
        DATASETS_DIR = alt_path
    else:
        for base in [Path.cwd(), PROJECT_ROOT, Path(__file__).resolve().parents[2]]:
            test_path = base / "data" / "datasets"
            if test_path.exists():
                DATASETS_DIR = test_path
                break

log.info(f"WebSocket DATASETS_DIR resolved to: {DATASETS_DIR} (exists: {DATASETS_DIR.exists()})")

# Cache for dataset events
_cached_events: Optional[list] = None
_last_cache_load: Optional[float] = None

async def load_dataset_events(refresh_seconds: int = 300) -> list:
    """Load conjunction events from dataset, with caching."""
    global _cached_events, _last_cache_load
    import time
    now = time.time()
    if _cached_events is not None and _last_cache_load and (now - _last_cache_load) < refresh_seconds:
        return _cached_events
    
    dataset_path = DATASETS_DIR / "active_conjunctions.json"
    if not dataset_path.exists():
        log.warning(f"Dataset file not found: {dataset_path}")
        return []
    
    try:
        with open(dataset_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            events = data.get("conjunctions", [])
            _cached_events = events
            _last_cache_load = now
            log.debug(f"Loaded {len(events)} dataset events into WebSocket cache")
            return events
    except Exception as e:
        log.warning(f"Failed to load dataset events for WS broadcast: {e}")
        return []

async def broadcast_dataset_events_cycle():
    """Broadcast dataset events on a rolling cycle."""
    events = await load_dataset_events()
    if not events:
        return
    
    for event in events:
        # Format event for broadcast
        payload = {
            "id": event.get("id"),
            "type": "conjunction_event",
            "data": event,
        }
        dead = []
        for conn in list(_connections):
            try:
                await conn.send_json(payload)
            except Exception:
                dead.append(conn)
        for d in dead:
            _connections.discard(d)
        # Wait 10 seconds between events
        await asyncio.sleep(10)

@router.websocket("/ws/alerts")
async def alerts_socket(ws: WebSocket):
    await ws.accept()
    _connections.add(ws)
    log.info(f"WebSocket client connected: {len(_connections)} total")
    try:
        # Start a background task to broadcast dataset events
        broadcast_task = asyncio.create_task(broadcast_dataset_events_cycle())
        
        # Main loop: keep connection alive and ping
        while True:
            await asyncio.sleep(30)
            try:
                await ws.send_json({"type": "ping"})
            except Exception:
                break
    except WebSocketDisconnect:
        log.info("WebSocket client disconnected")
    except Exception as e:
        log.warning("WebSocket connection exception: %s", e)
    finally:
        _connections.discard(ws)
        # Cancel broadcast task when connection closes
        broadcast_task.cancel()
        try:
            await broadcast_task
        except asyncio.CancelledError:
            pass

async def broadcast_new_event(event_payload: dict):
    """Broadcast new conjunction event payload to all active WebSocket clients."""
    dead = []
    for conn in list(_connections):
        try:
            await conn.send_json({"type": "conjunction_event", "data": event_payload})
        except Exception:
            dead.append(conn)
    for d in dead:
        _connections.discard(d)
