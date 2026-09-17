# 🍱 Tif Tof — Tiffin Subscription Management System (`TiffinSubs`)

A production-ready, full-stack web application built for the **Builder Round Master Specification**. Designed for generic tiffin and home-style lunch subscription businesses to manage customer subscriptions, handle daily service pauses, record meal preferences, simulate business dates, handle mid-cycle transfers with pro-rated split billing, and ingest messy customer CSV data.

---

## 📌 Problem Statement

Home-style tiffin delivery services operate on recurring monthly plans with lunch delivered on **weekdays (Monday to Friday)**. Customers regularly pause their orders due to travel, festivals, holidays, or personal commitments. In conventional operations using paper ledgers or basic spreadsheets:
- Business owners struggle to calculate manual deductions across multiple disjoint pause intervals.
- Disputes arise when customers are charged for days they did not receive meals.
- There is no unified view of who is active today, who is paused, what meal type each customer ordered, or how billing splits when subscriptions transfer mid-cycle.

### The Core Solution
**Tif Tof** automates this lifecycle entirely. It implements an isolated, pure mathematical billing engine where:
$$\text{Total Service Days} = \text{Total Weekdays (Mon-Fri) in Target Month}$$
$$\text{Served Days} = \text{Total Service Days} - \text{Paused Weekdays in Month}$$
$$\text{Final Payable Bill} = \text{round}\left(\text{Monthly Plan Price} \times \frac{\text{Served Days}}{\text{Total Service Days}}, 2\right)$$

---

## ✨ Main Features & Builder Round Twists

1. **Authentication & Security**: Owner registration and login with bcrypt password hashing and JWT token authentication.
2. **Customer & Meal Type Management**: Full CRUD on customers with phone indexing and meal customization (*Standard Veg Thali*, *Special Non-Veg Thali*, *Jain Special*, *Diet Box*, etc.).
3. **Core Monday → Friday Weekday Service**: Strict weekday delivery model where Saturday and Sunday are non-service days (not delivered, not billed).
4. **Flexible Pause & Resumption**:
   - Multi-day pause intervals with automatic calendar month clipping.
   - Database-level overlap prevention (`409 Conflict`).
   - Single-click **"🚫 Not Taken Today"** button for quick 1-weekday deduction.
5. **Level 1 (T1) — Daily Delivery Notifications & Clock Simulation**:
   - `POST /clock`: Simulates business days deterministically without depending on the system clock.
   - Idempotent delivery eligibility processing (active subscription, weekday, not paused, current assigned customer).
   - Internal Notification Service writes `DELIVERY_DUE` events to `outbox_events`.
   - `GET /outbox`: Dedicated inspection endpoint for graders to view all generated notification payloads.
6. **Level 2 (T6) — Mid-Cycle Subscription Transfer & Split Billing**:
   - `POST /api/subscriptions/:id/transfer`: Handover subscription to a new customer mid-cycle.
   - Subscription plan, billing cycle, and remaining days carry over.
   - Full lifecycle history preserved in `subscription_assignments` table.
   - Convention: The transfer date is the **first service date** of the new customer ($t < \text{transferDate}$ is Old Customer, $t \ge \text{transferDate}$ is New Customer).
   - Mathematical split billing accurately partitions served weekdays between both customers on invoices.
7. **Level 3 (T4) — Messy Customer CSV Import & Deduplication**:
   - `POST /api/customers/import`: Multipart CSV file upload or raw text ingestion.
   - Phone cleaning: strips spaces, dashes, parentheses, `+91`, and leading `0` to 10 digits.
   - Mixed date normalization: normalizes `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY` to `YYYY-MM-DD`.
   - Automatic deduplication: retains the first valid record for any phone number; subsequent duplicates are classified as `deduped`.
   - Detailed JSON report returned: `{ imported: X, deduped: Y, rejected: Z, errors: [ { row, reason } ] }`.
8. **Modern Responsive UI & Modals**:
   - Operations Dashboard with real-time counters and pro-rated run-rate cards.
   - Transfer Modal with candidate selection and day split preview.
   - CSV Import Modal with drag-and-drop dropzone and sample template download.
   - Outbox Inspector Modal with date filtering and JSON payload viewer.
   - Printable Pro-Rated Bill Modal with two-party split invoice breakdown.
   - One-click Dark Mode toggle with `localStorage` persistence.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite 8, Vanilla CSS Design System with CSS variables and responsive cards.
- **Backend**: Node.js, Express.js (`^4.21.0`), Multer (`^1.4.5-lts.2`).
- **Database**: SQLite 3 via `better-sqlite3` (`^11.0.0`) in WAL mode with foreign key enforcement.
- **Authentication**: `jsonwebtoken` (`^9.0.2`), `bcryptjs` (`^2.4.3`).

---

## 🏗️ Project Architecture

```text
TiffinSubs/
├── README.md                      # Complete system documentation
├── REASONING.md                   # Architectural trade-offs & reasoning
├── AI_LOGS.md                     # Comprehensive pairing & execution logs
├── backend/
│   ├── data/
│   │   └── tiffin.sqlite          # SQLite persistent database file
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # Database schema & migrations
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT bearer authentication
│   │   ├── services/
│   │   │   ├── calendar.service.js     # Shared date/weekday math
│   │   │   ├── billing.service.js      # Prorated weekday & split billing
│   │   │   ├── notification.service.js # T1 Outbox generator & clock
│   │   │   ├── subscription.service.js # T6 Transfer & assignment lifecycle
│   │   │   └── import.service.js       # T4 CSV parsing & deduplication
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── customer.controller.js
│   │   │   ├── subscription.controller.js
│   │   │   ├── clock.controller.js
│   │   │   └── import.controller.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── customer.routes.js
│   │   │   ├── subscription.routes.js
│   │   │   ├── stats.routes.js
│   │   │   ├── clock.routes.js
│   │   │   └── import.routes.js
│   │   ├── tests/
│   │   │   ├── billing.test.js         # 10 core weekday & transfer tests
│   │   │   ├── notification.test.js    # T1 Clock & outbox tests
│   │   │   ├── import.test.js          # T4 Messy CSV import tests
│   │   │   └── e2e.test.js             # End-to-end user & API flow
│   │   └── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── components/
    │   │   ├── Navbar.jsx              # Clock bar, Outbox badge, Dark mode
    │   │   ├── Dashboard.jsx           # Metrics, Customer table, Search, Actions
    │   │   ├── CustomerModal.jsx       # Add customer & subscription
    │   │   ├── PauseModal.jsx          # Date picker for pause intervals
    │   │   ├── TransferModal.jsx       # Mid-cycle transfer handover form
    │   │   ├── ImportModal.jsx         # CSV dropzone & {imported, deduped, rejected}
    │   │   ├── OutboxModal.jsx         # Grader inspection view for notifications
    │   │   └── BillModal.jsx           # Split prorated invoice breakdown
    │   ├── index.css                   # Custom responsive CSS design system
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 1. Clone & Install Dependencies

```bash
# Backend Setup
cd backend
npm install

# Frontend Setup
cd ../frontend
npm install
```

### 2. Environment Variables

Create `backend/.env`:
```ini
PORT=5000
JWT_SECRET=supersecret_tiffinsubs_jwt_key_2026
```

---

## 🏃 Running the Application

### Start the Backend Server (Port 5000)
```bash
cd backend
npm start
# Server starts on http://localhost:5000
```

### Start the Frontend Dev Server (Port 5173)
```bash
cd frontend
npm run dev
# Vite dev server running on http://localhost:5173
```

---

## 🧪 Running Automated Tests

The application includes 4 comprehensive automated test suites covering all core logic and twists:

```bash
cd backend

# Run Core Weekday & Split Billing Test Suite (10 cases)
node src/tests/billing.test.js

# Run T1 Clock & Outbox Notification Test Suite (6 cases)
node src/tests/notification.test.js

# Run T4 Messy CSV Import & Deduplication Test Suite (5 cases)
node src/tests/import.test.js

# Run Full End-to-End Verification Test (11 steps)
node src/tests/e2e.test.js
```

---

## 📡 Complete REST API Documentation

### 1. Authentication
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/auth/register` | Public | Register owner account (`{ name, email, password }`) |
| `POST` | `/api/auth/login` | Public | Login owner (`{ email, password }`) $\rightarrow$ returns JWT token |
| `GET` | `/api/auth/profile` | Bearer | Get current owner profile |

### 2. Customer Management
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `GET` | `/api/customers` | Bearer | List customers (`?phone=...&page=1&limit=10&sortBy=name&order=asc`) |
| `POST` | `/api/customers` | Bearer | Create customer & active subscription (`{ name, phone, monthlyPrice, startDate, tiffinType }`) |
| `GET` | `/api/customers/:id` | Bearer | Retrieve customer details, pause history, and assignment history |
| `PUT` | `/api/customers/:id` | Bearer | Update customer profile |
| `DELETE` | `/api/customers/:id` | Bearer | Remove customer and cascade subscriptions |

### 3. Subscription & Pause Management
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/customers/:id/subscribe` | Bearer | Create or renew subscription (`{ monthlyPrice, startDate, tiffinType }`) |
| `POST` | `/api/customers/:id/pause` | Bearer | Pause service for interval (`{ startDate, endDate }`). Rejects overlaps with `409 Conflict`. |
| `POST` | `/api/customers/:id/resume` | Bearer | Resume paused subscription |
| `GET` | `/api/customers/:id/bill` | Bearer | Calculate prorated bill for month (`?month=YYYY-MM`). Automatically calculates split bills for transferred plans. |

### 4. Level 2 (T6) — Subscription Transfer
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/subscriptions/:id/transfer` | Bearer | Transfer subscription mid-cycle (`{ newCustomerId, transferDate }`). Dates before `transferDate` billed to old customer; `transferDate` onward billed to new customer. |

### 5. Level 3 (T4) — Messy Customer Import
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/api/customers/import` | Bearer | Multipart CSV upload or raw CSV text. Returns `{ imported, deduped, rejected, errors }`. |

### 6. Level 1 (T1) — Clock & Outbox (Deterministic Simulation)
| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| `POST` | `/clock` | Public | Advance simulated date or set date (`{ date?: 'YYYY-MM-DD' }`). Triggers notification processing. |
| `GET` | `/clock` | Public | Inspect current simulated date and weekday status. |
| `GET` | `/outbox` | Public | Inspect generated notification events (`?date=YYYY-MM-DD&type=DELIVERY_DUE&limit=100`). |

---

## 💡 Example API Requests

### 1. Advance Clock & Trigger Delivery Notifications
```bash
curl -X POST http://localhost:5000/clock \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-09-17"}'
```
**Response:**
```json
{
  "success": true,
  "currentDate": "2026-09-17",
  "isWeekday": true,
  "eligibleCustomers": 12,
  "generatedEvents": 12,
  "message": "Processed delivery notifications for 2026-09-17."
}
```

### 2. Inspect Outbox Notifications
```bash
curl -X GET http://localhost:5000/outbox?date=2026-09-17
```
**Response:**
```json
{
  "count": 1,
  "events": [
    {
      "id": 1,
      "eventType": "DELIVERY_DUE",
      "customerId": 91,
      "phone": "9876543210",
      "payload": {
        "type": "DELIVERY_DUE",
        "customerId": 91,
        "customerName": "Rohan Sharma",
        "phone": "9876543210",
        "tiffinType": "Standard Veg Thali",
        "message": "Your tiffin delivery is scheduled for today (2026-09-17)."
      }
    }
  ]
}
```

### 3. Mid-Cycle Transfer
```bash
curl -X POST http://localhost:5000/api/subscriptions/88/transfer \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"newCustomerId": 92, "transferDate": "2026-09-16"}'
```

### 4. Messy CSV Import
```bash
curl -X POST http://localhost:5000/api/customers/import \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: text/csv" \
  --data-binary $'name,phone,monthly_price,start_date\nKaran,9811111111,2800,2026-09-01\nKaran,9811111111,2800,01/09/2026\n,9822222222,3000,2026-09-01'
```
**Response:**
```json
{
  "imported": 1,
  "deduped": 1,
  "rejected": 1,
  "errors": [
    { "row": 4, "reason": "Missing or empty customer name" }
  ]
}
```
