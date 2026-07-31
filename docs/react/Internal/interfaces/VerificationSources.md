# VerificationSources

Defined in: [src/lib/memory/verifySupport.ts:251](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#251)

How verification turns a stored source id into text to judge against.
Injected rather than assumed so this module stays storage-agnostic (and
testable without a database) — [createMessageSourceResolver](../functions/createMessageSourceResolver.md) is the
default wiring over the chat store.

## Methods

### getSourceText()

> **getSourceText**(`chunkId`: `string`): `Promise`<`string` | `null`>

Defined in: [src/lib/memory/verifySupport.ts:271](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/verifySupport.ts#271)

Resolve one `sourceChunkIds` entry.

Return null only when the id DEFINITIVELY resolves to nothing — the
message was deleted, or the id was never a message. That is a permanent
fact about the provenance and produces `unverifiable`/`sources-missing`.

THROW when the read itself failed (locked database, adapter error, network
store). That is transient and produces `unchecked`/`sources-unavailable`,
so the caller can retry instead of telling a user their evidence is gone.
Verification catches the throw per id; it never propagates.

An implementation that labels speakers — as
[createMessageSourceResolver](../functions/createMessageSourceResolver.md) does, because the verifier weighs the
user's words differently from the assistant's — must label EVERY line of a
multi-line message, counting a lone `\r` as a break the way verification's
indentation does. Verification indents evidence but cannot see roles, so a
single leading label lets a break in the body forge a second speaker.

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

`chunkId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string` | `null`>
