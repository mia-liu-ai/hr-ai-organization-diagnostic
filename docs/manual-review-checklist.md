# Manual Review Checklist

Use this checklist after Codex modifies the code and before merging a pull request.

## 1. Start backend

```bash
pnpm dev:backend
```

Check:

- Backend starts without import errors
- `/docs` opens
- Health endpoint works

## 2. Start frontend

```bash
pnpm dev -- --host 0.0.0.0
```

Check:

- Frontend opens
- Login page loads
- No console error blocks the page

## 3. Login smoke test

Check all demo accounts:

- Boss demo login
- HR demo login
- Employee demo login

For each role:

- Login succeeds
- Correct dashboard appears
- Role-specific navigation is correct

## 4. Project isolation test

1. Login as boss or HR.
2. Create project `111`.
3. Add one Organization Diagnosis dimension named `Dimension A`.
4. Create project `222`.
5. Add one Organization Diagnosis dimension named `Dimension B`.
6. Switch back to project `111`.
7. Confirm `Dimension A` exists.
8. Confirm `Dimension B` does not appear inside project `111`.
9. Refresh the browser.
10. Confirm project data still exists.

Expected result:

- Project `111` and project `222` keep separate data.
- Creating a new project does not overwrite the previous project.

## 5. Organization Diagnosis dimension test

For one project:

- Add a new dimension
- Edit the dimension name or description
- Delete the dimension
- Refresh the page
- Confirm the final state is persisted

Expected result:

- Add, edit, delete, and list all work.
- Deleted dimension does not reappear after refresh.
- Other projects are not affected.

## 6. Regression test

Open these modules and confirm they still work at a basic level:

- 360 Review
- Talent Model
- Survey Center
- Organization Feedback
- Dashboard
- Reports

## 7. PR merge decision

Do not merge if:

- Only one role can log in
- Backend cannot open `/docs`
- Frontend build fails
- New project overwrites old project
- Organization Diagnosis dimension buttons exist but do not actually work
- Frontend calls missing backend APIs
- Data disappears after refresh
