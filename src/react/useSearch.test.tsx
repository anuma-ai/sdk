import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSearch } from "./useSearch";
import { postApiV1Search } from "../client/sdk.gen";

vi.mock("../client/sdk.gen", () => ({
  postApiV1Search: vi.fn(),
}));

describe("useSearch", () => {
  it("should perform search and update results", async () => {
    const mockData = {
      results: [
        {
          title: "ZetaChain",
          snippet: "ZetaChain is a blockchain...",
          url: "https://zetachain.com",
        },
      ],
    };

    vi.mocked(postApiV1Search).mockResolvedValue({
      data: mockData,
      error: undefined,
      response: {} as any,
    });

    const { result } = renderHook(() =>
      useSearch({
        getToken: async () => "fake-token",
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.results).toBeNull();

    await act(async () => {
      const searchResult = await result.current.search("ZetaChain");
      expect(searchResult).toEqual(mockData);
    });

    expect(postApiV1Search).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          query: ["ZetaChain"],
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer fake-token",
        }),
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.results).toEqual(mockData.results);
    expect(result.current.response).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("should handle search errors", async () => {
    vi.mocked(postApiV1Search).mockResolvedValue({
      data: undefined,
      error: { error: "Something went wrong" } as any,
      response: {} as any,
    });

    const onError = vi.fn();

    const { result } = renderHook(() =>
      useSearch({
        getToken: async () => "fake-token",
        onError,
      })
    );

    await act(async () => {
      const searchResult = await result.current.search("ZetaChain");
      expect(searchResult).toBeNull();
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe("Something went wrong");
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(result.current.isLoading).toBe(false);
  });
});
