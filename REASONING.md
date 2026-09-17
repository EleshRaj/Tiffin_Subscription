# Development Reasoning & Architectural Decisions (`REASONING.md`)

This document outlines the technical reasoning, architectural decisions, trade-offs, and implementation details for the **Tiffin Subscription Management System** (`Tif Tof`) built according to the **Builder Round Master Specification**.

---

## 1. Problem Understanding

A home-style tiffin/lunch service operates on recurring monthly meal deliveries on **weekdays (Monday to Friday)**. Customers frequently pause service due to travel, office holidays, festivals, or personal emergencies. In traditional manual operations using paper notebooks:
- Billing calculations are error-prone because owners struggle to calculate manual deductions across multiple disjoint pause intervals.
- Disputes arise when customers are charged for days they did not receive meals.
- When a customer moves or hands over their subscription to a flatmate/colleague mid-cycle, tracking split billing becomes chaotic.
- Manually verifying who needs delivery every morning is slow and leads to missed or wasted meals.

**Core Objective**: Build a reliable, testable, and deterministic full-stack system that handles customer subscriptions, service pauses, weekday pro-rated billing, mid-cycle transfers with split billing, deterministic delivery notifications via simulated clock, and messy CSV ingestion.

---

## 2. Builder Round Architectural Decisions

### A. Core Weekday Service Rule (Monday → Friday)
- **Decision**: Service days are strictly Monday through Friday. Weekends (Saturday and Sunday) are non-service days (0 meals delivered, 0 charge).
- **Reasoning**: Standard home lunch services operate during the working week. To eliminate calculation discrepancies:
  - Total service days in a month is calculated as the exact count of weekdays in that calendar month (e.g. 22 weekdays in September 2026).
  - Pauses occurring over weekends (e.g. Friday to Monday) only deduct the actual weekdays (Friday and Monday), never charging or deducting for Saturday or Sunday.
  - An isolated, shared helper `calendar.service.js` serves as the single source of truth for `isWeekday` and month enumeration across billing, delivery eligibility, and dashboard counters.

---

### B. Level 1 (T1) — Daily Delivery Notifications & Clock Simulation
- **Decision**: Implemented an internal mock Notification Service backed by an `outbox_events` table and triggered via `POST /clock`.
- **Reasoning**:
  - The grader cannot depend on the physical system clock or external third-party SMS/WhatsApp APIs (Twilio, SendGrid) which introduce network flakiness and authentication blockers.
  - `POST /clock` allows the grader to simulate any target business date deterministically.
  - The Notification Service evaluates eligibility:
    1. Active subscription
    2. Target date is a weekday (Mon–Fri)
    3. Target date is not inside any recorded pause period
    4. Belongs to the customer holding the active assignment on that date
  - **Idempotency**: An internal unique constraint `UNIQUE(subscription_id, customer_id, event_date, event_type)` ensures that calling `POST /clock` multiple times on the same date never generates duplicate notifications.
  - `GET /outbox` exposes the notification queue for inspection by both automated graders and the UI inspector.

---

### C. Level 2 (T6) — Subscription Transfer & Split Billing
- **Decision**: Introduced a `subscription_assignments` table (`id`, `subscription_id`, `customer_id`, `start_date`, `end_date`) rather than simply overwriting `subscription.customer_id`.
- **Reasoning**:
  - Simply changing `customer_id` on the subscription erases historical ownership, making it impossible to audit past deliveries or generate accurate split invoices.
  - **Transfer Convention**: The transfer date is the **first service date** of the new customer.
    - Dates strictly before `transferDate` belong to Customer A (old customer).
    - Dates from `transferDate` onward belong to Customer B (new customer).
  - **Split Invoicing Algorithm**:
    - Generates all weekdays in the billing cycle.
    - Filters out paused weekdays (nobody is charged for paused days).
    - Checks `subscription_assignments` to map each served weekday to the customer who owned the subscription on that specific calendar day.
    - Computes pro-rated bills proportionally: $\text{Price} \times \text{CustomerServedWeekdays} / \text{TotalCycleWeekdays}$.

---

### D. Level 3 (T4) — Messy Customer CSV Import & Deduplication
- **Decision**: Built a dedicated `import.service.js` with phone normalization, multi-format date parsing, and in-memory + database deduplication.
- **Reasoning**:
  - Real-world CSV exports from spreadsheets or phone contacts contain messy inputs: mixed date formats (`DD/MM/YYYY`, `YYYY-MM-DD`, `DD-MM-YYYY`), phone numbers with spaces, dashes, or `+91`, and blank rows.
  - **Deduplication Strategy**:
    - A deterministic rule was selected: **Keep the first valid record for any normalized phone number; classify subsequent valid duplicates as `deduped`.**
    - Pre-existing phone numbers already stored in the database for that owner are also classified as `deduped`.
  - **Rejection Strategy**: Records missing mandatory fields (`name`, `phone`, positive `monthly_price`, valid `start_date`) are marked as `rejected` with the exact row number and failure reason recorded in an `errors` array.
  - The batch inserts all clean unique records in a single database transaction, ensuring atomicity.

---

### E. Persistence Layer: SQLite via `better-sqlite3`
- **Decision**: Used `better-sqlite3` in WAL mode with foreign key constraints enabled.
- **Reasoning**:
  - Zero external database installation, network overhead, or port collision risks on evaluation machines.
  - Synchronous execution model matches Express controller execution without Promise race conditions.
  - ACID compliant transactions guarantee transactional safety for multi-table operations (transfers, batch imports, customer cascading deletes).

---

## 3. Verification & Test Suite Strategy

Four dedicated test suites were implemented to validate every core requirement and edge case:

1. **`billing.test.js` (10 Mandatory Test Cases)**:
   - Evaluated 0 pauses, single mid-week pause, multiple disjoint pauses, weekend pauses (ensuring Sat/Sun are not deducted), cross-month pauses, 100% paused months, mid-cycle transfers without pauses, transfers with pauses in Window A, transfers with pauses in Window B, and 2-decimal rounding.
2. **`notification.test.js` (T1 Clock & Outbox)**:
   - Validated that active subscribers on weekdays receive notifications.
   - Validated that paused subscribers receive zero notifications.
   - Validated that weekend clock runs generate zero notifications.
   - Validated that transferred subscriptions route notifications to the new customer from the transfer date.
   - Validated strict idempotency of repeated `/clock` runs.
3. **`import.test.js` (T4 CSV Ingestion)**:
   - Validated phone cleaning (`+91 98765 43210` $\rightarrow$ `9876543210`).
   - Validated date parsing across `YYYY-MM-DD`, `DD/MM/YYYY`, and `DD-MM-YYYY`.
   - Validated duplicate retention and rejection reporting.
4. **`e2e.test.js` (End-to-End User Flow)**:
   - Ran an automated 11-step integration test from user registration through customer pause, pro-rated billing, clock simulation, outbox verification, mid-cycle transfer, split billing, and CSV import.
