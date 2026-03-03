import { describe, it, expect } from "vitest";
import { LRUCache, createVaultEmbeddingCache, DEFAULT_VAULT_CACHE_SIZE } from "./lruCache";

describe("LRUCache", () => {
  it("stores and retrieves values", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBe(2);
    expect(cache.size).toBe(2);
  });

  it("returns undefined for missing keys", () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("evicts the oldest entry when exceeding maxSize", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.set("d", 4); // should evict "a"

    expect(cache.has("a")).toBe(false);
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
    expect(cache.get("d")).toBe(4);
    expect(cache.size).toBe(3);
  });

  it("promotes entries on get, evicting the least recently used", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    // Access "a" to promote it
    cache.get("a");

    // Now "b" is the oldest
    cache.set("d", 4); // should evict "b"

    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
    expect(cache.has("d")).toBe(true);
  });

  it("promotes entries on set (update), evicting the least recently used", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    // Update "a" to promote it
    cache.set("a", 10);

    // Now "b" is the oldest
    cache.set("d", 4); // should evict "b"

    expect(cache.get("a")).toBe(10);
    expect(cache.has("b")).toBe(false);
    expect(cache.size).toBe(3);
  });

  it("supports delete", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.delete("a");
    expect(cache.has("a")).toBe(false);
    expect(cache.size).toBe(1);
  });

  it("supports clear", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe("createVaultEmbeddingCache", () => {
  it("creates an LRU cache with default size", () => {
    const cache = createVaultEmbeddingCache();
    expect(cache).toBeInstanceOf(LRUCache);
  });

  it("creates an LRU cache with custom size", () => {
    const cache = createVaultEmbeddingCache(5);
    for (let i = 0; i < 10; i++) {
      cache.set(`key-${i}`, [i]);
    }
    expect(cache.size).toBe(5);
  });
});

describe("DEFAULT_VAULT_CACHE_SIZE", () => {
  it("is 5000", () => {
    expect(DEFAULT_VAULT_CACHE_SIZE).toBe(5000);
  });
});
