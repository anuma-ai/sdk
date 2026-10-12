# ProfileSection

Defined in: [src/lib/memory/synthesizeProfile.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#163)

A synthesized profile section, grounded in specific vault facts.

## Properties

### generatedAt

> **generatedAt**: `number`

Defined in: [src/lib/memory/synthesizeProfile.ts:189](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#189)

Unix ms this section was generated.

***

### interests?

> `optional` **interests**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:187](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#187)

Structured interests — the `interests` facet only. Discrete entries,
trimmed and deduped case- and space-insensitively (first spelling wins), at
most 12 items of at most 40 code points each, ready for a profile store's
`interests` column. Absent when nothing survived normalization.

***

### key

> **key**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#164)

***

### label

> **label**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#165)

***

### occupation?

> `optional` **occupation**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#180)

Structured occupation — the `work_role` facet only. A short role phrase
(at most 80 code points, PII-gated alongside [ProfileSection.text](#text))
that a profile store's `occupation` column takes verbatim.

Absent when the facet found no evidence, when the model didn't return one,
or when the value it returned couldn't be made publishable. `text` is
unaffected either way, so the prose is never blocked on this.

***

### sourceMemoryIds

> **sourceMemoryIds**: `string`\[]

Defined in: [src/lib/memory/synthesizeProfile.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#170)

Vault memory ids this section was grounded on — provenance + delta refresh.

***

### stale?

> `optional` **stale**: `boolean`

Defined in: [src/lib/memory/synthesizeProfile.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#191)

True when regeneration failed (e.g. LLM returned empty) — the caller may choose to retry.

***

### text

> **text**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#168)

Synthesized prose (PII-redacted when a redactor is supplied). Empty when
the vault has no evidence for this facet.
