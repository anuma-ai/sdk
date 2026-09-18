/**
 * Client for the agentres.dev registration flow.
 *
 * Signer-agnostic on purpose: it takes a `signMessage` closure, a base58
 * address and a `fetch`, and imports nothing app-specific. The browser app
 * bridges Privy's embedded Solana wallet to {@link SolanaSignMessageFn} the
 * same way `usePrivySigningAdapters` already bridges the EVM one for
 * encryption, and this module never learns that Privy exists.
 *
 * Registration is four calls plus a status read, and the user is step three:
 *
 * 1. {@link AgentresClient.ensureAccount} — creates the wallet-bound account.
 * 2. {@link AgentresClient.requestCode} — agentres asks Resy to email a code.
 * 3. The user reads the 6-digit code out of their own inbox.
 * 4. {@link AgentresClient.verifyCode} — agentres verifies it and stores the
 *    Resy credential.
 * 5. {@link AgentresClient.getLinkStatus} — confirms `resyLinked`.
 *
 * The same email goes to all of them, and its field name is `em_address` on
 * `/api/link-resy` but `email` on `/api/account`. They are the provider's
 * spellings, not a typo.
 *
 * Whichever key signs IS the account, permanently — agentres derives identity
 * from the signature and has no unlink endpoint. So this client must be given
 * the end user's own wallet, never a shared or treasury one.
 *
 * @module lib/connectors/agentres/client
 */

import { parseAgentresError, SiwxChallengeError } from "./errors.js";
import {
  buildMessage,
  buildPayload,
  parseChallenge,
  PAYMENT_REQUIRED_HEADER,
  SIWX_HEADER,
} from "./siwx.js";

/**
 * Signs arbitrary bytes with the user's Solana key.
 *
 * Bytes in, bytes out — the SDK base58-encodes the result. Keep it byte-typed
 * end to end: a `Uint8Array` that reaches a string API stringifies to a
 * comma-separated digit list, which signs and encodes cleanly and verifies as
 * garbage with no error anywhere (ai-memoryless-client#7217).
 */
export type SolanaSignMessageFn = (message: Uint8Array) => Promise<Uint8Array>;

/** The `fetch` surface this client uses. Injected so tests make no network call. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface AgentresClientOptions {
  /** The user's own Solana address, base58. The identity the proof asserts. */
  address: string;
  signMessage: SolanaSignMessageFn;
  /** @default "https://agentres.dev" */
  baseUrl?: string;
  /** @default globalThis.fetch */
  fetch?: FetchLike;
}

/** One call to make through {@link AgentresClient.withSiwx}. */
export interface AgentresRequest {
  method: "GET" | "POST";
  /** Path on the agentres host, e.g. `/api/me`. */
  path: string;
  /** JSON body, for POSTs. */
  body?: unknown;
}

/** `POST /api/account` — the wallet-bound account, resolved or created. */
export interface AgentresAccount {
  accountId: string;
  email: string | null;
  /** `wallet` for this flow; `api_key` is the other auth path agentres offers. */
  credentialKind: string;
  walletLinked: boolean;
}

/** `POST /api/link-resy` — which half of the OTP exchange just completed. */
export interface AgentresLinkStep {
  step: "code_sent" | "linked";
  message?: string;
  /** Present once linked. */
  resyUserId?: number;
}

/** `GET /api/me` — what the tile renders from. */
export interface AgentresLinkStatus {
  accountId: string;
  email: string | null;
  resyLinked: boolean;
  /** The address agentres resolved from the proof. Base58, despite the OpenAPI's 0x pattern. */
  walletAddress: string | null;
  resyLinkedAt: string | null;
}

export interface AgentresClient {
  /**
   * Make one call, satisfying its 402 with a fresh SIWX proof.
   *
   * Always two requests: the first is unauthenticated and expected to answer
   * 402, the second carries the proof. Nonces are single-use and expire minutes
   * after they are issued, so nothing here is cached — a reused challenge works
   * in a fast dev loop and fails in real use.
   */
  withSiwx<T>(request: AgentresRequest): Promise<T>;
  ensureAccount(email: string): Promise<AgentresAccount>;
  requestCode(email: string): Promise<AgentresLinkStep>;
  verifyCode(email: string, code: string): Promise<AgentresLinkStep>;
  getLinkStatus(): Promise<AgentresLinkStatus>;
}

const DEFAULT_BASE_URL = "https://agentres.dev";

/**
 * Build a client bound to one wallet.
 *
 * The client holds no state between calls, deliberately. The pending code lives
 * at agentres, keyed by email, and step three of the flow sends the user out to
 * their inbox — on a phone that can unmount the page, so the instance that
 * requested the code is often not the instance that verifies it. A client that
 * remembered would refuse a code that is still perfectly valid upstream.
 */
export function createAgentresClient(options: AgentresClientOptions): AgentresClient {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const { address, signMessage } = options;

  async function withSiwx<T>(request: AgentresRequest): Promise<T> {
    const url = `${baseUrl}${request.path}`;
    const init = requestInit(request);

    const challenged = await fetchImpl(url, init);
    if (challenged.status !== 402) {
      return readBody<T>(challenged);
    }

    const header = challenged.headers.get(PAYMENT_REQUIRED_HEADER);
    if (!header) {
      throw new SiwxChallengeError(
        `the 402 from ${request.path} carried no ${PAYMENT_REQUIRED_HEADER} header`
      );
    }

    const challenge = parseChallenge(header);
    const signature = await signMessage(new TextEncoder().encode(buildMessage(challenge, address)));

    const authorized = await fetchImpl(url, {
      ...init,
      headers: { ...init.headers, [SIWX_HEADER]: buildPayload(challenge, address, signature) },
    });
    return readBody<T>(authorized);
  }

  async function linkResy(body: { em_address: string; code?: string }): Promise<AgentresLinkStep> {
    const response = await withSiwx<{
      step: "code_sent" | "linked";
      message?: string;
      resy_user_id?: number;
    }>({ method: "POST", path: "/api/link-resy", body });

    return { step: response.step, message: response.message, resyUserId: response.resy_user_id };
  }

  return {
    withSiwx,

    async ensureAccount(email: string): Promise<AgentresAccount> {
      const body = await withSiwx<{
        account_id: string;
        email: string | null;
        credential_kind: string;
        wallet_linked: boolean;
      }>({ method: "POST", path: "/api/account", body: { email } });

      return {
        accountId: body.account_id,
        email: body.email,
        credentialKind: body.credential_kind,
        walletLinked: body.wallet_linked,
      };
    },

    requestCode(email: string): Promise<AgentresLinkStep> {
      return linkResy({ em_address: email });
    },

    verifyCode(email: string, code: string): Promise<AgentresLinkStep> {
      return linkResy({ em_address: email, code });
    },

    async getLinkStatus(): Promise<AgentresLinkStatus> {
      const body = await withSiwx<{
        account_id: string;
        email: string | null;
        wallet_address: string | null;
        resy_linked: boolean;
        resy_linked_at: string | null;
      }>({ method: "GET", path: "/api/me" });

      return {
        accountId: body.account_id,
        email: body.email,
        resyLinked: body.resy_linked,
        walletAddress: body.wallet_address,
        resyLinkedAt: body.resy_linked_at ?? null,
      };
    },
  };
}

function requestInit(request: AgentresRequest): RequestInit & { headers: Record<string, string> } {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (request.body === undefined) {
    return { method: request.method, headers };
  }

  headers["Content-Type"] = "application/json";
  return { method: request.method, headers, body: JSON.stringify(request.body) };
}

/** Read a response as JSON, turning a refusal into a typed error first. */
async function readBody<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!response.ok) {
    throw parseAgentresError(response.status, body);
  }
  return JSON.parse(body) as T;
}
