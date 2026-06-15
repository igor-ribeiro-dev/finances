# Feature Specification: Expense Consolidation

**Feature Branch**: `011-expense-consolidation`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "próxima fase do roadmap" — roadmap feature 017
(Expense Consolidation): eliminate the separate Expense Registration screen and
unify all spending records under the Monthly Payment Tracker. Any spending —
whether planned in advance or logged after the fact — is recorded as a bill and
immediately marked as Paid. The "Paid" state of a bill IS the expense record;
no parallel Expense entity is created or maintained. The Budget module is
adapted to compute actual spending from paid bills instead of standalone
expense entries. The Expense Registration route, navigation item, and API
endpoints are removed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log an Already-Made Purchase Directly in the Tracker (Priority: P1)

A family member buys groceries at the supermarket and wants to record that
spending. Instead of going to a separate "expenses" screen, they open the
Monthly Payment Tracker and use a single quick action ("registrar gasto") that
creates a bill already in the Paid state — entering description, amount paid,
purchase date, payment method, responsible member, and (optionally) category
in one step. The record immediately appears in the tracker's checklist for that
month and counts toward the family and member budgets.

**Why this priority**: This is the core of the consolidation — without a
one-step "log spending" flow in the tracker, removing the Expense Registration
screen would make after-the-fact logging impossible. It is the most frequent
daily action in the app.

**Independent Test**: With the tracker open on the current month, a member
logs a purchase in one action and verifies it appears as a Paid item in the
checklist and is reflected in the dashboard's spending totals for the month.

**Acceptance Scenarios**:

1. **Given** the tracker is open on any month, **When** a member uses the
   quick "log spending" action and fills in description, amount, purchase
   date, payment method, and responsible member, **Then** a bill is created
   already in the Paid state, with the purchase date recorded as its payment
   date, and it appears immediately in the checklist of the month of that
   purchase date (which may differ from the month being viewed).

2. **Given** a spending is logged via the quick action, **When** the member
   opens the budget dashboard for that month, **Then** the amount counts
   toward total family spending, the responsible member's spending, and the
   selected category's spending (if a category was assigned).

3. **Given** the quick "log spending" form, **When** the member submits an
   amount of zero or less, a blank description, or a purchase date in the
   future, **Then** the record is rejected with a field-level message in
   PT-BR and nothing is saved.

4. **Given** a spending was logged with a mistake, **When** the member edits
   the Paid item in the tracker, **Then** they can correct amount, date,
   description, payment method, responsible member, and category, and totals
   update accordingly.

---

### User Story 2 - Historical Data Remains Accurate After Consolidation (Priority: P1)

A family that has been using the app for months opens the dashboard after the
consolidation. All past months show exactly the same spending totals, member
breakdowns, and category percentages as before, even though the underlying
records are now paid bills instead of standalone expense entries. Every
spending the family ever registered is visible in the tracker checklist of its
respective month.

**Why this priority**: The consolidation must not lose or distort any
historical data. If past totals change, users lose trust in the app — this is
as critical as the new flow itself.

**Independent Test**: Capture the dashboard totals (family, per member, per
category) of every past month before the consolidation; after it, the same
totals are displayed for every one of those months, and each former standalone
expense appears exactly once as a Paid item in the tracker of its month.

**Acceptance Scenarios**:

1. **Given** standalone expenses registered before the consolidation, **When**
   the consolidation is applied, **Then** each of them becomes exactly one
   Paid bill carrying the same amount, date, description, payment method,
   responsible member, and category.

2. **Given** an expense that was created automatically by paying a bill
   (feature 015 flow), **When** the consolidation is applied, **Then** no
   duplicate record is created — the existing paid bill remains the single
   record for that spending.

3. **Given** any past month, **When** a member views the dashboard after the
   consolidation, **Then** total spent, per-member values, and category
   percentages are identical to the values shown before the consolidation.

4. **Given** a historical expense whose responsible member has since left the
   family group, **When** it is shown in the tracker after consolidation,
   **Then** the ex-member reference (the bill's payer, `paidByMember`) is
   preserved and visually indicated, as it was in the expense list.

---

### User Story 3 - One Place to Plan, Log, and Review (Priority: P2)

A family member opens the app and no longer sees a separate "Despesas"
navigation item. Planning future obligations, logging spending, and reviewing
what was paid all happen in the Monthly Payment Tracker. Attempting to access
the old expense screen by its address leads the user to the tracker instead of
an error.

**Why this priority**: Removing the duplicate entry point is the visible
payoff of the consolidation, but it only becomes safe after the unified flow
(US1) and the data migration (US2) are in place.

**Independent Test**: Inspect the app navigation — no expense registration
item exists; visiting the old expense route lands the user on the tracker;
the old expense operations are no longer available through the system's
service interface.

**Acceptance Scenarios**:

1. **Given** the consolidated app, **When** a member looks at the navigation,
   **Then** there is no "Despesas" / expense registration item, and the
   tracker is the single destination for spending records.

2. **Given** a member who bookmarked the old expense screen, **When** they
   open that address, **Then** they are taken to the Monthly Payment Tracker
   instead of seeing an error page.

3. **Given** the consolidated system, **When** any client attempts to use the
   removed expense operations, **Then** the system responds that the resource
   no longer exists.

---

### Edge Cases

- What happens when a quick-logged Paid item is reverted to Pending? It
  becomes a regular planned bill for its month — allowed, since a member may
  use revert to fix a mistaken "paid" entry; the spending stops counting
  toward budgets until it is paid again.
- What happens when a Paid item is deleted? After explicit confirmation, the
  record disappears from the checklist and its amount is removed from all
  budget and dashboard totals.
- How are cancelled and pending bills treated in spending totals? Exactly as
  today: only Paid items count as actual spending; Pending counts only as
  forecast inside the tracker summary; Cancelled never counts.
- What if two members edit the same Paid item at the same time? Last write
  wins, consistent with the behavior already established for expenses and
  bills.
- What about a planned bill paid with a date different from its due date?
  The spending counts toward the budget month of the payment date — unchanged
  from feature 015 behavior.
- What if a migrated expense had no category? The resulting Paid bill simply
  has no category, and continues to appear in the dashboard's "sem categoria"
  grouping as before.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Monthly Payment Tracker MUST offer a quick "log spending"
  action that creates a bill directly in the Paid state in a single step,
  capturing: description, amount actually paid, purchase date (recorded as the
  payment date), payment method (cash/debit or credit card), responsible
  member (any active member of the group), and an optional category. The
  purchase date defaults to today and MAY be backdated to any past (non-future)
  date; the calendar month of the purchase date — not the month currently
  displayed — determines the month in whose checklist the Paid bill appears
  and the budget month it counts toward.

- **FR-002**: A Paid bill MUST be the sole record of a spending. The system
  MUST NOT create or maintain a separate expense entry when a bill is paid or
  when a spending is quick-logged.

- **FR-003**: The Budget module and the Budget & Expense Dashboard MUST
  compute actual spending exclusively from Paid bills, using the amount
  actually paid, the payment date (for month attribution), the responsible
  member, and the assigned category. Resulting figures MUST follow the same
  rules that previously applied to expenses (spending counts in the calendar
  month of the payment date; family, member, and category breakdowns).

- **FR-004**: Every standalone expense existing before the consolidation MUST
  be converted into exactly one Paid bill preserving amount, date (as payment
  date and due date), description, payment method, responsible member,
  category, and authorship/audit information. To carry authorship, the Bill
  entity gains `createdById`/`updatedById` fields populated from the source
  expense. No record may be lost, duplicated, or altered in value.

- **FR-005**: Expenses that were created automatically by paying a bill
  (feature 015) MUST NOT generate an additional bill during the conversion —
  their payment data already lives on the existing bill, which remains the
  single record. Once authorship is carried onto the bill, the now-redundant
  linked expense row and the `Bill.expenseId` link are removed together with
  the rest of the Expense table.

- **FR-006**: Monthly dashboard totals (family total, per-member totals, and
  category percentages) for every month with historical data MUST be identical
  before and after the consolidation.

- **FR-007**: The Expense Registration screen, its navigation item, its
  service operations, and the underlying `Expense` table/model MUST be
  removed. Accessing the old expense screen address
  MUST redirect the user to the Monthly Payment Tracker; invoking the removed
  service operations MUST result in a "resource does not exist" response.

- **FR-008**: Members MUST be able to edit the payment data of any Paid bill —
  amount paid, payment date, description, payment method, responsible member,
  and category — with all budget and dashboard figures updating accordingly.
  Deleting a Paid bill MUST require explicit confirmation and MUST remove its
  amount from all totals.

- **FR-009**: Quick-logged Paid bills MUST behave as regular bills in every
  other respect: they can be reverted to Pending, cancelled (when Pending),
  edited, and deleted, following the state rules established by feature 015.

- **FR-010**: The quick "log spending" flow MUST enforce the same validation
  rules previously applied to expenses: amount greater than zero, purchase
  date not in the future, description of 1–200 meaningful characters, valid
  payment method, and responsible member active in the group at the time of
  the operation.

- **FR-011**: Pending bills MUST NOT count as actual spending in budgets or
  the dashboard; Cancelled bills MUST remain excluded from all totals. Only
  the tracker's own monthly summary continues to show Pending amounts as
  forecast.

- **FR-012**: The entire user interface affected by this feature — the quick
  log action, forms, messages, confirmations, and any renamed navigation —
  MUST be exclusively in Brazilian Portuguese (PT-BR).

### Key Entities

- **Bill (Conta)**: Existing tracker entity, now the single record for all
  spending. A Paid bill carries the full spending information: amount paid,
  payment date, payment method, responsible member, and optional category. It
  gains `createdById`/`updatedById` authorship fields and no longer links to
  an Expense (`expenseId` removed).
- **Payment Record (Pagamento)**: The payment data on a Paid bill — extended
  to carry payment method and responsible member, which previously lived on
  the expense entry.
- **Expense (Despesa)**: Retired and removed. Existing records are absorbed
  into Paid bills and the `Expense` table/model is dropped in this feature's
  migration; the separate registration screen and operations cease to exist.
- **Budget / Dashboard figures**: Unchanged in meaning; their source becomes
  Paid bills instead of expense entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A family member can log an already-made purchase, from opening
  the tracker to seeing it in the checklist, in under 30 seconds and within a
  single screen.

- **SC-002**: 100% of historical months display identical spending totals
  (family, per member, per category) before and after the consolidation.

- **SC-003**: Every spending record registered before the consolidation
  appears exactly once in the tracker afterwards — zero lost and zero
  duplicated records.

- **SC-004**: After the consolidation, the app navigation contains exactly one
  destination for recording spending, and 100% of attempts to open the old
  expense screen land on the tracker.

- **SC-005**: 100% of Paid bills — and only Paid bills — count toward budget
  consumption, attributed to the calendar month of their payment date.

## Clarifications

### Session 2026-06-14

- Q: When a quick-logged spending has a purchase date in a different month
  than the one currently open in the tracker, where does it appear and count?
  → A: The purchase/payment date governs. The quick-log form defaults to
  today and allows backdating to any past (non-future) date; the resulting
  Paid bill appears in — and counts toward — the calendar month of that
  purchase date, which may differ from the month currently displayed
  (consistent with the budget-attribution rule in FR-003/SC-005).
- Q: After the one-time migration, is the legacy `Expense` table kept or
  dropped — and how is authorship preserved given `Bill` has no author
  columns? → A: Dropped. This feature's migration physically removes the
  `Expense` table, the `Bill.expenseId` link, and the linked-expense
  read-only mechanism after a verified lossless conversion preceded by a
  database backup. To satisfy FR-004, `Bill` gains `createdById`/`updatedById`
  columns that carry the converted expense's authorship; the change is
  irreversible (recovery relies on the pre-migration backup).
- Q: A quick-logged/migrated spending has one "responsible member", but a Bill
  has both `ownerMemberId` (shown in the checklist) and `paidByMemberId`
  (drives per-member budgets). Which field(s) get set? → A: Only
  `paidByMemberId` (the payer) is set; `ownerMemberId` stays null for
  quick-logged and migrated spends, since an after-the-fact spending has no
  planned-obligation owner. The payer is the responsible member for budgets
  and for identity. To keep the responsible member visible, the tracker
  checklist displays `paidByMember` for Paid bills (preserving the ex-member
  indication of US2 Scenario 4); `ownerMember` is shown only for
  Pending/Cancelled bills that have one.

## Assumptions

- The conversion of existing standalone expenses into Paid bills happens as a
  one-time, automatic step during the rollout of this feature; users do not
  trigger or configure it. The step is irreversible and is preceded by a
  database backup: it drops the `Expense` table after a verified lossless
  conversion, so recovery relies on the backup rather than an in-app rollback.
- Budget month attribution uses the payment date of the Paid bill. For
  quick-logged spending the purchase date entered by the user is the payment
  date; for planned bills paid later, the behavior established by feature 015
  (payment date governs) is unchanged.
- Payment method and responsible member become part of the bill's payment
  data. Planned (Pending) bills continue not to require them; both are
  captured when the bill is paid or quick-logged.
- Category remains optional on any bill, as established by features 006/015.
- The roadmap's feature 011 (Expense History & Filtering) is unaffected in
  scope but will operate over Paid bills when it is specified; adapting that
  future feature is out of scope here.
- Credit Card Management (roadmap feature 016) is not implemented here; this
  feature only preserves the payment-method distinction (cash/debit vs credit
  card) on Paid bills so feature 016 can build on it.
- No income tracking, bank sync, or multi-currency concerns are introduced;
  product-wide constraints from the roadmap remain in force.
