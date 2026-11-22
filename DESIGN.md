# FINZI AI Design System

Source of truth: Stitch design system
`stitch_finzi_ai_design_system/stitch_finzi_ai_design_system/finzi_ai_application_shell/code.html`
Craft reference: uixpress dashboard (supplied by the user as the desired craft level — structure learned, not pixels copied).

## Product

FINZI AI — accounting, GST and audit workspace for CA firms in India. Primary user: practice accountant working many client companies in one workspace, hours per day. Mode: Operate (scanability and consistency outrank expression).

## Visual world

Canvas: `#f9f9ff` (cool light grey). Raised surfaces: `#ffffff` with a 1px `#e9ebf2` hairline and 12px border-radius. Depth from the hairline + gutter, never from heavy shadows; one soft two-layer shadow (`shadow-pop`) for overlays. No gradient text, no neon glow, no glass as decoration, no left accent bars above 1px, no icon tiles, no hero metrics, no eyebrow labels, no card grids as page structure, no nested cards.

## Color system (Stitch, verbatim)

| Role | Value | Use |
|------|-------|-----|
| primary | `#000000` | Authority: primary buttons, headings |
| on-primary | `#ffffff` | Text on primary |
| primary-container | `#111c2e` | Dark shell panels |
| on-primary-container | `#79849a` | Muted text on dark shell |
| secondary | `#006d44` | Accent: primary actions, selected state, favourable deltas, chart line |
| on-secondary | `#ffffff` | |
| secondary-container | `#7df7b6` | |
| on-secondary-container | `#007147` | |
| tertiary | `#000000` | |
| background | `#f9f9ff` | Page canvas |
| on-background | `#121b2e` | |
| surface | `#ffffff` | Raised panels/cards |
| surface-container-low | `#f1f3ff` | Hover/active washes |
| surface-container-lowest | `#ffffff` | |
| on-surface | `#121b2e` | Body/headings |
| on-surface-variant | `#45474c` | Secondary text |
| outline | `#75777d` | Strong borders/focus rings |
| outline-variant | `#c5c6cd` | Muted borders |
| error | `#ba1a1a` | Adverse/danger |
| on-error | `#ffffff` | |
| error-container | `#ffdad6` | |
| on-error-container | `#93000a` | |
| inverse-surface | `#273044` | |
| inverse-on-surface | `#edf0ff` | |

Semantic aliases used in markup: `brand` = `#006d44` (secondary), `brand-soft` = `#e6f4ec`, `brand-wash` = `#f1f8f4`, `brand-ring` = `rgba(0,109,68,0.28)`, `warn`/`warning` = `#8a5a0b` with `#fdf3e2` wash, `danger`/`neg`/`error` = `#ba1a1a` with `#fdeceb` wash, `info` = `#2a4f9c` with `#eaf0fb` wash, `canvas`/`surface-base` = `#f9f9ff`, `line` = `#e9ebf2`, `ink-2/3/4` = `#45474c/#75777d/#c5c6cd`, `sub`/`sub-2` = `#f1f3ff/#e9edff`.

Negative deltas and adverse states are `#ba1a1a`, never green — a payable increasing is never coloured favourable.

## Typography

Faces: Inter (UI/display), JetBrains Mono (GSTIN, invoice/voucher/account codes, monospaced data). Scale: 10–28px; hierarchy carried by weight and colour, not size jumps. All money cells and counts use `font-variant-numeric: tabular-nums`. Body 13px/20; KPI figures 18px/24 tabular; micro-labels 10px/600 with 0.08em tracking, uppercase. More space above a heading than below it. Tracking tightens as size grows; body measure 45–75ch.

## Components

- **Button**: 7 variants (primary/black, green/emerald, secondary, outline, ghost, danger, success) × 5 sizes. Press settle `scale(0.98)` at 120ms; focus-visible ring 3px `ink/30`; never a coloured mouse halo. `cursor: pointer` on all clickables.
- **Card**: white, 1px `#e9ebf2` hairline, 12px radius, no shadow, optional hover-lift. Leaf container — never nested. `description`/`action` slots in header.
- **Input/Textarea/Select**: 40px height, hairline border, emerald focus ring, 10px–13px text, monospace GSTIN/PAN fields.
- **StatusBadge**: tinted pill with the status in words; colour never alone (dot/word). Tones map to status words (paid/approved → green tint, overdue/rejected → red tint, pending/review → amber tint).
- **Chip**: dot + figure readout at card top-right.
- **Segmented**: pill tab switch under page titles; active pill = raised white surface on canvas track.
- **Table (DataTable)**: sticky header, 9.5px uppercase tracked column headers, hairline rows, right-aligned tabular figures, leading status-glyph column.
- **KpiCard**: title + info glyph top-left, metric chip top-right, then label-left / figure-right rows with hairline separation.
- **Shell**: white airy sidebar (248px → 68px collapse, 220ms), tiny uppercase section labels, active row = `#f1f3ff` wash + 2px emerald indicator, custom company-switcher dropdown. Sticky top nav `bg-white/85 backdrop-blur` with page title/subtitle left, actions right. ⌘K command palette groups real results by type under uppercase headers; arrow keys, Enter, Escape; ESC/outside-click close menus; focus returns to trigger.

## Motion

Transform + opacity only; never width/height/top/left. Ease `cubic-bezier(0.23, 1, 0.32, 1)`. Page transitions 220ms fade/rise; dropdowns/modals/toasts 160–200ms (scale 0.97→1); hover lift `translateY(-1px)` gated to fine pointers; press `scale(0.98)`; skeleton shimmer 1.6s; KPI count-up 600ms on real values. `prefers-reduced-motion` reduces to gentler/shorter; state feedback kept.

## Browser surfaces

Text selection `#006d44/0.16` on `#003d27`; caret emerald; custom scrollbars (`#dcdff0` thumb); focus rings themed from palette.

## Honesty

No capability is implied that the app does not have: GSTN filing, OCR extraction, SMS and AI write-back are marked "pending integration"; email is shown as configured (real Resend keys). No fake statistics, no invented customers or benchmarks.

## Design decisions log

- Sidebar: light airy (user choice over Stitch's dark navy). Emerald used as single accent instead of Stitch's blue distribution.
- Delta colour follows direction of *meaning* (adverse = red), not direction of number.
- Table column headers use accounting vocabulary (DOCUMENT / PARTY / AMOUNT), not generic labels.
- Sidebar active row uses wash + 2px indicator instead of full fill.
- Inter kept as brand face despite detector advisory — Stitch source of truth mandates Inter.

## Verification

`tsc --noEmit` → 0 errors; `vite build` → success; 23-route sweep → 0 console errors; `impeccable detect` → 1 advisory (Inter as brand face, intentional). Built and probed at `:5173` with computed styles: canvas `#f9f9ff`, sidebar `#111c2e`/`#ffffff`, primary button `#000000`, cards `#ffffff`/hairline/12px, focus rings present.