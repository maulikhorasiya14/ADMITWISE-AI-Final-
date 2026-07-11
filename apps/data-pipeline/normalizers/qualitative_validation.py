from typing import Any

def validate_qualitative_record(category: str, normalized: dict[str, Any]) -> list[str]:
    errors = []
    if category == "clubs":
        if not normalized.get("club_name"):
            errors.append("club_name is required")
    elif category == "campus_reality":
        if not normalized:
            errors.append("campus_reality data is empty")
    elif category == "facilities":
        if not normalized:
            errors.append("facilities data is empty")
    elif category == "student_experience_sources":
        if not normalized.get("local_source_id"):
            errors.append("local_source_id is required")
        if not normalized.get("url"):
            errors.append("url is required")
    return errors
