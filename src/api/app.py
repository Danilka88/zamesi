
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from src.api.pipeline import _cleanup_expired_jobs
from src.api.routes import _jobs, router
from src.api.routes_mix import router as mix_router
from src.api.routes_offers import router as offers_router
from src.api.routes_search import router as search_router
from src.api.routes_studio import router as studio_router
from src.core.config import config
from src.core.logging_config import setup_logging

setup_logging()


@asynccontextmanager
async def lifespan(application: FastAPI):
    config.load()
    task = asyncio.create_task(_cleanup_expired_jobs(_jobs))
    yield
    task.cancel()


# START_BLOCK: M-API/APP/CREATE
app = FastAPI(lifespan=lifespan,
    title="RUTUBE Video Analyzer",
    version="0.1.0",
    description="AI pipeline: video → .md passport with monetization tags",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://rutube.ru", "https://studio.rutube.ru", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(search_router)
app.include_router(mix_router)
app.include_router(offers_router)
app.include_router(studio_router)
app.mount("/metrics", make_asgi_app())
# END_BLOCK: M-API/APP/CREATE


# START_BLOCK: M-API/APP/HEALTH
@app.get("/health")
async def health():
    return {"status": "ok", "service": "rutube-video-analyzer"}
# END_BLOCK: M-API/APP/HEALTH
