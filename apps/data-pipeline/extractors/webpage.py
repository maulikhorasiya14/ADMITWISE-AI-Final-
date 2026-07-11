from __future__ import annotations

from html.parser import HTMLParser

from schemas.extraction import ExtractedRecord, SourceRegistryEntry

from .common import read_source_text


class _TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._in_cell = False
        self._cell_parts: list[str] = []
        self._current_row: list[str] = []
        self.rows: list[list[str]] = []
        self.text_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:  # noqa: ANN001
        if tag in {"td", "th"}:
            self._in_cell = True
            self._cell_parts = []

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._in_cell:
            self._current_row.append(" ".join("".join(self._cell_parts).split()))
            self._in_cell = False
        if tag == "tr" and self._current_row:
            self.rows.append(self._current_row)
            self._current_row = []

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._cell_parts.append(data)
        stripped = " ".join(data.split())
        if stripped:
            self.text_parts.append(stripped)


def extract_webpage(source: SourceRegistryEntry) -> list[ExtractedRecord]:
    html = read_source_text(source)
    parser = _TableParser()
    parser.feed(html)
    table_records = _rows_to_records(parser.rows)
    if table_records:
        return table_records
    return [ExtractedRecord(raw_data={"text": " ".join(parser.text_parts)}, row_number=1)]


def _rows_to_records(rows: list[list[str]]) -> list[ExtractedRecord]:
    if len(rows) < 2:
        return []

    header = [item.strip().lower().replace(" ", "_") for item in rows[0]]
    records: list[ExtractedRecord] = []
    for index, row in enumerate(rows[1:], start=2):
        values = {header[column_index]: value for column_index, value in enumerate(row[: len(header)])}
        records.append(ExtractedRecord(raw_data=values, row_number=index))
    return records
