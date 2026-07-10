from fastapi import APIRouter, Depends

from app.routers.auth import require_auth
from app.scheduler import ingest_news, ingest_weather

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_auth)])


@router.post("/ingest")
def trigger_ingest():
    return {"news": ingest_news(), "weather": ingest_weather()}
