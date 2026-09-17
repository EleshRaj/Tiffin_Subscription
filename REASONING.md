# 🧠 Engineering Reasoning & Architectural Decisions (`REASONING.md`)

This document details the architectural decisions, trade-offs, and design rationale implemented in the **Tiffin Subscription Management System**.

---

## 1. Architectural Patterns & Decoupling

### Decoupled Pure Billing Engine
- **Decision**: All date arithmetic and pro-ration calculations are encapsulated in `backend/src/services/billing.service.js` as pure, side-effect-free functions.
- **Rationale**:
  - **Testability**: Pure functions can be tested against any permutation of calendars, leap years, or pause boundaries without needing database mocking.
  - **Reusability**: The same billing module is reused when generating monthly invoices, generating mid-month quotes, or rendering live impact estimates in the frontend UI.
  - **Maintainability**: If business rules evolve (e.g., adding Saturday delivery or national holiday deductions), the modifications are isolated to a single file.

---

## 2. Handling Edge Cases in Date Arithmetic

### A. Calendar Month Weekday Counts Differ
Different months have varying weekday totals (e.g., February 2026 has 20 weekdays; September 2026 has 22 weekdays; October 2026 has 22 weekdays).
- **Solution**: The daily rate is dynamically computed per month:
  $$\text{Daily Rate} = \frac{\text{Monthly Plan}}{\text{Total Weekdays in Given Month}}$$
  This ensures that whether a customer pauses in a 20-weekday or a 23-weekday month, the deduction is mathematically proportional to that specific month's operating days.

### B. Pauses Spanning Beyond Month Boundaries
A customer might request a pause from `2026-09-28` to `2026-10-05`.
- **Solution**: When generating a bill for September (`2026-09`), the engine clips the pause interval to `[2026-09-28, 2026-09-30]`, calculating only the weekdays falling within September. When generating October's bill, it clips to `[2026-10-01, 2026-10-05]`.

### C. Weekend Inclusion & Non-Delivering Days
Customers often provide calendar ranges like "from Saturday to next Monday".
- **Solution**: The weekday filtering loops through each date in the range, checking `date.getDay() !== 0 && date.getDay() !== 6`. Saturdays and Sundays are never deducted because meal deliveries do not occur on weekends.

### D. Overlapping Pauses Prevention
- **Solution**: Before inserting a new pause period, the database checks:
  ```sql
  SELECT id FROM pause_periods
  WHERE subscription_id = ?
    AND start_date <= ?
    AND end_date >= ?
  ```
  If a record exists, a `409 Conflict` is returned with a clear error message. Furthermore, in the billing engine, a `Set` of unique ISO date strings (`YYYY-MM-DD`) is used to guarantee that a day is never double-deducted.

---

## 3. Database Choice & Persistence Strategy

- **Choice**: SQLite (`better-sqlite3`) in Write-Ahead Logging (`WAL`) mode.
- **Rationale**:
  - **Zero-Config Deployment**: Requires no external database daemon (PostgreSQL/MySQL), allowing immediate local execution and evaluation by mentors.
  - **Foreign Key Enforcement**: `PRAGMA foreign_keys = ON` ensures strict referential integrity (e.g., cascading deletions when customers are removed).
  - **Synchronous Speed**: `better-sqlite3` is synchronous and significantly faster than async drivers for standard web traffic.

---

## 4. Frontend Design Decisions

- **Vanilla CSS Design System**: Built with modern CSS variables, glassmorphism, responsive flex/grid layouts, and customized micro-interactions instead of bulky UI libraries.
- **Instant Visual Feedback**:
  - When selecting pause dates, the modal instantly calculates and displays the exact delivery weekdays affected before submission.
  - Printable invoice layout formatted cleanly with print media queries.
- **Security**: JWT tokens stored with bearer injection across all protected routes; 401 interceptor automatically logs out expired sessions.
