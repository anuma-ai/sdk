# ObservationTrend

> **ObservationTrend** = `"new"` | `"strengthening"` | `"stable"` | `"weakening"` | `"stale"`

Defined in: src/lib/memory/observationTrend.ts:29

How a fact's evidence has been evolving.

* `new` — first seen inside the recent window, few proofs yet.
* `strengthening` — established fact re-observed recently (rising density).
* `stable` — known for a while, still observed inside the stale window.
* `weakening` — quiet for 30–90 days after having been observed.
* `stale` — no observation in 90+ days.
