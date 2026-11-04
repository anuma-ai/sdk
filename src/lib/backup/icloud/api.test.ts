import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getLogger } from "../../logger";
import { requestICloudSignIn } from "./api";

type Container = ReturnType<NonNullable<Window["CloudKit"]>["getDefaultContainer"]>;
const user = { userRecordName: "icloud-user" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("requestICloudSignIn", () => {
  const setUpAuth = vi.fn<Container["setUpAuth"]>();
  const whenUserSignsIn = vi.fn<Container["whenUserSignsIn"]>();
  const click = vi.fn();
  let signIn: ReturnType<typeof deferred<typeof user>>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    vi.spyOn(getLogger(), "debug").mockImplementation(() => {});
    document.body.innerHTML = '<div id="apple-sign-in-button"><button>Sign in</button></div>';
    document.querySelector("button")!.addEventListener("click", click);
    signIn = deferred<typeof user>();
    setUpAuth.mockResolvedValue(null);
    whenUserSignsIn.mockReturnValue(signIn.promise);
    window.CloudKit = {
      configure: vi.fn(),
      getDefaultContainer: vi.fn(() => ({
        containerIdentifier: "iCloud.Memoryless",
        setUpAuth,
        whenUserSignsIn,
        whenUserSignsOut: vi.fn(),
        privateCloudDatabase: {
          saveRecords: vi.fn(),
          deleteRecords: vi.fn(),
          performQuery: vi.fn(),
          fetchRecords: vi.fn(),
        },
      })),
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete window.CloudKit;
    document.body.innerHTML = "";
  });

  it("rejects after 60 seconds when the popup does not complete sign-in", async () => {
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");
    const resolved = vi.fn();
    const rejected = vi.fn();
    void requestICloudSignIn({ signal: controller.signal }).then(resolved, rejected);
    await vi.advanceTimersByTimeAsync(0);
    expect(click).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(59_999);
    expect(rejected).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(rejected).toHaveBeenCalledExactlyOnceWith(new Error("iCloud sign-in timed out"));
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    signIn.resolve(user);
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).not.toHaveBeenCalled();
    expect(rejected).toHaveBeenCalledOnce();
  });

  it("rejects when the caller aborts and removes the abort listener", async () => {
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");
    const rejected = vi.fn();
    void requestICloudSignIn({ signal: controller.signal }).catch(rejected);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(rejected).toHaveBeenCalledExactlyOnceWith(new Error("Sign-in was cancelled"));
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    signIn.resolve(user);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(rejected).toHaveBeenCalledOnce();
  });

  it("rejects an aborted signal before it starts authentication", async () => {
    const controller = new AbortController();
    controller.abort();
    const rejected = vi.fn();
    void requestICloudSignIn({ signal: controller.signal }).catch(rejected);
    await vi.advanceTimersByTimeAsync(0);
    expect(rejected).toHaveBeenCalledExactlyOnceWith(new Error("Sign-in was cancelled"));
    expect(window.CloudKit!.getDefaultContainer).not.toHaveBeenCalled();
    expect(setUpAuth).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["abort", "timeout"])("does not click after %s during auth setup", async (reason) => {
    const setup = deferred<null>();
    setUpAuth.mockReturnValueOnce(setup.promise);
    const controller = new AbortController();
    const rejected = vi.fn();
    void requestICloudSignIn({ signal: controller.signal }).catch(rejected);
    await vi.advanceTimersByTimeAsync(0);
    expect(setUpAuth).toHaveBeenCalledOnce();
    if (reason === "abort") controller.abort();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(rejected).toHaveBeenCalledExactlyOnceWith(
      new Error(reason === "abort" ? "Sign-in was cancelled" : "iCloud sign-in timed out")
    );
    setup.resolve(null);
    await vi.advanceTimersByTimeAsync(0);
    expect(click).not.toHaveBeenCalled();
    expect(whenUserSignsIn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns the user and clears the timer and listener after sign-in", async () => {
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");
    const result = requestICloudSignIn({ signal: controller.signal });
    await vi.advanceTimersByTimeAsync(0);
    signIn.resolve(user);
    await expect(result).resolves.toEqual(user);
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns an existing user without a popup", async () => {
    setUpAuth.mockResolvedValueOnce(user);
    await expect(requestICloudSignIn()).resolves.toEqual(user);
    expect(click).not.toHaveBeenCalled();
    expect(whenUserSignsIn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["setup", "sign-in"])(
    "preserves a CloudKit %s error and clears the timer",
    async (stage) => {
      const error = new Error("CloudKit failed");
      if (stage === "setup") setUpAuth.mockRejectedValueOnce(error);
      else whenUserSignsIn.mockRejectedValueOnce(error);
      await expect(requestICloudSignIn()).rejects.toBe(error);
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it("allows a retry after a timeout", async () => {
    const rejected = vi.fn();
    void requestICloudSignIn().catch(rejected);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(rejected).toHaveBeenCalledExactlyOnceWith(new Error("iCloud sign-in timed out"));
    const retry = requestICloudSignIn();
    await vi.advanceTimersByTimeAsync(0);
    signIn.resolve(user);
    await expect(retry).resolves.toEqual(user);
    expect(rejected).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
