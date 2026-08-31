# maskScopedEmbeddingCache

> **maskScopedEmbeddingCache**(`cache`: `Map`<`string`, `Float32Array`<`ArrayBufferLike`>>, `masked`: `boolean`): `Map`<`string`, `Float32Array`<`ArrayBufferLike`>>

Defined in: src/lib/db/chat/embeddingCache.ts:67

Build the same namespaced view over `cache` that a send with this masking decision uses.

REQUIRED FOR SHARING, and the reason this is exported at all. `embeddingCache`'s whole purpose is
that a caller who also needs the prompt vector passes one `Map` to both `sendMessage` and its own
`generateEmbedding` call, so the turn embeds once. But the send namespaces its entries by masking
decision (see MaskScopedEmbeddingCache) while `generateEmbedding` keys on the text alone —
so a caller handing the RAW `Map` to its own call writes `"hello"` where the send looks for
`"r:hello"`, and neither side ever hits. The dedupe silently does not happen.

So: pass the plain `Map` as `embeddingCache`, and wrap it with this for your own call.

```ts
const shared = new Map<string, Float32Array>();
// your own ranking embed, same masking decision as the send:
await generateEmbedding(text, { getToken, cache: maskScopedEmbeddingCache(shared, masked) });
await sendMessage({ ..., embeddingCache: shared, piiRedaction: masked });
```

`masked` must match what the send resolves for the same turn — i.e. whether PII redaction is on.
Get it wrong and you simply miss the cache; you cannot be served the other decision's vector,
which is the property the namespacing exists to guarantee.

## Parameters

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

`cache`

</td>
<td>

`Map`<`string`, `Float32Array`<`ArrayBufferLike`>>

</td>
</tr>
<tr>
<td>

`masked`

</td>
<td>

`boolean`

</td>
</tr>
</tbody>
</table>

## Returns

`Map`<`string`, `Float32Array`<`ArrayBufferLike`>>
