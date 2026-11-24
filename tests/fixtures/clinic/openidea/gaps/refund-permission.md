---
id: refund-permission
kind: clarification
found_by: consistency
question: May the cashier issue refunds, or only the owner?
ideas: [refund-by-cashier]
sources: [discovery/2026-10-12-kickoff.md, ideas/refund-by-cashier.md]
impact: high
confidence: high
status: open
resolution: null
history:
  - {date: 2026-11-24, status: open}
---

## Finding
`refund-by-cashier` says the cashier refunds on the spot. The kickoff notes quote the owner: "Cashiers should never issue refunds themselves, only the owner can."

## Why it matters
Refund permissions shape the payment entity, the audit trail, and the cashier screen. Changing them after build means reworking all three.

## Proposed validation
Ask the owner one closed question, quoting both sources. Effort: 5 minutes.

## Decision criteria
- Owner only: kill or reshape `refund-by-cashier` into an approval request.
- Cashier allowed: add a refund limit and an audit log.
