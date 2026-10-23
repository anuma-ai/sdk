import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getServerTools, type ServerTool } from "../lib/tools";
import { useTools } from "./useTools";

vi.mock("../lib/tools", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/tools")>();
  return {
    ...original,
    getServerTools: vi.fn(),
    getToolsChecksum: vi.fn(() => "catalog-checksum"),
  };
});

const catalog: ServerTool[] = ["search", "calendar"].map((name) => ({
  type: "function",
  name,
  description: name,
  parameters: { type: "object", properties: {}, required: [] },
}));

const getToken = () => Promise.resolve("token");

describe("useTools filters", () => {
  beforeEach(() => {
    vi.mocked(getServerTools).mockReset();
    vi.mocked(getServerTools).mockResolvedValue(catalog);
  });

  afterEach(cleanup);

  it("settles after a fetch with an inline filter", async () => {
    let renders = 0;
    const { result, rerender } = renderHook(() => {
      renders += 1;
      if (renders > 20) {
        throw new Error("useTools exceeded 20 renders");
      }
      return useTools({ getToken, includeTools: ["search"] });
    });

    await act(async () => {});

    expect(result.current.tools).toEqual([catalog[0]]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.checksum).toBe("catalog-checksum");
    expect(getServerTools).toHaveBeenCalledTimes(1);

    const settledRenders = renders;
    const settledTools = result.current.tools;
    rerender();

    expect(renders).toBe(settledRenders + 1);
    expect(result.current.tools).toEqual([catalog[0]]);
    expect(result.current.tools).toBe(settledTools);
  });

  it("derives each filter from the full catalog without another fetch", async () => {
    const { result, rerender } = renderHook(
      ({ includeTools }: { includeTools: string[] | undefined }) =>
        useTools({ getToken, includeTools }),
      { initialProps: { includeTools: ["search"] as string[] | undefined } }
    );

    await act(async () => {});
    expect(result.current.tools).toEqual([catalog[0]]);

    rerender({ includeTools: ["search", "calendar"] });
    expect(result.current.tools).toEqual(catalog);

    rerender({ includeTools: [] });
    expect(result.current.tools).toEqual([]);

    rerender({ includeTools: ["calendar"] });
    expect(result.current.tools).toEqual([catalog[1]]);

    rerender({ includeTools: undefined });
    expect(result.current.tools).toEqual(catalog);
    expect(getServerTools).toHaveBeenCalledTimes(1);
  });
});
