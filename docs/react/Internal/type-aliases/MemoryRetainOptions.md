# MemoryRetainOptions

> **MemoryRetainOptions** = `Omit`<[`RetainOptions`](../interfaces/RetainOptions.md), `"folderId"`>

Defined in: [src/lib/memory/store/types.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#85)

`retain()` options minus `folderId` (see [MemoryUpdate](MemoryUpdate.md)).

LOCAL-ONLY: `consolidateOptions` carries portal credentials, an `onFallback`
callback and possibly a `PiiRedactor` instance — it configures the
consolidation LLM call the backend makes. A remote backend makes that call
server-side with its own credentials and redaction, and ignores the field;
every other field is plain data it forwards.
