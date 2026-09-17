# 🤖 AI Development Logs & Implementation Audit (`AI_LOGS.md`)

This log documents the end-to-end development journey, requirements analysis, key decisions, and test results for the **Tiffin Subscription Management System**.

---

## 1. Initial Prompt & Requirement Analysis

- **Goal**: Full-stack application for tiffin delivery subscription management within a 1.5-hour submission window.
- **SRS Scope**:
  - Authentication (Register/Login with JWT & bcrypt).
  - Customer CRUD with phone number search and paginated/sorted tables.
  - Subscriptions with monthly rates.
  - Pause service for date ranges and resume service.
  - Accurate monthly pro-rated billing based strictly on weekdays served.
  - Complete documentation (`README.md`, `REASONING.md`, `AI_LOGS.md`).

---

## 2. Iterative Implementation Log

### Phase 1: Architecture & Backend Core
- Initialized Node.js backend with Express and `better-sqlite3`.
- Designed relational schema with 4 tables: `users`, `customers`, `subscriptions`, `pause_periods`.
- Enabled WAL mode and strict foreign keys.
- Developed `billing.service.js` implementing exact SRS business formulas:
  - Weekdays only (Monday to Friday).
  - Dynamic monthly weekday count.
  - Cross-month clipping.
  - Set-based deduplication for multi-pause periods.
  - Rounding to 2 decimal places.

### Phase 2: Testing Suite
- Implemented `backend/src/tests/billing.test.js` with 18 distinct test scenarios covering:
  - Zero pause periods.
  - Single pause within month.
  - Multiple non-overlapping pause intervals.
  - Cross-month pause clipping.
  - Weekends inclusion check (ensuring Saturday/Sunday do not deduct from bill).
  - Full-month pause (bill = ₹0.00).
  - Rounding correctness.
- **Result**: All 18 tests passed.

### Phase 3: Frontend Construction
- Scaffolded React 18 client via Vite.
- Authored a custom Vanilla CSS design system (`index.css`) with warm food-tech palette (`#e85d26`, `#ffc107`), Inter font, card elevation, and responsive breakpoints.
- Created reusable components:
  - `Navbar`: Session awareness, brand identity, quick logout.
  - `LandingPage`: Hero with animated emoji, 6 SRS core features, target audience, future roadmap.
  - `AuthModal`: Login / Register toggle with validation.
  - `Dashboard`: 4 summary metric cards, search by phone, sorting, pagination, action menu.
  - `CustomerModal`: Add & Edit customer profiles.
  - `PauseModal`: Live weekday preview calculation before pausing.
  - `BillModal`: Month selector, pro-rated breakdown, printable invoice view.
  - `CustomerDetailModal`: Full customer profile with historical pause logs.

### Phase 4: Full End-to-End API Flow Test
- Created automated test `backend/src/tests/e2e.test.js`.
- Automated 10-step verification flow:
  1. Register new owner.
  2. Authenticate and retrieve JWT token.
  3. Validate initial empty dashboard metrics.
  4. Create new customer with ₹3000/mo plan.
  5. Search customer by phone number.
  6. Pause customer from `2026-09-07` to `2026-09-11` (5 weekdays).
  7. Attempt overlapping pause and verify `409 Conflict`.
  8. Calculate September 2026 bill (22 total weekdays, 5 paused, 17 served = ₹2318.18).
  9. Resume customer service to ACTIVE.
  10. Re-verify dashboard metrics.
- **Result**: All 10 steps passed with zero assertion failures.

---

## 3. Summary of Verification Status

| Component | Status | Verification Method |
|---|---|---|
| Database Schema | ✅ Passed | Tables created, constraints and foreign keys verified |
| Auth System | ✅ Passed | Password hashed via bcrypt, JWT tokens validated |
| Billing Engine | ✅ Passed | 18 unit tests passed |
| Customer CRUD & Search | ✅ Passed | Phone search and pagination validated in E2E |
| Pause & Overlap Prevention | ✅ Passed | 409 Conflict verified in E2E |
| Pro-Rated Bill Generation | ✅ Passed | ₹2318.18 matched exact formula |
| Frontend Build | ✅ Passed | `vite build` completed in 882ms with 0 errors |
| Frontend Dev Server | ✅ Running | Hosted on `http://localhost:5173` |
| Backend API Server | ✅ Running | Hosted on `http://localhost:5000` |
