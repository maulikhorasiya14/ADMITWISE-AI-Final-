from __future__ import annotations

from dataclasses import dataclass, field

from schemas.extraction import DataConflict, ExtractionJob, SourceFile, StagedRecord


@dataclass
class InMemoryStagingStore:
    jobs: dict[str, ExtractionJob] = field(default_factory=dict)
    source_files: dict[str, SourceFile] = field(default_factory=dict)
    staged_records: dict[str, StagedRecord] = field(default_factory=dict)
    conflicts: dict[str, list[DataConflict]] = field(default_factory=dict)

    def save_job(self, job: ExtractionJob) -> ExtractionJob:
        self.jobs[job.id] = job
        return job

    def get_job(self, job_id: str) -> ExtractionJob | None:
        return self.jobs.get(job_id)

    def save_source_file(self, source_file: SourceFile) -> SourceFile:
        self.source_files[source_file.id] = source_file
        return source_file

    def save_staged_records(self, records: list[StagedRecord]) -> list[StagedRecord]:
        for record in records:
            self.staged_records[record.id] = record
        return records

    def save_conflicts(self, job_id: str, conflicts: list[DataConflict]) -> list[DataConflict]:
        self.conflicts[job_id] = conflicts
        return conflicts

    def records_for_job(self, job_id: str) -> list[StagedRecord]:
        return [
            record
            for record in self.staged_records.values()
            if record.extraction_job_id == job_id
        ]

    def conflicts_for_job(self, job_id: str) -> list[DataConflict]:
        return self.conflicts.get(job_id, [])
