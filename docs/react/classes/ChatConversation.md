# ChatConversation

Defined in: [src/lib/db/chat/models.ts:34](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/models.ts#L34)

## Extends

- `default`

## Constructors

### Constructor

> **new ChatConversation**(`collection`, `raw`): `Conversation`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:117

#### Parameters

##### collection

`Collection`\<`Model`\>

##### raw

`_RawRecord`

#### Returns

`Conversation`

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

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/models.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/models.ts#L41)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/models.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/models.ts#L43)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/models.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/models.ts#L45)

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/models.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/models.ts#L42)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/models.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/models.ts#L44)

***

### \_wmelonTag

> `static` **\_wmelonTag**: `string`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:32

#### Inherited from

`Model._wmelonTag`

***

### associations

> `static` **associations**: `Associations`

Defined in: [src/lib/db/chat/models.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/models.ts#L37)

#### Overrides

`Model.associations`

***

### table

> `static` **table**: `string` = `"conversations"`

Defined in: [src/lib/db/chat/models.ts:35](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/models.ts#L35)

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

### id

#### Get Signature

> **get** **id**(): `string`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:44

##### Returns

`string`

#### Inherited from

`Model.id`

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

> **observe**(): `Observable`\<`Conversation`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:84

#### Returns

`Observable`\<`Conversation`\>

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

> **update**(`recordUpdater?`): `Promise`\<`Conversation`\>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:55

#### Parameters

##### recordUpdater?

(`_`) => `void`

#### Returns

`Promise`\<`Conversation`\>

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
