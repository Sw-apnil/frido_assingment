# ReturnDesk

ReturnDesk is an operations desk built for small online stores to manage return and replacement lifecycles. Engineered with **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **PostgreSQL**.

---

## 🔗 Live Deployment & Links

- **Live Deployed Application:** [https://fridoassingment.vercel.app/](https://fridoassingment.vercel.app/)
- **GitHub Repository:** [https://github.com/Sw-apnil/frido_assingment](https://github.com/Sw-apnil/frido_assingment)
- **Primary Branch:** `main`

---

## ⏱️ Time Spent

- **Total Time Spent:** Approximately **7.5 hours**
  - Architecture planning & schema design: ~1 hour
  - Server endpoints & strict business rules implementation: ~2.5 hours
  - Frontend UI, responsive design (down to 375px), & error states: ~2.5 hours
  - Seed dataset curation & automated verification test suite: ~1 hour
  - Production deployment & documentation: ~0.5 hours

---

## 🚀 Setup & Running Locally (Clean Machine)

Follow these exact steps to run ReturnDesk on a clean machine from scratch.

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **PostgreSQL Database**: Any clean PostgreSQL instance (Local, Docker, Supabase, Neon, or Render).

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Sw-apnil/frido_assingment.git
cd frido_assingment
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Open `.env` and configure your database connection strings:
```env
# Pooled runtime connection (used by Prisma Client, e.g. Supabase port 6543)
# Note: connect_timeout=15 ensures high-latency remote database pools do not prematurely time out
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"

# Direct / session connection (used by Prisma Migrate, e.g. Supabase port 5432)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

### 3. Generate Prisma Client & Run Database Migrations
Create all tables, enum types, indexes, and foreign keys in your empty database:
```bash
npm run db:generate
npx prisma migrate deploy
```

### 4. Seed Database (35+ Pre-built Realistic Requests)
Populate the clean database with **35 realistic return requests** spanning every status (`OPEN`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `COMPLETED`), every reason, and realistic note histories:
```bash
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🏛️ Architectural & Design Decisions

### 1. Relational Data Model (PostgreSQL & Prisma)
The data model is deliberately relational, normalized, and strictly typed in [prisma/schema.prisma](file:///Users/swapnilsaurabh/Desktop/dev/frido_assingment/prisma/schema.prisma):

- **Enums**:
  - `RequestStatus`: `OPEN`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `COMPLETED`
  - `RequestReason`: `DAMAGED`, `WRONG_ITEM`, `SIZE_ISSUE`, `NOT_AS_DESCRIBED`, `CHANGED_MIND`
  - `Resolution`: `REFUND`, `REPLACEMENT`, `STORE_CREDIT`
- **Models**:
  - `ReturnRequest`: Represents the core ticket with `reference` (unique human-readable identifier), customer details, order info, item info, units, monetary refund amount (`Decimal(10, 2)`), timestamps, and a nullable `removedAt` soft-delete timestamp.
  - `Note`: Chronological audit notes associated with a return request via foreign key `requestId` (`onDelete: Cascade`). Notes store `body`, `authorName`, and `createdAt`.
- **Database Indexes**:
  - `@@index([status, createdAt])` — Accelerates filtered and sorted queue listing.
  - `@@index([reason, createdAt])` — Accelerates reason-based filtering.
  - `@@index([orderNumber, itemName])` — Enforces instant lookups for duplicate live request checks.
  - `@@index([removedAt])` — Filters out soft-deleted desk records in sub-millisecond query time.
  - `@@index([requestId, createdAt])` — Fast chronological note thread retrieval.

### 2. Autonomous Reference Generation
- References follow the pattern **`RET-YY-XXXX`** (e.g. `RET-26-8821`), generated autonomously on the server.
- The user/agent never types references manually.
- The generation algorithm verifies uniqueness against existing database records with retry resilience.

### 3. Server-Side Execution of Search, Filter, Sort & Paging
- **Zero Client-Side Slicing**: As required by the brief, loading all rows into the browser and filtering client-side is completely avoided.
- Search query (`q`), filters (`status`, `reason`), sort order (`newest`, `oldest`), and pagination (`page`, `pageSize`) are translated directly into PostgreSQL SQL `WHERE`, `ORDER BY`, `LIMIT`, and `OFFSET` clauses.
- Search evaluates case-insensitive matches across `customerName`, `customerEmail`, `orderNumber`, `itemName`, and `reference`.
- Total matching records (`count`) and page items (`findMany`) run concurrently in a server transaction returning total pages for pagination controls.

### 4. Server-Side Enforcement of All 5 Business Rules
Every single business rule is enforced strictly on the server in route handlers. Client-side button disabling is only a visual aid; calling the API directly enforces:

| Rule | Requirement | Server Enforcement & HTTP Response |
| :--- | :--- | :--- |
| **Rule 1: Status Flow** | Fixed lifecycle: `OPEN` → `IN_REVIEW` → `APPROVED`/`REJECTED`, and `APPROVED` → `COMPLETED`. `REJECTED` and `COMPLETED` are final. | Invalid transitions (e.g. `OPEN` → `COMPLETED` or moving out of terminal states) are rejected with **`HTTP 409 Conflict`** and machine-readable error codes. |
| **Rule 2: Approval Needs Resolution** | Becoming `APPROVED` mandates selecting `REFUND`, `REPLACEMENT`, or `STORE_CREDIT`. Refund requires amount > 0. Others forbid refund amounts. | Approving without a resolution returns **`HTTP 422 Unprocessable Entity`**. Approving a refund with amount ≤ 0 returns **`HTTP 422`**. Specifying an amount on replacement/store credit returns **`HTTP 422`**. |
| **Rule 3: One Live Request Per Item** | An order cannot have two active requests for the same item unless the earlier one reached `REJECTED` or `COMPLETED`. | Both `POST` (create) and `PATCH` (edit) check for existing unclosed records (`removedAt: null`, status not `REJECTED`/`COMPLETED`) for that order & item. Violations return **`HTTP 409 Conflict`**. |
| **Rule 4: Locked Once Decided** | Customer and item details become permanently immutable once a request reaches `APPROVED`, `REJECTED`, or `COMPLETED`. | Any `PATCH` attempting to modify customer, order, or item fields on a decided request returns **`HTTP 409 Conflict`**. Adding notes remains allowed at any stage. |
| **Rule 5: Removal (Soft-Delete)** | Taking a request off the desk must never destroy the record in PostgreSQL. Only `OPEN` or `REJECTED` requests may be removed. | `DELETE` sets `removedAt = new Date()`, keeping the record intact for compliance. Attempting to remove `IN_REVIEW`, `APPROVED`, or `COMPLETED` requests returns **`HTTP 409 Conflict`**. Removed items return `HTTP 404` on direct lookup. |

### 5. Honest HTTP Semantics & Consistent Error Shapes
All API route handlers return consistent, structured JSON responses:
```json
{
  "error": "Human-readable explanation of why the action was refused",
  "code": "MACHINE_READABLE_ERROR_CODE"
}
```
HTTP status codes used:
- `200 OK`: Successful retrieval or update.
- `201 Created`: Successful creation of return request or note.
- `400 Bad Request`: Schema validation failure (missing required fields, invalid email format, negative units).
- `404 Not Found`: Request does not exist or has been removed from the desk.
- `409 Conflict`: Business rule violations (illegal status transitions, duplicate live requests, immutable field editing, illegal removals).
- `422 Unprocessable Entity`: Semantic resolution errors (missing resolution upon approval, invalid refund amounts).
- `500 Internal Server Error`: Unexpected internal server faults.

### 6. Frontend Architecture & User Experience
- **Legal Actions Only**: The action bar dynamically evaluates the request state and only renders actions legally permitted for that exact state.
- **Debounced Search**: Search inputs are debounced by 350ms to eliminate redundant network requests on keystrokes.
- **State Handling**:
  - Loading skeleton states during asynchronous transitions.
  - Dedicated empty state cards when no requests match active filters or search terms.
  - Non-swallowed error handling: Form errors render inline inside modals without closing; desk errors render actionable retry banners; action errors trigger floating toast notifications.
- **Responsive down to 375px**:
  - Desktop: Dual-column split view (filterable table on left, sticky detail drawer on right).
  - Mobile/Tablet (<900px down to 375px): Full-screen overlay drawer with fluid scrolling and touch-friendly controls.

---

## 🔌 API Endpoints Specification

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/requests` | List requests with pagination (`page`, `pageSize`), filters (`status`, `reason`), search (`q`), and sort (`sort=newest\|oldest`). | `200`, `500` |
| `POST` | `/api/requests` | Create a new request. Validates required fields, reasons, and Rule 3 (no duplicate live items). Generates human-readable reference. | `201`, `400`, `409`, `500` |
| `GET` | `/api/requests/[id]` | Fetch full request details including chronological note history. Excludes soft-deleted requests. | `200`, `404`, `500` |
| `PATCH` | `/api/requests/[id]` | Update request details (Customer, Order, Item, Reason, Units). Enforces Rule 4 (locked if decided) and Rule 3 (no duplicate item conflict). | `200`, `400`, `404`, `409`, `500` |
| `DELETE` | `/api/requests/[id]` | Soft-delete request (`removedAt = now()`). Enforces Rule 5 (allowed only for `OPEN` and `REJECTED` requests). | `200`, `404`, `409`, `500` |
| `POST` | `/api/requests/[id]/status` | Move request lifecycle. Enforces Rule 1 (strict transitions) and Rule 2 (approval resolution + refund validation). | `200`, `400`, `404`, `409`, `422`, `500` |
| `POST` | `/api/requests/[id]/notes` | Append an audit note. Notes can be added at any lifecycle stage and are immutable. | `201`, `400`, `404`, `500` |

---

## 🧪 Automated Verification Suite

To independently verify all 5 business rules directly against PostgreSQL without relying on the UI, an automated test script is provided:

```bash
npx tsx tmp/verify_rules.ts
```

This runs automated assertions validating:
1. `Rule 1`: Illegal status transitions (`OPEN` → `COMPLETED`, transitions out of `REJECTED` or `COMPLETED`) fail with HTTP 409.
2. `Rule 2`: Approving without resolution fails; approving refund with 0 amount fails; approving non-refund with amount fails.
3. `Rule 3`: Creating duplicate active requests for the same order and item fails with HTTP 409.
4. `Rule 4`: Editing customer/item details on `APPROVED`, `REJECTED`, or `COMPLETED` requests fails with HTTP 409.
5. `Rule 5`: Removing `IN_REVIEW`, `APPROVED`, or `COMPLETED` requests fails with HTTP 409; removing `OPEN` or `REJECTED` succeeds and flags `removedAt`.

---

## 📝 Assumptions Made

1. **Customer Contact Channel**: Customer email is the primary contact identifier and is validated for standard email formatting on creation.
2. **Actor Attribution**: Support agent note submissions and status actions attribute the author name (defaults to "Jordan Singh" for demo and internal audit logging).
3. **Desk Removal Visibility**: Soft-deleted requests are excluded from all active desk queries, counts, and search results, but remain intact in PostgreSQL with full note histories for audit compliance.
4. **Item Identification**: Items within an order are uniquely identified by item name and optional variant (e.g., "Orthopedic Pillow - Standard").

---

## 📋 What is Done, What is Incomplete, and What I Would Do Next

### ✅ What is Done & Fully Working
- [x] Complete Next.js 15 (App Router) + React 19 + TypeScript architecture.
- [x] Persistent PostgreSQL database schema with Prisma ORM, migrations, and composite indexes.
- [x] Server-side search, multi-facet filtering, sorting, and pagination running strictly in SQL.
- [x] Autonomous server generation of unique human-readable references (`RET-YY-XXXX`).
- [x] 100% server-side enforcement of all 5 Business Rules with honest HTTP codes (400, 404, 409, 422).
- [x] Soft-delete mechanism preserving compliance audit history.
- [x] Immutable chronological note system attachable at any lifecycle stage.
- [x] Comprehensive seed dataset with 35 realistic requests across all statuses and reasons.
- [x] Responsive frontend interface with legal-action-only UI, error toasts, and retry states down to 375px.
- [x] Automated test verification script (`tmp/verify_rules.ts`).
- [x] Production deployment on Vercel with attached Supabase PostgreSQL database.

### ⏳ What is Incomplete (Deliberate Scope Boundaries)
- Multi-agent authentication (RBAC / login): Currently operates as a shared desk queue with actor attribution.
- Customer-facing self-service return portal: Scope was focused on the internal support operations desk.
- Automated email dispatch to customers on status changes.

### 🔮 What I Would Do Next
1. **Authentication & Role-Based Permissions (RBAC)**: Integrate NextAuth.js / Supabase Auth with roles (`Agent`, `Lead`, `Admin`) to restrict approvals above certain refund thresholds.
2. **Customer Webhook / Email Notifications**: Trigger automated emails (e.g. via Resend or SendGrid) when requests reach `APPROVED`, `REJECTED`, or `COMPLETED`.
3. **File Attachments & Photo Evidence**: Allow uploading image attachments (e.g. photos of damaged items or shipping labels) to S3 / Supabase Storage.
4. **Granular Field Diff Audit Logging**: Expand the `Note` table into a full `AuditLog` capturing exact before-and-after JSON diffs for every edit and status transition.
