# ChatConversation

Defined in: [src/lib/db/chat/models.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/models.ts#53)

## Extends

* `default`

## Constructors

### Constructor

> **new ChatConversation**(`collection`: `Collection`<`Model`>, `raw`: `_RawRecord`): `Conversation`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:117

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

`collection`

</td>
<td>

`Collection`<`Model`>

</td>
</tr>
<tr>
<td>

`raw`

</td>
<td>

`_RawRecord`

</td>
</tr>
</tbody>
</table>

**Returns**

`Conversation`

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

[`Project`](Project.md).[`_preparedState`](Project.md#_preparedstate)

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

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/models.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/models.ts#61)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/models.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/models.ts#64)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/models.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/models.ts#66)

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/models.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/models.ts#63)

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/models.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/models.ts#62)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/models.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/models.ts#65)

***

### \_wmelonTag

> `static` **\_wmelonTag**: `string`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:32

**Inherited from**

`Model._wmelonTag`

***

### associations

> `static` **associations**: `Associations`

Defined in: [src/lib/db/chat/models.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/models.ts#56)

**Overrides**

`Model.associations`

***

### table

> `static` **table**: `string` = `"conversations"`

Defined in: [src/lib/db/chat/models.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/models.ts#54)

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

[`Project`](Project.md).[`table`](Project.md#table-1)

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

`debugName`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`Model.__ensureNotDisposable`

***

### \_dangerouslySetRawWithoutMarkingColumnChange()

> **\_dangerouslySetRawWithoutMarkingColumnChange**(`rawFieldName`: `string`, `rawValue`: `Value`): `void`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:139

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

`rawFieldName`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`rawValue`

</td>
<td>

`Value`

</td>
</tr>
</tbody>
</table>

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

`rawFieldName`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

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

`rawFieldName`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`rawValue`

</td>
<td>

`Value`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`Model._setRaw`

***

### batch()

> **batch**(...`records`: `$ReadOnlyArray`<`false` | `void` | `Model` | `null`>): `Promise`<`void`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:102

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

...`records`

</td>
<td>

`$ReadOnlyArray`<`false` | `void` | `Model` | `null`>

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>

**Inherited from**

`Model.batch`

***

### callReader()

> **callReader**<`T`>(`action`: () => `Promise`<`T`>): `Promise`<`T`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:108

**Type Parameters**

<table>
<thead>
<tr>
<th>Type Parameter</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`T`

</td>
</tr>
</tbody>
</table>

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

`action`

</td>
<td>

() => `Promise`<`T`>

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`T`>

**Inherited from**

`Model.callReader`

***

### callWriter()

> **callWriter**<`T`>(`action`: () => `Promise`<`T`>): `Promise`<`T`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:105

**Type Parameters**

<table>
<thead>
<tr>
<th>Type Parameter</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`T`

</td>
</tr>
</tbody>
</table>

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

`action`

</td>
<td>

() => `Promise`<`T`>

</td>
</tr>
</tbody>
</table>

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

`subscriber`

</td>
<td>

(`isDeleted`: `boolean`) => `void`

</td>
</tr>
<tr>
<td>

`debugInfo?`

</td>
<td>

`any`

</td>
</tr>
</tbody>
</table>

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

> **observe**(): `Observable`<`Conversation`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:84

**Returns**

`Observable`<`Conversation`>

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

`recordUpdater?`

</td>
<td>

(`_`: `this`) => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

`this`

**Inherited from**

`Model.prepareUpdate`

***

### subAction()

> **subAction**<`T`>(`action`: () => `Promise`<`T`>): `Promise`<`T`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:111

**Type Parameters**

<table>
<thead>
<tr>
<th>Type Parameter</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`T`

</td>
</tr>
</tbody>
</table>

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

`action`

</td>
<td>

() => `Promise`<`T`>

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`T`>

**Inherited from**

`Model.subAction`

***

### update()

> **update**(`recordUpdater?`: (`_`: `this`) => `void`): `Promise`<`Conversation`>

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:55

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

`recordUpdater?`

</td>
<td>

(`_`: `this`) => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Conversation`>

**Inherited from**

`Model.update`

***

### \_disposableFromDirtyRaw()

> `static` **\_disposableFromDirtyRaw**(`collection`: `Collection`<`Model`>, `dirtyRaw`: `DirtyRaw`): `Model`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:123

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

`collection`

</td>
<td>

`Collection`<`Model`>

</td>
</tr>
<tr>
<td>

`dirtyRaw`

</td>
<td>

`DirtyRaw`

</td>
</tr>
</tbody>
</table>

**Returns**

`Model`

**Inherited from**

`Model._disposableFromDirtyRaw`

***

### \_prepareCreate()

> `static` **\_prepareCreate**(`collection`: `Collection`<`Model`>, `recordBuilder`: (`_`: `Model`) => `void`): `Model`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:119

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

`collection`

</td>
<td>

`Collection`<`Model`>

</td>
</tr>
<tr>
<td>

`recordBuilder`

</td>
<td>

(`_`: `Model`) => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

`Model`

**Inherited from**

`Model._prepareCreate`

***

### \_prepareCreateFromDirtyRaw()

> `static` **\_prepareCreateFromDirtyRaw**(`collection`: `Collection`<`Model`>, `dirtyRaw`: `DirtyRaw`): `Model`

Defined in: node\_modules/.pnpm/@nozbe+watermelondb@0.28.0/node\_modules/@nozbe/watermelondb/Model/index.d.ts:121

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

`collection`

</td>
<td>

`Collection`<`Model`>

</td>
</tr>
<tr>
<td>

`dirtyRaw`

</td>
<td>

`DirtyRaw`

</td>
</tr>
</tbody>
</table>

**Returns**

`Model`

**Inherited from**

`Model._prepareCreateFromDirtyRaw`
