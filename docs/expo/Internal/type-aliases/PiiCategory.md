# PiiCategory

> **PiiCategory** = `"EMAIL"` | `"PHONE"` | `"SSN"` | `"CREDIT_CARD"` | `"IP_ADDRESS"` | `"API_KEY"` | `"US_ADDRESS"` | `"DATE_OF_BIRTH"`

Defined in: [src/lib/pii/patterns.ts:8](https://github.com/anuma-ai/sdk/blob/main/src/lib/pii/patterns.ts#8)

PII detection patterns for structured data types.

Each pattern has a category (used for placeholder tags like \[EMAIL\_1]),
a regex, and an optional validator for reducing false positives.
