# NEVER\_TTL\_MS

> `const` **NEVER\_TTL\_MS**: `number` = `Number.POSITIVE_INFINITY`

Defined in: [src/lib/memory/decay.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/decay.ts#37)

"Never" TTL — durable identity-class types (identity/preference/relationship/
constraint) never age-archive. Expressed as +Infinity so the age comparison
`now - updatedAt > ttl` is always false.
