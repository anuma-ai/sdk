/**
 * Typed errors for the agentres connector.
 *
 * agentres states every refusal in one envelope, on every route:
 *
 * ```json
 * { "error": { "code": "NO_LINKED_ACCOUNT", "message": "…", "retryable": false,
 *              "next_step": "Call POST /api/link-resy with the account email." } }
 * ```
 *
 * `next_step` is often the only actionable part — it is the provider's own
 * sentence about what to do next — so it is carried through to the caller
 * rather than folded into the message. The registration UI shows the raw code
 * and message, which is deliberate: a refusal here is usually the user's Resy
 * account state, not a bug, and paraphrasing it hides what to fix.
 *
 * The SIWX errors are separate because they are ours, not the provider's: they
 * mean the challenge never became a usable proof, so no request was authorized.
 *
 * @module lib/connectors/agentres/errors
 */

/**
 * Provider codes the registration flow can return.
 *
 * `AgentresError.code` stays a plain `string` — agentres documents two dozen
 * more for the booking routes, and new ones appear without a version bump —
 * but these four are the ones a registration surface has to handle by name.
 */
export type AgentresErrorCode =
  | "NO_LINKED_ACCOUNT"
  | "RESY_VERIFICATION_FAILED"
  | "RESY_NO_PAYMENT_METHOD"
  | "UNAUTHORIZED";

/** A refusal agentres stated, decoded from its error envelope. */
export class AgentresError extends Error {
  /** HTTP status the refusal arrived with. */
  readonly status: number;
  /** Provider's stable machine-readable code, e.g. `NO_LINKED_ACCOUNT`. */
  readonly code: string;
  /** Whether the provider says the same call could work later. */
  readonly retryable: boolean;
  /** What the provider says to do about it, when it says anything. */
  readonly nextStep?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    retryable: boolean,
    nextStep?: string
  ) {
    super(message);
    this.name = "AgentresError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.nextStep = nextStep;
  }
}

/**
 * The 402 carried no `sign-in-with-x` extension.
 *
 * That marks a paid endpoint, which SIWX cannot satisfy. Signing anyway would
 * produce a well-formed proof the server answers with a bare 401, so the cause
 * has to be named here or it surfaces as an authentication mystery later.
 */
export class SiwxUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiwxUnsupportedError";
  }
}

/** The challenge could not be read, or is missing something the proof needs. */
export class SiwxChallengeError extends Error {
  /** The underlying decode failure, when there was one. */
  readonly cause?: unknown;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "SiwxChallengeError";
    this.cause = options?.cause;
  }
}

/**
 * Decode a failed response body into an {@link AgentresError}.
 *
 * Returns rather than throws, so the caller decides — mirroring
 * `buildConnectorErrorResult` in the sibling module. A body that is not the
 * envelope (an HTML error page, an empty 502) still produces an error, carrying
 * the status so the caller is never left with "something went wrong".
 *
 * @param status HTTP status of the response.
 * @param body   Raw response body.
 */
export function parseAgentresError(status: number, body: string): AgentresError {
  const stated = statedError(body);
  if (!stated) {
    return new AgentresError(
      status,
      `HTTP_${status}`,
      body.trim() || `HTTP ${status}`,
      status >= 500
    );
  }

  const code = typeof stated.code === "string" ? stated.code : `HTTP_${status}`;
  const message = typeof stated.message === "string" ? stated.message : `HTTP ${status}`;
  const retryable = typeof stated.retryable === "boolean" ? stated.retryable : status >= 500;
  const nextStep = typeof stated.next_step === "string" ? stated.next_step : undefined;

  return new AgentresError(status, code, message, retryable, nextStep);
}

/**
 * Pull the `error` object out of the envelope, when the body is one.
 *
 * An envelope carrying neither a code nor a message says nothing the caller
 * can use, so it counts as no stated refusal — same rule the payments server's
 * Go decoder applies.
 */
function statedError(body: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  const envelope = parsed as { error?: unknown } | null;
  const stated =
    typeof envelope?.error === "object" && envelope.error !== null ? envelope.error : null;
  if (!stated) {
    return null;
  }

  const fields = stated as Record<string, unknown>;
  if (typeof fields.code !== "string" && typeof fields.message !== "string") {
    return null;
  }
  return fields;
}
