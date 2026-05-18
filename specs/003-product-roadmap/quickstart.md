# Roadmap Quickstart

**For**: Anyone using this roadmap to plan, onboard, or build.

---

## 1. How to Read Priority Tiers

Features are grouped into three tiers:

| Tier | Label | Meaning |
|------|-------|---------|
| P1 — Core | Must exist for the app to be usable | Build these first; the app cannot function without them |
| P2 — Important | Significantly improves usability | Build after all P1 features are live |
| P3 — Extended | Valuable but not essential for launch | Build last; may be deferred or cut based on feedback |

Each feature entry shows: `# | Feature Name | Description | Status | Depends On`.

---

## 2. How to Select the Next Feature to Specify

1. Open `specs/003-product-roadmap/spec.md`
2. Find the **Planned Features** table
3. Pick the highest-priority (`P1 → P2 → P3`) entry with **Status: Planned**
4. Check its **Depends On** column — all listed features must have Status: **Specified** or higher before you begin
5. Run: `/speckit-specify <feature description from the table>`

**Current next feature**: Feature 004 — User Authentication & Family Groups (`Depends On: 001` ✅ complete)

---

## 3. How to Update a Feature Status

When a feature moves from one lifecycle stage to another, update the `Status` column in the Planned Features table **within 1 working day**.

| Status | Meaning |
|--------|---------|
| Planned | Feature is defined in the roadmap but not yet being specified |
| In Specification | `/speckit-specify` has been run; spec is in progress |
| Specified | spec.md, plan.md, and tasks.md are complete and merged |
| In Development | `/speckit-implement` is running |
| Complete | All tasks done, PR merged to main |

To update: edit the `Status` column in `specs/003-product-roadmap/spec.md` and commit.
