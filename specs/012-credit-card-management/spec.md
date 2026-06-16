# Feature Specification: Credit Card Management

**Feature Branch**: `012-credit-card-management`

**Created**: 2026-06-16

**Input**: User description: "Próxima fase do roadmap" — roadmap feature 016
(Credit Card Management): register one or more credit cards for the family
group (e.g., Nubank, Itaú Visa). When recording a spending, the user selects
which card was used. Credit card purchases appear immediately and count toward
category budgets at purchase date. A dedicated per-card view lists all
registered purchases with a running total, so the family can see what is
building up before the fatura is paid. The Monthly Payment Tracker also shows a
summary of open charges per card. The fatura is manually registered by the user
as a Bill in the tracker (with creditCardId set); no bank sync. Cash-outflow
totals count only the fatura payment, not the individual child purchases,
preventing double-counting.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Manage Credit Cards (Priority: P1)

A family member opens a "Cartões de Crédito" area and registers the cards the
household uses (e.g., "Nubank", "Itaú Visa"). Any member can add a new card,
rename it, or archive one that is no longer used. Archived cards stop appearing
as choices for new spending but remain attached to past purchases and faturas
so history stays intact.

**Why this priority**: Without registered cards there is nothing to attribute
credit-card spending to. Card registration is the foundation every other part
of this feature builds on, so it is the first independently shippable slice.

**Independent Test**: A member registers a card, sees it in the card list, can
rename it, and can archive it; an archived card no longer appears in the
card picker when logging a new credit-card spending but still shows on the
purchases it was previously attached to.

**Acceptance Scenarios**:

1. **Given** the credit cards area, **When** a member adds a card with a name,
   **Then** the card appears in the family group's card list and becomes
   selectable when logging credit-card spending.

2. **Given** an existing card, **When** a member renames it, **Then** the new
   name is reflected everywhere the card is shown, including on past purchases
   and faturas.

3. **Given** a card with attached purchases, **When** a member archives it,
   **Then** it stops appearing as a choice for new spending but remains visible
   on existing purchases, faturas, and the per-card view.

4. **Given** the add-card form, **When** a member submits a blank name or a
   name identical to another active card in the group, **Then** the card is
   rejected with a field-level message in PT-BR and nothing is saved.

---

### User Story 2 - Attribute a Spending to a Specific Card (Priority: P1)

When logging a spending paid by credit card (via the unified "registrar gasto"
flow in the Monthly Payment Tracker), the member selects which registered card
was used. The purchase is recorded as a Paid bill, counts toward the family,
member, and category budgets at its purchase date exactly as today, and is now
also associated with the chosen card so it can be tracked per card.

**Why this priority**: Linking each credit-card spending to a card is what
makes per-card visibility and double-counting prevention possible. It is the
core behavioral change of this feature and depends only on US1.

**Independent Test**: A member logs a credit-card spending, selects a card, and
verifies the amount counts toward budgets for the purchase month and the
purchase now appears under that card's running total.

**Acceptance Scenarios**:

1. **Given** the spending-log flow with payment method "cartão de crédito",
   **When** the member chooses a registered card and submits, **Then** the
   resulting Paid bill is linked to that card and counts toward the budget of
   its purchase month, identically to a cash/debit spending.

2. **Given** the spending-log flow with payment method "cartão de crédito",
   **When** no card is selected, **Then** the system requires a card before the
   spending can be saved (a credit-card spending must name its card).

3. **Given** a previously logged credit-card spending, **When** a member edits
   it and changes the card, **Then** the purchase moves to the new card's
   running total and the open-charges figures of both cards update accordingly.

4. **Given** a spending with payment method "dinheiro/débito", **When** the
   member fills the form, **Then** no card selection is offered or stored.

---

### User Story 3 - See What Is Building Up on a Card (Priority: P1)

Before paying a card's bill, a member wants to know how much has accumulated on
it. They open a dedicated per-card view that lists every purchase charged to
that card that has not yet been settled by a paid fatura, with a running total
of open charges. The Monthly Payment Tracker also shows, per card, a summary of
these open charges so the upcoming cash obligation is visible without opening
each card.

**Why this priority**: The whole point of registering cards is to anticipate
the cash outflow of the fatura. This visibility is the primary user value and
is independently demonstrable once US1 and US2 exist.

**Independent Test**: With several credit-card purchases logged on a card and no
fatura yet paid, a member opens the per-card view and sees each purchase listed
with a running total equal to the sum of those purchases; the same total shows
in the tracker's per-card open-charges summary.

**Acceptance Scenarios**:

1. **Given** a card with multiple open credit-card purchases, **When** a member
   opens the per-card view, **Then** every open purchase is listed with date,
   description, amount, and responsible member, and a running total of all open
   charges is shown.

2. **Given** the Monthly Payment Tracker, **When** a member views the selected
   month, **Then** a per-card summary section shows each card's accumulated open
   charges not yet covered by a paid fatura.

3. **Given** a card with no open purchases, **When** a member opens its per-card
   view or the tracker summary, **Then** the open-charges total shows as zero.

---

### User Story 4 - Register a Fatura Without Double-Counting (Priority: P1)

At payment time, a member registers the card's fatura as a bill in the tracker,
selecting the card it settles and the amount. When the fatura is paid, it
settles the card's open charges: those purchases are now considered covered, so
the card's open-charges total drops accordingly. Because each child purchase
already counted toward budgets at its purchase date, the fatura payment itself
does NOT count a second time toward budget/dashboard spending — it represents
the cash-outflow event only.

**Why this priority**: Preventing double-counting is essential for the numbers
to stay trustworthy. Without it, every credit-card real would be counted twice.
It depends on the card link (US2) and open-charges tracking (US3).

**Independent Test**: With open charges on a card, a member registers and pays a
fatura for it; the card's open charges drop by the settled amount, and the
month's budget/dashboard spending totals do NOT increase by the fatura amount
(the purchases already counted).

**Acceptance Scenarios**:

1. **Given** open charges on a card, **When** a member registers a fatura bill
   for that card and marks it Paid, **Then** the covered purchases are no longer
   counted as open charges and the card's open-charges total decreases.

2. **Given** a paid fatura bill linked to a card, **When** budget and dashboard
   spending totals are computed, **Then** the fatura's amount is excluded from
   those totals so credit-card spending is counted only once (at purchase date).

3. **Given** a paid fatura, **When** a member opens a period report or the
   dashboard, **Then** the individual credit-card purchases still appear in
   their categories and the fatura appears as a separate cash event, with no
   value counted twice.

---

### Edge Cases

- What happens when a credit-card purchase is logged with a purchase date in a
  month for which a fatura was already paid? The purchase is still attributed to
  the budget of its purchase month, but it joins the card's currently-open
  charges (it was not part of an already-settled fatura), so it will be covered
  by the next fatura.
- What happens when the fatura amount entered by the member differs from the sum
  of the card's open charges? The fatura is saved with the amount the member
  actually paid (the real bill may include interest, fees, or annuities not
  modeled as purchases); the settlement still closes the open charges so they no
  longer show as pending for that card. Any mismatch is informational only and
  never blocks saving.
- What happens when a credit-card purchase that was already covered by a paid
  fatura is later deleted or edited? Totals recompute: the deleted/edited amount
  is removed from budgets at its purchase month; the already-paid fatura is not
  altered (its recorded paid amount stays), preserving the historical cash
  event.
- What happens when a member archives a card that still has open charges? The
  card is archived (hidden from new-spending pickers) but its open charges and
  per-card view remain available so the pending fatura can still be registered
  and paid.
- What happens when a member tries to delete a card that has any attached
  purchases or faturas? Deletion is blocked; the member is directed to archive
  the card instead so history is preserved.
- What happens to a fatura bill that is reverted from Paid to Pending? The
  charges it had settled become open again and the card's open-charges total
  rises back, keeping the per-card view consistent.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let any member of a family group register, rename,
  and archive credit cards belonging to that group. A card MUST have a non-blank
  name that is unique among the group's active cards and a closing day (dia de
  fechamento da fatura, day 1–31). Cards are shared across the whole family
  group, consistent with the equal-members rule.

- **FR-001a**: The closing day is informational and for grouping/forecast only:
  it MUST be used to group a card's open credit-card purchases into the current
  billing cycle (the upcoming fatura) so the month's spending is presented under
  that fatura in the per-card view and tracker summary. It MUST NOT govern
  settlement — actual settlement of open charges follows the snapshot rule of
  FR-009 (open charges at the moment the fatura is paid), regardless of the
  closing day.

- **FR-002**: Archiving a card MUST remove it from selection lists for new
  spending while preserving it on all past purchases and faturas and in the
  per-card view. A card that has any attached purchase or fatura MUST NOT be
  permanently deletable; only archiving is allowed for such cards.

- **FR-003**: When logging a spending with payment method "cartão de crédito",
  the member MUST select exactly one registered (active) card. A credit-card
  spending MUST NOT be saved without a card. Spending with payment method
  "dinheiro/débito" MUST NOT carry a card.

- **FR-004**: A credit-card purchase MUST count toward family, member, and
  category budgets at its purchase date, identically to a cash/debit spending —
  this feature changes attribution to a card, not the existing budget behavior.

- **FR-005**: The Bill entity MUST be able to reference a credit card
  (`creditCardId`) in two distinct roles: (a) a credit-card purchase (a Paid
  bill paid by credit card) links to the card it was charged to; (b) a fatura
  bill links to the card whose statement it settles. The two roles MUST be
  distinguished by an explicit marker on the bill (a fatura flag/type), not
  inferred from payment method or other heuristics. A fatura MUST be created
  through a dedicated "registrar fatura" action that sets this marker and the
  `creditCardId`. A fatura MUST NOT be produced by the recurring-bill (conta
  fixa) mechanism nor by the "copy from previous month" action of feature 015;
  the dedicated action is the only way to create one.

- **FR-006**: The system MUST provide a per-card view listing every open
  credit-card purchase charged to that card — purchases not yet settled by a
  paid fatura — with date, description, amount, and responsible member, plus a
  running total of the card's open charges.

- **FR-007**: The Monthly Payment Tracker MUST display, for the selected month,
  a per-card summary of each card's accumulated open charges not yet covered by
  a paid fatura, giving visibility into the upcoming cash obligation before the
  fatura bill is created.

- **FR-008**: A member MUST be able to register a fatura for a card as a bill in
  the tracker, specifying the card it settles and the amount due/paid, and pay
  it following the same Pending/Paid/Cancelled state rules as any other bill.

- **FR-009**: Paying a fatura MUST settle exactly the card's charges that are
  open at the moment of payment (a snapshot), marking them as covered by that
  fatura so they no longer appear as open in the per-card view or the tracker
  summary. A paid fatura is immutable with respect to its settled set: purchases
  logged afterward MUST NOT alter it; they form a new open balance to be covered
  by the next fatura. Reverting a paid fatura to Pending MUST restore exactly the
  charges it had settled to open.

- **FR-010**: A paid fatura bill MUST be excluded from budget consumption and
  dashboard spending totals, because its child credit-card purchases already
  counted at their purchase dates. The fatura represents a cash-outflow event
  only and MUST NOT cause any amount to be counted twice.

- **FR-011**: Editing or deleting a credit-card purchase MUST recompute budget
  and per-card open-charge figures accordingly. Editing the card on a purchase
  MUST move it between the affected cards' open-charge totals.

- **FR-012**: The fatura amount the member enters MUST be saved as the actual
  paid amount even when it differs from the sum of the card's open charges; the
  difference is informational and MUST NOT block saving.

- **FR-012a**: A card MUST have at most one pending (unpaid) fatura at a time.
  The system MUST block registering a new fatura for a card while another fatura
  for the same card is still pending; the existing one must be paid or cancelled
  first. This keeps the snapshot settlement rule (FR-009) unambiguous — the
  card's open charges always map to a single upcoming fatura payment.

- **FR-013**: The entire user interface introduced or affected by this feature —
  card management screens, the card picker, the per-card view, the tracker
  per-card summary, fatura registration, messages, and confirmations — MUST be
  exclusively in Brazilian Portuguese (PT-BR).

### Key Entities

- **Credit Card (Cartão de Crédito)**: A payment card belonging to a family
  group. Attributes: name (non-blank, unique among the group's active cards),
  closing day (dia de fechamento, 1–31; informational/grouping only — see
  FR-001a), status (active/archived), and group ownership. Shared across all
  members.
- **Bill (Conta)**: Existing entity. Gains an optional `creditCardId` and an
  explicit fatura marker (flag/type). For a credit-card purchase it names the
  card charged; for a fatura the marker is set and it names the card whose
  statement is being settled (see FR-005).
- **Credit-card purchase**: A Paid bill with payment method "cartão de crédito"
  and a `creditCardId`. Counts toward budgets at its purchase date; appears in
  the owning card's open charges until settled by a paid fatura.
- **Fatura**: A bill (with `creditCardId`, in the fatura role) representing the
  monthly statement payment for one card. Settles that card's open charges when
  paid; excluded from budget/dashboard spending to prevent double-counting.
- **Open charges (per card)**: The set and running total of a card's credit-card
  purchases not yet settled by a paid fatura. Surfaced in the per-card view and
  the tracker's per-card summary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A member can register a new credit card and have it available for
  selection when logging spending in under 30 seconds.

- **SC-002**: 100% of credit-card spending records are attributed to exactly one
  card, and 0% of cash/debit spending records carry a card.

- **SC-003**: A card's open-charges total always equals the sum of its
  credit-card purchases not yet settled by a paid fatura — verifiable for any
  card at any time.

- **SC-004**: Across any month, the sum counted toward budgets/dashboard for
  credit-card spending equals the sum of the individual purchases (counted at
  purchase date) and never includes any paid fatura amount — zero double-counted
  reais.

- **SC-005**: After a fatura for a card is paid, that card's open-charges total
  drops by exactly the settled charges, and reverting the fatura restores them
  exactly.

## Clarifications

### Session 2026-06-16

- Q: How does a paid fatura determine which purchases it covers? → A:
  Snapshot/accumulation model. Paying a fatura settles exactly the card's
  charges open at that moment (by settlement state, not purchase date); the open
  balance resets to zero. A paid fatura is immutable — purchases logged
  afterward (including ones backdated into an already-billed month) do not alter
  it and instead form the next open balance for the next fatura. The card needs
  only a name (no closing/due-day modeling).
- Q: How does the system distinguish a fatura bill from a credit-card purchase
  bill, given both carry `creditCardId`? → A: An explicit marker (fatura
  flag/type) on the bill, never inferred from payment method or convention. A
  fatura is created via a dedicated "registrar fatura" action that sets the
  marker and the `creditCardId`.
- Q: Which attributes define a credit card in v1, and what is the role of a
  closing date? → A: Name + closing day (dia de fechamento). The closing day is
  informational/grouping only — it groups the month's purchases into the current
  fatura for display and forecast — and does NOT drive settlement, which remains
  the snapshot rule from FR-009. No due day, credit limit, or brand in v1.
- Q: Can a card have more than one pending (unpaid) fatura at a time? → A: No —
  at most one pending fatura per card. Registering a new fatura is blocked while
  another is pending for the same card (it must be paid or cancelled first),
  keeping the snapshot settlement rule unambiguous (one upcoming payment per
  card's open charges).
- Q: How does a fatura enter the tracker — only via the dedicated action, or
  also as a recurring (conta fixa) bill / copy-from-previous-month? → A: Only via
  the dedicated "registrar fatura" action. Faturas are never produced by the
  recurring-bill mechanism or the copy-from-previous-month action, since their
  amount varies and they carry the fatura marker.

## Assumptions

- This feature builds on the consolidated model from feature 017 (Expense
  Consolidation): there is no separate Expense entity; every spending — including
  credit-card purchases — is a Paid bill. The payment-method distinction
  (cash/debit vs credit card) preserved by that feature is the basis for the
  card link added here.
- There is no bank or card-issuer integration: cards, purchases, and faturas are
  all entered manually. No statement import, interest calculation, closing-date
  automation, or balance sync is in scope.
- A fatura is paid in full as a single obligation; partial payments, carry-over
  balances, and minimum-payment tracking are out of scope (consistent with the
  roadmap clarification).
- A credit card is defined by a name and a closing day (dia de fechamento) for
  v1. The closing day is informational/grouping only (groups the month's
  purchases into the current fatura for display and forecast) and does not drive
  settlement. Due day, credit limit, and brand/issuer metadata are out of scope
  unless later clarified.
- Settlement of open charges by a fatura uses a snapshot/accumulation model: a
  paid fatura covers exactly the card's charges that are open at the moment it
  is paid, determined by settlement state rather than by purchase date. Each
  fatura payment "draws a line" and resets the open balance to zero; purchases
  logged afterward — including ones backdated into an already-billed month —
  accumulate as the next open balance for the next fatura. Settlement is by
  state at pay time, so the card's closing day (a separate, informational
  attribute) never alters which charges a fatura settles.
- Budget month attribution for credit-card purchases continues to use the
  purchase (payment) date, unchanged from features 008/009/017.
- Product-wide constraints from the roadmap remain in force: PT-BR-only UI,
  single household per family group, single currency, expenses-only (no income).
