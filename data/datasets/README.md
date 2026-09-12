# Bit-N-Bulid Datasets

This directory contains comprehensive datasets supporting the Space Tech & Orbital Sustainability problem statement:

> **Problem Statement:** Build autonomous agents to track space debris, optimize satellite maneuver planning, or coordinate open-source orbital traffic management to protect global communication infrastructure.

## Dataset Overview

### 1. Communication Constellations (`communication_constellations.json`)
**Purpose:** Satellite constellations providing global communication services - the infrastructure Bit-N-Bulid protects.

**Contents:**
- Starlink (SpaceX): 158 satellites at 550km LEO
- Iridium NEXT: 66 satellites at 780km LEO  
- OneWeb: 48 satellites at 1200km LEO
- Globalstar: 15 satellites at 1400km LEO

**Total:** 287 communication satellites with TLE data

**Use for:**
- Dashboard display of assets under protection
- Conjunction events involving communication satellites
- Statistics and telemetry cards
- Identifying which operators are at risk

---

### 2. Debris Clouds (`debris_clouds.json`)
**Purpose:** Debris from historic fragmentation events threatening LEO communications.

**Contents:**

| Event | Date | Type | Altitude | Tracked Fragments |
|-------|------|------|----------|-------------------|
| Cosmos 1408 ASAT Test | 2021-11-15 | ASAT | 480km | 150+ |
| Iridium 33/Cosmos 2251 Collision | 2009-02-10 | Collision | 780km | 220+ |
| Fengyun-1C ASAT Test | 2007-01-11 | ASAT | 865km | 280+ |

**Total:** 320 debris fragments with TLE data

**Use for:**
- Tracking debris threatening communication assets
- Demonstrating real collision risk scenarios
- Showing which events create long-term hazards
- Dashboard threat visualization

---

### 3. Active Conjunctions (`active_conjunctions.json`)
**Purpose:** Realistic conjunction events highlighting debris-vs-communication threats.

**Contents:**
- 45 conjunction events across all risk levels
- CRITICAL: 3 events (immediate threat, Pc > 1%)
- HIGH: 8 events (action required, Pc > 0.1%)
- MEDIUM: 15 events (monitor closely)
- LOW: 19 events (routine monitoring)

**Each event includes:**
- Debris fragment and communication satellite details
- Miss distance, relative velocity, collision probability
- Time to closest approach (TCA)
- Threat assessment and recommended action
- Constellation impact analysis

**Use for:**
- Dashboard alerts and event ticker
- Event detail pages
- Risk visualization
- Decision-making workflow demonstration

---

### 4. Tracking Telemetry (`tracking_telemetry.json`)
**Purpose:** Real-time and historical telemetry for dashboard display.

**Contents:**
- System status (agents online, database status)
- Orbital regime statistics (LEO/MEDEO/GEO breakdown)
- Tracking performance metrics
- Debris population statistics by source
- Communication infrastructure assets summary
- Mission metrics (collisions prevented, maneuvers executed)
- Recent activity feed (last 6 events)
- Visualization reference data for 3D globe

**Use for:**
- Dashboard stat cards
- System health monitoring
- Performance metrics display
- 3D globe visualization parameters

---

### 5. Problem Context (`problem_context.json`)
**Purpose:** Comprehensive context supporting the problem statement.

**Contents:**
- Background on space debris problem
- Key facts and statistics
- Critical fragmentation events detail
- Communication infrastructure at risk analysis
- Economic impact assessment
- Algorithm components explanation
- Sustainability context and vision
- Visualization reference cards

**Use for:**
- Documentation and presentations
- Understanding the "why" behind the system
- Stakeholder education
- Problem statement grounding

---

## Data Format

All datasets are in JSON format for easy consumption by:
- Python/Backend (loading into database)
- Frontend/React (directly in components)
- API responses
- Dashboard visualizations

## Integration

### Loading into Database

The existing seed scripts (`scripts/seed_catalog.py`, `scripts/seed_problem_statement.py`) can be extended to load these datasets. Example pattern:

```python
import json
from pathlib import Path

# Load communication constellations
with open(Path(__file__).parent.parent / "data/datasets/communication_constellations.json") as f:
    comm_data = json.load(f)

for constellation in comm_data["constellations"]:
    for sat in constellation["satellites"]:
        # Insert or update in database
        pass
```

### Frontend Usage

Datasets can be served via API endpoints or loaded directly:

```typescript
// Example: Load conjunction events for dashboard
const eventsData = await fetch('/api/datasets/conjunction-events').then(r => r.json());
setActiveEvents(eventsData.conjunctions);
```

---

## File Inventory

```
data/datasets/
├── README.md                          # This file
├── communication_constellations.json # 287 comm satellites with TLEs
├── debris_clouds.json                # 320 debris fragments from 3 events
├── active_conjunctions.json          # 45 conjunction events (3 CRITICAL, 8 HIGH, 15 MEDIUM, 19 LOW)
├── tracking_telemetry.json           # Real-time system telemetry for dashboard
└── problem_context.json              # Problem background and impact analysis
```

---

## Updating Datasets

To add new data:
1. Update the JSON files with new objects/events
2. Update `metadata.total_*` counts
3. Update risk distribution statistics if adding events
4. Document changes in this README

## Source Notes

TLE data in these datasets is synthetic/representative and should be replaced with live Celestrak data for production use. The seed scripts already implement Celestrak fetching with synthetic fallback.
