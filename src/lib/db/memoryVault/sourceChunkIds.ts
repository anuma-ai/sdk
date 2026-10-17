export const MAX_SOURCE_CHUNK_IDS_BYTES = 16 << 10;

const utf8 = new TextEncoder();

export function serializeSourceChunkIds(ids: readonly string[]): string {
  const sizes = ids.map((id) => utf8.encode(JSON.stringify(id)).length + 1);
  let total = sizes.reduce((sum, size) => sum + size, 1);
  let start = 0;
  while (total > MAX_SOURCE_CHUNK_IDS_BYTES && start < ids.length) total -= sizes[start++];
  return JSON.stringify(ids.slice(start));
}
