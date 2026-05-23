"""API endpoints for debug reporting system."""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.schemas.debug import DebugReportCreate, DebugReportResponse

router = APIRouter(prefix="/api/debug", tags=["debug"])

# Path to debug reports file (in project root)
DEBUG_REPORTS_FILE = Path(__file__).parent.parent.parent.parent / "debug-reports.json"


def _load_reports() -> list[dict]:
    """Load existing debug reports from file."""
    if not DEBUG_REPORTS_FILE.exists():
        return []

    try:
        with open(DEBUG_REPORTS_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def _save_reports(reports: list[dict]) -> None:
    """Save debug reports to file."""
    try:
        with open(DEBUG_REPORTS_FILE, "w") as f:
            json.dump(reports, f, indent=2, ensure_ascii=False)
    except IOError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save debug report: {str(e)}"
        )


@router.post("", response_model=DebugReportResponse)
def create_debug_report(report: DebugReportCreate) -> DebugReportResponse:
    """Create a new debug report.

    Captures user-reported issues with full context (browser state,
    interactions, screenshot) and saves to debug-reports.json for
    later review.
    """
    # Generate unique ID and timestamp
    report_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    # Load existing reports
    reports = _load_reports()

    # Create new report
    new_report = {
        "id": report_id,
        "timestamp": timestamp,
        "context": report.context.model_dump(),
        "screenshot": report.screenshot,
        "user_report": report.user_report.model_dump(),
    }

    # Append and save
    reports.append(new_report)
    _save_reports(reports)

    return DebugReportResponse(
        id=report_id,
        timestamp=timestamp,
        message=f"Debug report saved successfully ({len(reports)} total reports)",
    )


@router.get("/count")
def get_report_count() -> dict[str, int]:
    """Get the count of debug reports."""
    reports = _load_reports()
    return {"count": len(reports)}


@router.delete("")
def clear_reports() -> dict[str, str]:
    """Clear all debug reports (useful after addressing issues)."""
    if DEBUG_REPORTS_FILE.exists():
        DEBUG_REPORTS_FILE.unlink()

    return {"message": "All debug reports cleared"}
