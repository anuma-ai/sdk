# PortalLlmFailureReason

> **PortalLlmFailureReason** = `"auth-unavailable"` | `"http-terminal"` | `"http-retryable"` | `"network"` | `"body-parse-failed"` | `"empty-content"` | `"invalid-json"` | `"null-completion"` | `"time-budget-exhausted"`

Defined in: [src/lib/memory/portalLlm.ts:190](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/portalLlm.ts#190)

Why a portal JSON completion gave up, as a STABLE low-cardinality code.

The retry loop has always classified its failures precisely, but only as an
interpolated `reason` string for `log.warn` — and prod ships no SDK log
(sdk#883), so in production every one of these collapsed into a single
`empty-after-retry` with no way to tell them apart. That is what made the
2026-08-11 audit need a Prometheus cross-check to discover that the portal
was returning HTTP 200 with an empty body on ~60% of extraction turns.

Codes are deliberately an enum, not the `reason` string: the strings embed
status codes and error messages, so they are unbounded and useless as an
analytics property. Keep this list SHORT and stable — it is a telemetry
contract, and a value added here has to mean the same thing in six months.
