---
name: debug-setup
description: Bootstrap the in-app debug-reporting system into a project — copies a chosen stack template (backend route, frontend tracker/modal/button, DEBUG_SYSTEM.md) and prints a wiring checklist. Use when the user wants to add bug reporting to a new project, or when /debug-fix complains that debug-reports.json isn't set up yet.
---

# debug-setup

Bootstrap the in-app debug-reporting system into the current project. Templates live in `skills/debug-setup/templates/<name>/`; each template's `template.json` declares its metadata and `wiring.md` is the post-copy checklist.

## Process

### 1. Pre-flight

- If the current directory is not a git repo (`git rev-parse --git-dir` fails), refuse unless the user passed `--force` as an argument (passed as `args` when the user invokes the skill, e.g., `/debug-setup --force`). Tell them to `git init` first.
- If `git status --porcelain` is non-empty, warn that the working tree is dirty and ask whether to continue (the bootstrap creates many new files; mixing with unrelated changes makes the diff hard to read).

### 2. Pick a template

List every subdirectory of `skills/debug-setup/templates/` that contains a `template.json`. For each, show the `label` and `description` fields. Present as a single-choice prompt via `AskUserQuestion`.

If the user has only one template installed, you may skip the prompt and proceed with that template, but say so explicitly ("using the only template available: <label>").

### 3. Locate target paths

Use the chosen template's `detect` rules to best-guess backend and frontend directories:

- For each path under `detect.backend`, check whether it exists relative to the project root. The first hit's parent directory is the backend dir (e.g., `backend/pyproject.toml` → backend dir is `backend/`).
- Same for `detect.frontend`.

If either side is not detected, ask the user via `AskUserQuestion` for the path (free-text). If they have no preference, fall back to `backend/` for backend and `frontend/` for frontend; accept `.` as a valid value for single-package layouts.

Confirm the resolved paths with the user before copying. Always.

### 4. Check collisions

**4a. Pre-scan for DEBUG_SYSTEM.md.** Before copying anything, compute the destination path for the template's `DEBUG_SYSTEM.md` (it lives at `<project-root>/DEBUG_SYSTEM.md`). If that file already exists, hard-stop: print the path and tell the user to back up or move the existing doc before re-running. Exit the skill — do NOT copy any other files yet.

**4b. Per-file collision check.** For every other file in the template's `files/` tree, compute the destination path (e.g., `files/backend/app/api/debug.py` → `<backend-dir>/app/api/debug.py`). For each destination:

- **Doesn't exist** → mark for copy.
- **Exists, identical content** (byte-level `diff`) → skip silently.
- **Exists, different content** → ask the user per file via `AskUserQuestion`: `keep` (don't copy), `overwrite`, or `diff` (show the diff and re-ask).

Resolve all collisions before moving to Step 5.

### 5. Copy files

Once collisions are resolved, copy each file to its destination. Create parent directories as needed. Use the `Bash` tool with `cp -p` so timestamps are sensible.

### 6. Print the wiring checklist

Print the template's `post_install` entries from `template.json` as a bulleted list first, then print the contents of `skills/debug-setup/templates/<chosen>/wiring.md` verbatim below. The `post_install` list covers any automated steps that were run; `wiring.md` is the manual checklist (router registration, layout mount, npm install, .gitignore).

### 7. Offer to verify

Ask the user whether to run a smoke test now (this is interactive, so wait for explicit `yes`/`no`). If yes:

- Look for existing test commands in `pyproject.toml` (`[tool.pytest.ini_options]`) and `package.json` (`scripts.test`, `scripts.typecheck`).
- Run all discovered commands sequentially; report each command's output and exit code independently. Failures here are almost certainly pre-existing — say so and don't block.

### 8. Summary

Print:

```
debug-system installed. Use Ctrl+Shift+B (or the floating bug button) to file a report, then run /debug-fix when you're ready to triage.
```

## Edge cases

- **Non-git directory without `--force`**: refuse with a hint to `git init`.
- **Dirty working tree**: warn, ask before continuing.
- **Backend or frontend not auto-detected**: ask the user; accept any path including `.` (single-package layout).
- **Existing target files**: never overwrite without asking; identical content is skipped silently; differing content prompts per file (keep/overwrite/diff).
- **`DEBUG_SYSTEM.md` exists**: hard stop. Tell the user to back up or rename, then re-run.
- **No templates installed**: not possible in a normal install (the plugin ships `fastapi-react`). If it happens, point at the plugin install.
- **Template `detect` matches nothing**: tell the user the template expected to find one of the `detect` paths and ask whether to proceed anyway with manual path entry.

## Notes

- This skill never installs npm packages or pip packages itself — running `npm install` in someone's project is too invasive for a bootstrap. The wiring checklist tells them what to install.
- The skill never registers the FastAPI router or modifies the user's root layout. Both involve picking a specific line in existing user code; the checklist asks them to do it.
- Always print the resolved target paths before copying. Do not assume.
