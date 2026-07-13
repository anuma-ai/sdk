# PAST\_EVENT\_GRACE\_MS

> `const` **PAST\_EVENT\_GRACE\_MS**: `number`

Defined in: [src/lib/memory/decay.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#48)

Grace applied after a `plan` / `ongoing_context` event's `event_time_end`
before it's considered "become past" and archived. Avoids archiving a plan
the instant its end date passes (the user may still reference it briefly).
