---
name: debug-fix
description: Run a triage-and-fix session over an existing debug-reports.json — summarise reports, propose batches, optionally escalate heavy batches to other superpowers skills, branch, fix one batch at a time with verification and per-batch commits, update DEBUG_SYSTEM.md changelog, push, and offer a PR. Use when the user wants to address collected bug reports.
---

# debug-fix

Orchestrate a triage-and-fix session over the project's `debug-reports.json`. Follows the conventions documented in `DEBUG_SYSTEM.md` (created by `/debug-setup`); falls back to skill defaults if the doc isn't present.

## Process

### 1. Locate state

Read `debug-reports.json` from the project root (use `git rev-parse --show-toplevel` to find it).

- **File missing** → tell the user: *"No `debug-reports.json` found. Either run `/debug-setup` to install the reporting system, or file some reports first via the in-app bug button."* Exit cleanly.
- **File exists but empty (`[]`)** → tell the user *"Nothing to fix."* and exit.
- **File exists, malformed JSON** → surface the parse error and exit.

### 2. Read DEBUG_SYSTEM.md

If `DEBUG_SYSTEM.md` exists at the repo root, read its "Debug Session Changelog" section to understand the project's branch-naming and batch-numbering conventions. Most projects will use `fix/bug-batch-YYYY-MM-DD`.

If the doc is absent, default to `fix/bug-batch-YYYY-MM-DD` and tell the user that's what you'll use.

### 3. Summarise reports

Print a compact markdown table of all reports:

| # | Severity | Route / area | Tags | Description |
|---|----------|--------------|------|-------------|
| 1 | critical | /grid | UI, Data | "Hot-seat warning never appears for…" |

Tag colour-coding isn't necessary — clarity over cleverness.

### 4. Propose batches

Group reports into batches by feature area or theme. Each batch should be a coherent unit (3–6 reports is the sweet spot). Present:

```
Batch A — Issue messaging (#1, #4)
Batch B — Roster UX (#2, #3)
Batch C — …
```

Recommend an order (typically critical → medium → minor). Ask the user via `AskUserQuestion` to confirm or reorder.

### 5. Heaviness check (per batch)

For each batch, evaluate these signals:

- Any report with `severity: critical`.
- More than ~5 reports in the batch.
- Reports with tags `Data`, `Performance`, or `API` whose route/description suggests they touch core engines (conflict engine, regatta state, billing, auth, etc. — anything load-bearing).
- Vague descriptions ("everything is slow", "feels wrong", "broken") that aren't actionable as straight fixes.
- The batch will plausibly touch ≥10 files (estimate from the routes/areas mentioned).

If any signal fires for a batch, print:

> **Heads up — Batch <X> looks heavy** (<N> reports, touches <area>). Worth considering:
> - `superpowers:brainstorming` if the underlying behaviour needs rethinking
> - `superpowers:writing-plans` to spec it out before any code changes
> - `superpowers:systematic-debugging` if it's a deep bug, not just UI polish
>
> Or say "carry on" to fix it inline as a normal batch.

This is always a flag, never a hard stop. Fires per-batch so a mixed session gets per-batch judgement.

### 6. Pre-flight

- If the working tree is dirty, ask: stash, commit-first, or abort?
- If the current branch matches `fix/bug-batch-*`, ask: continue this branch or start a new one?

### 7. Create branch

If continuing an existing batch branch, stay on it. Otherwise:

```bash
git checkout -b fix/bug-batch-YYYY-MM-DD
```

Use today's date.

### 8. Auto-discover verification commands

Inspect the project to figure out what to run before each commit:

- **Python backend**: if `pyproject.toml` exists with `[tool.pytest.ini_options]`, the verify command includes `pytest` (use the project's local venv: `.venv/bin/python -m pytest` if it exists, otherwise `python -m pytest`).
- **TypeScript frontend**: if `tsconfig.app.json` or `tsconfig.json` exists in `frontend/` (or root), the verify command includes `npx tsc --noEmit -p <path>`.
- **Linting**: if `package.json` has a `lint` script, append `npm run lint`.

Present the chosen command(s) to the user up front via plain text (not a question) and ask whether to keep them, modify, or skip verification.

### 9. For each batch, in order

Loop through the user-approved batch order. Per batch:

1. **Investigate**. Read the files mentioned in the report routes. Do not edit yet.
2. **Propose fixes**. List each report and the specific file + line you'll change. Show this before any edits.
3. **Implement**. Use `Edit`/`Write` to make the changes.
4. **Verify**. Run the discovered verification command(s). If they fail:
   - If they fail with the same errors that existed before any changes (pre-existing failures), surface the output and ask whether to baseline-ignore for this batch or abort.
   - If new failures, do NOT commit. Surface the failure, ask: retry the fix, fix manually, or skip this batch.
5. **Commit**. Use a message of the form:

   ```
   Fix <area> — <one-line summary>

   Batch <X> of debug session <N> (<branch-name>).

   <Per-report bullets explaining the fix and citing report IDs>
   ```

6. **Pause**. Tell the user: `Batch <X> committed (<short-hash>). Test in the browser, then say "next", "redo", or "stop".`

   - `next` → move on to the next batch.
   - `redo` → revert the batch's commit (`git revert HEAD --no-edit`) and restart the batch from step 1.
   - `stop` → break out of the loop; jump to "End of session" with whatever's committed.

### 10. End of session

Once all batches are done (or the user said `stop`):

1. **Update `DEBUG_SYSTEM.md` changelog**. Append a new session entry following the structure already in the file (the "Session Template" at the bottom is a good model). Include each batch with its commit hash and the reports it fixed. Commit this as a standalone "Log debug session N in DEBUG_SYSTEM" commit.
2. **Push branch**:
   ```bash
   git push -u origin <branch>
   ```
   If push fails (no remote, auth error, etc.), leave commits in place and surface the error. Do not roll back.
3. **Offer PR**. Ask: "Open a pull request now?" If yes, run `gh pr create` with an auto-generated title (e.g., `Debug session N: <areas touched>`) and body summarising the batches. If `gh` is not installed, print the URL `git push` returned instead.
4. **Reports lifecycle**. Ask: *"Archive `debug-reports.json` to `.trash/debug-reports-YYYY-MM-DD.json`, or leave it in place?"* Default to archive (per the global "never delete" rule). If archive:
   ```bash
   mkdir -p .trash
   mv debug-reports.json ".trash/debug-reports-$(date +%Y-%m-%d).json"
   ```

## Edge cases

- **No `debug-reports.json`** → exit cleanly with the setup hint above.
- **Empty `debug-reports.json` (`[]`)** → "Nothing to fix." exit.
- **Malformed JSON** → surface parse error, exit.
- **Already on a `fix/bug-batch-*` branch** → continue-or-new prompt.
- **Dirty working tree** → stash / commit-first / abort.
- **Verification fails on first run** (pre-existing) → surface output, baseline-ignore or abort.
- **Verification fails on a batch's changes** → no commit; retry / fix manually / skip.
- **`gh` CLI not installed** → skip PR step, print URL.
- **Push fails** → surface error, leave commits.

## Notes

- Always pause between batches. Never plough through silently.
- Always run verification before each commit (or explicitly skip with the user's say-so).
- Always preserve commit hashes in the changelog — they're the audit trail.
- Never `--no-verify`, never `--amend`, never force-push.
