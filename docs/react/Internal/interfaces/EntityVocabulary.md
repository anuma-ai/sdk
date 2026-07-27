# EntityVocabulary

Defined in: src/lib/memory/entityVocabulary.ts:51

A token -> stored-canonical-name index over the vault's entity table.
Immutable; rebuilt rather than mutated when the table moves.

## Properties

### index

> `readonly` **index**: `ReadonlyMap`<`string`, readonly `string`\[]>

Defined in: src/lib/memory/entityVocabulary.ts:53

Token -> the canonical names indexed under it.

***

### size

> `readonly` **size**: `number`

Defined in: src/lib/memory/entityVocabulary.ts:55

Number of distinct canonical names indexed.

***

### version

> `readonly` **version**: `string`

Defined in: src/lib/memory/entityVocabulary.ts:60

Opaque stamp of the entity-table state this was built from. Compare for
equality only — the composition is deliberately not part of the contract.
