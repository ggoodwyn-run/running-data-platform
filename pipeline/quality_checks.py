"""
Data quality checks for every pipeline layer.

Each check is a SQL query that returns rows only when the test FAILS.
Zero rows returned = PASS. Any rows returned = FAIL (the rows show the bad data).

Usage (standalone):
    python pipeline/quality_checks.py

Also called automatically at the end of run_pipeline.py.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence

from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parent / "ingestion"))
from load_raw_csv import DATABASE_URL


# ──────────────────────────────────────────────────────────────
# Data structures
# ──────────────────────────────────────────────────────────────

@dataclass
class Check:
    name: str
    layer: str        # used to group output
    description: str  # shown on failure so it's clear what broke
    sql: str          # returns rows on FAIL, zero rows on PASS


@dataclass
class Result:
    check: Check
    passed: bool
    failing_rows: list = field(default_factory=list)


# ──────────────────────────────────────────────────────────────
# Check definitions
# ──────────────────────────────────────────────────────────────

CHECKS: list[Check] = [

    # ── raw_data ──────────────────────────────────────────────
    Check(
        name="raw_has_rows",
        layer="raw_data",
        description="raw_data.runs_raw must not be empty",
        sql="""
            SELECT 'table is empty' AS issue
            WHERE (SELECT COUNT(*) FROM raw_data.runs_raw) = 0
        """,
    ),
    Check(
        name="raw_record_hash_unique",
        layer="raw_data",
        description="record_hash must be unique — duplicates break the upsert key",
        sql="""
            SELECT record_hash, COUNT(*) AS occurrences
            FROM raw_data.runs_raw
            GROUP BY record_hash
            HAVING COUNT(*) > 1
        """,
    ),
    Check(
        name="raw_no_null_dates",
        layer="raw_data",
        description="date_of_activity must never be NULL",
        sql="""
            SELECT activity_id, title
            FROM raw_data.runs_raw
            WHERE date_of_activity IS NULL
        """,
    ),
    Check(
        name="raw_no_future_dates",
        layer="raw_data",
        description="date_of_activity must not be in the future",
        sql="""
            SELECT activity_id, title, date_of_activity
            FROM raw_data.runs_raw
            WHERE date_of_activity > CURRENT_TIMESTAMP
        """,
    ),
    Check(
        name="raw_distance_positive",
        layer="raw_data",
        description="distance must be > 0 when present",
        sql="""
            SELECT activity_id, title, distance
            FROM raw_data.runs_raw
            WHERE distance IS NOT NULL AND distance <= 0
        """,
    ),
    Check(
        name="raw_hr_in_range",
        layer="raw_data",
        description="avg_hr must be between 40 and 220 bpm when present",
        sql="""
            SELECT activity_id, title, avg_hr
            FROM raw_data.runs_raw
            WHERE avg_hr IS NOT NULL AND avg_hr NOT BETWEEN 40 AND 220
        """,
    ),
    Check(
        name="raw_pace_positive",
        layer="raw_data",
        description="avg_pace must be > 0 when present",
        sql="""
            SELECT activity_id, title, avg_pace
            FROM raw_data.runs_raw
            WHERE avg_pace IS NOT NULL AND avg_pace <= 0
        """,
    ),

    # ── staging ───────────────────────────────────────────────
    Check(
        name="staging_has_rows",
        layer="staging",
        description="staging.runs_clean must not be empty",
        sql="""
            SELECT 'table is empty' AS issue
            WHERE (SELECT COUNT(*) FROM staging.runs_clean) = 0
        """,
    ),
    Check(
        name="staging_row_count_leq_raw",
        layer="staging",
        description="staging must not have more rows than raw (filter should hold or reduce count)",
        sql="""
            SELECT
                (SELECT COUNT(*) FROM staging.runs_clean) AS staging_count,
                (SELECT COUNT(*) FROM raw_data.runs_raw)  AS raw_count
            WHERE (SELECT COUNT(*) FROM staging.runs_clean)
                > (SELECT COUNT(*) FROM raw_data.runs_raw)
        """,
    ),
    Check(
        name="staging_all_running",
        layer="staging",
        description="every staging row must have activity_type = 'Running'",
        sql="""
            SELECT activity_id, activity_type
            FROM staging.runs_clean
            WHERE activity_type <> 'Running'
        """,
    ),
    Check(
        name="staging_no_null_dates",
        layer="staging",
        description="date_of_activity must never be NULL",
        sql="""
            SELECT activity_id, title
            FROM staging.runs_clean
            WHERE date_of_activity IS NULL
        """,
    ),
    Check(
        name="staging_no_future_dates",
        layer="staging",
        description="date_of_activity must not be in the future",
        sql="""
            SELECT activity_id, date_of_activity
            FROM staging.runs_clean
            WHERE date_of_activity > CURRENT_DATE
        """,
    ),
    Check(
        name="staging_distance_non_negative",
        layer="staging",
        description="distance must be >= 0 (NULLs are coalesced to 0 in the build script)",
        sql="""
            SELECT activity_id, distance
            FROM staging.runs_clean
            WHERE distance < 0
        """,
    ),
    Check(
        name="staging_week_start_is_monday",
        layer="staging",
        description="week_start must always be a Monday (PostgreSQL date_trunc('week') guarantee)",
        sql="""
            SELECT activity_id, date_of_activity, week_start
            FROM staging.runs_clean
            WHERE week_start IS NOT NULL
              AND EXTRACT(dow FROM week_start) <> 1
        """,
    ),
    Check(
        name="staging_month_start_is_first",
        layer="staging",
        description="month_start must always be the 1st of the month",
        sql="""
            SELECT activity_id, date_of_activity, month_start
            FROM staging.runs_clean
            WHERE month_start IS NOT NULL
              AND EXTRACT(day FROM month_start) <> 1
        """,
    ),

    # ── marts ─────────────────────────────────────────────────
    Check(
        name="mart_run_summary_has_rows",
        layer="marts",
        description="marts.run_summary must not be empty",
        sql="""
            SELECT 'table is empty' AS issue
            WHERE (SELECT COUNT(*) FROM marts.run_summary) = 0
        """,
    ),
    Check(
        name="mart_distance_miles_positive",
        layer="marts",
        description="distance_miles must be > 0",
        sql="""
            SELECT activity_id, distance_km, distance_miles
            FROM marts.run_summary
            WHERE distance_miles IS NOT NULL AND distance_miles <= 0
        """,
    ),
    Check(
        name="mart_pace_mile_gt_km",
        layer="marts",
        description="pace per mile must be greater than pace per km (a mile is longer than a km)",
        sql="""
            SELECT activity_id, avg_pace_min_per_km, avg_pace_min_per_mile
            FROM marts.run_summary
            WHERE avg_pace_min_per_km   IS NOT NULL
              AND avg_pace_min_per_mile IS NOT NULL
              AND avg_pace_min_per_mile <= avg_pace_min_per_km
        """,
    ),
    Check(
        name="mart_effort_zone_valid",
        layer="marts",
        description="effort_zone must be one of the four defined values",
        sql="""
            SELECT activity_id, avg_hr, effort_zone
            FROM marts.run_summary
            WHERE effort_zone NOT IN ('Easy', 'Moderate', 'Hard', 'Max Effort', 'Unknown')
        """,
    ),
    Check(
        name="mart_monthly_stats_has_rows",
        layer="marts",
        description="marts.monthly_stats must not be empty",
        sql="""
            SELECT 'table is empty' AS issue
            WHERE (SELECT COUNT(*) FROM marts.monthly_stats) = 0
        """,
    ),
    Check(
        name="mart_monthly_distance_matches_summary",
        layer="marts",
        description="total distance in monthly_stats must equal total distance in run_summary (within rounding)",
        sql="""
            SELECT
                ROUND(SUM(total_distance_km)::numeric, 1) AS monthly_total,
                (SELECT ROUND(SUM(distance_km)::numeric, 1) FROM marts.run_summary) AS summary_total
            FROM marts.monthly_stats
            HAVING ABS(
                SUM(total_distance_km)
                - (SELECT SUM(distance_km) FROM marts.run_summary)
            ) > 0.5
        """,
    ),

    # ── training_load ─────────────────────────────────────────
    Check(
        name="training_load_has_rows",
        layer="training_load",
        description="marts.training_load must not be empty",
        sql="""
            SELECT 'table is empty' AS issue
            WHERE (SELECT COUNT(*) FROM marts.training_load) = 0
        """,
    ),
    Check(
        name="training_load_no_date_gaps",
        layer="training_load",
        description="training_load must have exactly one row per calendar day with no gaps",
        sql="""
            SELECT date AS gap_after, next_date, (next_date - date) AS gap_days
            FROM (
                SELECT date, LEAD(date) OVER (ORDER BY date) AS next_date
                FROM marts.training_load
            ) t
            WHERE next_date - date > 1
        """,
    ),
    Check(
        name="training_load_streak_non_negative",
        layer="training_load",
        description="run_streak must be >= 0",
        sql="""
            SELECT date, run_streak
            FROM marts.training_load
            WHERE run_streak < 0
        """,
    ),
    Check(
        name="training_load_atl_non_negative",
        layer="training_load",
        description="ATL (7-day rolling load) must be >= 0",
        sql="""
            SELECT date, atl_7d
            FROM marts.training_load
            WHERE atl_7d IS NOT NULL AND atl_7d < 0
        """,
    ),
    Check(
        name="training_load_tsb_in_range",
        layer="training_load",
        description="TSB must be between -200 and 200 (values outside this range indicate a calculation error)",
        sql="""
            SELECT date, atl_7d, ctl_42d, tsb
            FROM marts.training_load
            WHERE tsb IS NOT NULL AND tsb NOT BETWEEN -200 AND 200
        """,
    ),

    # ── cross-layer ───────────────────────────────────────────
    Check(
        name="staging_ids_exist_in_raw",
        layer="cross_layer",
        description="every activity_id in staging must exist in raw (no orphaned rows)",
        sql="""
            SELECT s.activity_id
            FROM staging.runs_clean s
            LEFT JOIN raw_data.runs_raw r ON r.activity_id = s.activity_id
            WHERE r.activity_id IS NULL
        """,
    ),
    Check(
        name="mart_ids_exist_in_staging",
        layer="cross_layer",
        description="every activity_id in run_summary must exist in staging",
        sql="""
            SELECT m.activity_id
            FROM marts.run_summary m
            LEFT JOIN staging.runs_clean s ON s.activity_id = m.activity_id
            WHERE s.activity_id IS NULL
        """,
    ),
]

LAYER_ORDER = ["raw_data", "staging", "marts", "training_load", "cross_layer"]


# ──────────────────────────────────────────────────────────────
# Runner
# ──────────────────────────────────────────────────────────────

def run_checks(checks: Sequence[Check] = CHECKS) -> list[Result]:
    """Execute all checks and return results. Does not print anything."""
    engine = create_engine(DATABASE_URL, future=True)
    results: list[Result] = []
    with engine.connect() as conn:
        for check in checks:
            rows = conn.execute(text(check.sql)).fetchall()
            results.append(Result(
                check=check,
                passed=len(rows) == 0,
                failing_rows=list(rows),
            ))
    return results


def print_results(results: list[Result]) -> None:
    by_layer: dict[str, list[Result]] = {}
    for r in results:
        by_layer.setdefault(r.check.layer, []).append(r)

    for layer in LAYER_ORDER:
        if layer not in by_layer:
            continue
        print(f"\n  {layer}")
        for r in by_layer[layer]:
            status = "PASS" if r.passed else "FAIL"
            print(f"    {status}  {r.check.name}")
            if not r.passed:
                print(f"          ↳ {r.check.description}")
                for row in r.failing_rows[:3]:
                    print(f"          → {dict(row._mapping)}")
                if len(r.failing_rows) > 3:
                    print(f"          … and {len(r.failing_rows) - 3} more rows")

    passed = sum(1 for r in results if r.passed)
    failed = len(results) - passed
    print(f"\n  {'─' * 44}")
    print(f"  {passed} passed  |  {failed} failed  |  {len(results)} total\n")


def main() -> None:
    print("\nRunning data quality checks...")
    results = run_checks()
    print_results(results)
    if any(not r.passed for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
