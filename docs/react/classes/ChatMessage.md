# ChatMessage

Defined in: [src/lib/chatStorage/models.ts:16](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L16)

Message model representing a single chat message

Note: This model uses raw column accessors instead of decorators
for better TypeScript compatibility without requiring legacy decorators.

## Extends

- `default`

## Constructors

### Constructor

> **new ChatMessage**(`collection`, `raw`): `Message`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:117

#### Parameters

##### collection

`Collection`\<`Model`\>

##### raw

`_RawRecord`

#### Returns

`Message`

#### Inherited from

`Model.constructor`

## Properties

### \_\_changes?

> `optional` **\_\_changes**: `BehaviorSubject`\<`any`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:40

#### Inherited from

`Model.__changes`

***

### \_isEditing

> **\_isEditing**: `boolean`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:36

#### Inherited from

`Model._isEditing`

***

### \_preparedState

> **\_preparedState**: `"create"` \| `"update"` \| `"markAsDeleted"` \| `"destroyPermanently"` \| `null`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:38

#### Inherited from

[`StoredMemoryModel`](StoredMemoryModel.md).[`_preparedState`](StoredMemoryModel.md#_preparedstate)

***

### \_raw

> **\_raw**: `_RawRecord`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:34

#### Inherited from

`Model._raw`

***

### \_subscribers

> **\_subscribers**: \[(`isDeleted`) => `void`, `any`\][]

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:125

#### Inherited from

`Model._subscribers`

***

### collection

> **collection**: `Collection`\<`Model`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:88

#### Inherited from

`Model.collection`

***

### \_wmelonTag

> `static` **\_wmelonTag**: `string`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:32

#### Inherited from

`Model._wmelonTag`

***

### associations

> `static` **associations**: `Associations`

Defined in: [src/lib/chatStorage/models.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L19)

#### Overrides

`Model.associations`

***

### table

> `static` **table**: `string` = `"history"`

Defined in: [src/lib/chatStorage/models.ts:17](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L17)

#### Overrides

`Model.table`

## Accessors

### asModel

#### Get Signature

> **get** **asModel**(): `this`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:97

##### Returns

`this`

#### Inherited from

`Model.asModel`

***

### collections

#### Get Signature

> **get** **collections**(): `CollectionMap`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:91

##### Returns

`CollectionMap`

#### Inherited from

`Model.collections`

***

### content

#### Get Signature

> **get** **content**(): `string`

Defined in: [src/lib/chatStorage/models.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L39)

The message text content

##### Returns

`string`

***

### conversationId

#### Get Signature

> **get** **conversationId**(): `string`

Defined in: [src/lib/chatStorage/models.ts:29](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L29)

Links message to its conversation

##### Returns

`string`

***

### createdAt

#### Get Signature

> **get** **createdAt**(): `Date`

Defined in: [src/lib/chatStorage/models.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L61)

Created timestamp

##### Returns

`Date`

***

### database

#### Get Signature

> **get** **database**(): `Database`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:93

##### Returns

`Database`

#### Inherited from

`Model.database`

***

### db

#### Get Signature

> **get** **db**(): `Database`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:95

##### Returns

`Database`

#### Inherited from

`Model.db`

***

### embeddingModel

#### Get Signature

> **get** **embeddingModel**(): `string` \| `undefined`

Defined in: [src/lib/chatStorage/models.ts:82](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L82)

Model used to generate embedding

##### Returns

`string` \| `undefined`

***

### files

#### Get Signature

> **get** **files**(): [`FileMetadata`](../interfaces/FileMetadata.md)[] \| `undefined`

Defined in: [src/lib/chatStorage/models.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L50)

Optional attached files

##### Returns

[`FileMetadata`](../interfaces/FileMetadata.md)[] \| `undefined`

***

### id

#### Get Signature

> **get** **id**(): `string`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:44

##### Returns

`string`

#### Inherited from

`Model.id`

***

### messageId

#### Get Signature

> **get** **messageId**(): `number`

Defined in: [src/lib/chatStorage/models.ts:24](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L24)

Sequential message ID within conversation

##### Returns

`number`

***

### model

#### Get Signature

> **get** **model**(): `string` \| `undefined`

Defined in: [src/lib/chatStorage/models.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L44)

LLM model used (e.g., GPT-4, Claude)

##### Returns

`string` \| `undefined`

***

### responseDuration

#### Get Signature

> **get** **responseDuration**(): `number` \| `undefined`

Defined in: [src/lib/chatStorage/models.ts:110](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L110)

Response time in seconds

##### Returns

`number` \| `undefined`

***

### role

#### Get Signature

> **get** **role**(): [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/chatStorage/models.ts:34](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L34)

Who sent the message: 'user' | 'assistant' | 'system'

##### Returns

[`ChatRole`](../type-aliases/ChatRole.md)

***

### sources

#### Get Signature

> **get** **sources**(): [`SearchSource`](../interfaces/SearchSource.md)[] \| `undefined`

Defined in: [src/lib/chatStorage/models.ts:99](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L99)

Web search sources

##### Returns

[`SearchSource`](../interfaces/SearchSource.md)[] \| `undefined`

***

### syncStatus

#### Get Signature

> **get** **syncStatus**(): `SyncStatus`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:46

##### Returns

`SyncStatus`

#### Inherited from

`Model.syncStatus`

***

### table

#### Get Signature

> **get** **table**(): `string`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:113

##### Returns

`string`

#### Inherited from

[`StoredMemoryModel`](StoredMemoryModel.md).[`table`](StoredMemoryModel.md#table-1)

***

### updatedAt

#### Get Signature

> **get** **updatedAt**(): `Date`

Defined in: [src/lib/chatStorage/models.ts:66](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L66)

Updated timestamp

##### Returns

`Date`

***

### usage

#### Get Signature

> **get** **usage**(): [`StoredChatCompletionUsage`](../interfaces/StoredChatCompletionUsage.md) \| `undefined`

Defined in: [src/lib/chatStorage/models.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L88)

Token counts and cost

##### Returns

[`StoredChatCompletionUsage`](../interfaces/StoredChatCompletionUsage.md) \| `undefined`

***

### vector

#### Get Signature

> **get** **vector**(): `number`[] \| `undefined`

Defined in: [src/lib/chatStorage/models.ts:71](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/chatStorage/models.ts#L71)

Embedding vector for semantic search

##### Returns

`number`[] \| `undefined`

## Methods

### \_\_ensureCanSetRaw()

> **\_\_ensureCanSetRaw**(): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:141

#### Returns

`void`

#### Inherited from

`Model.__ensureCanSetRaw`

***

### \_\_ensureNotDisposable()

> **\_\_ensureNotDisposable**(`debugName`): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:143

#### Parameters

##### debugName

`string`

#### Returns

`void`

#### Inherited from

`Model.__ensureNotDisposable`

***

### \_dangerouslySetRawWithoutMarkingColumnChange()

> **\_dangerouslySetRawWithoutMarkingColumnChange**(`rawFieldName`, `rawValue`): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:139

#### Parameters

##### rawFieldName

`string`

##### rawValue

`Value`

#### Returns

`void`

#### Inherited from

`Model._dangerouslySetRawWithoutMarkingColumnChange`

***

### \_getChanges()

> **\_getChanges**(): `BehaviorSubject`\<`any`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:42

#### Returns

`BehaviorSubject`\<`any`\>

#### Inherited from

`Model._getChanges`

***

### \_getRaw()

> **\_getRaw**(`rawFieldName`): `Value`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:133

#### Parameters

##### rawFieldName

`string`

#### Returns

`Value`

#### Inherited from

`Model._getRaw`

***

### \_notifyChanged()

> **\_notifyChanged**(): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:129

#### Returns

`void`

#### Inherited from

`Model._notifyChanged`

***

### \_notifyDestroyed()

> **\_notifyDestroyed**(): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:131

#### Returns

`void`

#### Inherited from

`Model._notifyDestroyed`

***

### \_setRaw()

> **\_setRaw**(`rawFieldName`, `rawValue`): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:135

#### Parameters

##### rawFieldName

`string`

##### rawValue

`Value`

#### Returns

`void`

#### Inherited from

`Model._setRaw`

***

### batch()

> **batch**(...`records`): `Promise`\<`void`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:102

#### Parameters

##### records

...`$ReadOnlyArray`\<`false` \| `void` \| `Model` \| `null`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Model.batch`

***

### callReader()

> **callReader**\<`T`\>(`action`): `Promise`\<`T`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:108

#### Type Parameters

##### T

`T`

#### Parameters

##### action

() => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

#### Inherited from

`Model.callReader`

***

### callWriter()

> **callWriter**\<`T`\>(`action`): `Promise`\<`T`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:105

#### Type Parameters

##### T

`T`

#### Parameters

##### action

() => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

#### Inherited from

`Model.callWriter`

***

### destroyPermanently()

> **destroyPermanently**(): `Promise`\<`void`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:74

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Model.destroyPermanently`

***

### experimentalDestroyPermanently()

> **experimentalDestroyPermanently**(): `Promise`\<`void`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:78

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Model.experimentalDestroyPermanently`

***

### experimentalMarkAsDeleted()

> **experimentalMarkAsDeleted**(): `Promise`\<`void`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:76

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Model.experimentalMarkAsDeleted`

***

### experimentalSubscribe()

> **experimentalSubscribe**(`subscriber`, `debugInfo?`): `Unsubscribe`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:127

#### Parameters

##### subscriber

(`isDeleted`) => `void`

##### debugInfo?

`any`

#### Returns

`Unsubscribe`

#### Inherited from

`Model.experimentalSubscribe`

***

### markAsDeleted()

> **markAsDeleted**(): `Promise`\<`void`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:70

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Model.markAsDeleted`

***

### observe()

> **observe**(): `Observable`\<`Message`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:84

#### Returns

`Observable`\<`Message`\>

#### Inherited from

`Model.observe`

***

### prepareDestroyPermanently()

> **prepareDestroyPermanently**(): `this`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:66

#### Returns

`this`

#### Inherited from

`Model.prepareDestroyPermanently`

***

### prepareMarkAsDeleted()

> **prepareMarkAsDeleted**(): `this`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:64

#### Returns

`this`

#### Inherited from

`Model.prepareMarkAsDeleted`

***

### prepareUpdate()

> **prepareUpdate**(`recordUpdater?`): `this`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:62

#### Parameters

##### recordUpdater?

(`_`) => `void`

#### Returns

`this`

#### Inherited from

`Model.prepareUpdate`

***

### subAction()

> **subAction**\<`T`\>(`action`): `Promise`\<`T`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:111

#### Type Parameters

##### T

`T`

#### Parameters

##### action

() => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

#### Inherited from

`Model.subAction`

***

### update()

> **update**(`recordUpdater?`): `Promise`\<`Message`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:55

#### Parameters

##### recordUpdater?

(`_`) => `void`

#### Returns

`Promise`\<`Message`\>

#### Inherited from

`Model.update`

***

### \_disposableFromDirtyRaw()

> `static` **\_disposableFromDirtyRaw**(`collection`, `dirtyRaw`): `Model`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:123

#### Parameters

##### collection

`Collection`\<`Model`\>

##### dirtyRaw

`DirtyRaw`

#### Returns

`Model`

#### Inherited from

`Model._disposableFromDirtyRaw`

***

### \_prepareCreate()

> `static` **\_prepareCreate**(`collection`, `recordBuilder`): `Model`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:119

#### Parameters

##### collection

`Collection`\<`Model`\>

##### recordBuilder

(`_`) => `void`

#### Returns

`Model`

#### Inherited from

`Model._prepareCreate`

***

### \_prepareCreateFromDirtyRaw()

> `static` **\_prepareCreateFromDirtyRaw**(`collection`, `dirtyRaw`): `Model`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:121

#### Parameters

##### collection

`Collection`\<`Model`\>

##### dirtyRaw

`DirtyRaw`

#### Returns

`Model`

#### Inherited from

`Model._prepareCreateFromDirtyRaw`
