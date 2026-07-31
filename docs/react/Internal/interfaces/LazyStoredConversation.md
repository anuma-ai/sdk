# LazyStoredConversation

Defined in: [src/lib/db/chat/types.ts:285](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#285)

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

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#258)

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`conversationId`](StoredConversation.md#conversationid)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:262](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#262)

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`createdAt`](StoredConversation.md#createdat)

***

### encryptedTitle

> **encryptedTitle**: `string`

Defined in: [src/lib/db/chat/types.ts:291](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#291)

Raw stored title — either ciphertext (`enc:v3:...`) or plaintext for
legacy rows. Pass to `decryptConversationTitle(encryptedTitle, address)`
when the row needs to be rendered.

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:264](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#264)

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`isDeleted`](StoredConversation.md#isdeleted)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:267](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#267)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`pinnedAt`](StoredConversation.md#pinnedat)

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:261](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#261)

Optional project ID this conversation belongs to

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`projectId`](StoredConversation.md#projectid)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:257](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#257)

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`uniqueId`](StoredConversation.md#uniqueid)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:263](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#263)

**Inherited from**

[`StoredConversation`](StoredConversation.md).[`updatedAt`](StoredConversation.md#updatedat)
