"""
database.py — MINCE (REFERENCE DRAFT for checking the agent's output)

SQLite + SQLAlchemy. Everything (models, scheduler, seed) imports Base/engine/SessionLocal
from here. Keep it this simple for the MVP; do not switch to Postgres/Mongo.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# check_same_thread=False lets the APScheduler background thread use the same SQLite file
SQLALCHEMY_DATABASE_URL = "sqlite:///./mince.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a session, always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
