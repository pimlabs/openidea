---
team:
  people: 2
  days_per_week: 5
  focus: 0.7
start: 2026-12-01
actuals: []
---

# Calibration

Team capacity and, after each milestone, what it really took. `openidea estimate` scales every range by the median of actual ÷ estimated midpoint, so estimates learn from this team's history.

To record a finished milestone, add under `actuals`:

```yaml
  - milestone: core-booking
    estimate_low: 20
    estimate_high: 32
    actual_days: 30
```
