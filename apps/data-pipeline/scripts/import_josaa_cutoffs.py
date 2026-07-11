import argparse
import csv
import logging
import os
import time
from pathlib import Path

import httpx

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
        self.client = httpx.Client(base_url=self.url, headers=self.headers, timeout=60.0)

    def get_colleges(self) -> list:
        r = self.client.get("/colleges?select=id,name")
        r.raise_for_status()
        return r.json()
        
    def get_college_branches(self) -> list:
        r = self.client.get("/college_branches?select=id,college_id,name")
        r.raise_for_status()
        return r.json()
        
    def create_college(self, name: str) -> str:
        slug = name.lower().replace(" ", "-").replace(",", "").replace("(", "").replace(")", "")
        r = self.client.post("/colleges", json=[{
            "name": name,
            "slug": slug,
            "is_published": True,
            "verification_status": "published"
        }], headers={"Prefer": "return=representation"})
        r.raise_for_status()
        return r.json()[0]["id"]
        
    def create_branch(self, college_id: str, name: str) -> str:
        r = self.client.post("/college_branches", json=[{
            "college_id": college_id,
            "name": name,
            "verification_status": "published",
            "confidence_level": "A"
        }], headers={"Prefer": "return=representation"})
        r.raise_for_status()
        return r.json()[0]["id"]
        
    def delete_existing_cutoffs(self):
        # We need to delete in batches or use a fast delete if we're replacing
        # For safety and speed, we will just delete where counselling_system = JoSAA
        r = self.client.delete("/cutoff_records?counselling_system=eq.JoSAA")
        r.raise_for_status()
        logging.info("Deleted existing JoSAA cutoffs.")

    def bulk_insert_cutoffs(self, payload: list[dict]):
        if not payload:
            return
        r = self.client.post("/cutoff_records", json=payload, headers={"Prefer": "return=minimal"})
        if r.status_code not in (200, 201, 204):
            logging.error(f"Failed to insert batch: {r.text}")
            r.raise_for_status()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to CSV file")
    args = parser.parse_args()

    # Calculate absolute path for .env.local
    current_dir = Path(__file__).parent.resolve()
    env_path = current_dir.parent.parent / "web" / ".env.local"
    
    load_env(env_path)

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        logging.error(f"Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (looked in {env_path})")
        return

    client = SupabaseClient(url, key)
    
    logging.info("Fetching existing colleges and branches...")
    existing_colleges = client.get_colleges()
    college_name_to_id = {c["name"]: c["id"] for c in existing_colleges}
    
    existing_branches = client.get_college_branches()
    # map (college_id, branch_name) to branch_id
    branch_map = {(b["college_id"], b["name"]): b["id"] for b in existing_branches}
    
    logging.info("Deleting old JoSAA cutoffs...")
    client.delete_existing_cutoffs()
    
    logging.info("Reading CSV...")
    
    batch = []
    batch_size = 3000
    total_inserted = 0
    
    with open(args.csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            college_name = row["Institute"].strip()
            branch_name = row["Academic Program Name"].strip()
            quota = row["Quota"].strip()
            category = row["Seat Type"].strip()
            gender_pool = row["Gender"].strip()
            
            try:
                opening_rank = float(row["Opening Rank"]) if row["Opening Rank"] else None
                closing_rank = float(row["Closing Rank"]) if row["Closing Rank"] else None
            except ValueError:
                continue
                
            round_val = row["Round"].strip()
            
            try:
                year = int(row["Year"])
            except ValueError:
                continue
            
            if closing_rank is None:
                continue
                
            # Get or create college
            if college_name not in college_name_to_id:
                logging.info(f"Creating missing college: {college_name}")
                cid = client.create_college(college_name)
                college_name_to_id[college_name] = cid
            
            college_id = college_name_to_id[college_name]
            
            # Get or create branch
            branch_key = (college_id, branch_name)
            if branch_key not in branch_map:
                logging.info(f"Creating missing branch: {branch_name} in {college_name}")
                bid = client.create_branch(college_id, branch_name)
                branch_map[branch_key] = bid
                
            branch_id = branch_map[branch_key]
            
            exam = "JEE Advanced" if "Indian Institute of Technology" in college_name else "JEE Main"
            
            batch.append({
                "college_id": college_id,
                "college_branch_id": branch_id,
                "exam": exam,
                "counselling_system": "JoSAA",
                "admission_year": year,
                "round": round_val,
                "category": category,
                "quota": quota,
                "gender_pool": gender_pool,
                "opening_rank": opening_rank,
                "closing_rank": closing_rank,
                "verification_status": "published",
                "publication_status": "published",
                "source_id": f"josaa_bulk_{year}"
            })
            
            if len(batch) >= batch_size:
                client.bulk_insert_cutoffs(batch)
                total_inserted += len(batch)
                logging.info(f"Inserted {total_inserted} records...")
                batch = []
                time.sleep(0.2)
                
        if batch:
            client.bulk_insert_cutoffs(batch)
            total_inserted += len(batch)
            logging.info(f"Inserted {total_inserted} records...")
            
    logging.info("Import complete.")

if __name__ == "__main__":
    main()
