# useFiles

> **useFiles**(`options`: [`UseFilesOptions`](../Internal/interfaces/UseFilesOptions.md)): [`UseFilesResult`](../Internal/interfaces/UseFilesResult.md)

Defined in: [src/react/useFiles.ts:185](https://github.com/anuma-ai/sdk/blob/main/src/react/useFiles.ts#L185)

A React hook for managing files (images, videos, audio, documents).

This hook provides comprehensive CRUD operations for file records stored in
WatermelonDB, along with file reading capabilities from OPFS encrypted storage.
It supports both user-uploaded files and AI-generated files (e.g., DALL-E images).

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

[`UseFilesOptions`](../Internal/interfaces/UseFilesOptions.md)

</td>
<td>

Configuration options

</td>
</tr>
</tbody>
</table>

## Returns

[`UseFilesResult`](../Internal/interfaces/UseFilesResult.md)

An object containing file state and methods

## Example

```tsx
import { useFiles } from '@anthropic-ai/sdk/react';

function FileGallery({ database, walletAddress }) {
  const {
    getImages,
    readFile,
    createBlobUrl,
    isReady,
  } = useFiles({ database, walletAddress });

  const [images, setImages] = useState<StoredMedia[]>([]);

  useEffect(() => {
    if (isReady && walletAddress) {
      getImages(20).then(setImages);
    }
  }, [isReady, walletAddress, getImages]);

  return (
    <div>
      {images.map((img) => (
        <FileImage key={img.mediaId} file={img} createBlobUrl={createBlobUrl} />
      ))}
    </div>
  );
}
```
