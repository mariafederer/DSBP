"""Utilities for ensuring integer primary keys are populated."""
from __future__ import annotations

from typing import Type

from sqlalchemy import event, select, func
from sqlalchemy.orm import Mapper


def register_integer_pk_listener(model: Type[object], pk_name: str = "id") -> None:
    """Ensure ``model`` receives a sequential integer primary key before insert.

    Many of the existing database tables were created without ``AUTOINCREMENT``/
    ``SERIAL`` defaults. When SQLAlchemy tries to insert a row, the ``id`` column
    is left ``NULL`` which causes integrity errors on databases that do not
    provide implicit autoincrement behaviour. By attaching a ``before_insert``
    listener we can synthesise a new identifier when the database is not doing it
    for us. The logic is intentionally conservative: it only assigns a value when
    the model does not already provide one (allowing native sequences to keep
    working) and simply uses ``MAX(id) + 1`` as the next identifier.
    """

    table = getattr(model, "__table__", None)
    if table is None or pk_name not in table.c:
        raise ValueError(f"Model {model!r} does not expose a '{pk_name}' column")

    pk_column = table.c[pk_name]

    @event.listens_for(model, "before_insert", propagate=True)
    def _assign_integer_pk(_: Mapper, connection, target) -> None:  # pragma: no cover - SQLAlchemy callback
        if getattr(target, pk_name) is not None:
            return

        max_stmt = select(func.max(pk_column))
        max_value = connection.execute(max_stmt).scalar_one_or_none()
        next_id = (max_value or 0) + 1
        setattr(target, pk_name, next_id)

