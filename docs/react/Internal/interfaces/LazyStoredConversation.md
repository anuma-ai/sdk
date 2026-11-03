# LazyStoredConversation

Defined in: [src/lib/db/chat/types.ts:341](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#341)

Lazy variant of [StoredConversation](StoredConversation.md).

Identical to `StoredConversation` except `title` is replaced with
`encryptedTitle` — the raw value as persisted in WatermelonDB. The
caller is responsible for decrypting the title when (and only when)
the row is actually rendered, typically via `decryptConversationTitle`
inside an IntersectionObserver callback or a virtualized list.

For users with thousands of conversations this means plaintext titles
for the off-screen rows never enter client RAM.

The string in `encryptedTitle` may also be plaintext (legacy/unencrypted
conversations); `decryptConversationTitle` handles both transparently.

## Extends

* `Omit`<[`StoredConversation`](StoredConversation.md), `"title"`>

## Properties

### context?

> `optional` **context**: `object`

Defined in: [src/lib/db/chat/types.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#323)

Per-conversation app state kept with the conversation in vault, keyed by the app; absent on local storage.

**Index Signature**

\[`key`: `string`]: [`ChatJson`](../type-aliases/ChatJson.md)

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`context`](StoredConversation.md#context)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:312](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#312)

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`conversationId`](StoredConversation.md#conversationid)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:316](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#316)

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`createdAt`](StoredConversation.md#createdat)

***

### encryptedTitle

> **encryptedTitle**: `string`

Defined in: [src/lib/db/chat/types.ts:347](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#347)

Raw stored title — either ciphertext (`enc:v3:...`) or plaintext for
legacy rows. Pass to `decryptConversationTitle(encryptedTitle, address)`
when the row needs to be rendered.

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:318](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#318)

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`isDeleted`](StoredConversation.md#isdeleted)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#321)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`pinnedAt`](StoredConversation.md#pinnedat)

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:315](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#315)

Optional project ID this conversation belongs to

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`projectId`](StoredConversation.md#projectid)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#311)

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`uniqueId`](StoredConversation.md#uniqueid)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:317](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#317)

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`updatedAt`](StoredConversation.md#updatedat)
