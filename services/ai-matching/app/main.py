from fastapi import FastAPI
from app.config import settings

app = FastAPI(
    title="Smart Lorry Marketplace — AI Matching Service",
    version="0.1.0",
    description=(
        "Route optimization (Phase 4) and recommendation scoring (Phase 5) for the "
        "Smart Lorry Marketplace. Called internally by the Express API — not exposed "
        "directly to clients."
    ),
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "env": settings.env}


# Phase 4 adds: from app.routers import route_optimizer; app.include_router(route_optimizer.router)
# Phase 5 adds: from app.routers import recommendations; app.include_router(recommendations.router)
