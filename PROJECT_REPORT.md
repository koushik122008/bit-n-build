# Bit-N-Bulid Project Analysis Report

**Generated:** September 12, 2026  
**Project:** Bit-N-Bulid — Autonomous Orbital Traffic Management System  
**Version:** 0.1.0  

---

## Executive Summary

Bit-N-Bulid is an **autonomous orbital traffic management system** designed to track space debris, plan satellite collision-avoidance maneuvers, and coordinate decisions across multiple operators. The system is built as a two-tier architecture:

- **Backend (Python/FastAPI):** Orbital mechanics simulation, conjunction analysis, maneuver planning, and multi-operator arbitration
- **Frontend (Next.js 14):** Mission control dashboard with real-time WebSocket alerts and Skynetics-inspired UI design

The system uses **SGP4 propagation** for orbit prediction, **Foster/Chan 2D collision probability estimation**, and implements an **agent-based architecture** for tracking, planning, and coordination workflows.

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      Bit-N-Bulid System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐     ┌──────────────────────────────────┐   │
│  │   Next.js 14    │     │         FastAPI Backend          │   │
│  │   Frontend      │────▶│         (Port 8000)             │   │
│  │   Dashboard     │     │                                  │   │
│  └─────────────────┘     │  ┌────────────────────────────┐  │   │
│                          │  │   Tracking Agent           │  │   │
│  ┌─────────────────┐     │  │   (60-second loop)        │  │   │
│  │  WebSocket      │◀────│  └────────────────────────────┘  │   │
│  │  /ws/alerts     │     │                                  │   │
│  └─────────────────┘     │  ┌────────────────────────────┐  │   │
│                          │  │   Planning Agent           │  │   │
│                          │  │   (Maneuver options)       │  │   │
│                          │  └────────────────────────────┘  │   │
│                          │                                  │   │
│                          │  ┌────────────────────────────┐  │   │
│                          │  │   Coordination Agent       │  │   │
│                          │  │   (Conflict resolution)    │  │   │
│                          │  └────────────────────────────┘  │   │
│                          └──────────────────────────────────┘   │
│                                     │                             │
│                                     ▼                             │
│  ┌─────────────────────────────────────────────────────────────────┐
│  │                     PostgreSQL / SQLite DB                       │
│  │  - tracked_objects  - conjunction_events                       │
│  │  - maneuver_plans   - coordination_decisions                   │
│  │  - users (auth)                                               │
│  └─────────────────────────────────────────────────────────────────┘
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐
│  │                    Simulation Layer (SGP4)                      │
│  │  - propagator.py    - conjunction.py    - uncertainty.py       │
│  └─────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14.2.3 | React framework with App Router |
| **UI Components** | Lucide React, Custom Tailwind | Icon library, custom design system |
| **Styling** | Tailwind CSS 3.4.3 | Utility-first CSS with custom theme |
| **Backend API** | FastAPI 0.111.0 | REST API framework |
| **ORM** | SQLAlchemy 2.0.30 | Database abstraction |
| **Database** | PostgreSQL 16 / SQLite | Persistent storage |
| **Auth** | JWT (python-jose) + bcrypt | Token-based authentication |
| **Orbital Mechanics** | sgp4 2.23 | TLE propagation |
| **Numerical Computing** | numpy 1.26.4, scipy 1.13.0 | Vector math, probability calculations |
| **Testing** | pytest 8.2.0 | Unit and integration tests |
| **Realtime** | WebSockets | Live alert broadcast |
| **Migrations** | Alembic 1.13.1 | Schema versioning |

---

## Backend Analysis

### 1. API Structure (`bitnbulid/api/`)

#### Core Files

| File | Purpose | Lines of Code (approx.) |
|------|---------|------------------------|
| `main.py` | FastAPI app setup, lifespan, tracking scheduler | ~80 |
| `deps.py` | Dependency injection (auth, DB sessions) | ~50 |
| `schemas.py` | Pydantic models for request/response | ~100 |
| `auth.py` | JWT token creation/validation, password hashing | ~60 |
| `models_auth.py` | User SQLAlchemy model | ~25 |

#### API Routers (`bitnbulid/api/routers/`)

| Router | Endpoints | Purpose |
|--------|-----------|---------|
| `auth.py` | `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `GET /auth/users` | User authentication and management |
| `objects.py` | `GET /objects`, `GET /objects/{norad_id}` | Tracked object catalog |
| `events.py` | `GET /events`, `GET /events/{event_id}`, `POST /events/scan`, `POST /events/simulate` | Conjunction events |
| `plans.py` | `GET /plans`, `POST /plans`, `POST /plans/{event_id}/resolve` | Maneuver planning |
| `decisions.py` | `GET /decisions` | Coordination decisions |
| `ws.py` | `WS /ws/alerts` | Real-time alert broadcast |

#### Key Features

**Authentication System:**
- JWT-based auth with HS256 algorithm
- Token expiration: 8 hours
- Role-based access: `operator`, `coordinator`, `admin`
- Password hashing with bcrypt
- Fallback secret key for development

**Background Task:**
- `tracking_scheduler_loop()` runs every 60 seconds
- Propagates all tracked objects using SGP4
- Screens for conjunctions
- Broadcasts new events via WebSocket

**WebSocket Real-time:**
- `/ws/alerts` endpoint for live updates
- Broadcasts conjunction events as they're detected
- Ping every 30 seconds to maintain connection

**API Security:**
- All endpoints require authentication (except public status)
- Role-based access control for sensitive operations
- `require_role()` decorator for endpoint protection

---

### 2. Database Models (`bitnbulid/db/models.py`)

#### Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│   tracked_objects   │       │  conjunction_events │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │◀──────│ id (PK)             │
│ norad_id (UNIQUE)   │       │ object_a_norad_id   │
│ name                │       │ object_b_norad_id   │
│ tle_line1           │       │ tca                 │
│ tle_line2           │       │ miss_distance_km    │
│ pos_x_km (nullable) │       │ relative_velocity   │
│ pos_y_km (nullable) │       │ pc                  │
│ pos_z_km (nullable) │       │ risk_level          │
│ vel_x_km_s          │       │ data_quality        │
│ vel_y_km_s          │       │ notes               │
│ vel_z_km_s          │       │ created_at          │
│ state_epoch         │       │ resolved            │
│ last_updated        │       └─────────────────────┘
│ is_debris           │                 │
└─────────────────────┘                 │
        ▲                               │
        │                               ▼
        │                    ┌─────────────────────┐
        │                    │   maneuver_plans    │
        │                    ├─────────────────────┤
        │                    │ id (PK)             │
        │                    │ conjunction_event_id│
        │                    │ operator_id         │
        └────────────────────┼ options_json        │
                             │ recommended_option  │
                             │ rationale           │
                             │ delta_v_magnitude   │
                             │ burn_time           │
                             │ predicted_pc_after  │
                             │ status              │
                             │ created_at          │
                             └─────────────────────┘
                                      │
                                      ▼
                             ┌─────────────────────┐
                             │ coordination_decisions│
                             ├─────────────────────┤
                             │ id (PK)             │
                             │ maneuver_plan_id    │
                             │ conjunction_event_id│
                             │ proposals_received  │
                             │ accepted_operators  │
                             │ rejected_operators  │
                             │ conflict_detected   │
                             │ resolution_rationale│
                             │ decided_at          │
                             └─────────────────────┘

┌─────────────────────┐
│        users        │
├─────────────────────┤
│ id (PK)             │
│ email (UNIQUE)      │
│ hashed_password     │
│ role                │
│ operator_id         │
│ is_active           │
│ created_at          │
└─────────────────────┘
```

#### Key Design Decisions

1. **NORAD ID as Foreign Key:** Objects are linked by NORAD ID rather than internal IDs for conjunction events
2. **JSON Columns:** `options_json` and `recommended_option_json` store complex maneuver data as JSON
3. **Nullable Position Fields:** Position/velocity fields are nullable until first propagation
4. **Indexed Fields:** `norad_id`, `object_a_norad_id`, `object_b_norad_id`, `conjunction_event_id` are indexed for query performance

---

### 3. Agent System (`bitnbulid/agents/`)

#### Agent Architecture

```
                    ┌─────────────────┐
                    │   BaseAgent     │
                    ├─────────────────┤
                    │ name: str       │
                    │ log: Logger     │
                    └─────────────────┘
                           ▲
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ TrackingAgent   │ │PlanningAgent    │ │CoordinationAgent│
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ step()          │ │ plan()          │ │ resolve()       │
│                 │ │                 │ │                 │
│ • Load objects  │ │ • Generate DV   │ │ • Load plans    │
│ • Propagate TLE │ │   candidates    │ │ • Detect conflict│
│ • Screen pairs  │ │ • Apply delta-V │ │ • Pick winner   │
│ • Compute Pc    │ │ • Estimate Pc   │ │ • Update status │
│ • Create events │ │ • Save plan     │ │ • Log decision  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

#### Tracking Agent (`tracking.py`)

**Responsibilities:**
1. Load all tracked objects from database
2. Propagate each object forward by `screening_horizon_hours` (default: 24h)
3. Update position/velocity in database
4. Screen all pairs within `screening_distance_km` (default: 5.0 km)
5. Compute collision probability (Pc) for each conjunction
6. Create `ConjunctionEvent` records for events above threshold (`pc_alert_threshold`: 1e-4)
7. Return new events with populated object relationships

**Risk Level Classification:**
- CRITICAL: Pc > 1e-2
- HIGH: Pc > 1e-3
- MEDIUM: Pc > 1e-4
- LOW: Pc ≤ 1e-4

#### Planning Agent (`planning.py`)

**Maneuver Option Generation:**
- 5 directions: prograde, retrograde, radial+, radial-, cross-track+
- 3 magnitudes: 0.5, 1.0, 2.0 m/s
- Total: 15 possible options (minus those exceeding budget)

**Selection Criteria:**
- Filter infeasible options (exceed delta-V budget)
- Sort by (predicted_pc, delta_v_m_s) ascending
- Select best option as recommendation

#### Coordination Agent (`coordination.py`)

**Conflict Resolution Rules:**
- Single proposal: auto-accept
- Multiple proposals: lowest delta-V wins
- Tie-breaker: earliest submission time
- Updates plan statuses to ACCEPTED/REJECTED

---

### 4. Simulation Layer (`bitnbulid/sim/`)

#### Propagator (`propagator.py`)

**Key Functions:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `propagate_tle()` | Propagate TLE to horizon end | `StateVector` |
| `propagate_tle_trajectory()` | Step-by-step propagation | `list[StateVector]` |
| `apply_delta_v()` | Apply maneuver impulse | `StateVector` |

**StateVector Dataclass:**
```python
@dataclass
class StateVector:
    position_km: np.ndarray    # [x, y, z] ECI km
    velocity_km_s: np.ndarray  # [vx, vy, vz] ECI km/s
    epoch: datetime
```

**SGP4 Integration:**
- Uses `sgp4.api.Satrec.twoline2rv()` for TLE parsing
- Converts datetime to Julian date using `jday()`
- Error handling for SGP4 error codes

#### Conjunction Analysis (`conjunction.py`)

**Screening Algorithm:**
```python
for each pair (i, j):
    delta_r = position_a - position_b
    distance = ||delta_r||
    if distance < screening_distance_km:
        create ConjunctionCandidate
```

**Collision Probability (Foster/Chan 2D):**
```
Pc = (r² / (2σ²)) × exp(-d² / (2σ²))

where:
  r = combined_hard_body_radius_km (default: 0.01 km = 10m)
  d = miss_distance_km
  σ = max(d/3, 0.05) km  # covariance estimate
```

**Limitations:**
- Simplified covariance model (uses miss distance to estimate σ)
- Does not use actual covariance matrices from uncertainty.py
- 2D projection assumed perpendicular to relative velocity

#### Uncertainty Modeling (`uncertainty.py`)

**Available Functions:**
- `generate_default_covariance()`: 6x6 covariance matrix
- `project_covariance_2d()`: Project 3D covariance onto encounter plane

**Current Usage:** These functions are defined but not actively used in the main conjunction analysis pipeline.

---

### 5. Configuration (`bitnbulid/config.py`)

**Settings (from environment variables):**

| Setting | Default | Description |
|---------|---------|-------------|
| `DATABASE_URL` | `sqlite:///data/bitnbulid.db` | Database connection string |
| `USE_CELESTRAK` | `true` | Whether to use Celestrak for TLE data |
| `SPACETRACK_USER` | None | Space-track.org credentials |
| `SPACETRACK_PASS` | None | Space-track.org credentials |
| `SCREENING_DISTANCE_KM` | `5.0` | Conjunction screening distance |
| `SCREENING_HORIZON_HOURS` | `24.0` | Propagation horizon |
| `PC_ALERT_THRESHOLD` | `1e-4` | Collision probability alert threshold |

---

## Frontend Analysis

### 1. Application Structure (`web/`)

```
web/
├── app/
│   ├── layout.tsx              # Root layout with dark theme
│   ├── page.tsx                # Landing page (public)
│   ├── globals.css             # Global styles, custom fonts
│   └── (auth)/
│       └── login/
│           └── page.tsx        # Login page
│   └── (dashboard)/
│       ├── layout.tsx          # Dashboard layout (sidebar + top bar)
│       └── dashboard/
│           └── page.tsx        # Main dashboard
├── components/
│   ├── MarqueeBand.tsx         # Scrolling announcement band
│   ├── Sidebar.tsx             # Navigation sidebar
│   ├── TopStatusBar.tsx        # Top status indicator
│   ├── OrbitGlobe.tsx          # 3D globe visualization
│   ├── StatCard.tsx            # Statistics card component
│   ├── EventTicker.tsx         # Real-time event feed
│   ├── RiskBadge.tsx           # Risk level indicator
│   └── SectionHeader.tsx       # Section numbering chrome
├── lib/
│   └── api.ts                  # API client with auth
├── tailwind.config.ts          # Custom theme configuration
└── next.config.js              # Next.js configuration
```

### 2. Design System

**Color Palette:**
| Name | Hex | Usage |
|------|-----|-------|
| `void` | #05070A | Background (deep black) |
| `panel` | #0E131A | Panel backgrounds |
| `panelRaised` | #141B24 | Elevated surfaces |
| `hairline` | rgba(255,255,255,0.08) | Borders |
| `primary` | #E7ECF2 | Primary text, CTAs |
| `muted` | #7C8797 | Secondary text |
| `nominal` | #35D0BA | Success, OK status (teal) |
| `warn` | #F2A93C | Warning, medium risk (amber) |
| `critical` | #FF4757 | Critical, high risk (red) |
| `info` | #6E8CFF | Info, satellites (blue) |

**Typography:**
- **Display headings:** Space Grotesk, 700 weight, -0.03em letter-spacing
- **Body text:** Inter, 300-700 weights
- **Monospace/telemetry:** IBM Plex Mono

**Custom Components:**
- `.display-hero`: Oversized display headlines
- `.section-index`: Numbered section chrome (e.g., "01 / 04")
- `.telemetry-val`: Monospace tabular numbers
- `.marquee-track`: Scrolling announcement animation

### 3. Key Pages

#### Landing Page (`page.tsx`)

**Sections:**
1. **Header:** Logo, login button, "Enter Console" CTA
2. **Hero:** Main headline "Autonomous orbital traffic, screened every orbit"
3. **Marquee Band:** Scrolling capability tags
4. **Capabilities Grid:** 4 feature cards (Debris Screening, Conjunction Analysis, Maneuver Planning, Multi-Operator Arbitration)
5. **Live Stats:** 4-column telemetry display (objects, events, horizon, DB status)
6. **Mission Statement:** "We keep low Earth orbit safe, autonomous, and accountable"
7. **Feature Callouts:** Screen 24/7, Alert Instantly, Resolve Fairly
8. **Status Marquee:** System status indicators
9. **Final CTA:** "Enter ground control"
10. **Footer:** Coordinates, version, status indicator

**Live Data:**
- Fetches `/status` endpoint every 15 seconds
- Displays real-time object count and active events
- Shows database connection status

#### Dashboard (`(dashboard)/dashboard/page.tsx`)

**Sections:**
1. **Mission Telemetry:** 4 stat cards (tracked objects, active alerts, mean Pc, system status)
2. **Live Orbital Picture:** 2/3 OrbitGlobe + 1/3 critical conjunction panel
3. **Critical Conjunction Panel:**
   - Highest-risk event details
   - Object A and B names/NORAD IDs
   - Miss distance and Pc values
   - TCA countdown timer (updates every second)
   - Link to event details
4. **Realtime Feed:** EventTicker component
5. **Status Marquee:** System status band

**Live Data:**
- Fetches `/objects?limit=200` and `/events?active=true` every 15 seconds
- Highest-risk event drives TCA countdown
- Auto-refresh maintains real-time view

#### Login Page (`(auth)/login/page.tsx`)

**Features:**
- Pre-filled demo credentials (admin@bitnbulid.local / AdminPass123!)
- JWT token stored in localStorage
- Redirect to dashboard on success
- Error display for auth failures

### 4. API Client (`lib/api.ts`)

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  // ... fetch with Authorization header
}
```

**Pattern:** Automatic JWT injection from localStorage, error handling with status text.

---

## Database Schema Deep Dive

### Migration Strategy

- Alembic for schema versioning
- SQLite default for development (file: `data/bitnbulid.db`)
- PostgreSQL for production (via docker-compose)

### Data Flow

1. **Object Ingestion:** TLE data → `tracked_objects` table
2. **Propagation:** Background agent updates position/velocity fields
3. **Screening:** Pairwise distance check → `conjunction_events`
4. **Planning:** Operator creates plan → `maneuver_plans`
5. **Coordination:** Conflict resolution → `coordination_decisions`

### Audit Trail

The `coordination_decisions` table provides an immutable record of:
- Which operators proposed maneuvers
- Which were accepted/rejected
- Conflict detection flag
- Resolution rationale
- Timestamp of decision

---

## Testing Analysis

### Test Suite (`tests/`)

| Test File | Purpose | Coverage |
|-----------|---------|----------|
| `conftest.py` | Fixtures (in-memory SQLite, TLE data) | Setup |
| `test_db_models.py` | CRUD operations for all models | Database models |
| `test_conjunction.py` | Screening algorithm, Pc calculation | Simulation core |
| `test_tracking_agent.py` | Full tracking step cycle | Tracking agent |
| `test_planning_agent.py` | Maneuver plan generation | Planning agent |
| `test_coordination_agent.py` | Single/multiple proposal resolution | Coordination agent |
| `test_mini_loop.py` | End-to-end demo execution | Integration |
| `api/test_*.py` | API endpoint tests | API layer |

### Test Fixtures

**TLE Data (from conftest.py):**
- ISS (NORAD 25544): Real TLE data
- Debris (NORAD 99001): Simulated debris on converging path

**Database Isolation:**
- In-memory SQLite per test function
- SessionLocal patched to use test engine
- Clean state for each test

---

## Demo System (`bitnbulid/demo/`)

### Mini Loop (`demo/mini_loop.py`)

End-to-end demonstration that:
1. Seeds the database with sample objects
2. Runs tracking agent to detect conjunctions
3. Generates maneuver plans
4. Resolves coordination conflicts
5. Exits cleanly (SystemExit(0))

---

## Security Analysis

### Authentication & Authorization

**Strengths:**
- JWT tokens with expiration (8 hours)
- Role-based access control (operator/coordinator/admin)
- Password hashing with bcrypt
- SQL injection protection via SQLAlchemy ORM

**Considerations:**
- Fallback JWT secret in code (should be required in production)
- Token stored in localStorage (vulnerable to XSS)
- No refresh token mechanism
- Password limited to 72 bytes (bcrypt limitation)

### API Security

**Current State:**
- CORS configured for all origins (`allow_origins=["*"]`)
- All endpoints require authentication (except `/status`)
- Role checks on sensitive endpoints (register, resolve)

**Recommendations:**
- Restrict CORS origins in production
- Consider HttpOnly cookies instead of localStorage for tokens
- Add rate limiting
- Input validation on all endpoints

---

## Performance Considerations

### Backend

**Tracking Agent:**
- O(n²) pairwise screening (fine for small catalogs)
- Synchronous SGP4 propagation in thread pool
- 60-second interval may be aggressive for large catalogs

**Database:**
- Indexes on frequently queried fields
- Connection pooling via SQLAlchemy
- SQLite suitable for development, PostgreSQL for production

### Frontend

**Next.js:**
- Client-side data fetching with polling (15s intervals)
- No server-side rendering for dashboard (requires auth)
- WebSocket for real-time alerts (complementary to polling)

**Optimization Opportunities:**
- Implement SWR or React Query for caching/stale-while-revalidate
- Debounce TCA countdown updates
- Virtualize long event lists

---

## Project Strengths

1. **Clear Architecture:** Well-separated concerns (agents, simulation, API, frontend)
2. **Domain Accuracy:** Uses proper SGP4 propagation and Foster/Chan Pc model
3. **Comprehensive Demo:** Mini loop demonstrates full workflow
4. **Quality UI:** Polished dark theme with space-industry aesthetic
5. **Test Coverage:** Unit tests for all major components
6. **Real-time Alerts:** WebSocket broadcast for immediate notifications
7. **Audit Trail:** Coordination decisions provide accountability
8. **Configuration:** Environment-based settings for flexibility

---

## Areas for Improvement

### Technical Debt

1. **Uncertainty Integration:** `uncertainty.py` functions not used in main pipeline
2. **WebSocket Manager:** Simple connection set, no persistence or scaling
3. **Hardcoded Values:** Some magic numbers (risk thresholds, candidate directions)
4. **Error Handling:** Broad except clauses in some agent methods
5. **TLE Source:** Celestrak integration mentioned but not implemented

### Feature Gaps

1. **No Actual TLE Ingestion:** Demo uses hardcoded objects
2. **Limited Maneuver Options:** Only 5 directions × 3 magnitudes
3. **No Maneuver Execution:** Plans are created but not "executed"
4. **Single Conflict Rule:** Only lowest delta-V strategy
5. **No Historical Analysis:** No queries for past conjunctions or trends

### Production Readiness

1. **Database:** SQLite default, needs PostgreSQL migration guide
2. **Authentication:** Consider OAuth2/OIDC for production
3. **Logging:** Basic logging, no structured logs or aggregation
4. **Monitoring:** `/status` endpoint only, no metrics exposure
5. **Deployment:** Docker-compose for DB only, no app containerization

---

## Deployment Configuration

### Docker Compose (Development Database)

```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: bnb
      POSTGRES_PASSWORD: bnb
      POSTGRES_DB: bitnbulid
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

### Development Setup

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run automated setup
python scripts/setup.py

# 3. Run demo
python -m bitnbulid.demo.mini_loop

# 4. Run tests
pytest

# 5. Start backend
uvicorn bitnbulid.api.main:app --reload

# 6. Start frontend (separate terminal)
cd web && npm run dev
```

---

## File Inventory

### Backend (Python)

| Path | Type | Description |
|------|------|-------------|
| `bitnbulid/__init__.py` | Package | Package marker |
| `bitnbulid/config.py` | Config | Settings from environment |
| `bitnbulid/db/__init__.py` | Package | DB package |
| `bitnbulid/db/engine.py` | Database | SQLAlchemy engine, session |
| `bitnbulid/db/models.py` | Database | SQLAlchemy models |
| `bitnbulid/api/__init__.py` | Package | API package |
| `bitnbulid/api/main.py` | API | FastAPI app, lifespan |
| `bitnbulid/api/deps.py` | API | Dependency injection |
| `bitnbulid/api/schemas.py` | API | Pydantic schemas |
| `bitnbulid/api/auth.py` | API | JWT, password functions |
| `bitnbulid/api/models_auth.py` | API | User model |
| `bitnbulid/api/routers/__init__.py` | Package | Routers package |
| `bitnbulid/api/routers/auth.py` | Router | Auth endpoints |
| `bitnbulid/api/routers/objects.py` | Router | Object endpoints |
| `bitnbulid/api/routers/events.py` | Router | Event endpoints |
| `bitnbulid/api/routers/plans.py` | Router | Plan endpoints |
| `bitnbulid/api/routers/decisions.py` | Router | Decision endpoints |
| `bitnbulid/api/routers/ws.py` | Router | WebSocket endpoint |
| `bitnbulid/agents/__init__.py` | Package | Agents package |
| `bitnbulid/agents/base.py` | Agent | Base agent class |
| `bitnbulid/agents/tracking.py` | Agent | Tracking agent |
| `bitnbulid/agents/planning.py` | Agent | Planning agent |
| `bitnbulid/agents/coordination.py` | Agent | Coordination agent |
| `bitnbulid/sim/__init__.py` | Package | Simulation package |
| `bitnbulid/sim/propagator.py` | Sim | SGP4 propagation |
| `bitnbulid/sim/conjunction.py` | Sim | Conjunction screening |
| `bitnbulid/sim/uncertainty.py` | Sim | Covariance utilities |
| `bitnbulid/demo/__init__.py` | Package | Demo package |
| `bitnbulid/demo/mini_loop.py` | Demo | End-to-end demo |
| `alembic.ini` | Config | Alembic configuration |
| `scripts/setup.py` | Script | Setup script |

### Frontend (Next.js)

| Path | Type | Description |
|------|------|-------------|
| `web/package.json` | Config | Dependencies |
| `web/next.config.js` | Config | Next.js config |
| `web/tailwind.config.ts` | Config | Tailwind theme |
| `web/tsconfig.json` | Config | TypeScript config |
| `web/app/layout.tsx` | Page | Root layout |
| `web/app/page.tsx` | Page | Landing page |
| `web/app/globals.css` | Style | Global styles |
| `web/app/(auth)/login/page.tsx` | Page | Login page |
| `web/app/(dashboard)/layout.tsx` | Layout | Dashboard layout |
| `web/app/(dashboard)/dashboard/page.tsx` | Page | Dashboard |
| `web/components/*.tsx` | Component | UI components |
| `web/lib/api.ts` | Lib | API client |

### Infrastructure

| Path | Type | Description |
|------|------|-------------|
| `docker-compose.yml` | Config | PostgreSQL service |
| `.env.example` | Config | Environment template |
| `requirements.txt` | Config | Python dependencies |
| `pyproject.toml` | Config | Project metadata |
| `alembic/` | Directory | Migration files |

### Tests

| Path | Type | Description |
|------|------|-------------|
| `tests/conftest.py` | Fixture | Test fixtures |
| `tests/test_*.py` | Test | Unit tests |
| `tests/api/test_*.py` | Test | API tests |

---

## Summary Metrics

| Metric | Value |
|--------|-------|
| **Total Python Files** | ~25 |
| **Total TypeScript/TSX Files** | ~10 |
| **API Endpoints** | 12 |
| **Database Models** | 5 |
| **Agent Classes** | 3 |
| **Simulation Functions** | 6 |
| **UI Components** | 7 |
| **Test Files** | 10 |
| **Test Cases** | ~15 |

---

## Conclusion

Bit-N-Bulid is a well-architected orbital traffic management system with a clear separation between:

1. **Simulation layer** (SGP4 propagation, conjunction analysis)
2. **Agent layer** (tracking, planning, coordination workflows)
3. **API layer** (REST endpoints with authentication)
4. **Frontend layer** (mission control dashboard)

The system demonstrates autonomous collision avoidance workflows with multi-operator coordination and provides a polished UI experience. The codebase is structured for extensibility, with clear extension points for adding new propagation models, collision probability algorithms, or coordination strategies.

**Primary use case:** Demonstration and prototyping of autonomous orbital safety systems, suitable for research, education, and as a foundation for production orbital traffic management systems.
