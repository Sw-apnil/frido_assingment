# ReturnDesk

ReturnDesk is a returns operations desk built for small online stores, engineered with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM, and PostgreSQL.

---

## Live Deployment & Repository

- **Deployed Application:** `https://returndesk-frido.vercel.app` *(Replace with your deployed URL)*
- **GitHub Repository:** `https://github.com/Sw-apnil/frido_assingment` *(Replace with your repository URL)*

---

## Setup & Running Locally (Clean Machine)

### Prerequisites
- Node.js 20+ installed
- PostgreSQL database (Local, Docker, Supabase, Neon, or Render)

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
Populate your PostgreSQL connection strings in `.env`:
```env
# Runtime pooler connection (e.g. Supabase port 6543)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct / session connection for migrations (e.g. port 5432)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

### 3. Generate Prisma Client & Run Migrations
Run the initial migration against your clean database:
```bash
npm run db:generate
npx prisma migrate deploy
```

### 4. Seed Database
Seed the database with 35 realistic return requests spanning every status and reason:
```bash
npm run db:seed
```

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Architectural & Design Decisions

### 1. Server-Side Execution of Search, Filter, Sort & Pagination
- All querying occurs exclusively in PostgreSQL via Prisma SQL translations.
- Search queries (`q`) perform case-insensitive pattern matching on `customerName`, `customerEmail`, `orderNumber`, and `reference`.
- Filtering (`status`, `reason`), sorting (`newest`, `oldest`), and pagination (`skip`/`take`) are executed strictly within the database.
- The browser never loads the full dataset or applies client-side filtering over paginated slices.

### 2. Unique Human-Readable Reference Generation
- Return requests are assigned unique references in the format `RET-YY-XXXX` (e.g. `RET-26-8821`), generated autonomously on the server upon creation.
- A uniqueness guarantee is enforced by database-level unique constraints and conflict-safe generation retries.

### 3. Enforcement of Business Rules on the Server
Every business rule is enforced strictly on the server:

1. **Status Flow (Rule 1)**
   - Strict lifecycle: `OPEN` → `IN_REVIEW` → `APPROVED` / `REJECTED`, and `APPROVED` → `COMPLETED`.
   - `REJECTED` and `COMPLETED` are terminal states; no further transitions are allowed.
   - Any invalid transition (e.g., `OPEN` straight to `COMPLETED`) is rejected with `HTTP 409 Conflict`.

2. **Approval Needs a Resolution (Rule 2)**
   - Transition to `APPROVED` requires specifying a resolution (`REFUND`, `REPLACEMENT`, or `STORE_CREDIT`). Omitting it returns `HTTP 422 Unprocessable Entity`.
   - If `resolution === REFUND`, a positive `refundAmount > 0` is required.
   - If resolution is `REPLACEMENT` or `STORE_CREDIT`, specifying a refund amount is forbidden and rejected with `HTTP 422`.

3. **One Live Request Per Item (Rule 3)**
   - A customer cannot have two live requests for the same item on the same order.
   - Both request creation (`POST`) and undecided request editing (`PATCH`) verify that no other request with matching `orderNumber` and `itemName` exists with `removedAt === null` and status not in `['REJECTED', 'COMPLETED']`.
   - Violations return `HTTP 409 Conflict`. Once closed or rejected, a subsequent request for that item is allowed.

4. **Locked Once Decided (Rule 4)**
   - Once a request reaches `APPROVED`, `REJECTED`, or `COMPLETED`, its customer and item details (`customerName`, `customerEmail`, `orderNumber`, `itemName`, `itemVariant`, `units`, `reason`) become permanently immutable.
   - Any attempt to modify locked fields returns `HTTP 409 Conflict`.
   - Notes may still be appended at any stage in the lifecycle.

5. **Removal / Soft-Delete (Rule 5)**
   - Removing a request sets `removedAt = new Date()`, preserving the database record while removing it from active desk views.
   - Only requests in `OPEN` or `REJECTED` status may be removed; attempts to remove `IN_REVIEW`, `APPROVED`, or `COMPLETED` requests return `HTTP 409 Conflict`.
   - Removed requests return `HTTP 404 Not Found` upon direct retrieval attempts.

### 4. Honest HTTP & Predictable Error Semantics
The API returns standard, machine-readable JSON error payloads:
```json
{
  "error": "Descriptive human-readable explanation of why the action was refused",
  "code": "MACHINE_READABLE_ERROR_CODE"
}
```
HTTP status codes used:
- `400 Bad Request`: Validation failure (missing required fields, negative units).
- `404 Not Found`: Non-existent or removed request.
- `409 Conflict`: Business rule conflicts (illegal lifecycle transitions, duplicate live requests, editing locked records, removing ineligible states).
- `422 Unprocessable Entity`: Semantic resolution errors (missing resolution upon approval, invalid refund amounts).

### 5. UI & Responsive Design (Down to 375px)
- **Status Readability:** Distinct status badges with indicator tones allow immediate state recognition at a glance.
- **Contextual Action Offering:** Only actions legally permitted in the request's current state are presented in the UI.
- **Search Debounce:** Search input is debounced by 350ms to prevent excessive keystroke requests.
- **State Handling:** Comprehensive loading skeletons, empty state illustrations, and server error toasts ensure users are informed of all system states.
- **Responsive Layout:** Adaptive split-view transforms into a full-screen mobile drawer below 900px, functioning cleanly down to 375px viewport widths.

---

## Seed Dataset

The seed script (`prisma/seed.ts`) populates 35 return requests:
- Spans all 5 statuses: `OPEN`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `COMPLETED`.
- Spans all 5 reasons: `DAMAGED`, `WRONG_ITEM`, `SIZE_ISSUE`, `NOT_AS_DESCRIBED`, `CHANGED_MIND`.
- Includes chronological note histories with agent and portal entries.
- Strictly complies with all business rules (valid refund amounts on approved refunds, null amounts on replacements/store credit).

Run seed anytime with:
```bash
npm run db:seed
```

---

## Automated Verification Suite

Run the automated business rules verification script:
```bash
npx tsx tmp/verify_rules.ts
```
Tests all 5 business rules directly against the PostgreSQL database engine.

---

## Assumptions Made

1. **Contact Information:** Email was selected as the primary customer contact mechanism and is required on request creation.
2. **Actor Attribution:** Support agent actions default to "Jordan Singh" for demo and internal audit logging purposes.
3. **Desk Removal:** Soft-deleted requests are excluded from all active desk queries and single-record fetches, but are retained in the PostgreSQL database for compliance and store analytics.

---

## Approximate Time Spent

Roughly **7 hours** spent across architecture planning, database schema design, Prisma migration setup, business rule enforcement, server API implementation, seed data curation, responsive frontend development, and automated testing.
