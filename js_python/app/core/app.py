"""FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core import config
from app.core.database import Base, engine


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    Base.metadata.create_all(bind=engine)

    app = FastAPI(title=config.APP_TITLE)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ALLOW_ORIGINS,
        allow_credentials=config.CORS_ALLOW_CREDENTIALS,
        allow_methods=config.CORS_ALLOW_METHODS,
        allow_headers=config.CORS_ALLOW_HEADERS,
    )

    if config.STATIC_FILES_DIR.exists():
        app.mount(
            config.STATIC_MOUNT_PATH,
            StaticFiles(directory=str(config.STATIC_FILES_DIR)),
            name="static",
        )

    app.include_router(router)
    return app

