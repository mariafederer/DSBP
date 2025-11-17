"""API package exports."""

from typing import TYPE_CHECKING

__all__ = ["router"]

if TYPE_CHECKING:  # pragma: no cover - import only for typing
    from .routes import router as router


def __getattr__(name: str):
    if name == "router":
        from .routes import router as _router

        return _router
    raise AttributeError(name)

