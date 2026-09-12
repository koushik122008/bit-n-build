"""
Extends scripts/setup.py. Run automatically after the base setup:
1. Generate a JWT_SECRET if missing, write to .env
2. Run the new Alembic revision for the users table
3. Seed multi-role demo accounts (admin, coordinator, operators)
4. Print instructions for starting both services
"""
import os
import secrets
import subprocess
import sys
from pathlib import Path

# Add project root to python path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

def setup_jwt_secret():
    env_path = PROJECT_ROOT / ".env"
    env_text = env_path.read_text(encoding="utf-8") if env_path.exists() else ""
    if "JWT_SECRET=" not in env_text or "JWT_SECRET=\n" in env_text or "JWT_SECRET=\r\n" in env_text:
        secret = secrets.token_hex(32)
        with env_path.open("a", encoding="utf-8") as f:
            f.write(f"\nJWT_SECRET={secret}\n")
        os.environ["JWT_SECRET"] = secret
        print("  -> Generated JWT_SECRET and appended to .env")
    else:
        for line in env_text.splitlines():
            if line.startswith("JWT_SECRET="):
                os.environ["JWT_SECRET"] = line.split("=", 1)[1].strip()

def run_user_migrations():
    print("  -> Applying database schema migrations...")
    try:
        from alembic.config import Config
        from alembic import command
        alembic_cfg = Config(str(PROJECT_ROOT / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(PROJECT_ROOT / "alembic"))
        command.upgrade(alembic_cfg, "head")
        print("  -> Users schema migration complete.")
    except Exception as e:
        print(f"  -> Alembic migration notice: {e}. Ensuring tables via SQLAlchemy...")
        from bitnbulid.db.engine import engine
        from bitnbulid.db.models import Base
        import bitnbulid.api.models_auth
        Base.metadata.create_all(bind=engine)
        print("  -> User tables verified.")

def seed_demo_accounts():
    from bitnbulid.api.auth import hash_password
    from bitnbulid.api.models_auth import UserDB
    from bitnbulid.db.engine import get_session

    demo_users = [
        {"email": "admin@bitnbulid.local", "pass": "AdminPass123!", "role": "admin", "op_id": "ADMIN-01"},
        {"email": "coordinator@bitnbulid.local", "pass": "CoordinatorPass123!", "role": "coordinator", "op_id": "COORDINATOR-01"},
        {"email": "operator.alpha@bitnbulid.local", "pass": "OperatorPass123!", "role": "operator", "op_id": "OPERATOR-ALPHA"},
        {"email": "operator.beta@bitnbulid.local", "pass": "OperatorPass123!", "role": "operator", "op_id": "OPERATOR-BETA"},
    ]

    with get_session() as session:
        for u in demo_users:
            existing = session.query(UserDB).filter_by(email=u["email"]).first()
            if not existing:
                user = UserDB(
                    email=u["email"],
                    hashed_password=hash_password(u["pass"]),
                    role=u["role"],
                    operator_id=u["op_id"],
                )
                session.add(user)
                print(f"  -> Seeded user: {u['email']} [{u['role']}] / {u['pass']}")

def main():
    print("=== Bit-N-Bulid Web Setup ===")
    setup_jwt_secret()
    run_user_migrations()
    seed_demo_accounts()

    print("\n=== Web setup complete ===")
    print("Terminal 1 (API Server): uvicorn bitnbulid.api.main:app --reload --port 8000")
    print("Terminal 2 (Web Console): cd web && npm install && npm run dev")

if __name__ == "__main__":
    main()
