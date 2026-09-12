# Bit-N-Bulid — Autonomous Orbital Traffic Management System

Bit-N-Bulid tracks space debris, plans satellite collision-avoidance maneuvers, and coordinates decisions across multiple operators. It is precise, explainable, and auditable.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run automated setup (creates DB, seeds catalog, runs migrations)
python scripts/setup.py

# 3. Run the end-to-end demo mini loop
python -m bitnbulid.demo.mini_loop

# 4. Run unit tests
pytest
```
