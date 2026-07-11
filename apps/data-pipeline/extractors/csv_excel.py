from __future__ import annotations

from io import BytesIO, StringIO

import pandas as pd

from schemas.extraction import ExtractedRecord, SourceRegistryEntry

from .common import read_source_bytes


def extract_csv(source: SourceRegistryEntry) -> list[ExtractedRecord]:
    content = read_source_bytes(source)
    frame = pd.read_csv(StringIO(content.decode("utf-8", errors="replace")))
    return _frame_to_records(frame)


def extract_excel(source: SourceRegistryEntry) -> list[ExtractedRecord]:
    content = read_source_bytes(source)
    frame = pd.read_excel(BytesIO(content))
    return _frame_to_records(frame)


def _frame_to_records(frame: pd.DataFrame) -> list[ExtractedRecord]:
    frame = frame.where(pd.notna(frame), None)
    return [
        ExtractedRecord(raw_data={str(key): value for key, value in row.items()}, row_number=index + 2)
        for index, row in enumerate(frame.to_dict(orient="records"))
    ]
