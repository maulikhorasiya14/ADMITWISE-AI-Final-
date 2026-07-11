from __future__ import annotations

from schemas.extraction import ExtractedRecord, SourceKind, SourceRegistryEntry

from .csv_excel import extract_csv, extract_excel
from .pdf import extract_pdf_tables, extract_pdf_text
from .webpage import extract_webpage


def extract_records(source: SourceRegistryEntry) -> list[ExtractedRecord]:
    if source.source_kind == SourceKind.WEBPAGE:
        return extract_webpage(source)
    if source.source_kind == SourceKind.PDF_TEXT:
        return extract_pdf_text(source)
    if source.source_kind == SourceKind.PDF_TABLE:
        return extract_pdf_tables(source)
    if source.source_kind == SourceKind.CSV:
        return extract_csv(source)
    if source.source_kind == SourceKind.EXCEL:
        return extract_excel(source)

    raise ValueError(f"Unsupported source kind: {source.source_kind}")
