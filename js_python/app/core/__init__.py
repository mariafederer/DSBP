"""Core utilities for the FastAPI application."""

from typing import TYPE_CHECKING

__all__ = ["app", "config", "database"]

if TYPE_CHECKING:  # pragma: no cover - import only for typing
    from . import app, config, database


def __getattr__(name: str):
    if name in {"app", "config", "database"}:
        module = __import__(f"app.core.{name}", fromlist=[name])
        return module
    raise AttributeError(name)

