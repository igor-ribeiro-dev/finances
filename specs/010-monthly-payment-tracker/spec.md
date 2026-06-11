# Feature Specification: Monthly Payment Tracker

**Feature Branch**: `010-monthly-payment-tracker`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "Próxima fase do roadmap" — roadmap feature 015,
Monthly Payment Tracker: a checklist-style view of all financial obligations
for a selected month. Bills are added manually; each bill item has one of
three states (Pending, Paid, or Cancelled). When a bill is marked as Paid,
the payment date and actual amount paid are recorded separately from the
originally estimated amount, and a corresponding expense entry is created
automatically. Cancelled items remain visible but excluded from totals.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and View Monthly Bills (Priority: P1)

A family member opens the payment tracker to see all known financial
obligations for the current month — rent, electricity, internet, school
tuition — as a checklist. They add a new expected bill by entering a
description, the expected amount, and a due date. The bill appears in the
checklist for the month of its due date, marked as Pending.

**Why this priority**: The checklist of expected obligations is the core of
the feature. Without the ability to register and see bills for a month,
no other behavior (paying, cancelling, totals) has anything to operate on.

**Independent Test**: Can be fully tested by adding a bill with description,
expected amount, and due date, then confirming it appears as Pending in the
checklist of the corresponding month. Delivers value as a standalone monthly
obligations list even before payment recording exists.

**Acceptance Scenarios**:

1. **Given** the tracker is open on the current month, **When** a member adds
   a bill with description "Aluguel", expected amount R$ 2.000,00, and due
   date inside the current month, **Then** the bill appears in the checklist
   as Pending with its description, expected amount, and due date visible.

2. **Given** a member adds a bill with a due date in a future month, **When**
   they navigate the tracker to that month, **Then** the bill appears in that
   month's checklist and not in the current month's.

3. **Given** bills exist for the current month, **When** any other family
   group member opens the tracker, **Then** they see the same checklist —
   all members have equal access to view and manage bills.

4. **Given** a member is adding a bill, **When** they leave the expected
   amount empty or enter zero or a negative value, **Then** the bill is not
   saved and a PT-BR validation message explains the problem.

5. **Given** a Pending bill exists, **When** a member edits its description,
   expected amount, or due date, **Then** the changes are saved and visible
   to all members.

6. **Given** the previous month has non-Cancelled one-off bills and the
   selected month is empty, **When** a member uses the "copy bills from
   previous month" action, **Then** new Pending bills are created in the
   selected month mirroring those bills' descriptions, expected amounts,
   categories, responsible members, and equivalent due days.

---

### User Story 2 - Mark a Bill as Paid (Priority: P1)

When a family member pays an obligation, they mark the bill as Paid in the
tracker. They confirm the payment date and the actual amount paid — which may
differ from the originally expected amount — plus which family member the
payment belongs to and the payment method. The original expected amount is
preserved for reference, and a corresponding expense entry is created
automatically so the payment counts toward the family's spending and budgets.

**Why this priority**: Recording payments is the action that turns the
checklist into a tracking tool and connects obligations to the existing
expense and budget system. It is the second half of the feature's core value.

**Independent Test**: Can be tested by marking a Pending bill as Paid with an
actual amount different from the expected amount, then verifying the bill
shows both amounts and that a matching expense appears in the expense history.

**Acceptance Scenarios**:

1. **Given** a Pending bill with expected amount R$ 200,00, **When** a member
   marks it as Paid informing payment date, actual amount R$ 187,50, the
   responsible family member, and the payment method, **Then** the bill
   status changes to Paid and both the expected amount (R$ 200,00) and the
   actual amount paid (R$ 187,50) are stored and displayed.

2. **Given** a bill is marked as Paid, **When** the member checks the expense
   history, **Then** an expense entry exists with the actual amount paid, the
   payment date, the selected member, the selected payment method, and the
   bill's category (when one was set on the bill).

3. **Given** a bill is marked as Paid with a payment date in the current
   month, **When** the member opens the budget dashboard for the current
   month, **Then** the automatically created expense counts toward the family
   and member spending totals like any other expense.

4. **Given** a member is marking a bill as Paid, **When** the payment form
   opens, **Then** it is pre-filled with the expected amount as the actual
   amount and today's date as the payment date, both editable.

5. **Given** a bill due in May is only paid in June, **When** the member
   records the payment with a June payment date, **Then** the bill remains
   listed in May's checklist as Paid, and the expense counts toward June's
   spending (the month of the payment date).

---

### User Story 3 - Recurring Bills (Priority: P1)

A family member registers a recurring bill ("conta fixa") once — for example,
the electricity bill, due on the 10th of every month. They may not know the
exact amount in advance, so they set an estimated expected amount. From then
on, the system automatically creates the Pending bill of the current and the
next calendar months, with no manual re-entry; months further in the future
show the recurring bill as a read-only **projected entry ("Prevista")** that
becomes a real Pending bill when its month approaches. Each materialized
instance can have its expected amount adjusted, and is paid like any other
bill — recording the actual amount at payment time. The recurrence can be
paused temporarily or stopped permanently.

**Why this priority**: Most household obligations repeat monthly. Without
automatic recurrence the tracker demands re-entry every month, which is the
exact friction this feature exists to remove. This absorbs roadmap feature
012 (Recurring Expenses) into the tracker.

**Independent Test**: Can be tested by registering a monthly recurring bill
and verifying, without any manual action, that the current and next months
show a Pending instance with the template's data, and that months beyond
the window show a read-only projected entry ("Prevista").

**Acceptance Scenarios**:

1. **Given** a recurring bill "Conta de energia" with monthly interval, due
   day 10, and estimated amount R$ 300,00, **When** a member opens the
   current or the next month, **Then** that month's checklist shows a
   Pending bill with that description, expected amount, and due date on the
   10th — created automatically, with no user action.

2. **Given** the same recurring bill, **When** a member navigates to a month
   beyond the next one, **Then** the checklist shows a projected entry
   ("Prevista") with the template's description, estimated amount, and due
   date — visually distinct, read-only (it cannot be paid, edited, or
   cancelled), and always reflecting the template's current values. When
   that month approaches (enters the current/next window), the projection
   becomes a real Pending bill.

3. **Given** a recurring bill with due day 31, **When** an applicable month
   has fewer days, **Then** the instance's (or projection's) due date is the
   last day of that month.

4. **Given** a generated Pending instance, **When** a member edits its
   expected amount for that month (e.g., the energy estimate changed),
   **Then** only that month's instance changes — the template and other
   months are unaffected.

5. **Given** a generated Pending instance, **When** a member marks it as
   Paid with the actual amount, **Then** it behaves exactly like a manual
   bill payment: actual amount recorded, expense created automatically.

6. **Given** a recurring bill is paused, **When** subsequent months arrive,
   **Then** no new instances are generated and no projections are shown
   until it is resumed; already existing instances are untouched.

7. **Given** a recurring bill is stopped permanently, **When** the member
   reviews the tracker, **Then** all its Pending instances in months after
   the current one are automatically Cancelled, its projections disappear,
   and past and current instances (Paid, Pending, or Cancelled) are
   preserved.

8. **Given** a recurring bill with annual interval (e.g., IPVA every March),
   **When** the member browses the months, **Then** an instance (or
   projection) appears only once a year, in the matching month.

---

### User Story 4 - Cancel a Bill and Revert States (Priority: P2)

An obligation becomes irrelevant — a subscription was terminated, or a bill
was added by mistake. A member cancels it: the bill remains visible in the
month's checklist, struck through or visually distinct, but it no longer
counts toward any totals. Mistakes in any direction can be undone: a
Cancelled bill can be reactivated to Pending, and a Paid bill can be
reverted to Pending, which removes the automatically created expense.

**Why this priority**: Real households change plans constantly. Without
cancel and revert, every mistake would permanently distort totals, but the
feature is still usable for the happy path without it.

**Independent Test**: Can be tested by cancelling a Pending bill and
verifying it remains visible but excluded from totals, then reactivating it
and verifying it is counted again.

**Acceptance Scenarios**:

1. **Given** a Pending bill, **When** a member cancels it, **Then** its
   status changes to Cancelled, it remains visible in the month's checklist
   with a distinct visual treatment, and it is excluded from all totals.

2. **Given** a Cancelled bill, **When** a member reactivates it, **Then** its
   status returns to Pending and it counts toward totals again.

3. **Given** a Paid bill, **When** a member reverts the payment, **Then** the
   bill returns to Pending, the recorded payment date and actual amount are
   cleared, and the automatically created expense is removed from the expense
   history and from all budget totals.

4. **Given** a Paid bill, **When** a member tries to cancel it directly,
   **Then** the action is unavailable — the payment must be reverted first
   before the bill can be cancelled.

---

### User Story 5 - Month Summary and Navigation (Priority: P2)

A family member reviewing the month sees, at the top of the checklist, the
month's summary: total expected (sum of expected amounts of Pending and Paid
bills), total already paid (sum of actual amounts of Paid bills), and total
still pending (sum of expected amounts of Pending bills). They can navigate
to any past or future month to review or prepare its checklist.

**Why this priority**: Totals and navigation turn the list into an answer to
the question "how much is still coming this month?", but depend on the lists
and states from earlier stories existing first.

**Independent Test**: Can be tested by creating bills in different states
across two months and verifying each month's totals count only that month's
non-cancelled bills, with pending/paid split correctly.

**Acceptance Scenarios**:

1. **Given** a month with a Paid bill (expected R$ 100,00, actual R$ 90,00),
   a Pending bill (expected R$ 50,00), and a Cancelled bill (expected
   R$ 30,00), **When** the member views the month summary, **Then** total
   expected shows R$ 150,00, total paid shows R$ 90,00, and total pending
   shows R$ 50,00 — the cancelled bill appears in no total.

2. **Given** the tracker is open, **When** the member navigates to a previous
   or future month, **Then** the checklist and summary update to show only
   that month's bills.

3. **Given** a month with no bills, **When** the member opens it, **Then** an
   empty state in PT-BR invites them to add the month's first bill.

---

### Edge Cases

- What happens when a member deletes or edits the automatically created
  expense directly in the expense history? The linked expense is managed by
  the tracker: it cannot be edited or deleted from the expense module, and a
  notice directs the member to the payment tracker. Payment data is corrected
  by editing the Paid bill; reverting the payment is the way to remove it.
- What happens when two members act on the same bill at the same time (one
  pays, the other cancels)? The first action persisted wins; the second
  member sees an updated state and a PT-BR message that the bill changed.
- What happens to a Pending bill whose due date has passed? It remains
  Pending in its month's checklist and is visually flagged as overdue; it is
  never moved or cancelled automatically.
- Can a bill be deleted outright? Only bills that were never paid (Pending or
  Cancelled) can be deleted, after confirmation. Paid bills must be reverted
  first, preserving an intentional trail.
- What happens when "copy bills from previous month" is used on a month that
  already has bills? The action remains available and adds new copies; the
  confirmation dialog states how many bills will be created, so the member
  can avoid unintended duplicates. Instances generated by recurring bills
  are never copied — recurrence produces them itself.
- What happens when a recurring bill's instance for a month was manually
  edited and the template is later edited? The template edit overwrites
  Pending instances in months after the current one — last edit wins. Paid
  and Cancelled instances are never touched.
- What happens to a recurring bill when its category or responsible member
  is removed from the system? The template keeps working; new instances are
  generated without the removed reference, consistent with optional fields.
- What happens when a bill's category is removed from the category structure
  after the bill was created? The bill keeps working; the payment expense is
  created without a category (consistent with category assignment being
  optional on expenses).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow any family group member to register a
  bill with a description, an expected amount greater than zero, and a due
  date. An optional category and an optional responsible family member may
  also be set.

- **FR-002**: The system MUST place each bill in the checklist of the
  calendar month of its due date, and MUST allow bills to be created for the
  current month, past months, and future months.

- **FR-003**: The system MUST present, for a selected month, a checklist of
  all that month's bills showing description, expected amount, due date,
  status, and — for Paid bills — payment date and actual amount paid.

- **FR-004**: Each bill MUST be in exactly one of three states: Pending,
  Paid, or Cancelled. New bills start as Pending.

- **FR-005**: The system MUST allow a Pending bill to be marked as Paid,
  recording the payment date, the actual amount paid, the responsible family
  member, and the payment method. The originally expected amount MUST be
  preserved unchanged alongside the actual amount. A bill has exactly one
  payment — partial or multiple payments per bill are not supported; split
  obligations are modeled as separate bills.

- **FR-006**: When a bill is marked as Paid, the system MUST automatically
  create a corresponding expense entry with the actual amount paid, the
  payment date, the selected member, the selected payment method, and the
  bill's category when present. This expense MUST count toward spending and
  budget totals in the month of the payment date, like any manually
  registered expense.

- **FR-007**: The expense created from a bill payment MUST remain linked to
  the bill. It MUST NOT be editable or deletable directly from the expense
  module — the tracker is its single managing surface; reverting the bill's
  payment MUST remove it.

- **FR-008**: The system MUST allow reverting a Paid bill to Pending,
  clearing the recorded payment data and removing the linked expense from
  history and from all totals.

- **FR-009**: The system MUST allow cancelling a Pending bill. Cancelled
  bills MUST remain visible in their month's checklist with a distinct
  visual treatment and MUST be excluded from all totals. A Cancelled bill
  MUST be reactivatable to Pending. A Paid bill MUST NOT be cancellable
  without first reverting its payment.

- **FR-010**: The system MUST display a summary per month with: total
  expected (sum of expected amounts of Pending and Paid bills), total paid
  (sum of actual amounts of Paid bills), and total pending (sum of expected
  amounts of Pending bills). Cancelled bills are excluded from every total.
  For months containing projected entries (FR-025), the summary MUST
  additionally show the projected total as a separate figure — never mixed
  into the three bill totals.

- **FR-011**: The system MUST allow navigation between calendar months,
  defaulting to the current month when the tracker is opened.

- **FR-012**: The system MUST allow editing the description, expected
  amount, due date, category, and responsible member of a Pending bill, and
  MUST allow deleting bills that are not Paid, after confirmation.

- **FR-013**: The system MUST visually flag Pending bills whose due date has
  already passed as overdue, without changing their state automatically.

- **FR-014**: All bills MUST belong to the family group, and every member
  MUST be able to view and manage all of them equally.

- **FR-015**: The entire user interface of the tracker — labels, states
  ("Pendente", "Paga", "Cancelada"), messages, and validations — MUST be in
  Brazilian Portuguese (PT-BR).

- **FR-016**: The system MUST allow editing the payment data of a Paid bill
  (payment date, actual amount paid, responsible member, and payment method)
  directly, without reverting it. The linked expense MUST be updated
  automatically to reflect the edited payment data.

- **FR-017**: The system MUST offer a "copy bills from previous month"
  action, available from the month's checklist (including its empty state).
  It creates, for each non-Cancelled **one-off** bill of the previous month
  (instances generated by a recurring bill are skipped, since recurrence
  produces them itself), a new Pending bill in the selected month with the
  same description, expected amount, category, and responsible member, and
  an equivalent due day. When the due day does not exist in the selected
  month, the last day of the month is used. Copied bills are regular bills,
  fully editable afterwards.

- **FR-018**: The system MUST allow registering a recurring bill ("conta
  fixa") with a description, an estimated expected amount greater than zero,
  a due day, an interval (monthly or annual), a starting month, and an
  optional category and responsible family member.

- **FR-019**: While a recurring bill is active, the system MUST
  automatically materialize its Pending bill instance for the applicable
  months within the **generation window: the current month and the next
  month** — via a scheduled process at month rollover plus catch-up at
  template creation/resume and at system startup, with no user action.
  Materialization MUST be idempotent (a month never receives two instances
  of the same template). When the due day does not exist in a given month,
  the instance's due date MUST be the last day of that month. For annual
  recurrences, the instance is generated each year in the same month as the
  starting month, on the defined due day — no separate "month of year"
  field exists. When, at creation time, the starting month's due date has
  already passed, the system MUST ask the member whether to include that
  month; if declined, generation starts at the next applicable period.

- **FR-020**: Generated instances MUST behave as regular bills: they can be
  individually edited (e.g., adjusting that month's expected amount), paid,
  or cancelled without affecting the recurring template or other months'
  instances.

- **FR-021**: The system MUST allow pausing and resuming a recurring bill.
  While paused, no new instances are generated; existing instances are not
  modified.

- **FR-022**: The system MUST allow permanently stopping a recurring bill.
  Stopping MUST automatically set to Cancelled all its Pending instances in
  months after the current one, and MUST never modify past or current-month
  instances. A stopped recurrence cannot generate new instances.

- **FR-023**: Editing a recurring bill's template (description, estimated
  amount, due day, category, responsible member) MUST update its Pending
  instances in months after the current one, including instances previously
  edited by hand (last edit wins). Paid and Cancelled instances and
  past months are never modified by template edits.

- **FR-024**: The system MUST allow deleting a recurring bill's template,
  after confirmation. Deleting removes the template from the recurring
  bills list and automatically sets to Cancelled its Pending instances in
  months after the current one (same effect as stopping); all past and
  current-month instances are preserved in their months as regular bills.

- **FR-025**: For applicable months beyond the generation window, the
  checklist MUST display each active recurring bill as a **projected entry
  ("Prevista")**: visually distinct from real bills, read-only (it cannot
  be paid, edited, cancelled, or deleted individually), computed from the
  template's current values (description, estimated amount, due date rule),
  and not persisted. Projections of paused, stopped, or deleted templates
  are not shown. A projection becomes a real Pending bill automatically
  when its month enters the generation window.

### Key Entities

- **Bill (Conta)**: A financial obligation expected for a specific calendar
  month. Holds description, expected amount, due date, optional category,
  optional responsible family member, status (Pending, Paid, or Cancelled),
  and belongs to the family group. It is either one-off (created manually or
  by the copy action) or an instance generated by a Recurring Bill.
- **Recurring Bill (Conta Fixa)**: A template for an obligation that
  repeats. Holds description, estimated expected amount, due day, interval
  (monthly or annual), starting month, optional category and responsible
  member, and a lifecycle state (active, paused, or stopped). While active,
  it generates one Bill instance per applicable month within the generation
  window (current + next month).
- **Projected Entry (Conta Prevista)**: A virtual, non-persisted preview of
  a recurring bill in an applicable month beyond the generation window.
  Computed from the template's current values; read-only; replaced by a
  real Pending bill when the month enters the window.
- **Payment Record (Pagamento)**: Data captured when a bill is paid —
  payment date, actual amount paid, responsible member, and payment method.
  Exists only for Paid bills and is removed when the payment is reverted.
- **Linked Expense**: The expense entry created automatically from a payment
  record. Behaves as a regular expense for spending and budget purposes but
  is owned by the bill: removable only by reverting the payment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A family member can register a new expected bill in under
  1 minute.
- **SC-002**: A family member can answer "how much is still left to pay this
  month?" within 5 seconds of opening the tracker, using the month summary.
- **SC-003**: 100% of bills marked as Paid produce a corresponding expense
  entry visible in the expense history and counted in budget totals, with no
  manual re-entry.
- **SC-004**: When the actual amount differs from the expected amount, both
  values remain visible on the bill in 100% of cases.
- **SC-005**: Cancelled bills never affect monthly totals, while remaining
  visible in the checklist for audit.
- **SC-006**: Reverting a payment removes its expense from spending and
  budget totals in 100% of cases, leaving no orphaned expense.
- **SC-007**: After a recurring bill is registered, 100% of its applicable
  months show the obligation automatically with no manual re-entry — as a
  Pending instance within the generation window (current + next month), or
  as a projected entry beyond it.

## Clarifications

### Session 2026-06-11

- Q: How is a mistaken payment corrected — edit in place or revert-and-repay
  only? → A: Payment data (payment date, actual amount, responsible member,
  payment method) is editable directly on a Paid bill; the linked expense is
  updated automatically. Reverting to Pending remains available for full
  undo. The linked expense is read-only in the expense module — the tracker
  is its single managing surface.
- Q: Should the tracker offer a convenience for repeating monthly bills,
  given recurring automation belongs to feature 012? → A: Yes — a manual
  "copy bills from previous month" action that duplicates the previous
  month's non-Cancelled bills as Pending bills with equivalent due days; no
  automatic pre-population. *(Partially superseded by the decision below:
  feature 012 was later absorbed into this spec as Recurring Bills; the
  copy action remains, scoped to one-off bills.)*
- Q: Can a bill be paid in multiple partial payments? → A: No — a bill has
  exactly one payment, going straight from Pending to Paid. Split
  obligations are modeled as separate bills (consistent with the roadmap's
  full-amount-only decision for credit card faturas).
- Q: Should automatic recurrence (roadmap feature 012) be part of this
  feature? → A: Yes — feature 012 is absorbed into this spec as Recurring
  Bills: a "conta fixa" registered once generates the Pending instance of
  each applicable month automatically (monthly or annual interval, with
  pause and permanent stop). The manual "copy bills from previous month"
  action is kept for one-off bills and skips recurring instances.
- Q: Can a recurring bill template be deleted, or only stopped? → A:
  Deletable after confirmation — removes the template from the list and
  cancels its Pending instances in months after the current one (same
  effect as stopping); past and current-month instances are preserved in
  their months as regular bills.
- Q: When a recurring bill is created after its due day has already passed
  in the starting month, is that month's instance created? → A: The system
  asks at creation time whether to include the starting month; if declined,
  generation starts at the next applicable period. If included, the
  instance is created Pending and flagged as overdue.
- Q: For annual recurrences, which month of the year anchors the instance?
  → A: The month of the informed due date (the starting month) — the
  instance is generated every year in that same month, on the defined due
  day; no separate "month of year" field.
- Q: How are recurring instances generated — on demand when a month is
  viewed, or by a scheduled process? → A: A scheduled process materializes
  only the current and the next month (with catch-up at template
  creation/resume and at startup). Applicable months beyond that window
  show the recurring bill as a read-only projected entry ("Prevista"),
  computed from the template and not persisted; it becomes a real Pending
  bill when its month enters the window.

## Assumptions

- This feature covers one-off bills and recurring bills ("contas fixas") —
  roadmap feature 012 (Recurring Expenses) is absorbed here, scoped to bills
  in the tracker. Credit card faturas and the per-card open-charges summary
  section remain with roadmap feature 016 and are out of scope. The bill
  model must not preclude that later enrichment.
- Recurring instances are materialized only within the generation window
  (current + next month); no instances are created retroactively for months
  before the recurrence's starting month, nor for months skipped while
  paused. If the system is offline at a month rollover, startup catch-up
  materializes the missed window months.
- A member who wants to adjust or pay a specific future month's recurring
  instance ahead of time waits until that month enters the generation
  window (or registers a one-off bill for it); projections are read-only by
  design.
- Settling a bill by linking an already-registered expense (instead of
  creating a new one) is deferred: in this phase, paying a bill always
  creates the expense automatically, per the roadmap's primary flow.
- A bill belongs to exactly one calendar month, determined by its due date;
  changing the due date moves it between months. There is no carry-over of
  unpaid bills — an overdue Pending bill stays in its original month.
- The payment form defaults the responsible member to the member recording
  the payment and the actual amount to the expected amount, both editable —
  consistent with expense registration, where expenses are assignable to any
  member.
- Payment methods available when paying a bill are the same already
  supported by expense registration (cash/debit or credit card).
- All family group members are equal; there is no admin-only action in the
  tracker, consistent with the rest of the product.
- All amounts are in a single currency (BRL), consistent with the product's
  cross-cutting assumption.
