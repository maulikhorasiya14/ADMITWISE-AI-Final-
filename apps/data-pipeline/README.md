# AdmitWise Data Pipeline

This data pipeline is the ingestion engine for AdmitWise AI. It is designed to extract, clean, validate, and load unstructured or semi-structured data (like local PDFs, CSVs, Excel files, and JSON) into a strict, validated format inside the Supabase database.

## Why do we need this pipeline?

College information exists in raw files and formats that applications cannot read natively. For example, a branch might be called "cse" in one file and "Comp Sci" in another. The pipeline parses these files, normalizes names to a standard format (e.g., "Computer Science and Engineering"), catches data errors (like negative fees), and stages the data safely in the database so that it can be reviewed by administrators before going live.

## How it Works

The pipeline functions primarily in two modes:
1. **API Mode:** A FastAPI service that accepts source files dynamically (via `/sources/process`) and runs them through extractors and normalizers depending on their data category (e.g., Fees, Cutoffs).
2. **Script Mode (Bulk Import):** Python scripts that process large local directories of data and batch upload them to the Supabase database.

---

## Local Data Processing Requirements

To efficiently process local files using the bulk import scripts, your local `data/` folder must be structured and named in a specific way. 

### 1. Folder Structure
For qualitative college data (clubs, campus reality, facilities, etc.), you must create a separate folder for each college. The folder name **must start with `college_data_`** followed by the college slug.

Example:
```
data/
  college_data_indian_institute_of_technology_bombay/
  college_data_national_institute_of_technology_rourkela/
```

### 2. Required File Names per College
Inside each college's directory, the pipeline specifically looks for the following file names. If the files are named differently, they will be ignored by the `bulk_import.py` script.

* **`clubs.csv`**
  Contains information about college clubs. The pipeline reads this and maps it to the `college_clubs` table.
* **`campus_reality.json`**
  Contains qualitative points about campus life. The pipeline normalizes this into the `campus_reality` table.
* **`college_profile.json`**
  A general profile file. The pipeline specifically extracts the `hostels_and_facilities` key from this JSON to populate the `college_facilities` table.
* **`location.csv`**
  Contains location data (nearest airports, railway stations, etc.). Parsed into the `college_location_details` table.
* **`student_experience_sources.csv`**
  Links to videos, blogs, or reviews by verified students. Parsed into the `student_experience_sources` table.

### 3. Standalone Files (like Cutoffs)
Some massive datasets, like JoSAA cutoffs, are not separated by college. Instead, they are kept as standalone files in the root of the `data/` folder.
* **`merged_jee_cutoff_2018_2025.csv`** (or similar cutoff CSVs)
  These are imported using the `import_josaa_cutoffs.py` script, which takes the file path directly (e.g., `python scripts/import_josaa_cutoffs.py --csv data/merged_jee_cutoff_2018_2025.csv`).

---

## Running the Bulk Importers

To process the local `data/` folder, activate your Python environment and run:

**Import Qualitative Data (Clubs, Facilities, etc.):**
```bash
python scripts/bulk_import.py --data-dir data/
```

**Import JoSAA Cutoffs:**
```bash
python scripts/import_josaa_cutoffs.py --csv data/merged_jee_cutoff_2018_2025.csv
```

> **Note:** The pipeline automatically handles connecting to your local or remote Supabase instance by reading the `.env.local` file from the `apps/web/` directory.

> **Note:** `bulk_import.py` publishes qualitative rows (clubs, facilities, campus reality, location) directly and bypasses the TypeScript admin-review workflow, so it does **not** trigger the AI counsellor's automatic embedding sync. After running it, manually run `pnpm --filter web run sync-embeddings` so the counsellor's semantic search picks up the new or changed content.
