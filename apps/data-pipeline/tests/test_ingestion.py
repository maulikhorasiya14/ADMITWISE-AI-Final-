from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import pandas as pd

from schemas.extraction import DataCategory, SourceKind, SourceRegistryEntry, SourceType
from services import IngestionService


class IngestionPipelineTest(unittest.TestCase):
    def test_webpage_parsing_stages_table_rows(self):
        with tempfile.TemporaryDirectory() as directory:
            html = Path(directory) / "fixture.html"
            html.write_text(
                """
                <table>
                  <tr><th>Branch</th><th>Opening Rank</th><th>Closing Rank</th></tr>
                  <tr><td>cse</td><td>100</td><td>200</td></tr>
                </table>
                """,
                encoding="utf-8",
            )

            result = IngestionService().process_source(
                SourceRegistryEntry(
                    local_file=html,
                    source_kind=SourceKind.WEBPAGE,
                    source_type=SourceType.OFFICIAL_COLLEGE,
                    data_category=DataCategory.CUTOFFS,
                    academic_year="2025-26",
                )
            )

            self.assertEqual(result.status, "completed")
            self.assertEqual(len(result.staged_records), 1)
            self.assertEqual(
                result.staged_records[0].normalized_data["branch_name"],
                "Computer Science and Engineering",
            )

    def test_pdf_text_and_csv_normalization(self):
        with tempfile.TemporaryDirectory() as directory:
            pdf = Path(directory) / "fixture.pdf"
            pdf.write_text("Branch,Opening Rank,Closing Rank\nECE,10,20", encoding="utf-8")
            csv = Path(directory) / "fixture.csv"
            csv.write_text("branch,category,quota,gender_pool\nCSE,OBC,All India,GN", encoding="utf-8")

            service = IngestionService()
            pdf_result = service.process_source(
                SourceRegistryEntry(
                    local_file=pdf,
                    source_kind=SourceKind.PDF_TABLE,
                    source_type=SourceType.COUNSELLING_AUTHORITY,
                    data_category=DataCategory.CUTOFFS,
                    academic_year="2025-26",
                )
            )
            csv_result = service.process_source(
                SourceRegistryEntry(
                    local_file=csv,
                    source_kind=SourceKind.CSV,
                    source_type=SourceType.COUNSELLING_AUTHORITY,
                    data_category=DataCategory.CUTOFFS,
                    academic_year="2025-26",
                )
            )

            self.assertEqual(pdf_result.staged_records[0].normalized_data["branch_name"], "Electronics and Communication Engineering")
            self.assertEqual(csv_result.staged_records[0].normalized_data["category"], "OBC_NCL")
            self.assertEqual(csv_result.staged_records[0].normalized_data["quota"], "AI")
            self.assertEqual(csv_result.staged_records[0].normalized_data["gender_pool"], "GENDER_NEUTRAL")

    def test_excel_extractor(self):
        with tempfile.TemporaryDirectory() as directory:
            excel = Path(directory) / "fixture.xlsx"
            pd.DataFrame([{"branch": "ME", "tuition_fee": 100000}]).to_excel(excel, index=False)

            result = IngestionService().process_source(
                SourceRegistryEntry(
                    local_file=excel,
                    source_kind=SourceKind.EXCEL,
                    source_type=SourceType.OFFICIAL_COLLEGE,
                    data_category=DataCategory.FEES,
                    academic_year="2025-26",
                )
            )

            self.assertEqual(result.staged_records[0].normalized_data["branch_name"], "Mechanical Engineering")
            self.assertEqual(result.staged_records[0].normalized_data["tuition_fee"], 100000.0)

    def test_duplicate_detection(self):
        with tempfile.TemporaryDirectory() as directory:
            csv = Path(directory) / "duplicates.csv"
            csv.write_text(
                "branch,exam,academic_year,round,category,quota,gender_pool,opening_rank,closing_rank\n"
                "CSE,JEE Main,2025-26,1,GENERAL,AI,OPEN,100,200\n"
                "CSE,JEE Main,2025-26,1,GENERAL,AI,OPEN,100,250\n",
                encoding="utf-8",
            )

            result = IngestionService().process_source(
                SourceRegistryEntry(
                    local_file=csv,
                    source_kind=SourceKind.CSV,
                    source_type=SourceType.COUNSELLING_AUTHORITY,
                    data_category=DataCategory.CUTOFFS,
                    academic_year="2025-26",
                )
            )

            self.assertTrue(result.conflicts)
            self.assertTrue(any(conflict.field_name == "closing_rank" for conflict in result.conflicts))

    def test_invalid_rank_fee_and_placement_values_are_flagged(self):
        with tempfile.TemporaryDirectory() as directory:
            cutoffs = Path(directory) / "bad-cutoffs.csv"
            cutoffs.write_text("branch,opening_rank,closing_rank,category,quota\nCSE,500,400,GENERAL,AI", encoding="utf-8")
            fees = Path(directory) / "bad-fees.csv"
            fees.write_text("tuition_fee,hostel_fee\n-1,200", encoding="utf-8")
            placements = Path(directory) / "bad-placements.csv"
            placements.write_text("placement_percentage,average_package\n120,5", encoding="utf-8")

            service = IngestionService()
            cutoff_result = service.process_source(_source(cutoffs, DataCategory.CUTOFFS))
            fee_result = service.process_source(_source(fees, DataCategory.FEES))
            placement_result = service.process_source(_source(placements, DataCategory.PLACEMENTS))

            self.assertIn("closing_rank_below_opening_rank", cutoff_result.staged_records[0].validation_errors)
            self.assertIn("negative_tuition_fee", fee_result.staged_records[0].validation_errors)
            self.assertIn("placement_percentage_above_100", placement_result.staged_records[0].validation_errors)

    def test_output_is_staging_only(self):
        with tempfile.TemporaryDirectory() as directory:
            csv = Path(directory) / "branches.csv"
            csv.write_text("branch\nCSE", encoding="utf-8")

            result = IngestionService().process_source(_source(csv, DataCategory.BRANCHES))

            self.assertEqual(result.staged_records[0].status, "needs_review")
            self.assertNotIn("is_published", result.staged_records[0].normalized_data)

    def test_extraction_failure_handling(self):
        missing = Path("missing-fixture.csv")
        result = IngestionService().process_source(_source(missing, DataCategory.FEES))

        self.assertEqual(result.status, "failed")
        self.assertIn("No such file", result.message or "")


def _source(path: Path, category: DataCategory) -> SourceRegistryEntry:
    return SourceRegistryEntry(
        local_file=path,
        source_kind=SourceKind.CSV,
        source_type=SourceType.OFFICIAL_COLLEGE,
        data_category=category,
        academic_year="2025-26",
    )


if __name__ == "__main__":
    unittest.main()
