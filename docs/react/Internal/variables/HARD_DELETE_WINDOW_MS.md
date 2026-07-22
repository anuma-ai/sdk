# HARD\_DELETE\_WINDOW\_MS

> `const` **HARD\_DELETE\_WINDOW\_MS**: `number`

Defined in: [src/lib/memory/decay.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#48)

How long an archived memory lingers (recoverable) before the sweep hard-
deletes it. ~30 days gives the user a window to restore an over-eager decay.
