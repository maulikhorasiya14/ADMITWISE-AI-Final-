from fastapi import FastAPI

from schemas.extraction import ExtractionJob, ExtractionResult, SourceRegistryEntry
from services import IngestionService

app = FastAPI(title="AdmitWise Data Pipeline", version="0.1.0")
service = IngestionService()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "admitwise-data-pipeline"}


@app.post("/extraction-jobs", response_model=ExtractionJob)
def create_extraction_job(payload: SourceRegistryEntry) -> ExtractionJob:
    return service.create_job(payload)


@app.post("/extraction-jobs/{job_id}/process", response_model=ExtractionResult)
def process_extraction_job(job_id: str) -> ExtractionResult:
    return service.process_job(job_id)


@app.post("/sources/process", response_model=ExtractionResult)
def process_source(payload: SourceRegistryEntry) -> ExtractionResult:
    return service.process_source(payload)


@app.get("/extraction-jobs/{job_id}", response_model=ExtractionResult)
def inspect_extraction_job(job_id: str) -> ExtractionResult:
    return service.inspect_job(job_id)


@app.get("/extraction-jobs/{job_id}/validation")
def view_validation_results(job_id: str) -> dict[str, list]:
    return service.validation_results(job_id)
