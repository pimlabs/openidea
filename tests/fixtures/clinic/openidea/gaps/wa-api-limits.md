---
id: wa-api-limits
kind: feasibility
found_by: coverage
question: Can the WhatsApp Business API send a confirmation within one minute at peak hours?
ideas: [wa-booking]
affects: [integrations/whatsapp, flows/book-appointment]
sources: [ideas/wa-booking.md]
impact: medium
confidence: medium
status: open
resolution: null
history:
  - {date: 2026-11-24, status: open}
---

## Finding
"Done looks like" promises a confirmation within a minute, but nothing covers API rate limits or template approval.

## Proposed validation
One-day spike against the WhatsApp Business API sandbox.

## Decision criteria
If template approval or rate limits break the one-minute promise, change the promise, not the architecture.
