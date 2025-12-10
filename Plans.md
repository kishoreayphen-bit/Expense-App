# Expenses App: Current State and Next Steps (Plan)

Last updated: 2025-09-25

## Overview
This document summarizes what has been implemented so far, key technical decisions, and a prioritized roadmap for the next enhancements. It focuses on the Budgeting (Epic 9) experience on mobile, supporting backend endpoints, and supporting UX components like the FX screen.


## Completed Work

- **Budgets UI Modernization (mobile/src/screens/BudgetsScreen.tsx)**
  - Period navigation with chevrons and quick period chips (This month, Last month).
  - Summary cards with icons: Predicted Total, Anomalies count, Over/Under budget.
  - Variance progress bars with color thresholds (green <80%, orange 80–100%, red >100%).
  - Toggle chips and controls: Base (INR), Overruns-only, sorting (variance/amount/name).
  - Collapsible sections consolidated into an **Insights** area with tabs (Variance, Predicted, Anomalies) to declutter the page.
  - Error banner with Retry; pull-to-refresh.
  - Budget CRUD modal with validation (disable Save until amount > 0), month picker controls in modal, category picker with search and inline category creation.
  - Green theme applied consistently for interactive elements (chips, buttons, FAB, icons) to match other screens.
  - Confirmation dialog before delete (native Alert) to avoid accidental removals.
  - Budgets list search and sorting (Amount desc, A→Z).
  - Floating Action Button (FAB) to add new budget entries.
  - Swipe actions on budget rows (edit on right-swipe, delete on left-swipe with confirmation).
  - Export CSV for current period’s variance via OS share sheet.
  - Health badges on budget rows: Healthy (<80%), Watch (80–100%), Overrun (>100%).
  - Top risks card (largest overruns) and Alerts preview (projected ≥80% using pacing).

- **Data robustness & Validation**
  - Normalization to avoid `reduce()` on non-arrays for anomalies/predicted/variance.
  - Period validation and normalization (YYYY-MM) to prevent backend 500 (DateTimeParseException).

- **Backend (Epic 9 progress)**
  - Category budgets CRUD with spent vs budget calculations.
  - Endpoints implemented: `POST/PUT/DELETE /api/v1/budgets`, `GET /api/v1/budgets?period=YYYY-MM`.
  - Variance, predicted, anomalies endpoints: `/api/v1/budgets/variance`, `/api/v1/budgets/predicted`, `/api/v1/budgets/anomalies`.
  - Alerts at 80%/100% thresholds and scheduler endpoint `/api/v1/budgets/check-alerts?period=YYYY-MM`.
  - Insights tips stub endpoint (`GET /api/v1/insights/tips?period=YYYY-MM`).

- **Platform foundations**
  - JWT auth with refresh via `AuthContext` (mobile), correct navigation handling for auth/unauth states.
  - Backend preference set to Java + Spring Boot, Dockerized runtime with PostgreSQL and pgAdmin (compose).


## Current UX Snapshot

- **Header**: Period chevrons, Base toggle chip, Refresh action.
- **Quick chips**: This month / Last month.
- **Summary**: Compact cards with iconography.
- **Budgets**: Search, sort, badges, edit/delete (with confirm), swipe actions, CSV export.
- **Insights**: Tabs (Variance, Predicted, Anomalies). Variance has filtering/sorting chips.
- **Category workflow**: Picker with search and inline creation.
- **Validation**: Save disabled until amount > 0; error banner with Retry.


## Technical Notes (Mobile)

- Screen: `mobile/src/screens/BudgetsScreen.tsx` (core budgeting UI, state, API calls, modals)
- Shared API client: `mobile/src/api/client` (Axios instance)
- Icons: `@expo/vector-icons/MaterialIcons`
- Gesture handling: `react-native-gesture-handler` for swipe actions
- Share: `Share` API used for CSV export


## Technical Notes (Backend)

- Spring Boot services: BudgetService, Controllers for budgets/categories.
- Persistence: PostgreSQL via JPA; budgets schema at V14__budgets.sql.
- Expense totals used to compute variance for personal and group budgets.
- Notifications for crossing thresholds via NotificationPublisher.


## Known Issues / Cleanup Opportunities

- **Theming**: Light/Dark mode not yet unified; colors are currently hard-coded. Move to theme tokens.
- **Sticky UI**: Insights tabs not sticky during long scrolls.
- **PDF Export**: CSV export exists; PDF export is pending (nice-to-have).
- **Date-range budgets**: Only monthly periods supported today.
- **FX Screen**: Modernization planned (cards, chips, history). Pending commit.


## Next Steps (Roadmap)

### Phase 1 – UX Polish (frontend)
- Sticky Insights tabs (and variance chips) while scrolling.
- Smooth animations for tab switch, chip press, and progress bars.
- Theming refactor: extract colors to a theme provider and support Dark Mode.
- Add toast/snackbar confirmations for create/update budget success.

### Phase 2 – Reporting & Sharing (frontend)
- Export PDF: nicely formatted monthly budget vs spent report.
- Share-to options (email, drive) and filename with period.

### Phase 3 – Budgeting Power Features (frontend + backend)
- Date-range budgets: Add `start_date`/`end_date` (nullable) alongside `period`.
  - DB migration to add columns.
  - Update `Budget.java`, DTOs, `BudgetService`, `BudgetController`.
  - Update mobile modal with a “Custom Range” toggle and date pickers.
- Group-aware views: Friendly group names, filter budgets by group.

### Phase 4 – Insights & Guidance (backend + frontend)
- Enhance anomalies with clearer, data-rich messages.
- “Top 3 savings opportunities” tips from `/api/v1/insights/tips` with links to take action.
- Budget recommendations based on historical patterns.

### Phase 5 – FX Tools (frontend)
- Modernize `mobile/src/screens/FXScreen.tsx` (green theme, cards, quick currency/date controls, pacing).
- Historical chart (sparkline) for quick visual trend (optional, using a lightweight chart lib).


## Acceptance / QA Checklist

- Budgets list
  - Create/Update/Delete works; Delete requires confirmation.
  - Search and sorting behave correctly.
  - CSV export shares a well-formed file with current variance.
  - Health badges reflect spent/budget correctly at thresholds (<80%, 80–100%, >100%).

- Insights tabs
  - Tabs switch content without layout jumps.
  - Variance filters affect list and progress bars correctly.

- Category management
  - Picker loads list; search filters names.
  - Inline category creation works and auto-selects new category.

- Error handling
  - Error banner shows when API calls fail; Retry refreshes data.
  - Period input is normalized (YYYY-MM) with valid months (01–12).


## Dependencies / References

- Mobile: `mobile/src/screens/BudgetsScreen.tsx`
- Backend: BudgetController, BudgetService, BudgetRepository, V14__budgets.sql
- Auth: `AuthContext` (JWT + refresh)
- Docker: docker-compose with PostgreSQL and pgAdmin; Spring Boot Dockerfile


## Ownership & Contacts

- Mobile UI/UX and integrations: Budgeting feature team
- Backend Budgeting APIs: Backend services team (Spring Boot)
- DevOps: Docker, Compose, and environment templates
