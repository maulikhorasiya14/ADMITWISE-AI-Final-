from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field, HttpUrl, model_validator


class DataCategory(StrEnum):
    COLLEGE_IDENTITY = "college_identity"
    BRANCHES = "branches"
    CUTOFFS = "cutoffs"
    FEES = "fees"
    PLACEMENTS = "placements"
    SCHOLARSHIPS = "scholarships"
    RECRUITERS = "recruiters"
    CLUBS = "clubs"
    CAMPUS_REALITY = "campus_reality"
    FACILITIES = "facilities"
    LOCATION_DETAILS = "location_details"
    STUDENT_EXPERIENCE_SOURCES = "student_experience_sources"


class SourceKind(StrEnum):
    WEBPAGE = "webpage"
    PDF_TEXT = "pdf_text"
    PDF_TABLE = "pdf_table"
    CSV = "csv"
    EXCEL = "excel"


class SourceType(StrEnum):
    GOVERNMENT = "government"
    COUNSELLING_AUTHORITY = "counselling_authority"
    OFFICIAL_COLLEGE = "official_college"
    VERIFIED_STUDENT = "verified_student"
    PUBLIC_UNVERIFIED = "public_unverified"
    INFERENCE = "inference"


class ConfidenceLevel(StrEnum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"


class StagedRecordStatus(StrEnum):
    NEEDS_REVIEW = "needs_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class ExtractionJobStatus(StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SourceRegistryEntry(BaseModel):
    source_url: HttpUrl | None = None
    local_file: Path | None = None
    source_kind: SourceKind
    source_type: SourceType
    data_category: DataCategory
    academic_year: str | None = None
    college_identifier: str | None = None

    @model_validator(mode="after")
    def require_source(self) -> SourceRegistryEntry:
        if self.source_url is None and self.local_file is None:
            raise ValueError("source_url or local_file is required")
        return self


class ExtractionJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    source: SourceRegistryEntry
    status: ExtractionJobStatus = ExtractionJobStatus.QUEUED
    error_message: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SourceFile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    extraction_job_id: str
    source_url: str | None = None
    local_file_path: str | None = None
    content_type: str | None = None
    file_name: str | None = None
    file_size_bytes: int | None = Field(default=None, ge=0)
    checksum_sha256: str | None = None


class ExtractedRecord(BaseModel):
    raw_data: dict[str, Any]
    row_number: int | None = None


class DataConflict(BaseModel):
    conflict_key: str
    field_name: str
    existing_value: Any
    incoming_value: Any
    severity: str = "warning"


class StagedRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    extraction_job_id: str
    source_file_id: str | None = None
    source_id: str | None = None
    college_id: str | None = None
    data_category: DataCategory
    academic_year: str | None
    raw_extracted_data: dict[str, Any]
    normalized_data: dict[str, Any]
    validation_errors: list[str] = Field(default_factory=list)
    confidence_level: ConfidenceLevel = ConfidenceLevel.E
    status: StagedRecordStatus = StagedRecordStatus.NEEDS_REVIEW
    conflicts: list[DataConflict] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ExtractionResult(BaseModel):
    job: ExtractionJob
    source_file: SourceFile | None = None
    staged_records: list[StagedRecord] = Field(default_factory=list)
    conflicts: list[DataConflict] = Field(default_factory=list)
    status: ExtractionJobStatus
    message: str | None = None
