# MemoryRetainOptions

> **MemoryRetainOptions** = `Omit`<[`RetainOptions`](../interfaces/RetainOptions.md), `"folderId"`> & `object`

Defined in: [src/lib/memory/store/types.ts:125](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#125)

`retain()` options minus `folderId` (see [MemoryUpdate](MemoryUpdate.md)).

DEVICE-LOCAL: `consolidateOptions` carries portal credentials, an `onFallback`
callback and possibly a `PiiRedactor` instance — it configures the
consolidation LLM call on the device. A remote store fetches encrypted
candidates, decrypts and consolidates them on the device, then persists
encrypted results through versioned writes. Nearby holds no decryption key
and never receives these credentials, callbacks or redactor instances.

## Type Declaration

### canWrite()?

> `optional` **canWrite**: () => `Promise`<`boolean`>

Reject writes when the originating extraction is no longer eligible.

**Returns**

`Promise`<`boolean`>

### signal?

> `optional` **signal**: `AbortSignal`

Abort pending remote requests when the originating extraction is cancelled.
