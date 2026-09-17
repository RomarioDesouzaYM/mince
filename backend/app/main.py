from contextlib import asynccontextmanager
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import crud
from app.database import Base, engine
from app.routers import (
    admin, auth, dashboard, district_proposals, districts, kamtibmas, news, reports, risk,
    sampel, summary,
)
from app.scheduler import start_scheduler

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield


app = FastAPI(title="MINCE API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://mince.tabiland.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_uploads_headers(request: Request, call_next):
    """StaticFiles doesn't set this by default -- forced explicitly since uploaded files
    are served from here (see crud.save_bukti_dukung_upload for how they get there)."""
    response = await call_next(request)
    if request.url.path.startswith("/uploads/"):
        response.headers["X-Content-Type-Options"] = "nosniff"
    return response


# Nginx here proxies everything to this app already (no separate static-serving setup),
# so /uploads/ is served directly by FastAPI rather than adding a second nginx location
# block. StaticFiles only ever streams file bytes -- it never executes uploaded content
# as code, same security property nginx-based serving would have given.
os.makedirs(crud.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=crud.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(districts.router)
app.include_router(district_proposals.router)
app.include_router(dashboard.router)
app.include_router(news.router)
app.include_router(admin.router)
app.include_router(risk.router)
app.include_router(sampel.router)
app.include_router(summary.router)
app.include_router(kamtibmas.router)


@app.get("/health")
def health():
    return {"status": "ok"}
