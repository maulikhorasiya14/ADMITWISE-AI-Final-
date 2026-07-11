from __future__ import annotations

from io import BytesIO

from schemas.extraction import ExtractedRecord, SourceRegistryEntry

from .common import read_source_bytes


def extract_pdf_text(source: SourceRegistryEntry) -> list[ExtractedRecord]:
    content = read_source_bytes(source)
    text = _extract_text_with_pdf_libraries(content)
    return [ExtractedRecord(raw_data={"text": text}, row_number=1)]


def extract_pdf_tables(source: SourceRegistryEntry) -> list[ExtractedRecord]:
    content = read_source_bytes(source)
    rows = _extract_tables_with_pdfplumber(content)
    if rows:
        return _rows_to_records(rows)

    text = _extract_text_with_pdf_libraries(content)
    delimited_rows = [
        [cell.strip() for cell in line.split(",")]
        for line in text.splitlines()
        if "," in line
    ]
    return _rows_to_records(delimited_rows)


def _extract_text_with_pdf_libraries(content: bytes) -> str:
    try:
        from pypdf import PdfReader

        reader = PdfReader(BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except Exception:
        return content.decode("utf-8", errors="replace")


def _extract_tables_with_pdfplumber(content: bytes) -> list[list[str]]:
    try:
        import pdfplumber

        rows: list[list[str]] = []
        with pdfplumber.open(BytesIO(content)) as pdf:
            for page in pdf.pages:
                for table in page.extract_tables():
                    rows.extend([[cell or "" for cell in row] for row in table])
        return rows
    except Exception:
        return []


def _rows_to_records(rows: list[list[str]]) -> list[ExtractedRecord]:
    if len(rows) < 2:
        return []

    header = [item.strip().lower().replace(" ", "_") for item in rows[0]]
    return [
        ExtractedRecord(
            raw_data={header[column_index]: value for column_index, value in enumerate(row[: len(header)])},
            row_number=index,
        )
        for index, row in enumerate(rows[1:], start=2)
    ]
