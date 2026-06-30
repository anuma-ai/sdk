# ExtractOutcome

> **ExtractOutcome** = `"extracted"` | `"no-facts"` | `"empty-after-retry"`

Defined in: [src/lib/memory/autoExtract.ts:286](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/autoExtract.ts#286)

Outcome of the EXTRACTOR stage for a turn — independent of whether the
subsequent `retain()` writes landed (that's `failedCount`):

* `extracted`         — the extractor produced at least one candidate above
  the confidence floor. Whether those writes succeeded
  is reported separately by `failedCount` — so
  `extracted` + `failedCount > 0` means "found facts but
  writes are failing", which is more signal than
  collapsing it into `no-facts` would give.
* `no-facts`          — the extractor ran fine but found nothing durable.
* `empty-after-retry` — the extractor returned empty/malformed after
  exhausting retries (a *failure*). Distinguishing this
  from `no-facts` is what makes a silently-degrading
  extractor alarmable rather than invisible.
