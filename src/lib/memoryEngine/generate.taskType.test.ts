import { afterEach, describe, expect, it, vi } from "vitest";

import { generateEmbedding, generateEmbeddings } from "./generate";
import type { EmbeddingOptions } from "./types";

afterEach(() => vi.unstubAllGlobals());

describe("embedding task headers", () => {
  it.each([
    ["memory_recall_embed", { apiKey: "key" }],
    ["memory_retain_embed", { getToken: () => Promise.resolve("token") }],
    [undefined, { apiKey: "key" }],
  ] as const)("sends %s for single and batch requests", async (taskType, auth) => {
    const headers: Headers[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_request: unknown, init?: RequestInit) => {
        headers.push(new Headers(init?.headers));
        expect(typeof init?.body).toBe("string");
        const body = JSON.parse(init?.body as string) as { input: string | string[] };
        const input = Array.isArray(body.input) ? body.input : [body.input];
        return Promise.resolve(
          new Response(JSON.stringify({ data: input.map(() => ({ embedding: [1, 0] })) }), {
            headers: { "Content-Type": "application/json" },
          })
        );
      })
    );
    const options: EmbeddingOptions = {
      ...auth,
      taskType,
      baseUrl: "https://portal.test",
      batchSize: 1,
    };
    expect(await generateEmbedding("query", options)).toEqual([1, 0]);
    expect(await generateEmbeddings(["a", "b"], options)).toEqual([
      [1, 0],
      [1, 0],
    ]);
    expect(headers).toHaveLength(3);
    for (const header of headers) {
      expect(header.get("X-Anuma-Task-Type")).toBe(taskType ?? null);
      expect(header.get("X-API-Key") ?? header.get("Authorization")).toBe(
        "apiKey" in auth ? "key" : "Bearer token"
      );
    }
  });
});
