# Development Reasoning & Architectural Decisions (`REASONING.md`)

This document outlines the technical reasoning, architectural decisions, trade-offs, and implementation details for the **Tiffin Subscription Management System** (`Tif Tof`).

---

## 1. Problem Understanding

A home-style tiffin/lunch service operates on recurring monthly meal deliveries. Customers frequently pause service due to travel, office leaves, fasting, or unexpected commitments. In traditional manual ledger systems:
- Billing calculations are error-prone because owners struggle to calculate accurate deductions for multiple pause intervals.
- Dispute occurs when customers are billed for days on which tiffin was not delivered.
- Managing pause dates, resumptions, meal preferences (Veg/Non-Veg/Jain), and contact records on paper creates operational chaos.

**Core Objective**: Automate customer subscription lifecycle management and compute exact pro-rated bills where customers pay only for days meals were delivered.

---

## 2. Requirements Identified

### Functional Requirements
- **Authentication**: Secure registration and login for tiffin business owners using password hashing and token-based sessions.
- **Customer Management**: Full CRUD operations for customer records (name, phone number).
- **Tiffin Service Specification**: Ability to assign and describe meal types (Standard Veg, Non-Veg, Jain, Mini Thali, Diet/High Protein, Custom).
- **Subscription Lifecycle**: Manage monthly plan pricing, start dates, and active vs. paused states.
- **Pause & Resume**: Support multi-day pause intervals and single-click pauses ("Not Taken Today"), with overlap prevention.
- **Accurate Pro-Rated Billing**: Calculate monthly charges dynamically based only on actual days served.
- **Search & Discovery**: Fast lookup of customers using their phone number.
- **Pagination & Sorting**: Efficiently browse large customer lists with server-side pagination and whitelisted sorting.

### Non-Functional Requirements
- Relational integrity and local persistence with zero cloud database dependency.
- Responsive, clean user interface tailored for fast daily operations on mobile and desktop.
- Modular, testable backend business logic.

---

## 3. Feature Decisions

- **7-Day Service Support**: Extended delivery scheduling to support 7 days a week (Monday to Sunday) so catering services operating every day can accurately pro-rate without manual adjustments.
- **Single-Click "Not Taken Today"**: Added a direct action button on the dashboard for instant single-day pause when a customer calls in the morning to skip delivery.
- **Printable Statements**: Integrated print-friendly invoice views in the bill modal allowing owners to generate PDF statements or physical slips directly from the browser.
- **[TO BE FILLED BY DEVELOPER]** *(Additional personal motivations or business context for feature prioritization)*

---

## 4. Database Design Decisions

- **Engine**: SQLite (`better-sqlite3`) in Write-Ahead Logging (`WAL`) mode with `PRAGMA foreign_keys = ON`.
- **Rationale**:
  - Zero external infrastructure requirement allows immediate execution and local testing.
  - Synchronous execution model of `better-sqlite3` minimizes asynchronous overhead.
  - Referential integrity: Deleting a customer cascades to delete their subscriptions and pause intervals automatically.
- **Entity Design**:
  - `users`: Stores owner credentials with unique email constraint.
  - `customers`: Associated with an owner ID, indexed on `phone` for fast search.
  - `subscriptions`: Separated from customers to allow future multi-subscription history and custom pricing per plan. Includes `tiffin_type` column.
  - `pause_periods`: Stores discrete start and end dates with foreign keys to subscriptions.

---

## 5. API Design Decisions

- **RESTful Endpoints**: Clear resource hierarchy (`/api/customers`, `/api/customers/:id/pause`, `/api/customers/:id/bill`).
- **Separation of Concerns**: Controllers delegate domain arithmetic to an isolated service layer (`billing.service.js`).
- **Conflict Handling**: Overlapping pause requests return HTTP `409 Conflict` instead of corrupting data.
- **Security Middleware**: Centralized JWT verification middleware attaches verified owner identity (`req.user.id`) to request contexts.

---

## 6. Frontend Design Decisions

- **Vanilla CSS Design System**: Custom tokens and component classes in `index.css` (warm food-tech palette: saffron orange, warm amber, mint green) to avoid third-party CSS bloat while maintaining responsive UX.
- **Context API for State**: `AuthContext` provides global authentication status and a unified `apiFetch` wrapper that automatically injects Bearer tokens and handles session expiration.
- **Live Preview Feedback**: Pause modal dynamically computes and renders the number of days affected before submission.

---

## 7. Authentication Approach

- **Password Security**: Passwords hashed using `bcryptjs` (salt rounds: 10).
- **Session Strategy**: Stateless JSON Web Tokens (`jsonwebtoken`) signed with a server secret key, stored in client `localStorage`.
- **Route Protection**: Bearer token authorization header checked via middleware on all `/api/customers` and `/api/stats` routes.

---

## 8. Search Approach

- **Implementation**: SQL parameterized `LIKE ?` query on `customers.phone` with wildcards (`%${phone}%`).
- **Optimization**: Dedicated database index `idx_customers_phone` on the `phone` column.
- **Security**: Parameterized queries eliminate SQL injection vulnerabilities.

---

## 9. Pagination Approach

- **Implementation**: SQL `LIMIT ? OFFSET ?` coupled with a separate `COUNT(*)` query.
- **Behavior**: Sanitized page (min: 1) and limit parameters (bounded between 1 and 50, default: 10), returning `total`, `totalPages`, `page`, and `limit` metadata.

---

## 10. Sorting Approach

- **Implementation**: Server-side sorting using whitelisted columns (`name`, `phone`, `created_at`, `monthly_price`, `status`) to strictly guard against SQL injection.
- **Cross-Table Joins**: Transparently routes customer attributes (`c.name`, `c.phone`, `c.created_at`) vs. subscription attributes (`s.monthly_price`, `s.status`) in the generated `ORDER BY` clause.

---

## 11. Testing Performed

- **Unit Testing (`backend/src/tests/billing.test.js`)**:
  - Validated 25 edge cases covering zero pauses, single pause, multiple pauses, month-boundary clipping, full-month pause, and financial rounding.
- **Integration Flow Testing (`backend/src/tests/e2e.test.js`)**:
  - Automated 10-step full lifecycle test (register $\to$ login $\to$ stats $\to$ customer create $\to$ phone search $\to$ pause $\to$ overlap conflict $\to$ billing $\to$ resume $\to$ updated stats).
- **Scale Seeding Test (`backend/src/tests/seed_and_test_20.js`)**:
  - Automated seeding of 22 customers, multi-page pagination checks, and diverse tiffin types.
- **[TO BE FILLED BY DEVELOPER]** *(Additional manual browser tests or test scenarios executed)*

---

## 12. Bugs/Issues Encountered

1. **HTML5 Number Input Step Validation**:
   - *Symptom*: Entering rounded values like `2000` or `2200` into the monthly price field produced a browser validation error: *"Please enter a valid value. The two nearest valid values are 2191 and 2201."*
   - *Root Cause*: Input had `min="1"` and `step="10"`. Under HTML5 rules, `(value - min) % step` must equal 0. `(2200 - 1) % 10 = 9 != 0`.
2. **Missing Tiffin Type Specification**:
   - *Symptom*: System recorded pricing but did not record whether a customer was receiving Veg, Non-Veg, Jain, or a custom meal.
3. **[TO BE FILLED BY DEVELOPER]** *(Any other unexpected behavior encountered during local development)*

---

## 13. How Issues Were Fixed

1. **Fixed Step Validation**: Changed `step="10"` to `step="any"` in `CustomerModal.jsx`, allowing arbitrary whole numbers and decimals.
2. **Added Tiffin Type Support**:
   - Added `tiffin_type` column to `subscriptions` table with automated schema migration.
   - Updated controller `create`, `list`, `getById`, and `update` methods.
   - Added interactive meal plan selection and custom description inputs in the frontend.
3. **[TO BE FILLED BY DEVELOPER]** *(Details on any personal fixes applied)*

---

## 14. Trade-offs

- **SQLite vs. PostgreSQL/MySQL**: SQLite was chosen for zero-dependency portability and speed. Trade-off: Not natively suited for horizontally scaled multi-server deployments without replication layers (e.g. Litestream).
- **Client-Side Build vs. SSR**: Vite React SPA was chosen for UI responsiveness and client-side transitions. Trade-off: Requires client JavaScript execution and API proxy configuration.
- **[TO BE FILLED BY DEVELOPER]** *(Other trade-offs considered during architecture planning)*

---

## 15. Future Improvements

- **Payment Gateway Integration**: Direct UPI / QR-code collection and Razorpay/Stripe checkout.
- **Automated WhatsApp Alerts**: Daily delivery confirmations and billing statements pushed via WhatsApp Business API.
- **Delivery Staff Route Optimization**: Driver mobile view with turn-by-turn route ordering based on customer addresses.
- **[TO BE FILLED BY DEVELOPER]** *(Personal vision for subsequent iterations)*
