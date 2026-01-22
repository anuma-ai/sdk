# UseProjectsResult

Defined in: [src/react/useProjects.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L45)

Result returned by useProjects hook.

## Properties

### createProject()

> **createProject**: (`opts?`: [`CreateProjectOptions`](CreateProjectOptions.md)) => `Promise`<[`StoredProject`](StoredProject.md)>

Defined in: [src/react/useProjects.ts:60](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L60)

Create a new project

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

`opts?`

</td>
<td>

[`CreateProjectOptions`](CreateProjectOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredProject`](StoredProject.md)>

***

### currentProjectId

> **currentProjectId**: `string` | `null`

Defined in: [src/react/useProjects.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L50)

Currently selected project ID

***

### deleteProject()

> **deleteProject**: (`projectId`: `string`) => `Promise`<`boolean`>

Defined in: [src/react/useProjects.ts:73](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L73)

Delete a project (soft delete)

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

`projectId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### getConversationsByProject()

> **getConversationsByProject**: (`projectId`: `string` | `null`) => `Promise`<[`StoredConversation`](StoredConversation.md)\[]>

Defined in: [src/react/useProjects.ts:86](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L86)

Get conversations by project (null = no project)

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

`projectId`

</td>
<td>

`string` | `null`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md)\[]>

***

### getProject()

> **getProject**: (`projectId`: `string`) => `Promise`<[`StoredProject`](StoredProject.md) | `null`>

Defined in: [src/react/useProjects.ts:62](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L62)

Get a single project by ID

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

`projectId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredProject`](StoredProject.md) | `null`>

***

### getProjectConversationCount()

> **getProjectConversationCount**: (`projectId`: `string`) => `Promise`<`number`>

Defined in: [src/react/useProjects.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L79)

Get count of conversations in a project

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

`projectId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`number`>

***

### getProjectConversations()

> **getProjectConversations**: (`projectId`: `string`) => `Promise`<[`StoredConversation`](StoredConversation.md)\[]>

Defined in: [src/react/useProjects.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L77)

Get all conversations in a project

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

`projectId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredConversation`](StoredConversation.md)\[]>

***

### getProjects()

> **getProjects**: () => `Promise`<[`StoredProject`](StoredProject.md)\[]>

Defined in: [src/react/useProjects.ts:64](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L64)

Get all projects

**Returns**

`Promise`<[`StoredProject`](StoredProject.md)\[]>

***

### inboxProjectId

> **inboxProjectId**: `string` | `null`

Defined in: [src/react/useProjects.ts:94](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L94)

The ID of the default Inbox project (auto-created)

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/react/useProjects.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L54)

Whether projects are being loaded

***

### isReady

> **isReady**: `boolean`

Defined in: [src/react/useProjects.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L56)

Whether the projects system is ready (database table exists)

***

### projects

> **projects**: [`StoredProject`](StoredProject.md)\[]

Defined in: [src/react/useProjects.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L48)

List of all projects

***

### refreshProjects()

> **refreshProjects**: () => `Promise`<`void`>

Defined in: [src/react/useProjects.ts:92](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L92)

Refresh the projects list from database

**Returns**

`Promise`<`void`>

***

### setCurrentProjectId()

> **setCurrentProjectId**: (`id`: `string` | `null`) => `void`

Defined in: [src/react/useProjects.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L52)

Set the current project ID

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

`id`

</td>
<td>

`string` | `null`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### updateConversationProject()

> **updateConversationProject**: (`conversationId`: `string`, `projectId`: `string` | `null`) => `Promise`<`boolean`>

Defined in: [src/react/useProjects.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L81)

Move a conversation to a project (or remove with null)

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

`conversationId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`projectId`

</td>
<td>

`string` | `null`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### updateProject()

> **updateProject**: (`projectId`: `string`, `opts`: [`UpdateProjectOptions`](UpdateProjectOptions.md)) => `Promise`<`boolean`>

Defined in: [src/react/useProjects.ts:68](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L68)

Update a project with partial options

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

`projectId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`opts`

</td>
<td>

[`UpdateProjectOptions`](UpdateProjectOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### updateProjectName()

> **updateProjectName**: (`projectId`: `string`, `name`: `string`) => `Promise`<`boolean`>

Defined in: [src/react/useProjects.ts:66](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L66)

Update a project's name

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

`projectId`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`name`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>
