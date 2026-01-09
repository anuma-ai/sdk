# StoredMemoryModel

Defined in: [src/lib/db/memory/models.ts:5](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L5)

## Extends

* `default`

## Constructors

### Constructor

> **new StoredMemoryModel**(`collection`: `Collection`<`Model`>, `raw`: `_RawRecord`): `Memory`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:117

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `collection` | `Collection`<`Model`> |
| `raw` | `_RawRecord` |

**Returns**

`Memory`

**Inherited from**

`Model.constructor`

## Properties

### \_\_changes?

> `optional` **\_\_changes**: `BehaviorSubject`<`any`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:40

**Inherited from**

`Model.__changes`

***

### \_isEditing

> **\_isEditing**: `boolean`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:36

**Inherited from**

`Model._isEditing`

***

### \_preparedState

> **\_preparedState**: `"create"` | `"update"` | `"markAsDeleted"` | `"destroyPermanently"` | `null`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:38

**Inherited from**

`Model._preparedState`

***

### \_raw

> **\_raw**: `_RawRecord`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:34

**Inherited from**

`Model._raw`

***

### \_subscribers

> **\_subscribers**: \[(`isDeleted`: `boolean`) => `void`, `any`]\[]

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:125

**Inherited from**

`Model._subscribers`

***

### collection

> **collection**: `Collection`<`Model`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:88

**Inherited from**

`Model.collection`

***

### compositeKey

> **compositeKey**: `string`

Defined in: [src/lib/db/memory/models.ts:15](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L15)

***

### confidence

> **confidence**: `number`

Defined in: [src/lib/db/memory/models.ts:13](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L13)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/memory/models.ts:17](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L17)

***

### embedding?

> `optional` **embedding**: `number`\[]

Defined in: [src/lib/db/memory/models.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L19)

***

### embeddingModel?

> `optional` **embeddingModel**: `string`

Defined in: [src/lib/db/memory/models.ts:20](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L20)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/memory/models.ts:21](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L21)

***

### key

> **key**: `string`

Defined in: [src/lib/db/memory/models.ts:10](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L10)

***

### namespace

> **namespace**: `string`

Defined in: [src/lib/db/memory/models.ts:9](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L9)

***

### pii

> **pii**: `boolean`

Defined in: [src/lib/db/memory/models.ts:14](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L14)

***

### rawEvidence

> **rawEvidence**: `string`

Defined in: [src/lib/db/memory/models.ts:12](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L12)

***

### type

> **type**: [`MemoryType`](../type-aliases/MemoryType.md)

Defined in: [src/lib/db/memory/models.ts:8](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L8)

***

### uniqueKey

> **uniqueKey**: `string`

Defined in: [src/lib/db/memory/models.ts:16](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L16)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/memory/models.ts:18](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L18)

***

### value

> **value**: `string`

Defined in: [src/lib/db/memory/models.ts:11](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L11)

***

### \_wmelonTag

> `static` **\_wmelonTag**: `string`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:32

**Inherited from**

`Model._wmelonTag`

***

### associations

> `static` **associations**: `Associations`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:29

**Inherited from**

`Model.associations`

***

### table

> `static` **table**: `string` = `"memories"`

Defined in: [src/lib/db/memory/models.ts:6](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/models.ts#L6)

**Overrides**

`Model.table`

## Accessors

### asModel

**Get Signature**

> **get** **asModel**(): `this`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:97

**Returns**

`this`

**Inherited from**

`Model.asModel`

***

### collections

**Get Signature**

> **get** **collections**(): `CollectionMap`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:91

**Returns**

`CollectionMap`

**Inherited from**

`Model.collections`

***

### database

**Get Signature**

> **get** **database**(): `Database`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:93

**Returns**

`Database`

**Inherited from**

`Model.database`

***

### db

**Get Signature**

> **get** **db**(): `Database`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:95

**Returns**

`Database`

**Inherited from**

`Model.db`

***

### id

**Get Signature**

> **get** **id**(): `string`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:44

**Returns**

`string`

**Inherited from**

`Model.id`

***

### syncStatus

**Get Signature**

> **get** **syncStatus**(): `SyncStatus`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:46

**Returns**

`SyncStatus`

**Inherited from**

`Model.syncStatus`

***

### table

**Get Signature**

> **get** **table**(): `string`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:113

**Returns**

`string`

**Inherited from**

`Model.table`

## Methods

### \_\_ensureCanSetRaw()

> **\_\_ensureCanSetRaw**(): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:141

**Returns**

`void`

**Inherited from**

`Model.__ensureCanSetRaw`

***

### \_\_ensureNotDisposable()

> **\_\_ensureNotDisposable**(`debugName`: `string`): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:143

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `debugName` | `string` |

**Returns**

`void`

**Inherited from**

`Model.__ensureNotDisposable`

***

### \_dangerouslySetRawWithoutMarkingColumnChange()

> **\_dangerouslySetRawWithoutMarkingColumnChange**(`rawFieldName`: `string`, `rawValue`: `Value`): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:139

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `rawFieldName` | `string` |
| `rawValue` | `Value` |

**Returns**

`void`

**Inherited from**

`Model._dangerouslySetRawWithoutMarkingColumnChange`

***

### \_getChanges()

> **\_getChanges**(): `BehaviorSubject`<`any`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:42

**Returns**

`BehaviorSubject`<`any`>

**Inherited from**

`Model._getChanges`

***

### \_getRaw()

> **\_getRaw**(`rawFieldName`: `string`): `Value`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:133

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `rawFieldName` | `string` |

**Returns**

`Value`

**Inherited from**

`Model._getRaw`

***

### \_notifyChanged()

> **\_notifyChanged**(): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:129

**Returns**

`void`

**Inherited from**

`Model._notifyChanged`

***

### \_notifyDestroyed()

> **\_notifyDestroyed**(): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:131

**Returns**

`void`

**Inherited from**

`Model._notifyDestroyed`

***

### \_setRaw()

> **\_setRaw**(`rawFieldName`: `string`, `rawValue`: `Value`): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:135

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `rawFieldName` | `string` |
| `rawValue` | `Value` |

**Returns**

`void`

**Inherited from**

`Model._setRaw`

***

### batch()

> **batch**(...`records`: `$ReadOnlyArray`<`false` | `void` | `Model` | `null`>): `Promise`<`void`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:102

**Parameters**

| Parameter | Type |
| ------ | ------ |
| ...`records` | `$ReadOnlyArray`<`false` | `void` | `Model` | `null`> |

**Returns**

`Promise`<`void`>

**Inherited from**

`Model.batch`

***

### callReader()

> **callReader**<`T`>(`action`: () => `Promise`<`T`>): `Promise`<`T`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:108

**Type Parameters**

| Type Parameter |
| ------ |
| `T` |

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `action` | () => `Promise`<`T`> |

**Returns**

`Promise`<`T`>

**Inherited from**

`Model.callReader`

***

### callWriter()

> **callWriter**<`T`>(`action`: () => `Promise`<`T`>): `Promise`<`T`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:105

**Type Parameters**

| Type Parameter |
| ------ |
| `T` |

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `action` | () => `Promise`<`T`> |

**Returns**

`Promise`<`T`>

**Inherited from**

`Model.callWriter`

***

### destroyPermanently()

> **destroyPermanently**(): `Promise`<`void`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:74

**Returns**

`Promise`<`void`>

**Inherited from**

`Model.destroyPermanently`

***

### experimentalDestroyPermanently()

> **experimentalDestroyPermanently**(): `Promise`<`void`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:78

**Returns**

`Promise`<`void`>

**Inherited from**

`Model.experimentalDestroyPermanently`

***

### experimentalMarkAsDeleted()

> **experimentalMarkAsDeleted**(): `Promise`<`void`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:76

**Returns**

`Promise`<`void`>

**Inherited from**

`Model.experimentalMarkAsDeleted`

***

### experimentalSubscribe()

> **experimentalSubscribe**(`subscriber`: (`isDeleted`: `boolean`) => `void`, `debugInfo?`: `any`): `Unsubscribe`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:127

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `subscriber` | (`isDeleted`: `boolean`) => `void` |
| `debugInfo?` | `any` |

**Returns**

`Unsubscribe`

**Inherited from**

`Model.experimentalSubscribe`

***

### markAsDeleted()

> **markAsDeleted**(): `Promise`<`void`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:70

**Returns**

`Promise`<`void`>

**Inherited from**

`Model.markAsDeleted`

***

### observe()

> **observe**(): `Observable`<`Memory`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:84

**Returns**

`Observable`<`Memory`>

**Inherited from**

`Model.observe`

***

### prepareDestroyPermanently()

> **prepareDestroyPermanently**(): `this`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:66

**Returns**

`this`

**Inherited from**

`Model.prepareDestroyPermanently`

***

### prepareMarkAsDeleted()

> **prepareMarkAsDeleted**(): `this`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:64

**Returns**

`this`

**Inherited from**

`Model.prepareMarkAsDeleted`

***

### prepareUpdate()

> **prepareUpdate**(`recordUpdater?`: (`_`: `this`) => `void`): `this`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:62

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `recordUpdater?` | (`_`: `this`) => `void` |

**Returns**

`this`

**Inherited from**

`Model.prepareUpdate`

***

### subAction()

> **subAction**<`T`>(`action`: () => `Promise`<`T`>): `Promise`<`T`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:111

**Type Parameters**

| Type Parameter |
| ------ |
| `T` |

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `action` | () => `Promise`<`T`> |

**Returns**

`Promise`<`T`>

**Inherited from**

`Model.subAction`

***

### update()

> **update**(`recordUpdater?`: (`_`: `this`) => `void`): `Promise`<`Memory`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:55

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `recordUpdater?` | (`_`: `this`) => `void` |

**Returns**

`Promise`<`Memory`>

**Inherited from**

`Model.update`

***

### \_disposableFromDirtyRaw()

> `static` **\_disposableFromDirtyRaw**(`collection`: `Collection`<`Model`>, `dirtyRaw`: `DirtyRaw`): `Model`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:123

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `collection` | `Collection`<`Model`> |
| `dirtyRaw` | `DirtyRaw` |

**Returns**

`Model`

**Inherited from**

`Model._disposableFromDirtyRaw`

***

### \_prepareCreate()

> `static` **\_prepareCreate**(`collection`: `Collection`<`Model`>, `recordBuilder`: (`_`: `Model`) => `void`): `Model`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:119

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `collection` | `Collection`<`Model`> |
| `recordBuilder` | (`_`: `Model`) => `void` |

**Returns**

`Model`

**Inherited from**

`Model._prepareCreate`

***

### \_prepareCreateFromDirtyRaw()

> `static` **\_prepareCreateFromDirtyRaw**(`collection`: `Collection`<`Model`>, `dirtyRaw`: `DirtyRaw`): `Model`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:121

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `collection` | `Collection`<`Model`> |
| `dirtyRaw` | `DirtyRaw` |

**Returns**

`Model`

**Inherited from**

`Model._prepareCreateFromDirtyRaw`
