# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase answers this: React 18 + TypeScript + Vite 5 + Tailwind 3 + Recharts + Sonner + Lucide, Express + SQLite backend. No new runtime dependencies were added for the redesign; motion is CSS and Tailwind keyframes.

## Users

Primary: a Chartered Accountant firm practising in India, serving many client companies from one workspace. The user of the screen is the practice owner, a senior accountant, or an audit staff member who spends hours per day inside this app, switching between client companies' books. Secondary: audit staff and reviewers signing off working papers, and junior accounting staff recording bills, invoices and journal entries.

## Product Purpose

FINZI AI is the accounting, GST, and audit workspace a CA firm runs its client books in: recording bills and invoices, maintaining a double-entry ledger that refuses unbalanced postings, reconciling bank statements, preparing GST returns, managing audit engagements with evidence and working papers, and seeing practice-level financial reports. Success means a firm can do its daily books, its month-end GST work, and its audit file trail in one place without switching tools.

## Positioning

The ledger is a real double-entry ledger that refuses unbalanced postings, and the audit trail is a real evidence chain (engagement, working paper, observation, evidence) that a reviewer can sign. Every capability the app does not actually have is shown as pending rather than implied: there is no GSTN filing, no OCR extraction, and no AI action that writes records without a human approving it.

## Operating Context

A CA firm desk in India. Multi-company: one workspace owner holds several client companies, each with its own chart of accounts, GSTIN, and PAN. Daily work is recording vendor bills and customer invoices with CGST/SGST or IGST, posting journal entries, reconciling bank statements, chasing receivables, preparing GSTR-3B, and preparing audit files. Money is Indian Rupees with lakh/crore digit grouping, dates are DD/MM/YYYY, financial years run April to March, and audit evidence is filed per client per financial year.

## Capabilities and Constraints

- Double-entry ledger that refuses unbalanced postings; line totals derived in `client/src/utils/calc.ts`, never typed by the user.
- GST computed per line: CGST/SGST when buyer and seller state codes match, IGST when they differ.
- Integration surface must stay honest: GSTN, OCR, SMS, and AI are marked pending integration. Email is configured and shown as configured.
- AI suggestions never create, modify, or post financial records without a human approval decision.
- Multi-tenant isolation server-side; every query scoped by company and, in the audit module, by firm.
- Passwords hashed; no plaintext credentials in storage.
- Roles and permissions are real (Super Admin through Client User) and drive what each screen allows.
- Undecided by design, not by omission: direct GSTN filing, automated OCR, and any AI write-back are deliberately not shipped.

## Brand Commitments

- Product name is FINZI AI.
- The Stitch design system at `C:\Users\Praveen\Documents\FINZI WEB\stitch_finzi_ai_design_system\stitch_finzi_ai_design_system\` is the binding source of truth for the colour system: primary `#000000`, secondary `#006d44`, background `#f9f9ff`, surface-container-low `#f1f3ff`, on-surface `#121b2e`, on-surface-variant `#45474c`, outline `#75777d`, primary-container `#111c2e`. Typography Inter plus JetBrains Mono, icons from lucide-react.
- A reference dashboard in the uixpress style was supplied as the desired craft level: flat hairline cards on a light canvas, right-aligned tabular numerals, tiny uppercase column headers, metric chips, segmented pill tabs, smooth single-line charts with dashed horizontal gridlines only, and a white airy sidebar. It is the craft bar, not a template to copy: colour identity stays FINZI.

## Evidence on Hand

- Seeded demo workspace: Sharma & Associates LLP, GSTIN 27AAEFS1234P1Z8, 25 chart-of-accounts, 31 journal entries, 12 bills, 12 invoices, 4 automation workflows, 30 activity entries, and seeded audit content (1 engagement, 3 working papers, 3 observations, 1 evidence item).
- All dashboard, report, and table figures come from stored data. Nothing in the UI invents a number.

## Product Principles

- The ledger refuses what is unbalanced; the UI refuses what is unverified.
- One colour does the talking: emerald marks action, selected state, and favourable change; black marks authority. A payable going up is never coloured favourable.
- Show the real state, including "pending integration" and "no prior month to compare".
- Dense enough for a professional, quiet enough for eight hours a day.
- Every control that is visible works.

## Accessibility & Inclusion

Body text contrast measured against the rendered light theme at or above 4.5:1. Badges and status pills carry a word or dot alongside colour, never colour alone. Keyboard focus is visible on every interactive element. `prefers-reduced-motion` reduces animation to gentler, shorter transitions rather than removing state feedback. Responsive at 375, 768, 1024, and 1440px.