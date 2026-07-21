# ProfileFacet

Defined in: [src/lib/memory/synthesizeProfile.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#56)

One profile facet: how to recall its evidence and steer its synthesis.

## Properties

### guidance

> **guidance**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#63)

Facet-specific guidance appended to the synthesis system prompt.

***

### key

> **key**: [`ProfileFacetKey`](../type-aliases/ProfileFacetKey.md)

Defined in: [src/lib/memory/synthesizeProfile.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#57)

***

### label

> **label**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#59)

Human-readable section label.

***

### query

> **query**: `string`

Defined in: [src/lib/memory/synthesizeProfile.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/synthesizeProfile.ts#61)

Recall query that pulls the vault facts relevant to this facet.
