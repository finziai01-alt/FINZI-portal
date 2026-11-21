# FINZI AI

AI-powered accounting, financial management, and auditing SaaS platform for Indian businesses.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Express + SQLite (better-sqlite3)
- **Ports:** Backend `:5000`, Frontend preview `:5173` (proxies `/api` to `:5000`). Port `3000` must remain stopped.

## Project Root

`/finzi-ai/`
- `server/` — Express + SQLite backend
- `client/` — React + Vite frontend

## Design System (Stitch source of truth)

Colors are taken from the Stitch design files and must not be redesigned:

| Token | Value |
|-------|-------|
| Primary | `#000000` |
| Secondary | `#006d44` |
| Background | `#f9f9ff` |
| Surface container low | `#f1f3ff` |
| On surface | `#121b2e` |
| On surface variant | `#45474c` |
| Outline | `#75777d` |
| Primary container | `#111c2e` |

Typography: Inter + JetBrains Mono + lucide-react. Currency: Indian Rupees (₹) with Indian digit grouping (lakhs/crores). Date format: DD/MM/YYYY.

## Quick Start

### Prerequisites
- Node.js 18+

### 1. Install dependencies

```bash
# Backend
cd /finzi-ai/server
npm install

# Frontend
cd /finzi-ai/client
npm install
```

### 2. Environment variables

```bash
cd /finzi-ai/server
cp .env.example .env
# Edit .env if needed (JWT_SECRET, PORT, etc.)
```

### 3. Run the database migration

```bash
cd /finzi-ai/server
npm run migrate
```

### 4. Start the servers

```bash
# Terminal 1 — Backend (port 5000)
cd /finzi-ai/server
npm start

# Terminal 2 — Frontend preview (port 5173)
cd /finzi-ai/client
npm run build
npx vite preview --port 5173 --host
```

- Backend API: `http://localhost:5000/api/health`
- Frontend preview: `http://localhost:5173`
- Port 3000 must remain stopped.

## What is built (included)

- **Backend:** complete Express server with auth (register/login/logout/me/password reset/OTP/switch-company), multi-tenant companies, users/roles/permissions, dashboard, bills, vendors, invoices, customers, accounts, journal entries (double-entry, balanced), trial balance, banking (accounts, transactions, matching, statement import), documents/upload, tax (dashboard, GSTR-3B, GSTR-2B reconciliation, tax record workflow), reports (P&L, balance sheet, cash flow, ageing), audit (engagements, evidence, working papers, observations), FINZI AI (conversations, messages, approval requests with approve/reject/edit), reminders, automations, settings, team management, activity logs.
- **Frontend:** React router app with auth pages, dashboard, bills/invoices/ledger/banking/tax/reports/audit/AI/reminders/settings, sidebar navigation, KPI cards, status badges, Indian currency/date formatting.
- **DB:** SQLite schema (30+ tables) with migrations + default role/permission seeder.

## Demo account

- Email: `demo@finzi.ai`
- Password: `Demo@2026!`
- Workspace: Sharma & Associates LLP (GSTIN: 27AAEFS1234P1Z8, PAN: AAEFS1234P)
- Role: Workspace Owner

Seed data includes 25 chart-of-accounts, 31 journal entries, 12 bills, 12 invoices, 4 automation workflows, 30 activity log entries, and audit content (1 engagement, 3 working papers, 3 observations, 1 evidence item).

Per the project constraints, no fake claims are made. Integration adapters are implemented but remain **inactive until you configure credentials** in `.env`. When inactive, they return a `pending` state and a helpful message instead of fabricating results.

- **OCR / document extraction:** Adapter implemented (AWS Textract). Set `OCR_PROVIDER=aws_textract` + AWS credentials to enable automatic extraction. Otherwise documents are uploaded with `ocrStatus: pending` and fields entered manually.
- **GSTR-2B reconciliation:** Books-side ITC is reported; GSTR-2B columns show `awaiting_gstr2b` until GST portal download is integrated. No fabricated match/mismatch data.
- **GST/TDS portal filing:** Adapter implemented (GSTN OAuth2). Set `GSTN_ENABLED=true` + OAuth credentials to enable filing via `/api/tax/gstn/auth-url`, `/api/tax/gstn/callback`, `/api/tax/gstn/file`. Otherwise filing status stays in the preparation workflow (`draft → in_progress → ready_for_review → reviewed → filed`) and actual portal filing is a separate manual action.
- **Email/SMS notifications:** Email adapter implemented via **Resend** (free tier: 100 emails/day). Set `EMAIL_PROVIDER=resend` + `EMAIL_API_KEY`. SMS via Twilio/Msg91 optional. Reminders fire email/SMS when configured and a contact email/phone is present; otherwise delivered in-app only.
- **AI / LLM:** Adapter implemented with auto-fallback: **Google Gemini → NVIDIA Nemotron 3.5 Super VL 120B A12B → NVIDIA GLM 5.3 Flash → NVIDIA Nemotron Voice Chat**. Set `GEMINI_API_KEY` and/or `NVIDIA_API_KEY`. If ALL providers fail, FINZI AI shows `"Server Busy hold just a minute"` (no raw error surfaced to the user). Otherwise it runs as a rules-based assistant on stored data.
- **Voice integration:** Browser-native Web Speech API (SpeechRecognition input + speechSynthesis output, `en-IN` English Indian). Works immediately — no external service or API key required.

## Key constraints enforced

- Indian Rupees (₹), Indian date formats (DD/MM/YYYY), GSTIN-style identifiers.
- No silent AI posting: every AI-suggested financial action creates an approval request requiring human approval.
- Authorization enforced on the backend (`requireAuth`, `requireCompanyAccess`, `requireRole`) with multi-tenant `company_id` filtering on all queries.
- Passwords hashed with bcrypt (never plain text); JWT access tokens with expiration.
- Secure file upload (type validation, size limit, path traversal protection).
- Every visible control has a real function; no static arrays or fake buttons.
- Reports generated from actual stored data (no hardcoded values).
- Double-entry accounting: every posted journal entry must balance; unbalanced entries are rejected.
- Draft / preparation / review / filed distinction for GST/TDS.

## API Reference

Base URL: `http://localhost:5000/api`

### Auth
- `POST /auth/register` — register (creates user, company, chart of accounts)
- `POST /auth/login` — login (returns access token + company context)
- `POST /auth/logout`
- `GET /auth/me` — current user + company + permissions
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/verify-otp`
- `POST /auth/switch-company`

### Companies
- `GET /companies`, `GET /companies/:id`, `POST /companies`, `PUT /companies/:id`
- `GET /companies` returns `role_name` (resolved via `roles` table) alongside `role_id`

### Users / Team
- `GET /users`, `GET /roles`, `GET /roles/:id/permissions`, `GET /permissions`
- `GET /companies/:id/members`, `POST /companies/:id/members`, `PUT /companies/:id/members/:userId`, `DELETE /companies/:id/members/:userId`

### Bills
- `GET /bills`, `GET /bills/:id`, `POST /bills`, `PUT /bills/:id`, `DELETE /bills/:id`
- `POST /bills/:id/payment`, `POST /bills/:id/duplicate`

### Vendors / Customers
- `GET /vendors`, `GET /vendors/:id`, `POST /vendors`, `PUT /vendors/:id`, `DELETE /vendors/:id`
- `GET /customers`, `GET /customers/:id`, `POST /customers`, `PUT /customers/:id`, `DELETE /customers/:id`

### Invoices
- `GET /invoices`, `GET /invoices/:id`, `POST /invoices`, `PUT /invoices/:id`
- `POST /invoices/:id/receipt`

### Accounts & Ledger
- `GET /accounts`, `GET /accounts/:id`, `POST /accounts`, `PUT /accounts/:id`
- `GET /journal-entries`, `GET /journal-entries/:id`, `POST /journal-entries`
- `GET /trial-balance`

### Banking
- `GET /bank-accounts`, `POST /bank-accounts`
- `GET /bank-transactions`, `POST /bank-transactions/:id/match`
- `POST /bank-statements/import`

### Documents
- `POST /documents/upload`, `GET /documents`, `GET /documents/:id/download`, `DELETE /documents/:id`
- `POST /documents/:id/verify` (manual verification)
- `GET /document-extractions/:documentId`, `PUT /document-extractions/:documentId`

### Tax
- `GET /tax/dashboard`, `GET /tax/gstr3b`, `GET /tax/gstr2b-reconciliation`
- `POST /tax/records` (preparation → review → filed workflow)

### Reports
- `GET /reports/profit-loss`, `GET /reports/balance-sheet`, `GET /reports/cash-flow`
- `GET /reports/receivables-ageing`, `GET /reports/payables-ageing`

### Audit
- `GET /audit/engagements`, `POST /audit/engagements`, `GET /audit/engagements/:id`
- `GET /audit/evidence`, `POST /audit/evidence`, `PUT /audit/evidence/:id`
- `GET /audit/working-papers`, `POST /audit/working-papers`, `PUT /audit/working-papers/:id`
- `GET /audit/observations`, `POST /audit/observations`, `PUT /audit/observations/:id`
- `GET /clients`, `POST /clients`

### FINZI AI
- `GET /ai/conversations`, `POST /ai/conversations`
- `GET /ai/messages/:conversationId`, `POST /ai/message`
- `POST /ai/approval-requests`, `GET /ai/approval-requests`
- `POST /ai/approval-requests/:id/decision` (approve/reject/edit)

### Reminders
- `GET /reminders`, `POST /reminders`, `PUT /reminders/:id`, `DELETE /reminders/:id`

### Automations
- `GET /automations`, `POST /automations`, `PUT /automations/:id`

### Settings
- `GET /settings`, `PUT /settings`

### Activity Logs
- `GET /activity-logs`

### Notifications
- `GET /notifications`, `POST /notifications/:id/read`

## Database

Schema: `server/migrations/schema.sql` (with additional migrations `002_*.sql`, `003_*.sql`, `004_*.sql`).
Migration runner: `server/src/migrations/run.js` (idempotent, tracks applied files in `schema_migrations`).
Seed: default roles + permissions (Super Admin, Workspace Owner, Company Admin, Accountant, Finance Staff, CA Firm Admin, Auditor, Reviewer, Client User).

## Authorization

Middleware: `requireAuth`, `requireCompanyAccess`, `requirePermission`. All mutating routes check the relevant permission. Multi-tenant isolation: every query filters by `company_id`.

### Audit tenant scoping

All audit module GET lists (engagements, evidence, working papers, observations) are firm-scoped through `clients.firm_id`. Audit POST/PUT/GET-by-id reject access to engagements outside the user's organizations with `403` or `404`.

## License

Internal — FINZI AI.
