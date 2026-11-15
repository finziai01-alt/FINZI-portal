# FINZI AI — Complete Build Prompt for OpenCode

Use this prompt in OpenCode to continue building the FINZI AI website application completely. It includes everything already built, what's missing, and all constraints.

---

## PROJECT OVERVIEW

Build **FINZI AI** — a complete AI-powered accounting, financial management, and auditing SaaS platform for Indian businesses.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS (frontend), Express + SQLite (backend)

**Project Root:** `/home/user/finzi-ai/`

**Running Servers:**
- Backend API: `http://localhost:5000` (Express + SQLite)
- Frontend Dev: `http://localhost:3000` (Vite dev server, proxies `/api` to `:5000`)

---

## WHAT'S ALREADY BUILT (DO NOT REBUILD)

### Backend — `/home/user/finzi-ai/server/`
- `package.json` — Express, SQLite3, express-validator, bcryptjs, jsonwebtoken, multer, cors, dotenv (installed: 170+ packages)
- `migrations/schema.sql` — Complete multi-tenant SQLite schema (30+ tables): users, companies, company_members, roles, permissions, user_roles, vendors, customers, bills, bill_items, invoices, invoice_items, payments, payment_allocations, accounts, journal_entries, journal_entry_lines, bank_accounts, bank_transactions, documents, document_extractions, tax_returns, gstr_3b, gstr_2b, audit_engagements, audit_evidence, audit_working_papers, audit_observations, ai_conversations, ai_messages, ai_approval_requests, reminders, notifications, activity_logs, settings
- `src/migrations/run.js` — Migration runner + default role/permission seeder
- `src/index.js` — Complete Express server with ALL API routes:
  - Auth: register, login, logout, me, forgot-password, reset-password, verify-otp, switch-company
  - Companies: list, get, create, update
  - Users/Roles: list, roles
  - Dashboard: summary
  - Bills: list, get, create, update, delete, record payment
  - Vendors: list, create
  - Invoices: list, get, create, update
  - Customers: list, create
  - Accounts: list, create
  - Journal Entries: list, get, create (double-entry balanced)
  - Trial Balance
  - Banking: accounts, transactions, match, statement import
  - Documents: upload, download, extractions
  - Tax: dashboard, GSTR-3B, GSTR-2B reconciliation
  - Reports: P&L, balance sheet, cash flow, receivables ageing, payables ageing
  - Audit: engagements, evidence, working papers, observations
  - FINZI AI: conversations, messages, approval requests, approval decisions
  - Reminders: list, create
  - Notifications: list, mark read
  - Activity logs, Settings
- `db/finzi.db` — SQLite database (migrated, partially seeded)
- `uploads/` — File upload directory

**All backend API endpoints verified working via curl tests.**

### Frontend — `/home/user/finzi-ai/client/`
- `package.json` — React 18, TypeScript, Vite, Tailwind CSS, Axios, Lucide React, Recharts, Sonner, Zod, React Hook Form, class-variance-authority (installed: 201 packages)
- `vite.config.ts` — Vite config with `/api` proxy to `http://localhost:5000`, host: true, allowedHosts: true
- `tailwind.config.js` — Design system tokens (navy, green, background, surface, text, secondary, border, Inter font)
- `postcss.config.js`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- `src/index.css` — Tailwind directives + component CSS layer (btn-primary, btn-green, input-field, card, kpi-card, badge, etc.)
- `src/main.tsx` — React entry with BrowserRouter
- `src/App.tsx` — Route definitions (login, register, dashboard, bills, bills/:id, invoices, ledger, banking, tax, reports, audit, ai, reminders, settings, 404) with AuthProvider wrapping
- `src/types/index.ts` — TypeScript interfaces for all entities
- `src/services/api.ts` — All API service functions with auth interceptor, 401 auto-logout
- `src/context/AuthContext.tsx` — Auth state management (login, register, logout, switchCompany, checkAuth)
- `src/components/ui/Button.tsx`, `Input.tsx`, `Badge.tsx`, `Card.tsx`, `StatusBadge.tsx`
- `src/components/layout/Sidebar.tsx`, `TopNav.tsx`, `AppShell.tsx`
- `src/pages/auth/Login.tsx`, `Register.tsx`
- `src/pages/Dashboard.tsx`, `Bills.tsx`, `BillDetails.tsx`, `Invoices.tsx`, `Ledger.tsx`, `Banking.tsx`, `Tax.tsx`, `Reports.tsx`, `Audit.tsx`, `AI.tsx`, `Reminders.tsx`, `Settings.tsx`, `NotFound.tsx`
- `src/utils/format.ts` — formatMoneyIN (₹), formatDateIN (DD/MM/YYYY)

**Frontend builds successfully:** `npx vite build` completes without errors.

---

## DESIGN SYSTEM (STITCH SOURCE OF TRUTH — DO NOT REDESIGN)

**Colors:**
- Primary Navy: `#101B2D`
- Primary Green: `#16A36A`
- Background: `#F5F7FA`
- Surface: `#FFFFFF`
- Text Primary: `#172033`
- Text Secondary: `#64748B`
- Border: `#E8EDF3`
- Semantic: success `#16A36A`, warning `#E9A23B`, danger `#DC4C4C`, info `#3985D6`

**Typography:** Inter (300, 400, 500, 600, 700)

**Currency:** Indian Rupees (₹) with Indian number formatting (lakhs/crores)

**Date Format:** DD/MM/YYYY

**Statuses:** Draft, Processing, Unpaid, Partially Paid, Paid, Overdue, Rejected, Matched, Unmatched, Reconciled

**Sidebar Nav Groups:** WORKSPACE (Dashboard, Companies, Clients), ACCOUNTING (Bills & Expenses, Sales & Invoices, Ledger & Accounts, Banking, Tax & Compliance, Financial Reports), AUDIT (Audit Workspace, Evidence & Papers, Audit Reports), INTELLIGENCE (FINZI AI, Automations, Reminders), ADMINISTRATION (Settings, Team Management, Roles & Permissions, Activity Logs)

---

## USER CONSTRAINTS & CORRECTIONS (MUST FOLLOW)

1. **Use Stitch designs as source of truth; do not redesign or use generic templates**
2. **Indian Rupees (₹), Indian date formats, GSTIN-style identifiers, Indian accounting terminology**
3. **Do not claim OCR/AI/filing occurred unless real service configured; mark as pending integration if unavailable**
4. **Do not let AI silently create/modify/post financial records; approval workflow required**
5. **Enforce authorization on backend/database, not just frontend hiding**
6. **Never store passwords plain text; multi-tenant isolation; secure file upload**
7. **Every visible control must have actual function; no fake buttons or static arrays**
8. **Reports must be generated from actual stored data, not hardcoded values**
9. **Double-entry accounting: every posted journal entry must balance; reject unbalanced entries**
10. **Distinguish draft/preparation/review/actual filing for GST/TDS**
11. **Full deliverable: working app, components, backend/DB, auth, workflows, responsive, docs, migrations, env vars**

---

## STILL TO DO / MISSING THINGS (PRIORITY ORDER)

### 1. Create/Edit Forms (Currently List/View Only)
- **Bill Create Form** — vendor selection, bill number, invoice number, dates, line items, GST calculation, total
- **Invoice Create Form** — customer selection, invoice number, dates, line items, GST, total
- **Journal Entry Create Form** — account code resolution, debit/credit lines, balance validation, posting
- **Vendor Create/Edit Form** — GSTIN, PAN, address, contact
- **Customer Create/Edit Form** — GSTIN, PAN, address, contact
- **Account Create/Edit Form** — code, name, group, type, opening balance
- **Payment Record Form** — amount, method, reference, UTR, allocation to bills

### 2. OCR / Document Processing (Mark as Pending Integration)
- Document upload with file type validation
- OCR extraction status indicator — mark "Pending Integration" (no real OCR service)
- Document verification workflow (draft → verified)
- AI confidence score display

### 3. FINZI AI Assistant — Approval Workflow
- AI message sending and conversation history
- **Approval requests** — AI-suggested actions require human approval before posting
- Approve/Reject/Edit decision buttons on approval requests
- No silent posting of financial records by AI

### 4. Reports from Actual Data
- Profit & Loss report from journal entries
- Balance Sheet from account balances
- Cash Flow statement
- Receivables/Payables ageing from unpaid bills/invoices
- All reports must query real stored data (no hardcoded values)

### 5. Tax & Compliance
- GSTR-3B return preparation (draft → filed distinction)
- GSTR-2B reconciliation (matched/unmatched ITC)
- TDS payable calculation
- Late fee computation
- Filing status tracking

### 6. Audit Workspace
- Audit engagement creation
- Evidence upload (secure file upload)
- Working papers creation
- Observations recording
- Audit report generation

### 7. Banking & Reconciliation
- Bank account management
- Bank transaction import (CSV/statement)
- Transaction matching to bills/invoices
- Reconciliation status (matched/unmatched/reconciled)

### 8. Reminders & Automation
- Reminder creation (compliance dates, follow-ups)
- Priority levels (low, medium, high, critical)
- Status tracking (pending, completed, overdue)
- Email/SMS notification placeholders (mark as pending integration)

### 9. Settings & Administration
- Company profile management
- User/team management
- Roles & permissions assignment
- Activity logs viewer
- Notification preferences

### 10. Documentation
- README.md with setup instructions
- Environment variables guide (.env.example)
- API documentation
- Database schema documentation
- Deployment instructions

### 11. Environment Variables
Create `.env.example` with:
```
PORT=5000
DB_PATH=./db/finzi.db
JWT_SECRET=your-secret-key
BCRYPT_SALT_ROUNDS=12
FRONTEND_URL=http://localhost:3000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### 12. Security & Authorization
- Backend middleware: `requireAuth`, `requireCompanyAccess`, `requireRole`
- Multi-tenant isolation (company_id filtering on all queries)
- Password hashing with bcrypt (never plain text)
- JWT token-based auth with expiration
- Secure file upload (type validation, size limits, path traversal protection)

### 13. Voice Integration (Optional)
- `add_voice` to register a voice for speech generation
- `generate_speech` for AI assistant responses
- Language: English (Indian accent optional)

---

## HOW TO USE THIS PROMPT

Copy the entire contents of this file into OpenCode as your initial prompt. It will give the agent full context about:
- What's already built (backend + frontend)
- What still needs to be built (create forms, OCR, AI approvals, reports, tax, audit, banking, reminders, settings, docs)
- All user constraints (Stitch designs, Indian currency/dates, no fake controls, real data, double-entry accounting, approval workflow, security)
- The exact file structure and running servers

The agent should:
1. Start from `/home/user/finzi-ai/`
2. Verify both servers are running (port 5000 backend, port 3000 frontend)
3. Work through the "Still To Do" list in priority order
4. Follow all user constraints strictly
5. Test every API endpoint and page after building
6. Create documentation at the end

---

## QUICK START COMMANDS

```bash
# Start backend
cd /home/user/finzi-ai/server && node src/index.js

# Start frontend
cd /home/user/finzi-ai/client && npx vite --host 0.0.0.0 --port 3000

# Test backend
curl http://localhost:5000/  # returns "Cannot GET /" (expected - API only)

# Test frontend
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/  # should return 200
```
