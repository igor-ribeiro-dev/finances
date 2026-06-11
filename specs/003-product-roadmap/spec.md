# Feature Specification: Product Roadmap Guide

**Feature Branch**: `003-product-roadmap`

**Created**: 2026-05-17

**Status**: Draft

**Input**: User description: "Um plano que deve conter o guia de futuas especificações para atingirmos o produto final que desejamos com este app de finanças. A idéia e conter uma lista de feature/specs que deverão ser especificadas no futuro."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Feature Selection for Next Sprint (Priority: P1)

A product owner opens the roadmap to decide which feature should be specified
and built next. They can see all planned features, their priorities, and brief
descriptions, allowing them to make an informed decision about where to invest
development effort.

**Why this priority**: Without a prioritized feature list, each new development
cycle requires rebuilding context from scratch. This is the most frequent and
impactful use of the roadmap.

**Independent Test**: A product owner reads the roadmap document. They should
be able to identify the highest-priority unspecified feature and understand
what it involves well enough to immediately initiate `/speckit-specify` for it.

**Acceptance Scenarios**:

1. **Given** the roadmap document exists, **When** a product owner reads it,
   **Then** they can identify the top-priority unbuilt feature without
   consulting any other document.

2. **Given** a feature has been specified and built, **When** the product owner
   checks the roadmap, **Then** they can mark it as complete and see which
   feature should come next.

3. **Given** the roadmap lists multiple features at the same priority tier,
   **When** the product owner reviews them, **Then** each feature description
   provides enough context to choose between them.

---

### User Story 2 - New Team Member Orientation (Priority: P2)

A new developer or designer joins the project and reads the roadmap to
understand where the product is going. They can see what has been built, what
is in progress, and what is planned, giving them the full picture of the
app's intended scope.

**Why this priority**: Onboarding is a recurring need. A clear product roadmap
reduces ramp-up time and prevents misaligned contributions.

**Independent Test**: A person with no prior context reads the roadmap. After
reading it, they should be able to describe the intended product in their own
words and name the next two features to be worked on.

**Acceptance Scenarios**:

1. **Given** the roadmap document exists, **When** a new team member reads it,
   **Then** they understand the overall product vision in under 5 minutes.

2. **Given** features are grouped by priority tier, **When** a new member
   reviews them, **Then** they can distinguish between what is essential (P1),
   important (P2), and nice-to-have (P3).

---

### User Story 3 - Architectural Decision Support (Priority: P3)

A developer making a technical decision during implementation checks the
roadmap to understand what features are coming. They can ensure their current
work does not block or complicate future features.

**Why this priority**: Preventing rework by considering future requirements is
valuable, but secondary to the roadmap's role as a planning tool.

**Independent Test**: A developer reads the roadmap and identifies at least one
future feature that has architectural implications for a feature currently
being built.

**Acceptance Scenarios**:

1. **Given** a developer is designing a data model, **When** they consult the
   roadmap, **Then** they can see upcoming features that interact with that
   data model.

2. **Given** the roadmap is updated with a new feature, **When** a developer
   reviews it, **Then** they understand whether it affects current in-progress
   work.

---

### Edge Cases

- What happens when a planned feature becomes irrelevant after a later feature
  is specified? The roadmap must allow features to be removed or marked as
  superseded.
- How does the roadmap stay consistent when a new feature is split into two
  during specification? The original entry should be replaced by references to
  the two new specs.
- What if two features in different priority tiers turn out to be dependent?
  The roadmap must express dependencies between features.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The roadmap MUST define the product vision in a single,
  non-technical paragraph accessible to any stakeholder.

- **FR-002**: The roadmap MUST list all planned features with a short name,
  a one-paragraph description, and a priority tier (P1, P2, P3).

- **FR-003**: Each feature entry MUST contain enough information to initiate a
  full `/speckit-specify` session without requiring additional research.

- **FR-004**: Features MUST be grouped by priority tier so the build order is
  immediately visible.

- **FR-005**: Each feature entry MUST indicate its current status: Planned,
  In Specification, Specified, In Development, or Complete.

- **FR-006**: The roadmap MUST express dependencies between features where
  one feature must be completed before another can begin.

- **FR-007**: The roadmap MUST be a living document — it MUST be possible to
  add, remove, reprioritize, or update any feature entry without invalidating
  other entries.

### Product Vision

This app is a family budget tracker. It allows a household — made up of
multiple family members — to register expenses, monitor how spending is
distributed across categories, and track budgets at two levels: one shared
family budget and individual budgets per member. The goal is not to replace
a full accounting system but to give families a clear, simple view of where
their money is going and whether they are staying within their limits.

The entire user interface is presented exclusively in Brazilian Portuguese
(PT-BR). This is a fixed product constraint that applies to every feature
across all priority tiers.

### Glossary

- **Fatura**: The monthly credit card statement bill — the single payment that settles all purchases made with a credit card in a given billing period. In the app, a fatura is represented as a Bill with a creditCardId, manually registered by the user at payment time.

### Cross-Cutting Constraints

- **Language**: The UI MUST be exclusively in Brazilian Portuguese (PT-BR).
  No language selection or internationalization mechanism is required.
  All labels, messages, error texts, and navigation elements must be in PT-BR.

### Planned Features

#### Priority 1 — Core (must exist for the app to be usable)

| # | Feature | Description | Status | Depends On |
|---|---------|-------------|--------|------------|
| 004 | User Authentication & Family Groups | Register, log in, and manage credentials. Create a family group or join one via a shareable invite link or short code. All members of the family group are equal — any member can view and edit all expenses and budgets belonging to the group. | Complete (spec 004) | 001 |
| 005 | Expense Registration | Record individual expenses with an amount, date, description, payment method (cash/debit or credit card), and the family member the expense belongs to (assignable to any member, not necessarily the one recording it). Category assignment is optional. All expenses — including those paid by credit card — count against the budget at the date they are registered. The app does not sync with or automatically calculate credit card bills. | Complete (spec 006) | 004 |
| 006 | Expense Categories | Define and manage a two-level category hierarchy: root categories (e.g., Food, Housing) and sub-categories under each root (e.g., Food → Groceries, Restaurants). Categories are shared across the family group and used to group and analyze spending. | Complete (spec 007) | 004 |
| 007 | Budget Management | Set a global family budget and individual budgets per family member for each calendar month. The family budget is independent — it is set directly by any member and has no required relationship to the sum of individual member budgets. Category budgets can be defined at the root level (e.g., Food: R$1.500/month) and optionally broken down further into sub-category limits. Sub-category budgets are optional; a root-level cap alone is valid. When sub-category totals exceed the root cap, an advisory warning is shown but saving is not blocked. | Complete (spec 008) | 005, 006 |
| 008 | Budget & Expense Dashboard | A summary view defaulting to the current calendar month showing: total spent vs. family budget, each member's spending vs. their individual monthly budget, and a category breakdown with percentages. The user can navigate to any past calendar month to review its snapshot. All expenses — including those paid by credit card — count toward spending totals. | Complete (spec 009) | 007 |
| 015 | Monthly Payment Tracker | A checklist-style view of all financial obligations for a selected month. Bills are added manually, generated automatically by recurring bills (absorbed from feature 012: "contas fixas" with monthly/annual interval, pause and stop), copied from the previous month via a manual action, or created as credit card faturas (feature 016). Includes a dedicated summary section per registered credit card showing the accumulated open charges not yet covered by a paid fatura — giving visibility into upcoming cash obligations before the fatura bill is formally created. Each bill item has one of three states: Pending, Paid, or Cancelled. When a bill is marked as Paid, the payment date and actual amount paid are recorded separately from the originally estimated amount, and a corresponding expense entry is created automatically. Cancelled items remain visible but excluded from totals. | Complete (spec 010) | 005 |
| 017 | Expense Consolidation | Eliminate the separate Expense Registration screen and unify all spending records under the Payment Tracker. Any spending — whether planned in advance or logged after the fact — is recorded as a bill and immediately marked as Paid. The "Paid" state of a bill IS the expense record; no parallel Expense entity is created or maintained. The Budget module is adapted to compute actual spending from paid bills instead of standalone expense entries. The Expense Registration route, navigation item, and API endpoints are removed. The overall UX becomes simpler: one place to plan, one place to log, one place to review. | Planned (spec 011) | 015 |
| 016 | Credit Card Management | Register one or more credit cards for the family group (e.g., Nubank, Itaú Visa). When recording an expense, the user selects which card was used. Credit card expenses appear in expense history immediately and count toward category budgets at purchase date. Feature provides a dedicated per-card view listing all registered purchases with a running total — allowing the user to see exactly what is building up before the fatura is paid. The Monthly Payment Tracker (feature 015) also shows a summary of open charges per card. The fatura is manually registered by the user as a Bill in the tracker (with creditCardId set); no bank sync. Cash-outflow totals count only the fatura payment, not the individual child expenses, preventing double-counting. | Planned | 005, 015 |

#### Priority 2 — Important (significantly improves usability)

| # | Feature | Description | Status | Depends On |
|---|---------|-------------|--------|------------|
| 009 | Category Spending Analytics | Visual charts showing how spending is distributed across categories for the same month currently selected on the dashboard. Percentage share per category, viewable for the whole family or filtered by individual member. The period always mirrors the dashboard's active month selection — no independent period picker. | Planned | 006, 007 |
| 010 | Budget Alerts | Notify any member via in-app notification when spending approaches or exceeds a budget limit — at both the individual and family level. "Approaching" defaults to 80% of the limit consumed; each budget can have a custom threshold percentage that overrides the default. Alerts appear within the app; no push or email delivery. All members receive the same visibility into budget status. | Planned | 007 |
| 011 | Expense History & Filtering | Browse all recorded expenses for the family or filtered by member, category, date range, payment method (cash/debit or credit card), or specific credit card. Allows reviewing and correcting past entries. | Planned | 005 |

#### Priority 3 — Extended (valuable but not essential for launch)

| # | Feature | Description | Status | Depends On |
|---|---------|-------------|--------|------------|
| 012 | Recurring Expenses | Mark an expense as recurring so it is automatically logged at its defined interval without manual re-entry. Supported intervals: monthly and annual. When the scheduled day does not exist in a given month (e.g., the 31st in February), the entry is logged on the last day of that month. A recurring expense can be paused (temporarily skips future periods) or permanently stopped. When stopped, all PENDING BillPayment entries for future months are automatically set to CANCELLED. Past (already settled or cancelled) entries are always preserved. Recurring expenses auto-populate the Monthly Payment Tracker (feature 015) as Pending items for each relevant period while active. | Superseded — absorbed into 015 (spec 010) | 005 |
| 013 | Period-over-Period Reports | Monthly and custom-period reports comparing spending across periods. All expenses — including individual credit card purchases — appear as line items in their respective categories. Fatura payments also appear as separate line items. "Total cash paid" in any report sums only direct expenses (CASH_OR_DEBIT) + fatura payments; individual credit card expenses are excluded from that total to prevent double-counting. | Planned | 009 |
| 014 | Data Export | Export the family's expense history as a standard file (e.g., CSV) for external review, backup, or tax purposes. | Planned | 005 |

### Key Entities

- **Roadmap**: The document itself — a versioned list of features with their
  status and priority, used to guide specification and development work.
- **Feature Entry**: A single item in the roadmap — includes a sequential
  number, name, description, priority tier, status, and dependency list.
- **Priority Tier**: A grouping label (P1, P2, P3) indicating when a feature
  should be built relative to others.
- **Status**: The current lifecycle stage of a feature entry — Planned,
  In Specification, Specified, In Development, or Complete.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Any team member can identify the highest-priority unspecified
  feature and begin writing its spec within 5 minutes of reading the roadmap.
- **SC-002**: The roadmap lists at least one P1 feature covering each of the
  five core budget-tracker capabilities: authentication, expense recording,
  categorization, budgeting, and payment tracking.
- **SC-003**: Every feature entry is understandable to a non-technical
  stakeholder without requiring supplementary explanation.
- **SC-004**: The roadmap remains accurate — within one working day of any
  feature changing status, the roadmap is updated to reflect it.
- **SC-005**: New features can be added to the roadmap without disrupting or
  rewriting existing entries.

## Clarifications

### Session 2026-05-17

- Q: Within a family group, can all members see everyone's expenses and individual budgets — or should there be a distinction between a family admin and regular members? → A: All members are equal — any member can view and edit all expenses and budgets.
- Q: Which budget model should the app support — per-category budgets, total spending caps, or both? → A: Expenses are individually categorized (optional); categories are hierarchical with root and sub-categories. Budget scope aligns with this structure.
- Q: What period should budgets be defined for — monthly fixed calendar month, custom periods, or both? → A: Monthly, fixed calendar month.
- Q: When registering an expense, does it always belong to the recorder, or can it be assigned to any family member? → A: Assignable — the recorder selects which family member the expense belongs to.
- Q: How does a new member join an existing family group? → A: Invite by link or code — the group creator generates a shareable link or short code.

### Session 2026-05-17 (continued)

- Q: In the Monthly Payment Tracker, where does the list of items come from — registered expenses, a separate bills list, or both? → A: Both — registered expenses can be marked as settled AND a separate "expected bills" list exists for known monthly obligations; paying a bill creates a corresponding expense entry.
- Q: At which category level should monthly budgets be set — root only, sub-category only, or both? → A: Both levels — users set a root-category cap and can optionally break it down into sub-category limits; sub-category budgets are optional.
- Q: What are the valid payment states in the Monthly Payment Tracker? → A: Three states — Pending, Paid, and Cancelled. Cancelled items remain visible but excluded from totals.
- Q: When marking a bill as Paid with a different actual amount, does the actual amount replace the original or are both stored? → A: Both stored — original expected amount is preserved as reference; actual payment amount recorded separately on the payment event.
- Q: Does the Monthly Payment Tracker auto-populate from Recurring Expenses each month? → A: Yes — recurring expenses automatically appear as Pending items in the tracker for each relevant month.

### Session 2026-05-17 (credit card)

- Q: When does a credit card expense affect the monthly budget — at purchase date or at fatura payment date? → A: At purchase date — credit card expenses count against the budget immediately when registered, exactly like cash expenses. Fatura payment is a cash-flow event only and does not affect budgets a second time.
- Q: Can a credit card fatura be partially paid, or must it always be settled in full? → A: Full amount only — the fatura is a single obligation paid in full; no carry-over or partial payment tracking.
- Q: Should the dashboard show an open fatura balance per card, or is credit card spending only visible through category totals? → A: No automatic fatura tracking. The app does not sync with or calculate card bills. Credit card expenses are tagged informational only; the user manually registers the fatura as a bill at payment date. No CreditCard or CreditCardBill entities needed.
- Q: How should a fatura Bill be linked to a CreditCard for double-counting prevention — creditCardId field, category convention, or no link? → A: creditCardId field on Bill — when creating a fatura bill, the user selects the credit card it represents; the system uses this to exclude that card's expenses from cash-outflow totals automatically.
- Q: Should the dashboard show both budget consumed and actual cash paid, or just budget view? → A: Budget view only — all expenses (including credit card) count toward spending totals on the dashboard; no separate cash-paid figure.

### Session 2026-05-17 (checklist gaps)

- Q: What threshold defines "approaching" a budget limit in feature 010? → A: Defaults to 80% consumed; each budget can optionally override with a custom threshold percentage.
- Q: What recurrence intervals does feature 012 support, and how is the day-of-month edge case handled? → A: Monthly and annual. When the scheduled day doesn't exist in a month, entry is logged on the last day of that month.
- Q: Is the dashboard locked to the current month or can the user navigate to past months? → A: Defaults to current month; user can navigate to any past calendar month to review its snapshot.
- Q: How should budget alerts be delivered — in-app only, push, or email? → A: In-app only — alerts appear within the app; no push notifications or email required.
- Q: Can a recurring expense be stopped/paused, and what happens to past entries? → A: Both pause (skip future periods) and stop (no future entries) are supported. Past auto-generated entries are always preserved.

### Session 2026-05-17 (checklist resolution)

- Q: When sub-category budget totals exceed the root category cap, does the system block saving or show a warning? → A: Advisory warning only — values are saved; no save is blocked. [CHK039 resolved]
- Q: Is the family budget total independent from member budget totals, or derived as their sum? → A: Independent — the family budget is set directly by any member with no required relationship to member budget totals. [CHK041 resolved]
- Q: When a recurring Bill is STOPPED, what happens to already-generated future PENDING BillPayments? → A: Auto-cancelled — all PENDING BillPayments for months after today are set to CANCELLED. Past entries always preserved. [CHK052 resolved]
- Q: What does Budget.limitCents = 0 mean — "no spending allowed" or "no budget set"? → A: No budget set — a zero limit means the budget is inactive; no alerts fire and spending is unconstrained. [CHK054 resolved]

### Session 2026-05-17 (final gaps)

- Q: Does feature 009 analytics have its own period selector or mirror the dashboard month? → A: Mirrors the dashboard — analytics always shows the same month currently selected on the dashboard; no independent period picker.
- Q: Should expense history (011) support filtering by specific credit card? → A: Yes — filter by specific registered credit card added to feature 011, alongside existing member/category/date/payment-method filters.
- Q: In reports, should individual card expenses and the fatura both appear, and how should totals work? → A: Both appear as line items. Credit card expenses are child records (show category/member breakdowns); the fatura is the parent cash event. "Total cash paid" = direct expenses + fatura payments only — individual card expenses excluded from that total to prevent double-counting.
- Q: What should the app show for credit card expenses in a month where the fatura has not yet been paid? → A: Show as registered — they appear in expense history and count toward budget; a "pending fatura" indicator shows the expected cash outflow that hasn't been paid yet.
- Q: Where should the pending fatura indicator appear? → A: Both the Monthly Payment Tracker (a summary section per card showing open charges) AND a dedicated per-card view in feature 016 (full purchase list with running total).

## Assumptions

- The target product is a family budget tracker for a single household, not
  a multi-tenant or business accounting product.
- The UI language is fixed as Brazilian Portuguese (PT-BR) for all features;
  no multilingual support or locale switching is required.
- Each household forms one "family group"; members join via a shareable
  invite link or short code generated by the group creator.
  Cross-household sharing is out of scope.
- All monetary values are recorded in a single currency (multi-currency
  support is out of scope).
- There is no integration with bank accounts or automatic transaction import;
  all expenses are entered manually.
- The app tracks expenses (outflows) only; income tracking is out of scope
  for the initial version.
- Feature numbers in the roadmap are sequential and align with the spec
  directory numbering convention already established in this project.
  Specs 001 (monorepo architecture), 002 (backend entities), and 003
  (this roadmap) are infrastructure/planning artifacts and do not appear
  as product features.
- Features in P3 may be deferred or removed based on user feedback gathered
  after P1 and P2 features are live.
