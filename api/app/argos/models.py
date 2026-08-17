from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import BaseModel


class ArgosOperation(BaseModel):
    __tablename__ = "argos_operations"

    company_name: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
    )

    client_slug: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
        unique=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="active",
        server_default="active",
        index=True,
    )

    current_step: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
        default="CREATED",
        server_default="CREATED",
        index=True,
    )

    domain_candidates: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    domain: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    site_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    business_id: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    last_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )


class ArgosJob(BaseModel):
    __tablename__ = "argos_jobs"

    operation_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "argos_operations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    action: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="queued",
        server_default="queued",
        index=True,
    )

    payload: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    result: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    worker_id: Mapped[str | None] = mapped_column(
        String(180),
        nullable=True,
    )

    claimed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
