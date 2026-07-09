"""
scheduler.py — MINCE automatic data (REFERENCE DRAFT for checking the agent's output)

Pulls berita (RSS) and cuaca (Open-Meteo) 3x/day at 06:00, 14:00, 22:00 WIT, plus once at
startup. No API keys. Stores only headline + summary + link for news (never full bodies).

This is a reference to sanity-check what Claude Code builds — adjust imports/model names to
match the real models/session in your project.

Deps:  pip install apscheduler feedparser httpx
"""

from datetime import datetime, timezone
import logging

import feedparser
import httpx
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

# --- adjust these imports to your project ---------------------------------
from app.database import SessionLocal
from app.models import News, District, WeatherSnapshot
# --------------------------------------------------------------------------

log = logging.getLogger("mince.scheduler")

RSS_FEEDS = [
    "https://papua.antaranews.com/rss/terkini.xml",
    "https://papua.antaranews.com/rss/top-news.xml",
    "https://papua.antaranews.com/rss/daerah.xml",
    "https://papuatengah.antaranews.com/rss/terkini.xml",
]

# keyword -> kategori (checked in this order; first hit wins, else "Umum")
KATEGORI_KEYWORDS = {
    "Keamanan": ["keamanan", "kkb", "tni", "polri", "konflik", "aparat", "penembakan"],
    "Bencana":  ["banjir", "longsor", "gempa", "bencana", "erupsi", "cuaca ekstrem", "tanah longsor"],
    "Cuaca":    ["cuaca", "hujan", "bmkg", "angin", "kabut"],
}

# distrik/kabupaten name hints -> kabupaten_terkait
WILAYAH_HINTS = {
    "Jayawijaya": ["jayawijaya", "wamena", "kurulu", "asologaima", "bolakme"],
    "Yalimo": ["yalimo", "elelim", "abenaho", "apalapsili", "welarek"],
    "Mamberamo Tengah": ["mamberamo tengah", "kobakma", "kelila", "eragayam", "ilugwa"],
}

# WMO weather_code -> label Indonesia (Open-Meteo current/daily weather_code)
WEATHER_CODE_ID = {
    0: "Cerah",
    1: "Cerah Berawan", 2: "Berawan", 3: "Mendung",
    45: "Kabut", 48: "Kabut Beku",
    51: "Gerimis Ringan", 53: "Gerimis", 55: "Gerimis Lebat",
    61: "Hujan Ringan", 63: "Hujan", 65: "Hujan Lebat",
    66: "Hujan Beku", 67: "Hujan Beku Lebat",
    71: "Salju", 73: "Salju", 75: "Salju Lebat",
    80: "Hujan Lokal", 81: "Hujan Lebat Lokal", 82: "Hujan Sangat Lebat",
    95: "Badai Petir", 96: "Badai Petir + Es", 99: "Badai Petir Berat",
}


def _kategori(text: str) -> str:
    t = text.lower()
    for kategori, words in KATEGORI_KEYWORDS.items():
        if any(w in t for w in words):
            return kategori
    return "Umum"


def _kabupaten(text: str):
    t = text.lower()
    for kab, hints in WILAYAH_HINTS.items():
        if any(h in t for h in hints):
            return kab
    return None


def ingest_news() -> int:
    """Pull all feeds, dedupe on url, insert new rows. Returns count inserted."""
    db = SessionLocal()
    inserted = 0
    try:
        existing_urls = {u for (u,) in db.query(News.url).all()}
        for feed_url in RSS_FEEDS:
            try:
                parsed = feedparser.parse(feed_url)
            except Exception as e:  # noqa: BLE001
                log.warning("feed failed %s: %s", feed_url, e)
                continue
            sumber = parsed.feed.get("title", "Antara Papua")
            for entry in parsed.entries:
                url = entry.get("link")
                if not url or url in existing_urls:
                    continue
                judul = (entry.get("title") or "").strip()
                ringkasan = (entry.get("summary") or "")[:300].strip()
                blob = f"{judul} {ringkasan}"
                tanggal = entry.get("published") or datetime.now(timezone.utc).isoformat()
                db.add(News(
                    tanggal=tanggal,
                    judul=judul,
                    ringkasan=ringkasan,
                    kategori=_kategori(blob),
                    sumber=sumber,
                    url=url,
                    kabupaten_terkait=_kabupaten(blob),
                    created_at=datetime.now(timezone.utc),
                ))
                existing_urls.add(url)
                inserted += 1
        db.commit()
        log.info("ingest_news inserted %d", inserted)
    finally:
        db.close()
    return inserted


def ingest_weather() -> int:
    """Refresh a WeatherSnapshot per district from Open-Meteo. Returns count updated."""
    db = SessionLocal()
    updated = 0
    try:
        districts = db.query(District).all()
        for d in districts:
            try:
                r = httpx.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={
                        "latitude": d.latitude,
                        "longitude": d.longitude,
                        "current": "temperature_2m,weather_code",
                        "daily": "temperature_2m_max,temperature_2m_min,"
                                 "weather_code,precipitation_probability_max",
                        "forecast_days": 2,
                        "timezone": "Asia/Jayapura",
                    },
                    timeout=15,
                )
                r.raise_for_status()
                data = r.json()
            except Exception as e:  # noqa: BLE001
                # keep last snapshot; never break the page because of weather
                log.warning("weather failed for %s: %s", d.distrik, e)
                continue

            cur = data.get("current", {})
            daily = data.get("daily", {})
            snap = db.get(WeatherSnapshot, d.id) or WeatherSnapshot(distrik_id=d.id)
            snap.suhu = cur.get("temperature_2m")
            snap.kondisi = WEATHER_CODE_ID.get(cur.get("weather_code"), "Tidak diketahui")
            # index 1 = besok (forecast_days=2 -> [hari ini, besok])
            snap.besok_min = (daily.get("temperature_2m_min") or [None, None])[1]
            snap.besok_max = (daily.get("temperature_2m_max") or [None, None])[1]
            snap.besok_kondisi = WEATHER_CODE_ID.get(
                (daily.get("weather_code") or [None, None])[1], "Tidak diketahui")
            snap.peluang_hujan = (daily.get("precipitation_probability_max") or [None, None])[1]
            snap.updated_at = datetime.now(timezone.utc)
            db.merge(snap)
            updated += 1
        db.commit()
        log.info("ingest_weather updated %d", updated)
    finally:
        db.close()
    return updated


_scheduler: BackgroundScheduler | None = None


def start_scheduler() -> None:
    """Call from the FastAPI lifespan. Runs both jobs at 06:00/14:00/22:00 WIT + once now."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return
    _scheduler = BackgroundScheduler(timezone="Asia/Jayapura")
    trigger = CronTrigger(hour="6,14,22", minute=0)
    _scheduler.add_job(ingest_news, trigger, id="news", replace_existing=True)
    _scheduler.add_job(ingest_weather, trigger, id="weather", replace_existing=True)
    _scheduler.start()
    # run once immediately so the app is never empty on a fresh boot
    try:
        ingest_news()
        ingest_weather()
    except Exception as e:  # noqa: BLE001
        log.warning("initial ingest failed (will retry on schedule): %s", e)


# Wire into main.py like:
#
#   from contextlib import asynccontextmanager
#   from app.scheduler import start_scheduler
#
#   @asynccontextmanager
#   async def lifespan(app):
#       start_scheduler()
#       yield
#
#   app = FastAPI(lifespan=lifespan)
#
# And expose a manual trigger:
#
#   @app.post("/admin/ingest")
#   def admin_ingest(_=Depends(require_auth)):
#       return {"news": ingest_news(), "weather": ingest_weather()}
