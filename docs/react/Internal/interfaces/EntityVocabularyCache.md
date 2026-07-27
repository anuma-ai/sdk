# EntityVocabularyCache

Defined in: src/lib/memory/entityVocabulary.ts:75

Single-slot cache for a built [EntityVocabulary](EntityVocabulary.md). Deliberately NOT an
LRU and deliberately NOT time-based: there is exactly one vocabulary per
process, and it is invalidated by a data signal (the entity table's version
stamp) rather than by a clock. A TTL would be both slower to notice a real
change and impossible to test without wall-clock dependence.

Build with [createEntityVocabularyCache](../functions/createEntityVocabularyCache.md) and hold it for the session.
Clear it whenever the underlying identity changes — entity names are derived
from decrypted user content and must not survive a user switch.

## Methods

### clear()

> **clear**(): `void`

Defined in: src/lib/memory/entityVocabulary.ts:78

**Returns**

`void`

***

### get()

> **get**(): [`EntityVocabulary`](EntityVocabulary.md) | `undefined`

Defined in: src/lib/memory/entityVocabulary.ts:76

**Returns**

[`EntityVocabulary`](EntityVocabulary.md) | `undefined`

***

### set()

> **set**(`vocabulary`: [`EntityVocabulary`](EntityVocabulary.md)): `void`

Defined in: src/lib/memory/entityVocabulary.ts:77

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
