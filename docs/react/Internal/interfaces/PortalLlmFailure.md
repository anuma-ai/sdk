# PortalLlmFailure

Defined in: [src/lib/memory/portalLlm.ts:229](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#229)

A give-up report: the classified [PortalLlmFailureReason](../type-aliases/PortalLlmFailureReason.md) plus the
little context worth carrying into telemetry. Both extra fields are bounded
(a status code, a small attempt count), so both are safe as event properties.

## Properties

### attempts

> **attempts**: `number`

Defined in: [src/lib/memory/portalLlm.ts:235](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#235)

How many attempts ran before giving up (1-based, ≥ 1).

***

### httpStatus?

> `optional` **httpStatus**: `number`

Defined in: [src/lib/memory/portalLlm.ts:233](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#233)

HTTP status, when the failure was an HTTP one.

***

### reason

> **reason**: [`PortalLlmFailureReason`](../type-aliases/PortalLlmFailureReason.md)

Defined in: [src/lib/memory/portalLlm.ts:231](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#231)

Stable code for the last failure observed.
