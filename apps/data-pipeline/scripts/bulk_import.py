import argparse
import json
import logging
import os
import csv
from pathlib import Path

import httpx

from normalizers.qualitative import (
    normalize_club_record,
    normalize_campus_reality,
    normalize_facilities,
    normalize_location_details,
    normalize_experience_source
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def load_env(env_path: Path):
    if not env_path.exists():
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                key, val = line.split("=", 1)
                if key not in os.environ:
                    os.environ[key] = val.strip("'\"")

class SupabaseClient:
    def __init__(self, url: str, key: str):
        self.url = f"{url}/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        self.client = httpx.Client(base_url=self.url, headers=self.headers, timeout=30.0)

    def get_colleges(self) -> dict:
        r = self.client.get("/colleges?select=id,slug,name")
        r.raise_for_status()
        return r.json()

    def upsert(self, table: str, payload: list[dict], on_conflict: str = ""):
        if not payload:
            return
        headers = self.headers.copy()
        if on_conflict:
            headers["Prefer"] = f"resolution=merge-duplicates,return=representation"
        r = self.client.post(f"/{table}?on_conflict={on_conflict}", json=payload, headers=headers)
        if r.status_code >= 400:
            logging.error(f"Error upserting to {table}: {r.text}")
        r.raise_for_status()

def _slugify(name: str) -> str:
    return name.lower().replace(" ", "-").replace("(", "").replace(")", "").replace(",", "").replace(".", "")

def main():
    parser = argparse.ArgumentParser(description="Bulk import qualitative data to Supabase")
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
        name_to_id = {c["name"].lower(): c["id"] for c in colleges}
    else:
        slug_to_id = {}
        name_to_id = {}

    for college_dir in args.data_dir.iterdir():
        if not college_dir.is_dir() or not college_dir.name.startswith("college_data_"):
            continue

        raw_slug = college_dir.name.replace("college_data_", "")
        clean_slug = raw_slug.split("(")[0].replace("_", "-")

        college_id = None
        if not args.dry_run:
            college_id = slug_to_id.get(clean_slug)
            if not college_id:
                logging.warning(f"Could not match college dir {college_dir.name} by slug {clean_slug}")
                continue

        logging.info(f"Processing {college_dir.name}...")

        clubs_csv = college_dir / "clubs.csv"
        if clubs_csv.exists():
            clubs_payload = []
            with open(clubs_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    norm = normalize_club_record(row)
                    if not norm.get("club_name"): continue
                    norm["college_id"] = college_id
                    norm["verification_status"] = "published"
                    clubs_payload.append(norm)
            if not args.dry_run:
                db.upsert("college_clubs", clubs_payload, "college_id,club_name")

        cr_json = college_dir / "campus_reality.json"
        if cr_json.exists():
            with open(cr_json, "r", encoding="utf-8") as f:
                raw_cr = json.load(f)
            norm_cr = normalize_campus_reality(raw_cr)
            if not args.dry_run:
                db.upsert("campus_reality", [{"college_id": college_id, "data": norm_cr, "verification_status": "published"}], "college_id")

        profile_json = college_dir / "college_profile.json"
        if profile_json.exists():
            with open(profile_json, "r", encoding="utf-8") as f:
                raw_prof = json.load(f)
            facs = raw_prof.get("hostels_and_facilities", {})
            norm_fac = normalize_facilities(facs)
            if not args.dry_run:
                db.upsert("college_facilities", [{"college_id": college_id, "data": norm_fac, "verification_status": "published"}], "college_id")

        loc_csv = college_dir / "location.csv"
        if loc_csv.exists():
            loc_payload = []
            with open(loc_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    norm_loc = normalize_location_details(row)
                    norm_loc["college_id"] = college_id
                    norm_loc["verification_status"] = "published"
                    loc_payload.append(norm_loc)
            if not args.dry_run:
                db.upsert("college_location_details", loc_payload, "college_id")

        ses_csv = college_dir / "student_experience_sources.csv"
        if ses_csv.exists():
            ses_payload = []
            with open(ses_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    norm_ses = normalize_experience_source(row)
                    if not norm_ses.get("local_source_id"): continue
                    norm_ses["college_id"] = college_id
                    norm_ses["verification_status"] = "published"
                    ses_payload.append(norm_ses)
            if not args.dry_run:
                db.upsert("student_experience_sources", ses_payload, "college_id,local_source_id")

    logging.info("Import completed.")

if __name__ == "__main__":
    main()
