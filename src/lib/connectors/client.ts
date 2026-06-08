/**
 * Token-getter factory shared by every connector tool factory.
 *
 * Wraps a portal client's `mintConnectorToken(provider)` call in a
 * per-instance access-token cache. The returned closure is the
 * `getAccessToken: () => string | null` argument every tool factory takes.
 *
 * Cache rules (per-instance):
 * - First call mints; subsequent calls return the cached token until
 *   `(expiresAt - refreshBeforeMs) <= now`, then re-mints.
 * - On mint failure (`MintResult.ok === false`), the cache is left untouched;
 *   the failure is forwarded to `onNotConnected` (when applicable) or
 *   surfaced as `null` so the tool factory can emit a connector error.
 * - A thrown mint call (portal unreachable, all retries exhausted) is
 *   swallowed and surfaced as `null` too — the closure's documented
 *   contract is `() => Promise<string | null>`, and letting a network
 *   error bubble would crash the tool executor instead of letting it
 *   emit the canonical `__anuma_connector_error_v1` result.
 *
 * Two tool calls in the same request reuse the same `PortalClient` instance,
 * and so share this cache — that's where the "2 calls = 1 mint" caching
 * guarantee in the runtime spec comes from.
 */

/** Discriminated union returned by `mintConnectorToken`. */
export type ConnectorMintResult =
  | { ok: true; accessToken: string; expiresAt: number /* unix ms */ }
  | { ok: false; error: ConnectorMintError };

/** Error variants from the mint endpoint, mirrored on `@anuma/agent-runtime`. */
export type ConnectorMintError =
  | { code: "connector_not_connected"; provider: string; connectUrl: string }
  | {
      code: "scope_not_covered";
      provider: string;
      missingScopes: string[];
      connectUrl: string;
    }
  | { code: "insufficient_scope"; required: string }
  | { code: "upstream_unavailable"; retryAfterMs?: number }
  | { code: "unknown"; message: string };

/**
 * Minimal portal-client surface this helper depends on.
 *
 * `@anuma/agent-runtime` exposes a richer `PortalClient` that satisfies this
 * shape. Keeping the SDK-side dependency structural avoids pulling the
 * runtime package into every SDK consumer.
 */
export interface ConnectorTokenSource {
  mintConnectorToken(provider: string): Promise<ConnectorMintResult>;
}

export interface ConnectorTokenGetterOpts {
  /** How early to refresh before expiry. @default 30_000 (30 s) */
  refreshBeforeMs?: number;
  /**
   * Called when mint returns `connector_not_connected` or `scope_not_covered`.
   * The default returns `null`, letting tool factories emit a structured
   * connector error via `buildConnectorErrorResult`. Interactive surfaces
   * (browser, mobile) can override to drive a connect UI and return a fresh
   * token once the user finishes.
   */
  onNotConnected?: (err: ConnectorMintError) => Promise<string | null>;
  /** Defaults to `Date.now`; injected for tests. */
  now?: () => number;
}

const DEFAULT_REFRESH_BEFORE_MS = 30_000;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Build a `() => Promise<string | null>` closure that mints + caches an
 * upstream access token for the given logical provider.
 *
 * The closure is consumed verbatim by tool factories such as `createGmailTools`
 * and `createDriveTools` — those factories expect a synchronous getter today,
 * but Promise-returning getters are tolerated because tool executors are
 * already async. (PR 7 in the plan shrinks the existing factories to call
 * `await getToken()` internally.)
 */
export function createConnectorTokenGetter(
  client: ConnectorTokenSource,
  provider: string,
  opts: ConnectorTokenGetterOpts = {}
): () => Promise<string | null> {
  const refreshBeforeMs = opts.refreshBeforeMs ?? DEFAULT_REFRESH_BEFORE_MS;
  const now = opts.now ?? Date.now;
  let cached: CachedToken | null = null;

  return async () => {
    if (cached && cached.expiresAt - refreshBeforeMs > now()) {
      return cached.accessToken;
    }

    let result: ConnectorMintResult;
    try {
      result = await client.mintConnectorToken(provider);
    } catch {
      // Portal unreachable or all retries exhausted. Honor the
      // `() => Promise<string | null>` contract — the tool factory will
      // surface a structured connector error from the null return.
      cached = null;
      return null;
    }
    if (result.ok) {
      cached = { accessToken: result.accessToken, expiresAt: result.expiresAt };
      return result.accessToken;
    }

    cached = null;
    if (opts.onNotConnected) {
      return opts.onNotConnected(result.error);
    }
    return null;
  };
}
