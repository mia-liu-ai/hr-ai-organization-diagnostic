# GitHub Copilot repository instructions

This is an AI-native HR / Organization Diagnostic MVP with React frontend, FastAPI backend, and SQLite persistence.

When reviewing, generating, or modifying code, focus on product behavior first.

## Product areas

The application includes:

- Boss / HR / Employee role login
- Project-based organization diagnosis workflow
- Organization Diagnosis
- Talent Model
- 360 Review
- Survey Center
- Organization Feedback
- Dashboard
- Reports

## Review priorities

Please review code for:

1. Whether the code actually implements the requested feature or bug fix.
2. Whether frontend API calls match backend FastAPI routes.
3. Whether frontend TypeScript types match backend response schemas.
4. Whether database models and initialization logic are consistent.
5. Whether project-specific data is isolated and cannot be overwritten by another project.
6. Whether boss, HR, and employee demo logins still work.
7. Whether Organization Diagnosis dimensions can be created, edited, deleted, listed, and persisted.
8. Whether existing modules are broken by unrelated changes.
9. Whether errors, loading states, and empty states are handled.
10. Whether tests or manual verification steps are missing.

## Known high-risk bugs to prevent

- Creating multiple projects causes previous project data to be overwritten.
- Organization Diagnosis dimensions cannot be added or deleted.
- Frontend shows buttons but backend has no matching route.
- Backend route exists but frontend does not pass the correct payload.
- Only boss demo login works while HR and employee login fail.
- Backend appears to run but `/docs` or health endpoints are inaccessible.
- SQLite initialization resets or corrupts existing demo data.
- Global state is accidentally used where project-specific state is required.

## Preferred implementation style

- Keep backend routes explicit and easy to inspect.
- Keep API client functions centralized.
- Keep TypeScript types aligned with backend schemas.
- Avoid duplicated hardcoded demo data across multiple files.
- Use clear names for project-specific identifiers.
- Preserve existing MVP features unless the PR explicitly removes them.
- Add or update tests when possible.
- If no automated tests exist, include a manual test checklist in the PR.

## Variable name and logic checks

Every time TypeScript / React code is modified, check the following before finishing:

1. There must be no undefined variables.
2. There must be no stale variable names left behind after refactors.
3. Check role and user scope carefully, especially `role`, `user`, `currentUser`, `isAdmin`, and `isEmployee`.
4. Check project data isolation carefully, especially `project_id` and `activeProjectId`.
5. Do not call `.length` directly on an array value that may be `undefined`; use a safe fallback such as an empty array.
6. User-visible text must not contain old product terms such as `HR`, `boss`, `Add Hypothesis`, `Delete`, or `Competency Model`.
7. Run `npm run build` before finishing.
8. If the build does not pass, do not say the task is complete.
