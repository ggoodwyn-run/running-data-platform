from __future__ import annotations

import hashlib
import os
from pathlib import Path

import pandas as pd
from sqlalchemy import MetaData, Table, create_engine
from sqlalchemy.engine import URL
from sqlalchemy.dialects.postgresql import insert


# ----------------------------
# Configuration
# ----------------------------

connection_url = URL.create(
    drivername="postgresql+psycopg2",
    username=os.environ.get("DB_USER", "postgres"),
    password=os.environ.get("DB_PASSWORD", "Mp1Z4cD@7"),
    host=os.environ.get("DB_HOST", "localhost"),
    port=int(os.environ.get("DB_PORT", "5432")),
    database=os.environ.get("DB_NAME", "postgres"),
)
DATABASE_URL = connection_url

# Default resolves relative to this file so the script works from any working directory.
CSV_PATH = os.environ.get(
    "ACTIVITIES_CSV_PATH",
    str(Path(__file__).resolve().parents[2] / "data" / "Activities.csv"),
)

RAW_SCHEMA = "raw_data"
RAW_TABLE_NAME = "runs_raw"

# Map normalized CSV column names -> database column names
COLUMN_MAPPING = {
    "date": "date_of_activity",
    "title": "title",
    "activity_type": "activity_type",
    "distance": "distance",
    "avg_hr": "avg_hr",
    "avg_run_cadence": "avg_run_cadence",
    "max_hr": "max_hr",
    "avg_pace": "avg_pace",
    "calories": "calories",
    "total_ascent": "total_ascent",
    "total_descent": "total_descent",
    "steps": "steps",
    "avg_stride_length": "avg_stride_length",
}

# Garmin time fields (HH:MM:SS) that become decimal-minute columns in the DB
MOVING_TIME_SOURCE_COLUMN = "moving_time"
ELAPSED_TIME_SOURCE_COLUMN = "elapsed_time"

REQUIRED_SOURCE_COLUMNS = set(COLUMN_MAPPING.keys()) | {
    MOVING_TIME_SOURCE_COLUMN,
    ELAPSED_TIME_SOURCE_COLUMN,
}

TARGET_COLUMNS = [
    "date_of_activity",
    "title",
    "activity_type",
    "distance",
    "moving_time_minutes",
    "elapsed_time_minutes",
    "avg_hr",
    "max_hr",
    "avg_run_cadence",
    "avg_pace",
    "calories",
    "total_ascent",
    "total_descent",
    "avg_stride_length",
    "steps",
    "source_file",
    "record_hash",
]


# ----------------------------
# Helpers
# ----------------------------

def normalize_column_name(col: str) -> str:
    """
    'Avg. HR' -> 'avg_hr'
    'Moving Time' -> 'moving_time'
    """
    return (
        col.strip()
        .lower()
        .replace(".", "")
        .replace("/", "_")
        .replace(" ", "_")
    )


def build_record_hash(row: pd.Series) -> str:
    """Deterministic hash used as the upsert conflict key."""
    parts = [
        str(row.get("date_of_activity", "")),
        str(row.get("title", "")),
        str(row.get("distance", "")),
        str(row.get("moving_time_minutes", "")),
    ]
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def validate_required_columns(df: pd.DataFrame) -> None:
    missing = REQUIRED_SOURCE_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(
            f"Missing expected source columns: {sorted(missing)}. "
            f"Actual columns found: {sorted(df.columns)}"
        )


def convert_hhmmss_to_minutes(
    df: pd.DataFrame, source_col: str, target_col: str
) -> pd.DataFrame:
    """Convert a HH:MM:SS column to decimal minutes."""
    td = pd.to_timedelta(df[source_col], errors="coerce")
    df[target_col] = (td.dt.total_seconds() / 60).round(2)
    return df


def convert_avg_pace(df: pd.DataFrame) -> pd.DataFrame:
    """Convert avg_pace from MM:SS string to decimal minutes. E.g. '7:45' -> 7.75"""
    def pace_to_decimal(val):
        if pd.isna(val):
            return None
        s = str(val).strip()
        if ":" in s:
            parts = s.split(":")
            try:
                return round(int(parts[0]) + int(parts[1]) / 60, 2)
            except (ValueError, IndexError):
                return None
        try:
            return float(s)
        except ValueError:
            return None

    df["avg_pace"] = df["avg_pace"].apply(pace_to_decimal)
    return df


def convert_types(df: pd.DataFrame) -> pd.DataFrame:
    df["date_of_activity"] = pd.to_datetime(df["date_of_activity"], errors="coerce")

    numeric_columns = [
        "distance",
        "moving_time_minutes",
        "elapsed_time_minutes",
        "avg_hr",
        "max_hr",
        "avg_run_cadence",
        "avg_stride_length",
        "calories",
        "total_ascent",
        "total_descent",
        "steps",
    ]
    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


def prepare_dataframe(csv_path: str) -> pd.DataFrame:
    """Read source CSV and return a dataframe aligned to the raw table schema."""
    print(f"Reading source file: {csv_path}")
    df = pd.read_csv(csv_path, thousands=",")

    df.columns = [normalize_column_name(c) for c in df.columns]
    validate_required_columns(df)

    df = df.rename(columns=COLUMN_MAPPING)
    df = convert_hhmmss_to_minutes(df, MOVING_TIME_SOURCE_COLUMN, "moving_time_minutes")
    df = convert_hhmmss_to_minutes(df, ELAPSED_TIME_SOURCE_COLUMN, "elapsed_time_minutes")

    keep_columns = list(COLUMN_MAPPING.values()) + ["moving_time_minutes", "elapsed_time_minutes"]
    df = df[keep_columns].copy()

    df = convert_avg_pace(df)
    df = convert_types(df)

    df["source_file"] = Path(csv_path).name
    df["record_hash"] = df.apply(build_record_hash, axis=1)

    df = df[TARGET_COLUMNS]

    print(f"Prepared {len(df)} rows for loading")
    print(df.head())
    return df


def upsert_raw_runs(df: pd.DataFrame) -> None:
    """Upsert rows into raw_data.runs_raw using record_hash as the conflict key."""
    engine = create_engine(DATABASE_URL, future=True)
    metadata = MetaData(schema=RAW_SCHEMA)
    runs_raw = Table(RAW_TABLE_NAME, metadata, autoload_with=engine)

    # Replace NaN with None so PostgreSQL receives NULL instead of NaN
    df = df.where(df.notna(), None)
    rows = df.to_dict(orient="records")

    if not rows:
        print("No rows to load.")
        return

    with engine.begin() as conn:
        for row in rows:
            stmt = insert(runs_raw).values(**row)
            stmt = stmt.on_conflict_do_update(
                index_elements=["record_hash"],
                set_={
                    "date_of_activity": stmt.excluded.date_of_activity,
                    "title": stmt.excluded.title,
                    "activity_type": stmt.excluded.activity_type,
                    "distance": stmt.excluded.distance,
                    "moving_time_minutes": stmt.excluded.moving_time_minutes,
                    "elapsed_time_minutes": stmt.excluded.elapsed_time_minutes,
                    "avg_hr": stmt.excluded.avg_hr,
                    "max_hr": stmt.excluded.max_hr,
                    "avg_run_cadence": stmt.excluded.avg_run_cadence,
                    "avg_pace": stmt.excluded.avg_pace,
                    "calories": stmt.excluded.calories,
                    "total_ascent": stmt.excluded.total_ascent,
                    "total_descent": stmt.excluded.total_descent,
                    "avg_stride_length": stmt.excluded.avg_stride_length,
                    "steps": stmt.excluded.steps,
                    "source_file": stmt.excluded.source_file,
                },
            )
            conn.execute(stmt)

    print(f"Upserted {len(rows)} rows into {RAW_SCHEMA}.{RAW_TABLE_NAME}")


def main() -> None:
    df = prepare_dataframe(CSV_PATH)
    upsert_raw_runs(df)
    print("Raw load complete.")


if __name__ == "__main__":
    main()
