import { describe, expect, test } from "vitest";

import type { AgentresErrorCode } from "./errors.js";
import { AgentresError, parseAgentresError } from "./errors.js";

function envelope(error: Record<string, unknown>): string {
  return JSON.stringify({ error });
}

describe("parseAgentresError", () => {
  // T-U7. Each of these is a state the registration UI has to say something
  // specific about, and `next_step` is the provider's own sentence about what
  // to do — the only actionable part of most refusals.
  test.each<[AgentresErrorCode, number, string, boolean, string]>([
    [
      "NO_LINKED_ACCOUNT",
      400,
      "No linked Resy account found. Use /api/link-resy first.",
      false,
      "Call POST /api/link-resy with the account email.",
    ],
    [
      "RESY_VERIFICATION_FAILED",
      502,
      "Resy could not verify that code.",
      true,
      "Ask the user to re-enter the code from their email.",
    ],
    [
      "RESY_NO_PAYMENT_METHOD",
      422,
      "The Resy account has no card on file.",
      false,
      "Add a credit card at resy.com, then retry.",
    ],
    [
      "UNAUTHORIZED",
      401,
      "Signature verification failed.",
      false,
      "Sign a fresh challenge and retry.",
    ],
  ])("maps %s, keeping next_step", (code, status, message, retryable, nextStep) => {
    const error = parseAgentresError(
      status,
      envelope({ code, message, retryable, next_step: nextStep })
    );

    expect(error).toBeInstanceOf(AgentresError);
    expect(error.code).toBe(code);
    expect(error.status).toBe(status);
    expect(error.message).toBe(message);
    expect(error.retryable).toBe(retryable);
    expect(error.nextStep).toBe(nextStep);
  });

  test("leaves nextStep undefined when the provider states none", () => {
    const error = parseAgentresError(
      400,
      envelope({ code: "INVALID_INPUT", message: "bad email" })
    );

    expect(error.nextStep).toBeUndefined();
    expect(error.retryable).toBe(false);
  });

  test("keeps a code-only refusal readable", () => {
    const error = parseAgentresError(409, envelope({ code: "ACTIVE_JOB_EXISTS", retryable: true }));

    expect(error.code).toBe("ACTIVE_JOB_EXISTS");
    expect(error.message).toBe("HTTP 409");
    expect(error.retryable).toBe(true);
  });

  // An envelope that states neither a code nor a message says nothing the
  // caller can use, so it counts as no stated refusal — the same rule the
  // payments server's Go decoder applies.
  test("treats an empty envelope as no stated refusal", () => {
    const error = parseAgentresError(500, envelope({ retryable: true }));

    expect(error.code).toBe("HTTP_500");
    expect(error.retryable).toBe(true);
  });

  test("still produces an error for a body that is not the envelope", () => {
    const error = parseAgentresError(502, "<html>Bad Gateway</html>");

    expect(error).toBeInstanceOf(AgentresError);
    expect(error.code).toBe("HTTP_502");
    expect(error.message).toBe("<html>Bad Gateway</html>");
    expect(error.retryable).toBe(true);
  });

  test("falls back to the status when the body is empty", () => {
    const error = parseAgentresError(404, "");

    expect(error.message).toBe("HTTP 404");
    expect(error.retryable).toBe(false);
  });

  test("is catchable as an Error with a name", () => {
    try {
      throw parseAgentresError(400, envelope({ code: "NO_LINKED_ACCOUNT", message: "nope" }));
    } catch (caught) {
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).name).toBe("AgentresError");
    }
  });
});
