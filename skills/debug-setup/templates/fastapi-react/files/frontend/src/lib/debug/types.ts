/**
 * TypeScript types for the debug reporting system.
 * Matches backend Pydantic schemas in app/schemas/debug.py
 */

export type InteractionType =
  | "click"
  | "navigation"
  | "form_submit"
  | "error"
  | "api_failure";

export interface InteractionEvent {
  type: InteractionType;
  timestamp: string;
  element?: {
    tag: string;
    text: string;
    classes: string[];
    id: string;
    dataset: Record<string, string>;
    ariaLabel?: string;
  };
  details: Record<string, unknown>;
}

export interface BrowserContext {
  route: string;
  url: string;
  user_agent: string;
  viewport: {
    width: number;
    height: number;
  };
  navigation_history: string[];
  recent_interactions: InteractionEvent[];
  console_errors: string[];
  failed_requests: Array<{
    url: string;
    status?: number;
    error: string;
  }>;
}

export type Severity = "critical" | "medium" | "minor";

export interface UserReport {
  severity: Severity;
  description: string;
  tags: string[];
}

export interface DebugReportCreate {
  context: BrowserContext;
  screenshot: string | null;
  user_report: UserReport;
}

export interface DebugReportResponse {
  id: string;
  timestamp: string;
  message: string;
}
