from fastapi import FastAPI

from app.routes.health import router as health_router

app = FastAPI(
    title="Hardt Systems API",
    description="API oficial da plataforma Hardt Systems",
    version="0.1.0",
)

app.include_router(health_router)


@app.get("/", tags=["Root"])
def root() -> dict[str, str]:
    return {
        "message": "Hardt Systems API",
        "status": "online",
        "docs": "/docs",
    }
