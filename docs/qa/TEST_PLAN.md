# QA Practice Shop — Test Plan

- **Version:** 1.0
- **Updated:** 2026-11-17
- **Status:** Active development

## Purpose

Define a repeatable way to check the shop before changes are treated as ready. This plan covers the current catalog, authentication, account, cart, checkout and admin API. It is a living document: revise it when product behavior or scope changes.

## Scope

### In scope

- Registration, sign-in, sign-out, session expiry and profile updates.
- Password changes and revocation of other active sessions.
- Catalog search, category filtering, price/stock filtering and sorting.
- Guest and authenticated carts, quantity updates, cart merging and stock limits.
- Checkout, order history, cancellation and ownership checks.
- Customer versus administrator authorization.
- Desktop/mobile layout, keyboard interaction, loading, empty and error states.

### Out of scope for the current build

- Payment processing and saved bank cards. No card number or security code should be entered or stored.
- Email verification and password-reset emails; email delivery is not configured.
- Two-step verification.
- A frontend administration dashboard. Admin permissions are currently exercised through the API.

## Test approach

1. **Backend integration tests:** run pytest against the dedicated `qa_practice_shop_test` database. The fixtures truncate data in that database; never point it at the development or production database.
2. **Frontend static/build check:** run the TypeScript/Vite production build. This catches type and bundling errors but does not replace browser tests.
3. **Manual browser checks:** follow the cases in [TEST_CASES.md](TEST_CASES.md) on the local app. Record result, build/commit, browser and any defect.
4. **Regression:** rerun the backend suite and frontend build after changes to shared auth, catalog, cart or order behavior; repeat affected manual cases.

There is no frontend unit or browser automation suite yet. Adding browser automation is a future step after the manual flows stabilize.

## Environments and data

- Local app: FastAPI at `http://127.0.0.1:8000`, frontend at `http://localhost:5173`.
- Development data: configured by the root `.env` file. Do not commit it or paste its values into reports.
- Test data: PostgreSQL database `qa_practice_shop_test`, using the same connection settings as `.env` except for the database name. Keep this database separate; test fixtures delete its product and user rows before test runs.
- Manual test accounts: use local-only customer and administrator accounts. Keep passwords out of this repository, screenshots, bug reports and commits.
- Products: use products with known prices and stock counts. Include an in-stock item, a low-stock item and an out-of-stock item where available.

### Prepare the test database once

Create `qa_practice_shop_test` in PostgreSQL, then apply the repository migrations to it. In PowerShell:

```powershell
psql -d postgres -c "CREATE DATABASE qa_practice_shop_test;"
$env:DB_NAME = "qa_practice_shop_test"
.\.venv\Scripts\python.exe run_migrations.py
Remove-Item Env:DB_NAME
```

If the database already exists, skip the create command. Confirm the selected database name before running migrations.

## Entry criteria

- The change is available locally and its migrations are applied to the intended database.
- Backend and frontend can start; required local services are reachable.
- Test accounts and products are available for the scenarios being run.

## Exit criteria

- Backend tests pass against `qa_practice_shop_test`.
- Frontend production build succeeds.
- Critical manual flows (registration/sign-in, cart update, checkout authorization, profile/password, role access) pass or have documented defects.
- No unresolved blocker prevents the intended user flow. Known limitations and accepted defects are recorded.

## Defect reporting

For each defect record: title, environment/build, preconditions, numbered steps, expected result, actual result, severity, reproducibility, and redacted screenshot/log evidence. Never attach passwords, session cookies, access tokens, `.env` contents or real payment details.

Suggested severity: **Blocker** (core flow/data/security unusable), **Major** (important flow fails), **Minor** (workaround exists or limited UI defect), **Trivial** (cosmetic).
