# useMedia

> **useMedia**(`options`: [`UseMediaOptions`](../Internal/interfaces/UseMediaOptions.md)): [`UseMediaResult`](../Internal/interfaces/UseMediaResult.md)

Defined in: [src/react/useMedia.ts:187](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useMedia.ts#L187)

A React hook for managing media files (images, videos, audio, documents).

This hook provides comprehensive CRUD operations for media records stored in
WatermelonDB, along with file reading capabilities from OPFS encrypted storage.
It supports both user-uploaded files and AI-generated media (e.g., DALL-E images).

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

[`UseMediaOptions`](../Internal/interfaces/UseMediaOptions.md)

</td>
<td>

Configuration options

</td>
</tr>
</tbody>
</table>

## Returns

[`UseMediaResult`](../Internal/interfaces/UseMediaResult.md)

An object containing media state and methods

## Example

```tsx
import { useMedia } from '@reverbia/sdk/react';

function MediaGallery({ database, walletAddress }) {
  const {
    media,
    getImages,
    readFile,
    createBlobUrl,
    isReady,
  } = useMedia({ database, walletAddress });

  const [images, setImages] = useState<StoredMedia[]>([]);

  useEffect(() => {
    if (isReady && walletAddress) {
      getImages(20).then(setImages);
    }
  }, [isReady, walletAddress, getImages]);

  return (
    <div>
      {images.map((img) => (
        <MediaImage key={img.mediaId} media={img} createBlobUrl={createBlobUrl} />
      ))}
    </div>
  );
}
```
