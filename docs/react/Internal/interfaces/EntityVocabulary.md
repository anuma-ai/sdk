# EntityVocabulary

Defined in: [src/lib/memory/entityVocabulary.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/entityVocabulary.ts#65)

A token -> stored-canonical-name index over the vault's entity table.
Immutable; rebuilt rather than mutated when the table moves.

## Properties

### index

> `readonly` **index**: `ReadonlyMap`<`string`, readonly `string`\[]>

Defined in: [src/lib/memory/entityVocabulary.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/entityVocabulary.ts#67)

Token -> the canonical names indexed under it.

***

### size

> `readonly` **size**: `number`

Defined in: [src/lib/memory/entityVocabulary.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/entityVocabulary.ts#69)

Number of distinct canonical names indexed.

***

### version

> `readonly` **version**: `string`

Defined in: [src/lib/memory/entityVocabulary.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/entityVocabulary.ts#74)

Opaque stamp of the entity-table state this was built from. Compare for
equality only — the composition is deliberately not part of the contract.
