# Manual test plan

Skills are markdown instructions, not code — there's no unit-test framework. These end-to-end scenarios are the validation suite. Run them before every release (`plugin.json` version bump).

## Setup

Install the plugin from a local path (so you can iterate without pushing):

```bash
# Adjust the path to wherever you cloned/checked out the repo
claude plugin install /Users/loucas/Documents/github/debug-system
```

If the plugin is already installed from a remote, uninstall first:

```bash
claude plugin uninstall debug-system
```

## Scenario 1: /debug-setup happy path

**Goal:** bootstrap a fresh project end-to-end and file a real report.

Prep a throwaway repo:

```bash
cd /tmp
mkdir debug-system-smoketest && cd debug-system-smoketest
git init
mkdir backend frontend
cat > backend/pyproject.toml <<EOF
[project]
name = "smoketest-backend"
version = "0.0.0"
EOF
cat > frontend/package.json <<EOF
{ "name": "smoketest-frontend", "version": "0.0.0" }
EOF
```

In a Claude Code session inside `/tmp/debug-system-smoketest`, run:

```
/debug-setup
```

**Expected:**

- Pre-flight passes (git repo, clean tree).
- Single template `fastapi-react` is offered (and chosen).
- Target paths auto-detect as `backend` and `frontend`.
- No collisions; all template files copy without prompting.
- The wiring checklist prints.
- The optional verification offer appears (decline — there's no real test suite here).
- The summary message prints.

**Verify on disk:**

```bash
test -f backend/app/api/debug.py && echo "backend route ok"
test -f backend/app/schemas/debug.py && echo "backend schema ok"
test -f frontend/src/components/debug/bug-report-modal.tsx && echo "frontend modal ok"
test -f frontend/src/components/debug/debug-reporter.tsx && echo "frontend reporter ok"
test -f frontend/src/lib/debug/event-tracker.tsx && echo "tracker ok"
test -f frontend/src/lib/debug/types.ts && echo "tracker types ok"
test -f frontend/src/lib/debug/index.ts && echo "tracker index ok"
test -f DEBUG_SYSTEM.md && echo "doc ok"
```

All eight should print `ok`.

## Scenario 2: /debug-setup with existing DEBUG_SYSTEM.md

**Goal:** confirm the hard-stop guard fires.

In the same `/tmp/debug-system-smoketest` directory (post-scenario 1), `DEBUG_SYSTEM.md` already exists. Run:

```
/debug-setup
```

**Expected:** the skill stops with a clear message that `DEBUG_SYSTEM.md` already exists and instructs the user to back up or rename it.

## Scenario 3: /debug-setup with one collision

**Goal:** confirm the per-file collision prompt.

Reset:

```bash
cd /tmp && rm -rf debug-system-smoketest
mkdir debug-system-smoketest && cd debug-system-smoketest
git init
mkdir -p backend/app/api frontend
cat > backend/pyproject.toml <<EOF
[project]
name = "smoketest"
version = "0.0.0"
EOF
cat > frontend/package.json <<EOF
{ "name": "smoketest", "version": "0.0.0" }
EOF
# Pre-create a stub at one of the target paths
echo "# pre-existing" > backend/app/api/debug.py
```

Run `/debug-setup`. **Expected:** when the skill reaches `backend/app/api/debug.py`, it prompts you (keep / overwrite / diff). Pick `diff` once to confirm the diff renders, then `overwrite` to continue. Remaining files copy without prompting.

## Scenario 4: /debug-fix happy path

**Goal:** run a fix session against seeded reports.

In a real test project (you can use a clone of `boat-selection` on a throwaway branch), create a fake reports file:

```bash
cat > debug-reports.json <<'EOF'
[
  {
    "id": "test-1",
    "timestamp": "2026-05-23T10:00:00Z",
    "context": { "route": "/", "url": "http://localhost:5173/" },
    "screenshot": null,
    "user_report": {
      "severity": "medium",
      "description": "Test report: the homepage heading should say 'Welcome' not 'Hello'.",
      "tags": ["UI"]
    }
  }
]
EOF
```

Run `/debug-fix`. **Expected:**

- The single report is summarised in a table.
- A single batch is proposed.
- No heaviness signals fire (1 medium-severity UI report).
- Pre-flight passes (clean tree).
- A branch `fix/bug-batch-YYYY-MM-DD` is created.
- A verification command is auto-discovered and shown.
- The skill investigates, proposes a one-line fix, implements it, verifies, commits, and pauses.

Say `stop` to short-circuit. **Expected:**

- The DEBUG_SYSTEM.md changelog (if present) gets a session entry.
- The branch is pushed (if a remote exists) or the skill surfaces the push failure cleanly.
- The skill offers a PR (if `gh` is installed) or prints the URL.
- The skill asks whether to archive `debug-reports.json`.

## Scenario 5: /debug-fix with no reports

**Goal:** confirm clean exit when nothing to fix.

In a directory with no `debug-reports.json`:

```
/debug-fix
```

**Expected:** the skill tells you to run `/debug-setup` first, and exits without creating any branch or making any changes.

## Scenario 6: /debug-fix with malformed JSON

**Goal:** confirm error handling.

```bash
echo "not json" > debug-reports.json
```

Run `/debug-fix`. **Expected:** the skill surfaces the parse error and exits cleanly. No branch created.

## Cleanup

After every scenario:

```bash
cd /tmp && rm -rf debug-system-smoketest
```

For scenarios in the real test project, reset the branch:

```bash
git checkout main
git branch --list 'fix/bug-batch-*' | xargs -r -n 1 git branch -D
rm -f debug-reports.json
```
