# debug-system

A Claude Code plugin for in-app bug reporting and a structured fix workflow. Drop a floating bug button into any React app, capture rich context per report, then run `/debug-fix` to triage and ship the fixes in clean per-batch commits.

## What you get

Two skills, both invoked by name:

- **`/debug-setup`** — bootstraps the in-app reporting system into a project. Copies a chosen stack template (backend route, frontend tracker/modal/button, `DEBUG_SYSTEM.md`) and prints a manual-wiring checklist. v0.1.0 ships a `fastapi-react` template.
- **`/debug-fix`** — orchestrates a fix session. Reads `debug-reports.json`, proposes batches, optionally flags heavy ones for escalation to other superpowers skills, branches, fixes one batch at a time with verification + per-batch commits, updates the changelog, pushes, and offers a PR.

## Install

> Verify the exact command against the current Claude Code plugin docs — this is what works at time of writing.

```
claude plugin install https://github.com/ldiamant/debug-system
```

Both skills become available immediately. To update later:

```
claude plugin update debug-system
```

## Quick start

In a fresh project:

```
/debug-setup
```

Follow the prompts to copy template files. Complete the printed wiring checklist (register the FastAPI router, mount the React component in your root layout, `npm install html2canvas`).

Use the app for a while. File reports via the red bug button (bottom-right) or `Ctrl+Shift+B` / `Cmd+Shift+B`.

When ready to fix them:

```
/debug-fix
```

The skill summarises the reports, proposes batches, and walks through them one at a time.

## Templates

Templates live in `skills/debug-setup/templates/<name>/`. Each has:

- `template.json` — metadata and `detect` rules
- `wiring.md` — post-copy checklist (stack-specific)
- `files/` — mirrors target project layout

To add a new template (e.g., `express-react`, `flask-vue`):

1. Create a new folder under `skills/debug-setup/templates/`.
2. Add a `template.json` following the `fastapi-react` example.
3. Add a `wiring.md` with the post-copy instructions for that stack.
4. Drop the reference implementation into `files/` mirroring the target layout.
5. Send a PR.

The skill discovers templates at runtime — no skill code needs editing.

## Reports format

Reports are stored as JSON in `<repo-root>/debug-reports.json`:

```json
[
  {
    "id": "uuid",
    "timestamp": "ISO-8601",
    "context": {
      "route": "/path",
      "url": "http://…",
      "user_agent": "…",
      "viewport": { "width": 1440, "height": 900 },
      "navigation_history": ["…"],
      "recent_interactions": [{ "type": "click", "element": { "tag": "button", "text": "Submit" } }],
      "console_errors": ["…"],
      "failed_requests": [{ "url": "…", "status": 500 }]
    },
    "screenshot": "data:image/png;base64,…",
    "user_report": {
      "severity": "critical|medium|minor",
      "description": "…",
      "tags": ["UI", "Data"]
    }
  }
]
```

Add the file to `.gitignore` — reports are local-only by design.

## Workflow conventions

`/debug-fix` follows the `DEBUG_SYSTEM.md` conventions installed by `/debug-setup`:

- Branch naming: `fix/bug-batch-YYYY-MM-DD`
- One commit per batch, with the report IDs referenced in the message
- A session changelog entry appended to `DEBUG_SYSTEM.md` at the end

If you have an existing `DEBUG_SYSTEM.md` with different conventions, the skill respects them.

## License

MIT — see [LICENSE](./LICENSE).
