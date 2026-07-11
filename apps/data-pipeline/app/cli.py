from __future__ import annotations

import argparse
import json
from pathlib import Path

from pydantic import TypeAdapter

from schemas.extraction import SourceRegistryEntry
from services import IngestionService


def main() -> None:
    parser = argparse.ArgumentParser(description="AdmitWise official-data ingestion CLI")
    subcommands = parser.add_subparsers(dest="command", required=True)

    create = subcommands.add_parser("create-job", help="Create an extraction job")
    create.add_argument("source_json", type=Path)

    process = subcommands.add_parser("process-source", help="Create and process a source")
    process.add_argument("source_json", type=Path)

    inspect = subcommands.add_parser("inspect-job", help="Inspect a job from a saved result JSON")
    inspect.add_argument("result_json", type=Path)

    validation = subcommands.add_parser("validation-results", help="Show validation results")
    validation.add_argument("result_json", type=Path)

    args = parser.parse_args()
    service = IngestionService()

    if args.command == "create-job":
        source = _load_source(args.source_json)
        print(service.create_job(source).model_dump_json(indent=2))
    elif args.command == "process-source":
        source = _load_source(args.source_json)
        print(service.process_source(source).model_dump_json(indent=2))
    elif args.command == "inspect-job":
        print(args.result_json.read_text(encoding="utf-8"))
    elif args.command == "validation-results":
        payload = json.loads(args.result_json.read_text(encoding="utf-8"))
        records = payload.get("staged_records", [])
        conflicts = payload.get("conflicts", [])
        print(json.dumps({"records": records, "conflicts": conflicts}, indent=2, default=str))


def _load_source(path: Path) -> SourceRegistryEntry:
    adapter = TypeAdapter(SourceRegistryEntry)
    return adapter.validate_json(path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
