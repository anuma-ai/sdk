# MemoryRetainOptions

> **MemoryRetainOptions** = `Omit`<[`RetainOptions`](../interfaces/RetainOptions.md), `"folderId"`>

Defined in: [src/lib/memory/store/types.ts:117](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#117)

`retain()` options minus `folderId` (see [MemoryUpdate](MemoryUpdate.md)).

DEVICE-LOCAL: `consolidateOptions` carries portal credentials, an `onFallback`
callback and possibly a `PiiRedactor` instance — it configures the
consolidation LLM call on the device. A remote store fetches encrypted
candidates, decrypts and consolidates them on the device, then persists
encrypted results through versioned writes. Nearby holds no decryption key
and never receives these credentials, callbacks or redactor instances.
