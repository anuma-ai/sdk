# DEFAULT\_PROFILE\_FACT\_TYPE\_WEIGHTS

> `const` **DEFAULT\_PROFILE\_FACT\_TYPE\_WEIGHTS**: `Partial`<`Record`<[`FactType`](../type-aliases/FactType.md), `number`>>

Defined in: [src/lib/memory/profileSalience.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/profileSalience.ts#30)

Per-FactType multipliers for profile synthesis / salience.
Durable identity-class types (never age-archive in decay) rank higher;
ephemeral plan/ongoing\_context rank lower. Untyped / `other` stay neutral.
