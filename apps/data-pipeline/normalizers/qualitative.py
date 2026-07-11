from typing import Any

def normalize_club_record(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "club_name": raw.get("club_name") or raw.get("Club Name") or "",
        "club_category": raw.get("club_category") or raw.get("Club Category"),
        "official_status": raw.get("official_status"),
        "description": raw.get("description"),
        "official_page": raw.get("official_page"),
        "latest_activity": raw.get("latest_activity"),
        "latest_activity_date": str(raw.get("latest_activity_date")) if raw.get("latest_activity_date") else None,
        "major_achievements": raw.get("major_achievements"),
        "recruitment_process": raw.get("recruitment_process"),
        "activity_status": raw.get("activity_status"),
        "source_id": raw.get("source_id") if raw.get("source_id") and "-" in raw.get("source_id") else None,
        "last_verified_date": raw.get("last_verified_date")
    }

def normalize_campus_reality(raw: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    return raw

def normalize_facilities(raw: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    return raw

def normalize_location_details(raw: dict[str, Any]) -> dict[str, Any]:
    def parse_float(val: Any) -> float | None:
        if val in (None, "", "null"): return None
        try: return float(val)
        except ValueError: return None

    return {
        "campus_name": raw.get("campus_name"),
        "official_address": raw.get("official_address"),
        "locality": raw.get("locality"),
        "district": raw.get("district"),
        "nearest_metro": raw.get("nearest_metro"),
        "nearest_bus_terminal": raw.get("nearest_bus_terminal"),
        "railway_travel_time_minutes": parse_float(raw.get("railway_travel_time_minutes")),
        "airport_travel_time_minutes": parse_float(raw.get("airport_travel_time_minutes")),
        "technology_ecosystem": raw.get("technology_ecosystem"),
        "cost_of_living_description": raw.get("cost_of_living_band") or raw.get("cost_of_living_description"),
        "data_origin": raw.get("data_origin"),
        "source_id": raw.get("source_id") if raw.get("source_id") and "-" in raw.get("source_id") else None
    }

def normalize_experience_source(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "local_source_id": raw.get("source_id"),
        "platform": raw.get("platform"),
        "source_title": raw.get("source_title"),
        "url": raw.get("url"),
        "publication_date": str(raw.get("publication_date")) if raw.get("publication_date") else None,
        "source_identity_type": raw.get("source_identity_type"),
        "college_branch_if_known": raw.get("college_branch_if_known"),
        "graduation_year_if_known": raw.get("graduation_year_if_known"),
        "hosteller_or_day_scholar": raw.get("hosteller_or_day_scholar"),
        "topics_covered": raw.get("topics_covered"),
        "positive_themes": raw.get("positive_themes"),
        "negative_themes": raw.get("negative_themes"),
        "visual_evidence": str(raw.get("visual_evidence")).lower() == 'true',
        "possible_bias": raw.get("possible_bias"),
        "confidence_level": raw.get("confidence_level", "E"),
        "notes": raw.get("notes")
    }
