# ScreenedCandidate

Defined in: [src/lib/memory/injectionScreen.ts:18](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#18)

A candidate the screen flagged, with the matching signature id + reason.
Content is intentionally NOT duplicated here beyond the candidate itself —
callers must never log `candidate.content`.

## Properties

### candidate

> **candidate**: [`ExtractedCandidate`](ExtractedCandidate.md)

Defined in: [src/lib/memory/injectionScreen.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#19)

***

### reason

> **reason**: [`InjectionReason`](../type-aliases/InjectionReason.md)

Defined in: [src/lib/memory/injectionScreen.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#21)

Coarse reason bucket.

***

### signature

> **signature**: `string`

Defined in: [src/lib/memory/injectionScreen.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#23)

Stable id of the signature that matched (safe to log; carries no content).
