"""Pydantic schemas for debug reports."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class InteractionEvent(BaseModel):
    """Schema for a single user interaction event."""

    type: Literal["click", "navigation", "form_submit", "error", "api_failure"]
    timestamp: str
    element: dict[str, Any] | None = None  # Element info for clicks
    details: dict[str, Any] = Field(default_factory=dict)  # Additional context


class BrowserContext(BaseModel):
    """Schema for browser/environment context."""

    route: str
    url: str
    user_agent: str
    viewport: dict[str, int]  # {"width": 1920, "height": 1080}
    navigation_history: list[str] = Field(default_factory=list)
    recent_interactions: list[InteractionEvent] = Field(default_factory=list)
    console_errors: list[str] = Field(default_factory=list)
    failed_requests: list[dict[str, Any]] = Field(default_factory=list)


class UserReport(BaseModel):
    """Schema for user-provided report details."""

    severity: Literal["critical", "medium", "minor"]
    description: str
    tags: list[str] = Field(default_factory=list)


class DebugReportCreate(BaseModel):
    """Schema for creating a new debug report."""

    context: BrowserContext
    screenshot: str | None = None  # Base64 data URL
    user_report: UserReport


class DebugReportResponse(BaseModel):
    """Response schema after creating a debug report."""

    id: str
    timestamp: str
    message: str = "Debug report saved successfully"
