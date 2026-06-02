/**
 * Shared math helpers for pre-processor classifiers. Re-exports from
 * `memoryEngine/vector` so there's a single cosineSimilarity implementation
 * across the SDK (memory retrieval, classifier centroids, server-tool
 * selection); this module keeps the import path classifiers were written
 * against.
 */

export { cosineSimilarity } from "../memoryEngine/vector";
