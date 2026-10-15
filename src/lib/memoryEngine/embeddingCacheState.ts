interface EmbeddingCacheState {
  scopedViews: WeakMap<
    Map<string, Float32Array>,
    { masked?: Map<string, Float32Array>; raw?: Map<string, Float32Array> }
  >;
  inFlightByCache: WeakMap<Map<string, Float32Array>, Map<string, Promise<Float32Array>>>;
  cachedEmbeddingModels: WeakMap<Float32Array, string>;
}

const EMBEDDING_CACHE_STATE_KEY = Symbol.for("@anuma/sdk/embedding-cache/v1");
const cacheGlobal = globalThis as typeof globalThis & {
  [EMBEDDING_CACHE_STATE_KEY]?: EmbeddingCacheState;
};
const fallbackState: EmbeddingCacheState = {
  scopedViews: new WeakMap(),
  inFlightByCache: new WeakMap(),
  cachedEmbeddingModels: new WeakMap(),
};

export function getEmbeddingCacheState(): EmbeddingCacheState {
  try {
    return (cacheGlobal[EMBEDDING_CACHE_STATE_KEY] ??= fallbackState);
  } catch {
    // TODO(ceiling): Frozen globals use entrypoint-local state; initialize the SDK before freezing to share caches.
    return fallbackState;
  }
}
