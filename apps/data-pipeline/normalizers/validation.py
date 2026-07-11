from __future__ import annotations

from typing import Any

from schemas.extraction import DataCategory, DataConflict


def validate_normalized_record(
    normalized: dict[str, Any],
    data_category: DataCategory,
    academic_year: str | None,
    has_source: bool,
) -> list[str]:
    errors: list[str] = []

    if not academic_year and not normalized.get("academic_year"):
        errors.append("missing_year")
    if not has_source:
        errors.append("missing_source")

    opening_rank = normalized.get("opening_rank")
    closing_rank = normalized.get("closing_rank")
    if opening_rank is not None and closing_rank is not None and closing_rank < opening_rank:
        errors.append("closing_rank_below_opening_rank")

    if data_category == DataCategory.CUTOFFS:
        for key in ("category", "quota"):
            if not normalized.get(key):
                errors.append(f"missing_{key}")

    for key in (
        "tuition_fee",
        "hostel_fee",
        "mess_fee",
        "admission_fee",
        "refundable_deposit",
        "other_compulsory_fees",
        "estimated_four_year_cost",
    ):
        if key in normalized and normalized[key] is not None and normalized[key] < 0:
            errors.append(f"negative_{key}")

    if "placement_percentage" in normalized and normalized["placement_percentage"] is not None:
        if normalized["placement_percentage"] > 100:
            errors.append("placement_percentage_above_100")
        if normalized["placement_percentage"] < 0:
            errors.append("negative_placement_percentage")

    for key in ("average_package", "median_package", "highest_package"):
        if key in normalized and normalized[key] is not None and normalized[key] < 0:
            errors.append(f"negative_{key}")

    return errors


def detect_conflicts(records: list[dict[str, Any]]) -> list[DataConflict]:
    conflicts: list[DataConflict] = []
    seen: dict[str, dict[str, Any]] = {}

    for record in records:
        key = _record_key(record)
        if key in seen:
            conflicts.append(
                DataConflict(
                    conflict_key=key,
                    field_name="record",
                    existing_value=seen[key],
                    incoming_value=record,
                    severity="error",
                )
            )
            for field_name, incoming_value in record.items():
                existing_value = seen[key].get(field_name)
                if existing_value != incoming_value:
                    conflicts.append(
                        DataConflict(
                            conflict_key=key,
                            field_name=field_name,
                            existing_value=existing_value,
                            incoming_value=incoming_value,
                        )
                    )
        else:
            seen[key] = record

    return conflicts


def _record_key(record: dict[str, Any]) -> str:
    parts = [
        record.get("data_category"),
        record.get("college_id") or record.get("college_name") or record.get("college_identifier"),
        record.get("branch_name"),
        record.get("exam"),
        record.get("academic_year"),
        record.get("round"),
        record.get("category"),
        record.get("quota"),
        record.get("gender_pool"),
    ]
    return "|".join(str(part or "").upper() for part in parts)
