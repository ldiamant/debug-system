# Wiring checklist — fastapi-react

After `/debug-setup` finishes copying files, complete these steps manually. Each is project-specific enough that the skill can't do it reliably for you.

## Backend

1. **Register the debug router** in your FastAPI app entry point (typically `backend/app/main.py`):

   ```python
   from app.api import debug

   app.include_router(debug.router)
   ```

2. **Confirm the report-file path** in `backend/app/api/debug.py`. The constant `DEBUG_REPORTS_FILE` is calculated as `Path(__file__).parent.parent.parent.parent / "debug-reports.json"`, which assumes the file lives at `<repo-root>/debug-reports.json` and the route file is at `<repo-root>/backend/app/api/debug.py`. If your layout differs, adjust the number of `.parent` calls so the path lands at the repo root.

## Frontend

3. **Install the screenshot library**:

   ```bash
   cd frontend
   npm install html2canvas
   ```

4. **Mount the debug reporter** in your root layout (typically `frontend/src/App.tsx`, `frontend/src/main.tsx`, or `frontend/src/components/layout/root-layout.tsx`):

   ```tsx
   import { EventTrackerProvider } from "@/lib/debug";
   import { DebugReporter } from "@/components/debug/debug-reporter";

   export function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <EventTrackerProvider>
         {children}
         <DebugReporter />
       </EventTrackerProvider>
     );
   }
   ```

   Adjust the import paths to match your alias setup (`@/`, `~/`, relative, etc.).

5. **Verify the API path** in the modal. By default it POSTs to `/api/debug`. If your Vite dev server proxies `/api/*` to the backend, no change is needed. If not, configure the proxy in `vite.config.ts`:

   ```ts
   server: {
     proxy: {
       "/api": "http://localhost:8000",
     },
   },
   ```

## Repo hygiene

6. **Ignore the reports file**. Add to `.gitignore` at the project root:

   ```gitignore
   debug-reports.json
   ```

## Smoke test

7. Restart backend + frontend. Open the app in a browser. Click the red bug icon in the bottom-right (or press `Ctrl+Shift+B` / `Cmd+Shift+B`). File a test report. Confirm `debug-reports.json` appears at the repo root and contains your report.
