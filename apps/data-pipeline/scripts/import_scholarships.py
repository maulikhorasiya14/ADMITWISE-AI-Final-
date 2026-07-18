"""Import scholarships from per-college scholarships.csv files into Supabase.

Each CSV row becomes:
  1. A scholarship record (upserted by deterministic UUID5 from name+provider).
  2. A college_scholarships link (upserted by college_id + scholarship_id).

Usage:
  cd apps/data-pipeline
  .\.venv\Scripts\activate
  python scripts/import_scholarships.py --data-dir data
"""
from __future__ import annotations

import argparse
import csv
import logging
import os
import re
import uuid
from pathlib import Path

import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

NAMESPACE_SCHOLARSHIPS = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
NAMESPACE_SOURCES = uuid.UUID("b2c3d4e5-f6a7-8901-bcde-f12345678901")


def load_env(env_path: Path):
    if not env_path.exists():
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                parts = line.split("=", 1)
                if len(parts) == 2 and parts[0] not in os.environ:
                    os.environ[parts[0]] = parts[1].strip("'\"")


class SupabaseClient:
    def __init__(self, url: str, key: str):
        self.url = f"{url}/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        self.client = httpx.Client(base_url=self.url, headers=self.headers, timeout=30.0)

    def get_colleges(self) -> list[dict]:
        r = self.client.get("/colleges?select=id,slug,name")
        r.raise_for_status()
        return r.json()

    def upsert(self, table: str, payload: list[dict], on_conflict: str = ""):
        if not payload:
            return []
        headers = self.headers.copy()
        if on_conflict:
            headers["Prefer"] = "resolution=merge-duplicates,return=representation"
        r = self.client.post(f"/{table}?on_conflict={on_conflict}", json=payload, headers=headers)
        if r.status_code >= 400:
            logging.error(f"Error upserting to {table}: {r.text}")
        r.raise_for_status()
        return r.json()


def scholarship_id(name: str, provider: str) -> str:
    """Deterministic UUID for a scholarship based on name + provider."""
    key = f"{name.strip().lower()}|{provider.strip().lower()}"
    return str(uuid.uuid5(NAMESPACE_SCHOLARSHIPS, key))


def source_id_for(source_ref: str, college_name: str) -> str:
    """Deterministic UUID for a source reference."""
    key = f"{source_ref.strip()}|{college_name.strip().lower()}"
    return str(uuid.uuid5(NAMESPACE_SOURCES, key))


def parse_income(value: str) -> int | None:
    if not value:
        return None
    cleaned = value.replace(",", "").strip()
    match = re.search(r"(\d+)", cleaned)
    if not match:
        return None
    return int(match.group(1))


def parse_array_field(value: str) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(";") if item.strip()]


def parse_deadline(value: str) -> str | None:
    """Return a valid date string or None if the value is free text."""
    if not value:
        return None
    # Only accept values that look like dates (YYYY-MM-DD or similar)
    if re.match(r"^\d{4}-\d{2}-\d{2}$", value.strip()):
        return value.strip()
    return None


def process_csv_row(row: dict, college_name: str) -> tuple[dict, dict, dict]:
    """Returns (source_record, scholarship_record, link_record)."""
    name = row.get("scholarship_name", "").strip()
    provider = row.get("provider", "").strip()
    if not name:
        raise ValueError("Empty scholarship_name")

    sid = scholarship_id(name, provider)
    src_ref = row.get("source_id", "").strip() or "scholarship-csv"
    src_id = source_id_for(src_ref, college_name)

    source_record = {
        "id": src_id,
        "title": f"{name} - {college_name}",
        "source_type": "official_college",
        "source_url": row.get("application_url", "").strip() or None,
        "academic_year": None,
        "verification_status": "published",
        "confidence_level": row.get("confidence_level", "B").strip()[:1] or "B",
    }

    # Parse categories from category_requirement
    categories = []
    cat_req = row.get("category_requirement", "").strip()
    if cat_req:
        for token in re.split(r"[,;/]", cat_req):
            token = token.strip().upper()
            if "SC" in token and "SCHEME" not in token:
                categories.append("SC")
            if "ST" in token:
                categories.append("ST")
            if "OBC" in token:
                categories.append("OBC")
            if "EBC" in token:
                categories.append("EBC")
            if "EWS" in token:
                categories.append("EWS")
            if "DNT" in token:
                categories.append("DNT")
        categories = list(dict.fromkeys(categories))  # dedupe preserving order

    # Parse states from domicile_requirement
    states = []
    domicile = row.get("domicile_requirement", "").strip()
    if domicile:
        state_names = [
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
            "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
            "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
            "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
            "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
            "Jammu and Kashmir", "Ladakh", "Delhi",
        ]
        for state in state_names:
            if state.lower() in domicile.lower():
                states.append(state)

    scholarship_record = {
        "id": sid,
        "name": name,
        "provider": provider or None,
        "description": row.get("benefit_description", "").strip() or None,
        "applicable_states": states,
        "applicable_categories": categories,
        "categories": categories,
        "gender_requirement": row.get("gender_requirement", "").strip() or None,
        "maximum_family_income": parse_income(row.get("income_limit_inr", "")),
        "minimum_marks": None,
        "minimum_rank": None,
        "benefit_amount": parse_income(row.get("benefit_amount_inr", "")),
        "benefit_description": row.get("benefit_description", "").strip() or None,
        "required_documents": parse_array_field(row.get("required_documents", "")),
        "renewal_conditions": parse_array_field(row.get("renewal_conditions", "")),
        "application_deadline": parse_deadline(row.get("deadline", "")),
        "official_url": row.get("application_url", "").strip() or None,
        "source_id": src_id,
        "verification_status": "published",
        "is_published": True,
        "confidence_level": row.get("confidence_level", "B").strip()[:1] or "B",
    }

    link_record = {
        "scholarship_id": sid,
        "availability_notes": row.get("applicable_programme", "").strip() or None,
        "source_id": src_id,
        "verification_status": "published",
        "is_published": True,
    }

    return source_record, scholarship_record, link_record


def main():
    parser = argparse.ArgumentParser(description="Import scholarships from CSV files")
    parser.add_argument("--data-dir", type=Path, required=True, help="Path to data/ folder")
    parser.add_argument("--dry-run", action="store_true", help="Parse but do not insert")
    args = parser.parse_args()

    load_env(Path("../../.env.local"))
    load_env(Path("../../apps/web/.env.local"))

    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        logging.error("Missing Supabase credentials in environment")
        return

    db = SupabaseClient(supabase_url, supabase_key)

    if not args.dry_run:
        logging.info("Fetching colleges from Supabase...")
        colleges = db.get_colleges()
        slug_to_id = {c["slug"]: c["id"] for c in colleges}
    else:
        slug_to_id = {}

    total_scholarships = 0
    total_links = 0

    for college_dir in sorted(args.data_dir.iterdir()):
        if not college_dir.is_dir() or not college_dir.name.startswith("college_data_"):
            continue

        scholarships_csv = college_dir / "scholarships.csv"
        if not scholarships_csv.exists():
            continue

        raw_slug = college_dir.name.replace("college_data_", "")
        # Extract optional number suffix like (3) from folder name
        num_suffix = ""
        if "(" in raw_slug:
            num_match = re.search(r"\((\d+)\)", raw_slug)
            if num_match:
                num_suffix = f"-{num_match.group(1)}"
        clean_slug = raw_slug.split("(")[0].replace("_", "-")

        college_id = None
        college_name = college_dir.name.replace("college_data_", "").replace("_", " ").split("(")[0].strip()
        if not args.dry_run:
            college_id = slug_to_id.get(clean_slug) or slug_to_id.get(clean_slug + num_suffix)
            if not college_id:
                logging.warning(f"Could not match college dir {college_dir.name} by slug {clean_slug}")
                continue
            # Get real college name
            for c in db.get_colleges():
                if c["id"] == college_id:
                    college_name = c["name"]
                    break

        logging.info(f"Processing {college_dir.name} ({college_name})...")

        sources = []
        scholarships = []
        links = []

        with open(scholarships_csv, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if not row.get("scholarship_name", "").strip():
                    continue
                try:
                    source, scholarship, link = process_csv_row(row, college_name)
                    sources.append(source)
                    scholarships.append(scholarship)
                    link["college_id"] = college_id
                    links.append(link)
                except Exception as e:
                    logging.warning(f"  Skipping row: {e}")

        logging.info(f"  Found {len(scholarships)} scholarships, {len(links)} links")
        total_scholarships += len(scholarships)
        total_links += len(links)

        if args.dry_run:
            for s in scholarships:
                logging.info(f"    [DRY] {s['name']} ({s['provider']})")
            continue

        # Upsert sources first
        seen_source_ids = set()
        unique_sources = []
        for s in sources:
            if s["id"] not in seen_source_ids:
                seen_source_ids.add(s["id"])
                unique_sources.append(s)
        try:
            db.upsert("sources", unique_sources, "id")
        except Exception as e:
            logging.error(f"  Failed to upsert sources: {e}")
            continue

        # Upsert scholarships (deduplicated by id)
        seen_ids = set()
        unique_scholarships = []
        for s in scholarships:
            if s["id"] not in seen_ids:
                seen_ids.add(s["id"])
                unique_scholarships.append(s)
        try:
            db.upsert("scholarships", unique_scholarships, "id")
        except Exception as e:
            logging.error(f"  Failed to upsert scholarships: {e}")
            continue

        # Upsert college_scholarships links
        try:
            db.upsert("college_scholarships", links, "college_id,scholarship_id")
        except Exception as e:
            logging.error(f"  Failed to upsert college_scholarships: {e}")

    logging.info(f"Done. Total: {total_scholarships} scholarships, {total_links} links processed.")


if __name__ == "__main__":
    main()
