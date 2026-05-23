# Debug Reporting System

A comprehensive bug tracking system integrated into the ORC Regatta Planner that automatically captures context and allows easy bug reporting during development and testing.

## Features

### Auto-Captured Context
- **Current route and URL** - Where you are in the app
- **Browser information** - User agent, viewport size
- **Navigation history** - Last 10 route changes
- **User interactions** - Last 50 clicks, form submissions, etc. with full element details
- **Console errors** - Last 20 console.error messages
- **Failed API requests** - Last 20 failed network requests with status codes
- **Screenshot** - Optional visual context of the current state

### User Input
- **Severity levels**: Critical, Medium, Minor (color-coded)
- **Tags**: UI, Data, Performance, Navigation, Form, API, Other
- **Description**: Free-form text to describe the issue

### Storage
All reports are saved to `debug-reports.json` in the project root, which Claude can read to review all reported issues at once.

## How to Use

### Method 1: Floating Button
Click the red bug button in the bottom-right corner of the app.

### Method 2: Keyboard Shortcut
Press **Ctrl+Shift+B** (Windows/Linux) or **Cmd+Shift+B** (Mac) anywhere in the app.

### Reporting Flow
1. Trigger the bug reporter (button or keyboard)
2. Review the auto-captured context (route, interactions, errors, etc.)
3. Select severity: Critical / Medium / Minor
4. Optionally add tags (UI, Data, Performance, etc.)
5. Write a description of what went wrong
6. Optionally capture a screenshot
7. Submit

The report is saved immediately and you'll see a success toast.

### Badge Counter
The floating button shows a badge with the count of reports submitted this session, so you can track how many issues you've logged.

## For Reviewers (Claude)

When the user is ready to review all collected bugs:

```bash
# Read the debug reports file
cat debug-reports.json
```

Each report contains:
```json
{
  "id": "unique-uuid",
  "timestamp": "2026-05-15T10:30:00.000Z",
  "context": {
    "route": "/regattas/123/grid",
    "url": "http://localhost:5173/regattas/123/grid?filter=sweep",
    "user_agent": "Mozilla/5.0...",
    "viewport": { "width": 1920, "height": 1080 },
    "navigation_history": ["/roster", "/regattas", "/regattas/123", ...],
    "recent_interactions": [
      {
        "type": "click",
        "timestamp": "...",
        "element": {
          "tag": "button",
          "text": "Add Boat",
          "classes": ["btn", "btn-primary"],
          "id": "add-boat-btn"
        }
      }
    ],
    "console_errors": ["Error: Failed to fetch..."],
    "failed_requests": [
      {
        "url": "/api/boats/123",
        "status": 500,
        "error": "Internal Server Error"
      }
    ]
  },
  "screenshot": "data:image/png;base64,...",
  "user_report": {
    "severity": "critical",
    "description": "When clicking Add Boat, nothing happens...",
    "tags": ["UI", "Form"]
  }
}
```

## API Endpoints

- **POST `/api/debug`** - Submit a new debug report
- **GET `/api/debug/count`** - Get count of submitted reports
- **DELETE `/api/debug`** - Clear all reports (useful after addressing them)

## Implementation Details

### Backend
- `backend/app/api/debug.py` - FastAPI endpoints
- `backend/app/schemas/debug.py` - Pydantic schemas
- Saves to `debug-reports.json` in project root

### Frontend
- `frontend/src/lib/debug/event-tracker.tsx` - Context provider that captures all interactions
- `frontend/src/components/debug/bug-report-modal.tsx` - Report submission modal
- `frontend/src/components/debug/debug-reporter.tsx` - Floating button + keyboard shortcut
- Integrated into `RootLayout` so it's available everywhere

### Dependencies
- `html2canvas` - Screenshot capture library

## Clearing Reports

After addressing all bugs from a batch:

```bash
curl -X DELETE http://localhost:8000/api/debug
```

Or delete the file directly:
```bash
rm debug-reports.json
```

## Tips

- Use the keyboard shortcut frequently while testing - it's faster than clicking
- Screenshot is optional but helpful for visual/layout issues
- Be descriptive in your notes - "button doesn't work" is less helpful than "Add Boat button shows no response, no console errors, expected boat form to open"
- Tags help categorize issues for batch fixing (e.g., fix all "Data" issues at once)
- The auto-captured interactions show what you clicked BEFORE the issue occurred, which is critical context

---

## Fix Workflow: Batched Sequential Approach

After collecting bug reports, fixes are implemented in **sequential batches** grouped by feature area to avoid merge conflicts and enable incremental testing.

### Recommended Batch Strategy

**Branch naming**: `fix/bug-batch-YYYY-MM-DD` (e.g., `fix/bug-batch-2026-05-15`) or `fix/bug-batch-improvements`

**Why sequential, not parallel?**
- Many issues touch the same files/components (attendance UI, navigation, etc.)
- Avoids merge conflicts from parallel work on separate branches
- Allows testing after each batch before proceeding
- Creates clean, logical git history
- Easier to review and rollback if needed

### Process Per Batch

1. **Group issues** - Organize by feature area, severity, or theme
2. **Implement** - Make focused changes for that batch
3. **Commit** - Single commit with clear message referencing bug report IDs
4. **Test** - User tests the changes in dev environment
5. **Iterate** - Fix any issues found during testing
6. **Move to next batch** - Repeat

### Batch Organization Template

When planning batches, consider grouping by:
- **Severity**: Critical → Medium → Minor
- **Feature area**: Attendance, Navigation, Grid, Forms, etc.
- **Type**: UI bugs, Data issues, Performance, API errors

Example batch structure:
```
Batch 1: Critical - [Feature Area]
  - Fix [issue description] (#report-id)
  - Fix [issue description] (#report-id)
  - Commit: [commit-hash]

Batch 2: Medium - [Feature Area]
  - [same structure]
```

### Resuming After Context Compaction

If conversation gets compacted:
1. Check current branch: `git branch --show-current`
2. Check last commit: `git log -1 --oneline`
3. Read the changelog section below to see which batches are complete
4. Continue from the next pending batch

---

## Debug Session Changelog

This section preserves the history of debug sessions and their fixes. Each debug session should add a new entry with its batches and outcomes.

### Session 1: May 15, 2026 - Initial Bug Hunt

**Branch**: `fix/bug-batch-improvements`

**Total reports**: 15 bugs across UI, navigation, data handling, and performance

**Batches:**

**Batch 1: Critical - Attendance & Validation** ✅ COMPLETE
- Fix attendance dropdown (default to "rowing", one-click toggle buttons)
- Add conflict detection for unavailable athletes in boats
- Commit: `a9c8e97`
- Fixes reports: #9, #12, #13

**Batch 2: Critical - Navigation & UX Flow** ✅ COMPLETE
- Event cards → boat builder on click
- Back button from boat builder → boat list (not regatta page)
- Commit: `da5234e`
- Fixes reports: #11, #14

**Batch 3: Medium - UI Bugs & Polish** ✅ COMPLETE
- Fix filter button toggle bug (Sculling/Sweep/All)
- Add error detail popover/tooltip in grid
- Fix button labels (code names → user-friendly)
- Fix "49 info" label in grid
- Commit: `5774682`
- Fixes reports: #1, #2, #8, #15

**Batch 4: Minor - Athlete Page Enhancements** ✅ COMPLETE
- Split regatta history (Previous/Upcoming)
- Direct-edit notes (no edit button)
- Click regatta → navigate to regatta detail
- Move Performance tab to bottom with "coming soon"
- Commit: `c99d4c9`
- Fixes reports: #3, #4, #5, #6

**Batch 5: Major - Athlete Page Refactor** ✅ COMPLETE
- Converted athlete detail page to tab-based layout
- Use real regatta data from API (no more placeholders)
- Fixed back navigation from regatta to athlete page
- Added availability calendar placeholder
- Simplified notes structure
- Commit: `4e812f1`
- Fixes reports: #7 (indirectly - improved structure)

**Outcome**: All 15 bugs addressed, merged to `main` on 2026-05-15

---

### Session 2: May 23, 2026 - Issue Messaging & Roster UX

**Branch**: `fix/bug-batch-2026-05-23`

**Total reports**: 4 bugs (all medium severity)

**Batches:**

**Batch A: Issue Messaging** ✅ COMPLETE
- Drop redundant `boat_empty` detector — `boat_incomplete` already covers fully-empty boats as "0 of N seats filled" (#4)
- Banner: rename "X conflicts" → "X issues"; replace lead red AlertCircle with per-severity icons (red AlertCircle / amber AlertTriangle / blue Info); green CheckCircle2 for the empty state (#1)
- Commit: `45e1bcc`
- Fixes reports: #1, #4

**Batch B: Roster UX** ✅ COMPLETE
- Drop the 3-dot row menu; row click already navigates to the athlete detail page where Edit lives (#2)
- DataTable: optional row selection (tri-state header + per-row checkboxes, click-isolated)
- Bulk-delete action bar with confirmation dialog; uses `Promise.allSettled` and reports per-id failures (#3)
- Commit: `84a60fd`
- Fixes reports: #2, #3

**Outcome**: All 4 bugs addressed on branch `fix/bug-batch-2026-05-23`

---

### Session Template (for future debug sessions)

**Date**: YYYY-MM-DD

**Branch**: `fix/bug-batch-YYYY-MM-DD`

**Total reports**: [number] bugs

**Batches:**

**Batch 1: [Severity] - [Feature Area]** [STATUS]
- [Fix description] (#report-id)
- Commit: `[hash]`
- Fixes reports: #X, #Y, #Z

**Batch 2: ...** [continue as needed]

**Outcome**: [Summary of what was accomplished]

---
