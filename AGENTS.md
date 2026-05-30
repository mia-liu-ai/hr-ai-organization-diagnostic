# AGENTS.md

## Project context

This repository is an AI-native HR / Organization Diagnostic MVP.

The product includes:
- Three roles: boss, HR, employee
- Login and role-based access
- Project-based organization diagnosis workflow
- Organization Diagnosis module
- Talent Model module
- 360 Review module
- Survey Center
- Organization Feedback
- Dashboard
- Reports
- FastAPI backend
- React frontend
- SQLite persistence for local MVP usage

The most important review goal is not only code quality. The main goal is to verify that code changes match the intended product behavior and do not break existing workflows.

## Critical product expectations

When reviewing or modifying code, always check the following:

1. Project isolation
   - Creating a new project must not overwrite an existing project.
   - Switching between projects must preserve each project's data.
   - Project-specific diagnosis, dimensions, survey data, feedback, reports, and dashboards should not leak across projects.

2. Organization Diagnosis dimensions
   - Dimensions should support create, edit, delete, and list behavior.
   - Deleting one dimension must not corrupt unrelated project data.
   - Dimension changes should persist correctly after refresh.
   - UI state and backend state must remain consistent.

3. Role login and permissions
   - Boss demo login must work.
   - HR demo login must work.
   - Employee demo login must work.
   - Each role should only see the workflows intended for that role.
   - Adding or changing auth code must not break existing demo accounts.

4. Frontend / backend consistency
   - Every frontend API call must map to a real backend route.
   - Request and response types must match.
   - Frontend TypeScript types, backend schemas, and database models must remain aligned.
   - Avoid hidden hardcoded data unless it is clearly demo-only and documented.

5. Backend health
   - `/docs` should open when the backend is running.
   - `/api/health` or the project's health endpoint should return a valid response.
   - Backend startup must not fail because of missing migrations, import errors, or database initialization issues.

6. Existing module protection
   - Do not break 360 Review.
   - Do not break Survey Center.
   - Do not break Organization Feedback.
   - Do not break Dashboard.
   - Do not break Reports.
   - Do not remove existing MVP workflows unless explicitly requested.

## Code review style

When reviewing a pull request, prioritize:

1. Functional correctness
2. Regression risk
3. Frontend/backend mismatch
4. Data persistence issues
5. Role and permission bugs
6. Missing tests or missing manual verification
7. Error handling and empty states
8. Code maintainability

Do not only comment on formatting or naming. If the code compiles but the product behavior is likely wrong, call that out clearly.

## Required review questions

For every PR, answer these questions:

- What user-facing behavior changed?
- Does the implementation actually satisfy the PR description?
- Which role workflows are affected?
- Which backend routes changed?
- Which frontend pages changed?
- Could this change overwrite or mix project data?
- Could this change break boss / HR / employee login?
- Are there tests or manual verification steps?
- What should be manually checked before merging?

## Suggested local validation commands

If the repository root is the `hr-ai-consulting` app folder:

```bash
pnpm install
pnpm build
pnpm dev:backend
pnpm dev -- --host 0.0.0.0
```

Then manually verify:

- Backend docs open
- Health endpoint works
- Frontend login page opens
- Boss demo login works
- HR demo login works
- Employee demo login works
- Creating project A and project B does not overwrite either project
- Organization Diagnosis dimensions can be added, edited, and deleted
- Refreshing the page does not lose project data

## Safety rules for Codex

- Do not push directly to `main`.
- Prefer pull requests for functional changes.
- Do not remove features to make tests pass.
- Do not replace persistent project data with global mock data.
- Do not silently change demo credentials.
- Do not introduce a new database schema without updating initialization and compatibility logic.
- If a bug fix requires assumptions, state them in the PR summary.
- If a change cannot be fully verified, leave a clear manual testing checklist.

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
