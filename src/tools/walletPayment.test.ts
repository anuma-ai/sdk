import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import type { UIInteractionContext } from "./uiInteraction";
import type { PaymentWallet, WalletPaymentOutcome } from "./walletPayment";
import { createSelectPaymentWalletTool, createWalletPaymentTool } from "./walletPayment";

function pendingContext() {
  let settle!: { answer: (result: unknown) => void; fail: (error: Error) => void };
  const createInteraction = vi.fn(
    (_id: string, _type: string, _data: unknown) =>
      new Promise<unknown>((resolve, reject) => {
        settle = { answer: resolve, fail: reject };
      })
  );

  const context: UIInteractionContext = {
    createInteraction,
    createDisplayInteraction: vi.fn(),
  };

  return { context, createInteraction, settle: () => settle };
}

const WALLETS: PaymentWallet[] = [
  { address: "FakeWa11etAddress111", chainType: "solana", label: "Main", usdcBalance: "500" },
];
const OFFER_ARGS = { offer_id: "off_1", summary: "SFO → JFK", amount: "412.50", currency: "USD" };
const PAYMENT_ARGS = { provider: "brij", reference: "ref_1", passenger_count: 1 };
const PASSENGERS = [{ given_name: "FAKE", family_name: "PASSENGER" }];
const PAID: WalletPaymentOutcome = {
  paid: true,
  provider: "brij",
  reference: "ref_1",
  status: "confirmed",
};

describe("createSelectPaymentWalletTool", () => {
  async function chooseWallet(
    answer: unknown,
    args: Record<string, unknown> = OFFER_ARGS,
    listWallets = vi.fn().mockResolvedValue(WALLETS)
  ) {
    const { context, createInteraction, settle } = pendingContext();
    const tool = createSelectPaymentWalletTool({ getContext: () => context, listWallets });
    const pending = tool.executor?.(args);
    await vi.waitFor(() => expect(createInteraction).toHaveBeenCalled());
    settle().answer(answer);
    return { result: await pending, createInteraction };
  }

  it("passes the listed wallets to the card", async () => {
    const { createInteraction } = await chooseWallet({ confirmed: false });

    expect(createInteraction.mock.calls[0][1]).toBe("select_payment_wallet");
    expect(createInteraction.mock.calls[0][2]).toMatchObject({ ...OFFER_ARGS, wallets: WALLETS });
  });

  it("returns the offer and the chosen wallet when the user confirms", async () => {
    const { result } = await chooseWallet({
      confirmed: true,
      funding_wallet: "FakeWa11etAddress111",
    });

    expect(result).toEqual({
      confirmed: true,
      offer_id: "off_1",
      funding_wallet: "FakeWa11etAddress111",
    });
  });

  it("passes a declined choice through", async () => {
    expect((await chooseWallet({ confirmed: false })).result).toEqual({ confirmed: false });
  });

  it("returns cancelled for an answer that is neither a choice nor a decline", async () => {
    expect((await chooseWallet({ confirmed: true })).result).toEqual({ cancelled: true });
  });

  it("returns cancelled without listing wallets or opening a card for an empty offer id", async () => {
    const { context, createInteraction } = pendingContext();
    const listWallets = vi.fn().mockResolvedValue(WALLETS);
    const tool = createSelectPaymentWalletTool({ getContext: () => context, listWallets });

    expect(await tool.executor?.({ ...OFFER_ARGS, offer_id: "" })).toEqual({ cancelled: true });
    expect(listWallets).not.toHaveBeenCalled();
    expect(createInteraction).not.toHaveBeenCalled();
  });

  it("returns cancelled without opening a card when listing wallets fails", async () => {
    const { context, createInteraction } = pendingContext();
    const tool = createSelectPaymentWalletTool({
      getContext: () => context,
      listWallets: () => Promise.reject(new Error("rpc down")),
    });

    expect(await tool.executor?.(OFFER_ARGS)).toEqual({ cancelled: true });
    expect(createInteraction).not.toHaveBeenCalled();
  });

  it("does not pass stray model arguments to the card", async () => {
    const { createInteraction } = await chooseWallet(
      { confirmed: false },
      {
        ...OFFER_ARGS,
        injected: "x",
      }
    );

    expect(createInteraction.mock.calls[0][2]).not.toHaveProperty("injected");
  });
});

describe("createWalletPaymentTool", () => {
  const consoleSpies: MockInstance[] = [];

  beforeEach(() => {
    for (const method of ["log", "info", "warn", "error"] as const) {
      consoleSpies.push(vi.spyOn(console, method).mockImplementation(() => {}));
    }
  });

  afterEach(() => {
    for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
    for (const spy of consoleSpies.splice(0)) spy.mockRestore();
  });

  async function payAfterCard(answer: unknown, pay = vi.fn().mockResolvedValue(PAID)) {
    const { context, createInteraction, settle } = pendingContext();
    const tool = createWalletPaymentTool({ getContext: () => context, pay });
    const pending = tool.executor?.(PAYMENT_ARGS);
    await vi.waitFor(() => expect(createInteraction).toHaveBeenCalled());
    settle().answer(answer);
    return { result: await pending, createInteraction, pay };
  }

  it("never times its executor out", () => {
    const tool = createWalletPaymentTool({ getContext: () => null, pay: vi.fn() });

    expect(tool.executorTimeout).toBe(Infinity);
  });

  it("does not pay when the card is cancelled", async () => {
    const { result, pay } = await payAfterCard({ cancelled: true });

    expect(result).toEqual({ cancelled: true });
    expect(pay).not.toHaveBeenCalled();
  });

  it("pays once with the provider, reference and passengers from the card", async () => {
    const { createInteraction, pay } = await payAfterCard({ passengers: PASSENGERS });

    expect(createInteraction.mock.calls[0][1]).toBe("prompt_wallet_payment");
    expect(pay).toHaveBeenCalledTimes(1);
    expect(pay).toHaveBeenCalledWith(
      { provider: "brij", reference: "ref_1", passengers: PASSENGERS },
      undefined
    );
  });

  it("returns only the paid flag, provider, reference and status on success", async () => {
    const { result } = await payAfterCard(
      { passengers: PASSENGERS },
      vi.fn().mockResolvedValue({ ...PAID, passenger_name: "FAKE PASSENGER" })
    );

    expect(Object.keys(result as object).sort()).toEqual([
      "paid",
      "provider",
      "reference",
      "status",
    ]);
    expect(JSON.stringify(result)).not.toContain("FAKE");
  });

  it("passes a failed payment through", async () => {
    const failed = { paid: false, error_code: "insufficient_funds", retryable: true };
    const { result } = await payAfterCard(
      { passengers: PASSENGERS },
      vi.fn().mockResolvedValue(failed)
    );

    expect(result).toEqual(failed);
  });

  it("returns payment_failed without the error text when pay rejects", async () => {
    const { result } = await payAfterCard(
      { passengers: PASSENGERS },
      vi.fn().mockRejectedValue(new Error("FAKE PASSENGER rejected"))
    );

    expect(result).toEqual({ paid: false, error_code: "payment_failed", retryable: false });
  });

  it("returns cancelled without opening a card for zero passengers", async () => {
    const { context, createInteraction } = pendingContext();
    const pay = vi.fn();
    const tool = createWalletPaymentTool({ getContext: () => context, pay });

    expect(await tool.executor?.({ ...PAYMENT_ARGS, passenger_count: 0 })).toEqual({
      cancelled: true,
    });
    expect(createInteraction).not.toHaveBeenCalled();
    expect(pay).not.toHaveBeenCalled();
  });

  it("hands the turn's signal to pay, so a stop during payment reaches the caller", async () => {
    const { context, createInteraction, settle } = pendingContext();
    let paySignal: AbortSignal | undefined;
    const pay = vi.fn((_request: unknown, signal?: AbortSignal) => {
      paySignal = signal;
      return new Promise<WalletPaymentOutcome>(() => {});
    });
    const tool = createWalletPaymentTool({ getContext: () => context, pay });
    const controller = new AbortController();

    void tool.executor?.(PAYMENT_ARGS, controller.signal);
    await vi.waitFor(() => expect(createInteraction).toHaveBeenCalled());
    settle().answer({ passengers: PASSENGERS });
    await vi.waitFor(() => expect(pay).toHaveBeenCalledTimes(1));
    controller.abort();

    expect(paySignal?.aborted).toBe(true);
  });

  it("does not pay when the turn is aborted while the card is open", async () => {
    const { context, createInteraction, settle } = pendingContext();
    const pay = vi.fn().mockResolvedValue(PAID);
    const tool = createWalletPaymentTool({ getContext: () => context, pay });
    const controller = new AbortController();

    const pending = tool.executor?.(PAYMENT_ARGS, controller.signal);
    await vi.waitFor(() => expect(createInteraction).toHaveBeenCalled());
    controller.abort();
    settle().answer({ passengers: PASSENGERS });

    expect(await pending).toEqual({ cancelled: true });
    expect(pay).not.toHaveBeenCalled();
  });
});
