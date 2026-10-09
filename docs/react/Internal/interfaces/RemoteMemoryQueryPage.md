# RemoteMemoryQueryPage

Defined in: [src/lib/memory/store/remotePersistence.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#91)

## Extends

* [`RemoteMemoryPage`](RemoteMemoryPage.md)

## Properties

### changes\_cursor?

> `optional` **changes\_cursor**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#93)

Only for order "changed": resume the next poll from here.

***

### failed

> **failed**: [`RemoteMemoryDecodeFailure`](RemoteMemoryDecodeFailure.md)\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#70)

**Inherited from**

[`RemoteMemoryPage`](RemoteMemoryPage.md).[`failed`](RemoteMemoryPage.md#failed)

***

### items

> **items**: [`RemoteMemoryRecord`](RemoteMemoryRecord.md)\[]

Defined in: [src/lib/memory/store/remotePersistence.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#69)

**Inherited from**

[`RemoteMemoryPage`](RemoteMemoryPage.md).[`items`](RemoteMemoryPage.md#items)

***

### next\_cursor?

> `optional` **next\_cursor**: `string`

Defined in: [src/lib/memory/store/remotePersistence.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remotePersistence.ts#71)

**Inherited from**

[`RemoteMemoryPage`](RemoteMemoryPage.md).[`next_cursor`](RemoteMemoryPage.md#next_cursor)
