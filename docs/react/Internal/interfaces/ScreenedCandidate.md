# ScreenedCandidate

Defined in: [src/lib/memory/injectionScreen.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#50)

A candidate the screen flagged, with the matching signature id + reason.
Content is intentionally NOT duplicated here beyond the candidate itself —
callers must never log `candidate.content`.

## Properties

### candidate

> **candidate**: [`ExtractedCandidate`](ExtractedCandidate.md)

Defined in: [src/lib/memory/injectionScreen.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#51)

***

### reason

> **reason**: [`InjectionReason`](../type-aliases/InjectionReason.md)

Defined in: [src/lib/memory/injectionScreen.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#53)

Coarse reason bucket.

***

### signature

> **signature**: `string`

Defined in: [src/lib/memory/injectionScreen.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/injectionScreen.ts#55)

Stable id of the signature that matched (safe to log; carries no content).
