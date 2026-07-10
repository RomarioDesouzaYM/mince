from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, dashboard, districts, reports

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MINCE API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(districts.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
