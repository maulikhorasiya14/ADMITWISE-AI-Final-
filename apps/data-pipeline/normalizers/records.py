from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from typing import Any

from schemas.extraction import DataCategory


CATEGORY_ALIASES = {
    "GEN": "GENERAL",
    "OPEN": "GENERAL",
    "GENERAL": "GENERAL",
    "EWS": "EWS",
    "OBC": "OBC_NCL",
    "OBC-NCL": "OBC_NCL",
    "OBC_NCL": "OBC_NCL",
    "SC": "SC",
    "ST": "ST",
}

QUOTA_ALIASES = {
    "AI": "AI",
    "ALL INDIA": "AI",
    "ALL_INDIA": "AI",
    "HS": "HS",
    "HOME STATE": "HS",
    "HOME_STATE": "HS",
    "OS": "OS",
    "OTHER STATE": "OS",
    "OTHER_STATE": "OS",
}

GENDER_ALIASES = {
    "OPEN": "GENDER_NEUTRAL",
    "GN": "GENDER_NEUTRAL",
    "GENDER NEUTRAL": "GENDER_NEUTRAL",
    "GENDER_NEUTRAL": "GENDER_NEUTRAL",
    "FEMALE": "FEMALE",
    "FEMALE ONLY": "FEMALE",
    "FEMALE_ONLY": "FEMALE",
    "MALE": "MALE",
}


def normalize_record(raw: dict[str, Any], category: DataCategory) -> dict[str, Any]:
    normalized = {_normalize_key(key): value for key, value in raw.items()}
    normalized["data_category"] = category.value

    if "branch" in normalized and "branch_name" not in normalized:
        normalized["branch_name"] = normalized["branch"]
    if "branch_name" in normalized:
        normalized["branch_name"] = normalize_branch_name(str(normalized["branch_name"]))

    if "category" in normalized:
        normalized["category"] = normalize_category(str(normalized["category"]))
    if "quota" in normalized:
        normalized["quota"] = normalize_quota(str(normalized["quota"]))
    if "gender_pool" in normalized:
        normalized["gender_pool"] = normalize_gender_pool(str(normalized["gender_pool"]))

    for key in ("opening_rank", "closing_rank", "rank", "minimum_rank"):
        if key in normalized:
            normalized[key] = parse_int(normalized[key])

    for key in (
        "tuition_fee",
        "hostel_fee",
        "mess_fee",
        "admission_fee",
        "refundable_deposit",
        "other_compulsory_fees",
        "estimated_four_year_cost",
        "average_package",
        "median_package",
        "highest_package",
        "placement_percentage",
    ):
        if key in normalized:
            normalized[key] = parse_decimal(normalized[key])

    if "academic_year" in normalized:
        normalized["academic_year"] = normalize_academic_year(str(normalized["academic_year"]))

    return normalized


def normalize_branch_name(value: str) -> str:
    cleaned = " ".join(value.replace("&", "and").split())
    aliases = {
        "cse": "Computer Science and Engineering",
        "cs": "Computer Science and Engineering",
        "ece": "Electronics and Communication Engineering",
        "me": "Mechanical Engineering",
    }
    return aliases.get(cleaned.lower(), cleaned.title())


def normalize_category(value: str) -> str:
    return CATEGORY_ALIASES.get(value.strip().upper(), value.strip().upper())


def normalize_quota(value: str) -> str:
    return QUOTA_ALIASES.get(value.strip().upper().replace("-", " "), value.strip().upper())


def normalize_gender_pool(value: str) -> str:
    return GENDER_ALIASES.get(value.strip().upper().replace("-", " "), value.strip().upper())


def normalize_academic_year(value: str) -> str | None:
    match = re.search(r"(20\d{2})\D*(\d{2}|20\d{2})?", value)
    if not match:
        return None
    start = match.group(1)
    end = match.group(2)
    if not end:
        return start
    if len(end) == 2:
        end = f"20{end}"
    return f"{start}-{end}"


def parse_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    text = str(value).replace(",", "").strip()
    try:
        return int(Decimal(text))
    except (InvalidOperation, ValueError):
        return None


def parse_decimal(value: Any) -> float | None:
    if value in (None, ""):
        return None
    text = str(value).replace(",", "").replace("₹", "").replace("INR", "").strip()
    try:
        return float(Decimal(text))
    except (InvalidOperation, ValueError):
        return None


def _normalize_key(key: str) -> str:
    return key.strip().lower().replace(" ", "_").replace("-", "_")
