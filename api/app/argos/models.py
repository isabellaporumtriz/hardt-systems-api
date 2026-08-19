from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy import UniqueConstraint
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

    company_data: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    company_data_confirmed_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    legacy_reconciliation_status: Mapped[
        str | None
    ] = mapped_column(
        String(40),
        nullable=True,
        index=True,
    )

    legacy_source: Mapped[
        str | None
    ] = mapped_column(
        String(180),
        nullable=True,
    )

    legacy_evidence: Mapped[
        dict | None
    ] = mapped_column(
        JSON,
        nullable=True,
    )

    legacy_reconciled_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
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


class ArgosIntake(BaseModel):

    __tablename__ = "argos_intakes"

    document_type: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="CNPJ_CARD",
        server_default="CNPJ_CARD",
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="parsed",
        server_default="parsed",
        index=True,
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    object_key: Mapped[str] = mapped_column(
        String(700),
        nullable=False,
        unique=True,
    )

    mime_type: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    extracted_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    extracted_data: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    parse_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    operation_id: Mapped[UUID | None] = mapped_column(
        ForeignKey(
            "argos_operations.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
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


class ArgosCnpjBatch(BaseModel):

    """
    Lote de CNPJs importado por planilha.

    Não substitui ArgosIntake.
    Não cria operação automaticamente.
    """

    __tablename__ = "argos_cnpj_batches"

    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="parsed",
        server_default="parsed",
        index=True,
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    object_key: Mapped[str] = mapped_column(
        String(700),
        nullable=False,
        unique=True,
    )

    mime_type: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    total_rows: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    valid_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    duplicate_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    invalid_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    created_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )


class ArgosCnpjBatchItem(BaseModel):

    """
    Uma linha da planilha de CNPJs.

    status esperado:
    - pending
    - duplicate
    - invalid
    - processing
    - completed
    - failed
    """

    __tablename__ = "argos_cnpj_batch_items"

    batch_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "argos_cnpj_batches.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    row_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    cnpj_original: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
    )

    cnpj_normalized: Mapped[str | None] = mapped_column(
        String(14),
        nullable=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )

    error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    operation_id: Mapped[UUID | None] = mapped_column(
        ForeignKey(
            "argos_operations.id",
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



class ArgosMetaProfile(BaseModel):
    """
    Perfil Meta interno do Argos.

    Totalmente separado do estoque comercial
    inventory_items / products / purchases.
    """

    __tablename__ = "argos_meta_profiles"

    label: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
    )

    facebook_id: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
        index=True,
    )

    profile_ref: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
        unique=True,
        index=True,
    )

    allocation_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        unique=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="available",
        server_default="available",
        index=True,
    )

    capacity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    encrypted_payload: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )


class ArgosMetaAssignment(BaseModel):
    """
    Relação auditável:

        operação/empresa
              ↕
        perfil Meta interno
    """

    __tablename__ = "argos_meta_assignments"

    __table_args__ = (
        UniqueConstraint(
            "operation_id",
            "meta_profile_id",
            name=(
                "uq_argos_meta_assignment_"
                "operation_profile"
            ),
        ),
    )

    operation_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "argos_operations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    meta_profile_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "argos_meta_profiles.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="reserved",
        server_default="reserved",
        index=True,
    )

    reserved_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    login_completed_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    released_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    business_id: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    last_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
