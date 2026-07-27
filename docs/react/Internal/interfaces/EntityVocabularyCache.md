# EntityVocabularyCache

Defined in: [src/lib/memory/entityVocabulary.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/entityVocabulary.ts#93)

Single-slot cache for a built [EntityVocabulary](EntityVocabulary.md). Deliberately NOT an
LRU and deliberately NOT time-based: there is exactly one vocabulary per
process, and it is invalidated by a data signal (the entity table's version
stamp) rather than by a clock. A TTL would be both slower to notice a real
change and impossible to test without wall-clock dependence.

Build with [createEntityVocabularyCache](../functions/createEntityVocabularyCache.md) and hold it for the session.
Sharing one across two different entity tables is SAFE — the version stamp
carries a per-context identity, so the second vault misses the cache and
rebuilds rather than being served the first vault's names. Clearing it on a
user switch is still worth doing (entity names are derived from decrypted
user content and there is no reason to keep them resident), but correctness
no longer depends on the caller remembering to.

## Methods

### clear()

> **clear**(): `void`

Defined in: [src/lib/memory/entityVocabulary.ts:96](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/entityVocabulary.ts#96)

**Returns**

`void`

***

### get()

> **get**(): [`EntityVocabulary`](EntityVocabulary.md) | `undefined`

Defined in: [src/lib/memory/entityVocabulary.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/entityVocabulary.ts#94)

**Returns**

[`EntityVocabulary`](EntityVocabulary.md) | `undefined`

***

### set()

> **set**(`vocabulary`: [`EntityVocabulary`](EntityVocabulary.md)): `void`

Defined in: [src/lib/memory/entityVocabulary.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/entityVocabulary.ts#95)

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

`vocabulary`

</td>
<td>

[`EntityVocabulary`](EntityVocabulary.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`
