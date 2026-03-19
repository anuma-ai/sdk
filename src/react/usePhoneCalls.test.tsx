import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getApiV1PhoneCallsByCallId } from "../client/sdk.gen";
import { usePhoneCalls } from "./usePhoneCalls";

vi.mock("../client/sdk.gen", () => ({
  getApiV1Config: vi.fn(),
  getApiV1PhoneCallsByCallId: vi.fn(),
  postApiV1PhoneCalls: vi.fn(),
}));

describe("usePhoneCalls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stops polling when the call reaches a terminal failure state", async () => {
    vi.mocked(getApiV1PhoneCallsByCallId).mockResolvedValue({
      data: {
        call_id: "call_123",
        status: "failed",
        queue_status: "failed",
        error_message: "Call failed.",
      },
    } as never);

    const { result } = renderHook(() =>
      usePhoneCalls({
        autoFetchAvailability: false,
      })
    );

    let finalCall = null;
    await act(async () => {
      finalCall = await result.current.pollPhoneCall("call_123", {
        intervalMs: 0,
        maxAttempts: 3,
      });
    });

    expect(getApiV1PhoneCallsByCallId).toHaveBeenCalledTimes(1);
    expect(finalCall).toEqual({
      call_id: "call_123",
      status: "failed",
      queue_status: "failed",
      error_message: "Call failed.",
    });
    expect(result.current.currentCall?.status).toBe("failed");
    expect(result.current.isPolling).toBe(false);
  });
});
