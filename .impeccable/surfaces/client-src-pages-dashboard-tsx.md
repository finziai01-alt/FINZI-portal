---
version: 1
slug: "client-src-pages-dashboard-tsx"
primary_target: "client/src/pages/Dashboard.tsx"
related_targets: ["client/src/components/layout/Sidebar.tsx","client/src/components/layout/TopNav.tsx","client/src/components/layout/AppShell.tsx"]
---

# Surface brief — FINZI AI workspace UI

Scope: the authenticated workspace — application shell (sidebar, top navigation) and every page rendered inside it, plus the login, register, and password-reset screens.

Visitor mode: Operate. A CA practice accountant or auditor completes real tasks for hours a day: recording bills, posting balanced journals, chasing receivables, preparing GSTR-3B, signing audit work. Scanability, consistency, and the real usage scene outrank expression. Brand lives in precise details.

Audience: CA firms in India holding many client companies in one workspace. Job: keep several books current and file-ready. What must remain untouched: double-entry balance enforcement, derived line totals and GST arithmetic, server-side tenant isolation, the honesty wording on unconfigured integrations, and the AI human-approval workflow.

Direction: "Quiet Ledger". A precision instrument panel: flat hairline cards on a cool `#f9f9ff` canvas, one emerald accent, tabular numerals, and near-silent motion. The category default — a violet-to-blue SaaS dashboard with tinted hero metrics and glow — is refused, as is the costume of a "financial terminal" keyboard-shell.

Unresolved: none blocking. Direct GSTN filing, automated OCR, and AI write-back remain unshipped by product decision, not by omission.

## Direction contract

THESIS: the workspace is an instrument, not a brochure. The category ships a marketing dashboard — tinted hero-metric band, gradient accents, icon-plus-heading-plus-text card grid. This surface refuses that: white hairline cards on a tinted canvas, no card chrome, no icon tiles, and every number right-aligned in tabular figures so a column of rupees can be scanned vertically without the eye hunting for the decimal.

OWN-WORLD: canvas `#f9f9ff`, card `#ffffff` with a 1px `#e9ebf2` hairline and a 12–14px radius, no colored fills anywhere except emerald `#006d44` for action, selected state, favourable delta, and the chart line. Ink `#121b2e` for headings, `#45474c` for secondary, `#75777d` for muted meta and the strong focus ring. Black `#000000` is the single authority colour for primary buttons. Depth is a single two-layer soft shadow, never a zero-blur halo, never a left accent bar above 1px. JetBrains Mono carries GSTIN, invoice and voucher numbers; Inter with `font-variant-numeric: tabular-nums` carries every money cell and count.

STORY: the accountant opens the dashboard, sees the four numbers that decide their morning in one row, reads the emerald/red delta under each without a legend, follows the right rail to the two records that need attention, and acts within one click. Nothing on screen claims a capability the app does not have; "pending integration" and "no prior month to compare" are shown as-is.

FIRST VIEWPORT: white sidebar (248px, collapsible to 68px) with tiny muted uppercase section labels, an active row in a `#f1f3ff` wash with a 2px emerald left indicator, and a custom company-switcher dropdown under the logo. Top navigation is sticky, `bg-white/85 backdrop-blur`, carrying the page title and subtitle on the left and `Export`, `New entry`, and a financial-year selector on the right. Main column starts with a segmented pill tab row (`Overview · Cash flow · Tax · Audit`) over a four-up KPI row: label and info glyph top-left, emerald metric chip top-right, then one row of `label left / amount right / delta beneath`, every amount tabular and right-aligned, every delta emerald when favourable and `#ba1a1a` when adverse. Below, a two-thirds chart card (one smooth emerald line over an emerald-to-transparent area fade, dashed horizontal gridlines only, no vertical grid, 10px axis labels, no legend chrome) sits beside a one-third "Needs attention" rail listing real overdue records.

FORM: an existing-surface replacement, inheriting product truth and function while replacing the incumbent visual world. Its roots are the Stitch token system and the uixpress reference supplied as the craft level: flat hairline cards, right-aligned big numbers, tiny uppercase column headers, a leading status-glyph column, segmented pill tabs, and a white airy sidebar. The elevation of that base is in three named lines. RESTRAINED ACCENT: uixpress spends blue on every dot and chart; this surface restricts one accent to emerald and lets black carry authority, so the accent still means something when it appears. HONEST DELTA: uixpress colours every delta green; a finance surface must read a rising payable as adverse, so delta colour follows direction of meaning, not direction of number. LEDGER CARTOGRAPHY: uixpress labels a table `PAGE` and `VIEWS`; this surface labels it with the accounting vocabulary the reader already has — `DOCUMENT`, `PARTY`, `AMOUNT` — and pairs each row with a status dot instead of a flag, so the reader reads their own ledger rather than a translated one.

SIGNATURE INTERACTION: the ⌘K command palette. It opens over the shell with a 160ms fade and 4px rise, groups real results by type (bill, invoice, customer, vendor, account) under tiny uppercase headers, and moves with arrow keys, enter, and escape. It is the surface's one authored motion moment; everything else stays under 220ms and quiet.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
