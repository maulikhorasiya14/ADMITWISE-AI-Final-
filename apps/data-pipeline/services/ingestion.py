from __future__ import annotations

from datetime import UTC, datetime

from extractors import extract_records
from extractors.common import build_source_file, read_source_bytes
from normalizers import detect_conflicts, normalize_record, validate_normalized_record
from schemas.extraction import (
    ConfidenceLevel,
    ExtractionJob,
    ExtractionJobStatus,
    ExtractionResult,
    SourceRegistryEntry,
    StagedRecord,
)
from services.staging import InMemoryStagingStore


class IngestionService:
    def __init__(self, store: InMemoryStagingStore | None = None) -> None:
        self.store = store or InMemoryStagingStore()

    def create_job(self, source: SourceRegistryEntry) -> ExtractionJob:
        return self.store.save_job(ExtractionJob(source=source))

    def process_source(self, source: SourceRegistryEntry) -> ExtractionResult:
        job = self.create_job(source)
        return self.process_job(job.id)

    def process_job(self, job_id: str) -> ExtractionResult:
        job = self.store.get_job(job_id)
        if job is None:
            raise ValueError(f"Unknown extraction job: {job_id}")

        job.status = ExtractionJobStatus.PROCESSING
        job.updated_at = datetime.now(UTC)
        self.store.save_job(job)

        try:
            content = read_source_bytes(job.source)
            source_file = build_source_file(job.source, job.id, content)
            self.store.save_source_file(source_file)

            extracted_records = extract_records(job.source)
            staged_records: list[StagedRecord] = []
            normalized_records: list[dict] = []

            for extracted in extracted_records:
                normalized = normalize_record(extracted.raw_data, job.source.data_category)
                if job.source.academic_year and not normalized.get("academic_year"):
                    normalized["academic_year"] = job.source.academic_year
                if job.source.college_identifier and not normalized.get("college_identifier"):
                    normalized["college_identifier"] = job.source.college_identifier

                validation_errors = validate_normalized_record(
                    normalized=normalized,
                    data_category=job.source.data_category,
                    academic_year=job.source.academic_year or normalized.get("academic_year"),
                    has_source=bool(job.source.source_url or job.source.local_file),
                )
                normalized_records.append(normalized)
                staged_records.append(
                    StagedRecord(
                        extraction_job_id=job.id,
                        source_file_id=source_file.id,
                        source_id=None,
                        college_id=None,
                        data_category=job.source.data_category,
                        academic_year=job.source.academic_year or normalized.get("academic_year"),
                        raw_extracted_data=extracted.raw_data,
                        normalized_data=normalized,
                        validation_errors=validation_errors,
                        confidence_level=_confidence_for_source(job.source.source_type.value),
                    )
                )

            conflicts = detect_conflicts(normalized_records)
            for staged_record in staged_records:
                staged_record.conflicts = [
                    conflict
                    for conflict in conflicts
                    if conflict.conflict_key in _candidate_conflict_keys(staged_record.normalized_data)
                ]

            self.store.save_staged_records(staged_records)
            self.store.save_conflicts(job.id, conflicts)
            job.status = ExtractionJobStatus.COMPLETED
            job.updated_at = datetime.now(UTC)
            self.store.save_job(job)

            return ExtractionResult(
                job=job,
                source_file=source_file,
                staged_records=staged_records,
                conflicts=conflicts,
                status=job.status,
                message="Extracted records stored in staging only.",
            )
        except Exception as exc:
            job.status = ExtractionJobStatus.FAILED
            job.error_message = str(exc)
            job.updated_at = datetime.now(UTC)
            self.store.save_job(job)
            return ExtractionResult(
                job=job,
                status=job.status,
                message=str(exc),
            )

    def inspect_job(self, job_id: str) -> ExtractionResult:
        job = self.store.get_job(job_id)
        if job is None:
            raise ValueError(f"Unknown extraction job: {job_id}")
        return ExtractionResult(
            job=job,
            staged_records=self.store.records_for_job(job_id),
            conflicts=self.store.conflicts_for_job(job_id),
            status=job.status,
        )

    def validation_results(self, job_id: str) -> dict[str, list]:
        return {
            "records": self.store.records_for_job(job_id),
            "conflicts": self.store.conflicts_for_job(job_id),
        }


def _confidence_for_source(source_type: str) -> ConfidenceLevel:
    if source_type in {"government", "counselling_authority"}:
        return ConfidenceLevel.A
    if source_type == "official_college":
        return ConfidenceLevel.B
    if source_type == "verified_student":
        return ConfidenceLevel.C
    if source_type == "public_unverified":
        return ConfidenceLevel.D
    return ConfidenceLevel.E


def _candidate_conflict_keys(normalized: dict) -> list[str]:
    from normalizers.validation import _record_key

    return [_record_key(normalized)]
