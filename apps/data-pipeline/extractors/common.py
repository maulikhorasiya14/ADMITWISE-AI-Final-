from __future__ import annotations

import hashlib
from pathlib import Path
from urllib.request import urlopen

from schemas.extraction import SourceFile, SourceRegistryEntry


def read_source_bytes(source: SourceRegistryEntry) -> bytes:
    if source.local_file:
        return source.local_file.read_bytes()
    if source.source_url:
        with urlopen(str(source.source_url), timeout=20) as response:  # noqa: S310
            return response.read()
    raise ValueError("source_url or local_file is required")


def read_source_text(source: SourceRegistryEntry) -> str:
    return read_source_bytes(source).decode("utf-8", errors="replace")


def build_source_file(source: SourceRegistryEntry, job_id: str, content: bytes) -> SourceFile:
    file_name = Path(source.local_file).name if source.local_file else None
    return SourceFile(
        extraction_job_id=job_id,
        source_url=str(source.source_url) if source.source_url else None,
        local_file_path=str(source.local_file) if source.local_file else None,
        content_type=source.source_kind.value,
        file_name=file_name,
        file_size_bytes=len(content),
        checksum_sha256=hashlib.sha256(content).hexdigest(),
    )
