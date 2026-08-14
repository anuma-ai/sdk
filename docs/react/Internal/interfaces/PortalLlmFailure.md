# PortalLlmFailure

Defined in: [src/lib/memory/portalLlm.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#191)

A give-up report: the classified [PortalLlmFailureReason](../type-aliases/PortalLlmFailureReason.md) plus the
little context worth carrying into telemetry. Both extra fields are bounded
(a status code, a small attempt count), so both are safe as event properties.

## Properties

### attempts

> **attempts**: `number`

Defined in: [src/lib/memory/portalLlm.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#197)

How many attempts ran before giving up (1-based, ≥ 1).

***

### httpStatus?

> `optional` **httpStatus**: `number`

Defined in: [src/lib/memory/portalLlm.ts:195](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#195)

HTTP status, when the failure was an HTTP one.

***

### reason

> **reason**: [`PortalLlmFailureReason`](../type-aliases/PortalLlmFailureReason.md)

Defined in: [src/lib/memory/portalLlm.ts:193](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#193)

Stable code for the last failure observed.
