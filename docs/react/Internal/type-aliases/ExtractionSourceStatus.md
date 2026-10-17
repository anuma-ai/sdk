# ExtractionSourceStatus

> **ExtractionSourceStatus** = `"ready"` | `"later"` | `"gone"`

Defined in: [src/lib/memory/durableExtraction.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/durableExtraction.ts#27)

`ready` runs the job, `later` leaves it queued without counting an attempt, `gone` drops it.
