# ProfileSection

Defined in: [src/lib/memory/synthesizeProfile.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#171)

A synthesized profile section, grounded in specific vault facts.

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#197)

Unix ms this section was generated.

***

### interests?

> `optional` **interests**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:195](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#195)

Structured interests — the `interests` facet only. Discrete entries,
trimmed and deduped case- and space-insensitively (first spelling wins), at
most 12 items of at most 40 code points each, ready for a profile store's
`interests` column. Absent when nothing survived normalization.

***

### key

> **key**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#172)

***

### label

> **label**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#173)

***

### occupation?

> `optional` **occupation**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#188)

Structured occupation — the `work_role` facet only. A short role phrase
(at most 80 code points, PII-gated alongside [ProfileSection.text](#text))
that a profile store's `occupation` column takes verbatim.

Absent when the facet found no evidence, when the model didn't return one,
or when the value it returned couldn't be made publishable. `text` is
unaffected either way, so the prose is never blocked on this.

***

### sourceMemoryIds

> **sourceMemoryIds**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#178)

Vault memory ids this section was grounded on — provenance + delta refresh.

***

### stale?

> `optional` **stale**: `boolean`

Defined in: [src/lib/memory/synthesizeProfile.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#199)

True when regeneration failed (e.g. LLM returned empty) — the caller may choose to retry.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#176)

Synthesized prose (PII-redacted when a redactor is supplied). Empty when
the vault has no evidence for this facet.
