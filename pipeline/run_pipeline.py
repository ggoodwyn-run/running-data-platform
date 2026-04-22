"""
End-to-end pipeline runner.

Steps:
  1. Raw load     — reads Activities.csv, upserts into raw_data.runs_raw
  2. Staging      — rebuilds staging.runs_clean from raw
  3. Marts        — rebuilds marts.run_summary and marts.monthly_stats
  4. Training load — rebuilds marts.training_load (rolling ATL/CTL/TSB)

Usage:
  source .venv/bin/activate
  python pipeline/run_pipeline.py
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

# Allow importing load_raw_csv without requiring __init__.py files
sys.path.insert(0, str(Path(__file__).resolve().parent / "ingestion"))

from sqlalchemy import create_engine, text

from load_raw_csv import CSV_PATH, DATABASE_URL, prepare_dataframe, upsert_raw_runs
from quality_checks import print_results, run_checks


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SQL_STEPS = [
    ("Staging",        PROJECT_ROOT / "sql" / "staging" / "build_run_clean.sql"),
    ("Marts",          PROJECT_ROOT / "sql" / "marts"   / "build_marts.sql"),
    ("Training load",  PROJECT_ROOT / "sql" / "marts"   / "build_training_load.sql"),
]


def run_sql_file(path: Path, engine) -> None:
    """Execute every statement in a .sql file, each in its own transaction."""
    sql = path.read_text()
    statements = [s.strip() for s in sql.split(";") if s.strip()]
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


def step(label: str, index: int, total: int) -> None:
    print(f"[{index}/{total}] {label}", flush=True)


def main() -> None:
    total = 1 + len(SQL_STEPS)
    pipeline_start = time.time()

    # Step 1: raw load (Python)
    step(f"Raw load  →  {CSV_PATH}", 1, total)
    t = time.time()
    df = prepare_dataframe(CSV_PATH)
    upsert_raw_runs(df)
    print(f"           done  ({time.time() - t:.1f}s)\n")

    # Steps 2–4: SQL transformations
    engine = create_engine(DATABASE_URL, future=True)
    for i, (label, path) in enumerate(SQL_STEPS, start=2):
        step(f"{label:<14}  →  {path.relative_to(PROJECT_ROOT)}", i, total)
        t = time.time()
        run_sql_file(path, engine)
        print(f"           done  ({time.time() - t:.1f}s)\n")

    print(f"Pipeline complete  ({time.time() - pipeline_start:.1f}s total)")

    print("\nRunning data quality checks...")
    results = run_checks()
    print_results(results)
    if any(not r.passed for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
