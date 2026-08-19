# RetainOptions

Defined in: [src/lib/memory/types.ts:461](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#461)

## Properties

### autoMergeThreshold?

> `optional` **autoMergeThreshold**: `number`

Defined in: [src/lib/memory/types.ts:478](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#478)

Cosine similarity threshold for auto-merge. Default: 0.8
(`DEFAULT_AUTO_MERGE_THRESHOLD` in retain.ts — the source of truth).

***

### consolidateOptions?

> `optional` **consolidateOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memory/types.ts:486](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#486)

When provided, runs an LLM-based consolidation pass against the top-K
existing memories above `consolidateThreshold` (looser than auto-merge).
The LLM emits create/update/noop per Hindsight's facet-dedup rules.
Auth/endpoint required — one of `apiKey` / `getToken` (see
[PortalLlmAuth](PortalLlmAuth.md)); without this option we keep the cosine-only path.

**Type Declaration**

**baseUrl?**

> `optional` **baseUrl**: `string`

**model?**

> `optional` **model**: `string`

**onFallback()?**

> `optional` **onFallback**: (`reason`: [`ConsolidationFallbackReason`](../type-aliases/ConsolidationFallbackReason.md)) => `void`

Invoked when the consolidator degrades to its "create" fallback
instead of returning a real decision — `llm_error` for network /
timeout / unparseable output, `invalid_response` for well-formed
JSON that violates the schema (unknown action, bad targetId).
A flaky consolidator silently accumulates duplicate memories;
wire this to logging/metrics so the fallback rate is observable.

`subject_mismatch` is the odd one out and worth reading separately: the
model answered fine and we REFUSED its supersede because its own stated
subjects disagreed (#822). A non-zero rate is the guard doing its job, not
a problem — the rate to watch is how often it fires, which is also the
only signal for how reliably the model fills the subject fields in at all.

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`reason`

</td>
<td>

[`ConsolidationFallbackReason`](../type-aliases/ConsolidationFallbackReason.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**piiRedaction?**

> `optional` **piiRedaction**: `boolean` | [`PiiRedactor`](../../../expo/Internal/classes/PiiRedactor.md)

When set, the new fact and existing candidates are PII-redacted before
the consolidation model sees them and the result is de-anonymized before
persistence. Auto-extraction inherits this from its `extract` options.

***

### consolidateThreshold?

> `optional` **consolidateThreshold**: `number`

Defined in: [src/lib/memory/types.ts:513](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#513)

Cosine similarity floor for the consolidator candidate set. Default: 0.55
(`DEFAULT_CONSOLIDATE_THRESHOLD` in retain.ts — the source of truth).

***

### consolidateTopK?

> `optional` **consolidateTopK**: `number`

Defined in: [src/lib/memory/types.ts:518](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#518)

Top-K consolidation candidates to feed the LLM. Default: 20
(`DEFAULT_CONSOLIDATE_TOP_K` in retain.ts — the source of truth). Widened
from 5 so a value change can find and retire ALL stale duplicates of the
old value in one pass, not just the nearest few.

***

### enableAutoMerge?

> `optional` **enableAutoMerge**: `boolean`

Defined in: [src/lib/memory/types.ts:467](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#467)

When provided, applies merge-on-write logic instead of plain insert.

***

### eventTime?

> `optional` **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; } | `null`

Defined in: [src/lib/memory/types.ts:525](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#525)

W6 temporal lane — when the event in this fact occurred. Persisted to
memory\_vault.event\_time\_\* columns; recall's temporal lane filters
and boosts memories whose event-time overlaps the query window.
Auto-extraction emits this; manual writes can omit it.

***

### factType?

> `optional` **factType**: `"other"` | `"identity"` | `"preference"` | `"relationship"` | `"plan"` | `"ongoing_context"` | `"constraint"`

Defined in: [src/lib/memory/types.ts:536](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#536)

Typed memory (PR1) — the extractor's classification for this fact.
Persisted on create; on merge/consolidate it lazily backfills the target
only when the target has no type yet (never overwrites a non-null type).
Auto-extraction emits this; manual writes omit it (persisted as null).

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:465](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#465)

***

### respectTombstones?

> `optional` **respectTombstones**: `boolean`

Defined in: [src/lib/memory/types.ts:475](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#475)

When true, a would-be create is suppressed if it matches a soft-deleted
("tombstoned") memory above the auto-merge threshold — so auto-extraction
can't silently resurrect a fact the user deleted. Off by default so manual
and other `retain()` callers are unaffected; auto-extraction opts in.
Returns `action: 'suppressed'` with the matched `tombstoneId`.

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memory/types.ts:464](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#464)

***

### source?

> `optional` **source**: [`RetainSource`](../type-aliases/RetainSource.md)

Defined in: [src/lib/memory/types.ts:462](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#462)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:463](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#463)

***

### trustTier?

> `optional` **trustTier**: `string`

Defined in: [src/lib/memory/types.ts:545](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#545)

Tier-0 security (PR3) — trust tier for this fact. The write-time
injection screen threads `"quarantined"` here for flagged candidates;
omit for the default (null/trusted). Persisted only on create (a
quarantined candidate is force-created, never merged, so it can't bump
or contaminate a clean memory). The DB op re-validates the value
against the known set before writing.
