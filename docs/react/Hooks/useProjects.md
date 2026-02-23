# useProjects

> **useProjects**(`options`: [`UseProjectsOptions`](../Internal/interfaces/UseProjectsOptions.md)): [`UseProjectsResult`](../Internal/interfaces/UseProjectsResult.md)

Defined in: [src/react/useProjects.ts:129](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useProjects.ts#L129)

A React hook for managing projects (conversation groups).

Projects allow users to organize their conversations by topic, purpose,
or any other criteria. This hook provides CRUD operations for projects
and methods to manage conversation-project associations.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options`

</td>
<td>

[`UseProjectsOptions`](../Internal/interfaces/UseProjectsOptions.md)

</td>
<td>

Configuration options

</td>
</tr>
</tbody>
</table>

## Returns

[`UseProjectsResult`](../Internal/interfaces/UseProjectsResult.md)

An object containing project state and methods

## Example

```tsx
import { useProjects } from '@reverbia/sdk/react';

function ProjectsComponent({ database }) {
  const {
    projects,
    createProject,
    getProjectConversations,
    updateConversationProject,
  } = useProjects({ database });

  const handleCreateProject = async () => {
    const project = await createProject({ name: 'My New Project' });
    console.log('Created project:', project.projectId);
  };

  return (
    <div>
      <button onClick={handleCreateProject}>New Project</button>
      {projects.map((p) => (
        <div key={p.projectId}>{p.name}</div>
      ))}
    </div>
  );
}
```
