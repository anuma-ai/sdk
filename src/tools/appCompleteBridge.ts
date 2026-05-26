/**
 * Parent ↔ iframe bridge for `window.app.complete`.
 *
 * Generated apps (built via `createAppGenerationTools`) call
 * `window.app.complete(prompt)` to reach an LLM at runtime — see the
 * AI CAPABILITIES section of `buildAppSystemPrompt`. The transport is
 * a host concern: hosts decide which model, which auth, which endpoint.
 * This module ships the standard postMessage protocol so hosts don't
 * have to design their own:
 *
 *   PARENT (host's chat app):
 *     installs `createAppCompleteBridge({ complete })`, which listens
 *     for `anuma:app:complete:request` messages from any iframe and
 *     calls the host's async `complete(prompt)` function.
 *
 *   IFRAME (preview HTML where the generated app runs):
 *     installs the shim via `installAppCompleteIframeShim()` (or by
 *     inlining `APP_COMPLETE_IFRAME_SHIM_SCRIPT`). The shim sets
 *     `window.app.complete` to a function that posts a request to
 *     the parent and resolves with the response.
 *
 * The protocol is intentionally minimal — one request type, one
 * response type, an id to correlate them. Sandbox-friendly: the
 * iframe never reaches outside its origin, the parent never lets
 * the iframe pick the backend.
 *
 * @example Parent-side wiring:
 * ```ts
 * import { createAppCompleteBridge } from "@anuma/sdk/tools";
 *
 * const bridge = createAppCompleteBridge({
 *   complete: async (prompt) => {
 *     const res = await fetch("/api/complete", {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify({ prompt }),
 *     });
 *     return await res.text();
 *   },
 * });
 * // when the preview is unmounted:
 * bridge.dispose();
 * ```
 *
 * @example Iframe-side wiring (preview HTML):
 * ```html
 * <script>${APP_COMPLETE_IFRAME_SHIM_SCRIPT}</script>
 * <!-- now window.app.complete is available to the React app -->
 * ```
 */

/** Tagged request from iframe → parent. Carries the prompt and a
 *  correlation id so the parent can route the reply to the right
 *  pending promise. */
export const APP_COMPLETE_REQUEST_TYPE = "anuma:app:complete:request";

/** Tagged response from parent → iframe. Either `result` (string) or
 *  `error` (string) is populated. */
export const APP_COMPLETE_RESPONSE_TYPE = "anuma:app:complete:response";

export interface AppCompleteBridgeOptions {
  /** Host's implementation. Receives the prompt string and resolves
   *  with the response. May throw / reject; the error message is
   *  forwarded to the iframe. */
  complete: (prompt: string) => Promise<string>;
  /** Origin to send the postMessage response to. Defaults to "*".
   *  Set this in production to the iframe's expected origin. */
  targetOrigin?: string;
  /** Filter messages by source window. When set, requests from any
   *  other window are ignored. Useful when the parent embeds multiple
   *  iframes and wants to route them differently. */
  source?: Window;
  /** Restrict accepted `event.origin` values. When set, requests from
   *  any other origin are silently dropped — so a cross-origin script
   *  that gains a window handle can't trigger arbitrary `complete()`
   *  calls and burn quota. Recommended in production. Defaults to
   *  unconstrained (accept all origins), which is convenient for local
   *  dev and srcdoc iframes (origin: "null") but should not be relied
   *  on under any untrusted-origin threat model. */
  allowedOrigins?: readonly string[];
}

export interface AppCompleteBridge {
  /** Remove the message listener. Call when the preview is unmounted. */
  dispose(): void;
}

/**
 * Install a parent-side bridge that responds to `window.app.complete`
 * calls from one or more preview iframes. Returns a handle whose
 * `dispose()` removes the listener.
 */
export function createAppCompleteBridge(options: AppCompleteBridgeOptions): AppCompleteBridge {
  const { complete, targetOrigin = "*", source, allowedOrigins } = options;
  const allowSet = allowedOrigins ? new Set(allowedOrigins) : null;

  const handler = async (event: MessageEvent): Promise<void> => {
    if (source && event.source !== source) return;
    if (allowSet && !allowSet.has(event.origin)) return;
    const data = event.data as
      | { type?: unknown; id?: unknown; prompt?: unknown }
      | null
      | undefined;
    if (!data || data.type !== APP_COMPLETE_REQUEST_TYPE) return;
    if (typeof data.id !== "string") return;

    const reply = event.source as Window | null;
    if (!reply) return;

    const prompt = typeof data.prompt === "string" ? data.prompt : "";
    try {
      const result = await complete(prompt);
      reply.postMessage(
        { type: APP_COMPLETE_RESPONSE_TYPE, id: data.id, result: String(result) },
        targetOrigin
      );
    } catch (err) {
      reply.postMessage(
        {
          type: APP_COMPLETE_RESPONSE_TYPE,
          id: data.id,
          error: err instanceof Error ? err.message : String(err),
        },
        targetOrigin
      );
    }
  };

  const listener = (event: MessageEvent): void => {
    void handler(event);
  };
  window.addEventListener("message", listener);
  return {
    dispose(): void {
      window.removeEventListener("message", listener);
    },
  };
}

/** Default timeout (ms) for `window.app.complete` calls inside the
 *  iframe shim. Long enough for slow LLM completions, short enough to
 *  surface a hung parent bridge (e.g. unmounted preview). Hosts can
 *  override by setting `window.APP_COMPLETE_TIMEOUT_MS` in the iframe
 *  before the first call. */
export const APP_COMPLETE_DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Inline JavaScript source that installs `window.app.complete` in an
 * iframe, sending requests to the parent via postMessage. Drop into
 * a `<script>` tag of a preview HTML to enable in-app LLM calls.
 *
 * No-ops when there's no parent window (e.g. when the HTML is opened
 * directly via `file://` rather than embedded in an iframe). In that
 * case, hosts can provide their own `window.app.complete` stub or
 * leave it unset.
 *
 * Each call has a {@link APP_COMPLETE_DEFAULT_TIMEOUT_MS} ms timeout
 * (overridable via `window.APP_COMPLETE_TIMEOUT_MS`); on timeout the
 * promise rejects and the message listener is removed, so a disposed
 * parent bridge can't leave the app frozen.
 */
export const APP_COMPLETE_IFRAME_SHIM_SCRIPT = `(function () {
  if (typeof window === "undefined" || !window.parent || window.parent === window) {
    return;
  }
  var REQUEST_TYPE = ${JSON.stringify(APP_COMPLETE_REQUEST_TYPE)};
  var RESPONSE_TYPE = ${JSON.stringify(APP_COMPLETE_RESPONSE_TYPE)};
  var DEFAULT_TIMEOUT_MS = ${APP_COMPLETE_DEFAULT_TIMEOUT_MS};
  window.app = window.app || {};
  window.app.complete = function (prompt) {
    return new Promise(function (resolve, reject) {
      var id = "c_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      var timeoutMs = (typeof window.APP_COMPLETE_TIMEOUT_MS === "number" && window.APP_COMPLETE_TIMEOUT_MS > 0)
        ? window.APP_COMPLETE_TIMEOUT_MS
        : DEFAULT_TIMEOUT_MS;
      var timer = null;
      var onMessage = function (event) {
        var data = event.data;
        if (!data || data.type !== RESPONSE_TYPE || data.id !== id) return;
        window.removeEventListener("message", onMessage);
        if (timer !== null) { clearTimeout(timer); timer = null; }
        if (typeof data.error === "string") reject(new Error(data.error));
        else resolve(String(data.result == null ? "" : data.result));
      };
      window.addEventListener("message", onMessage);
      timer = setTimeout(function () {
        window.removeEventListener("message", onMessage);
        reject(new Error("window.app.complete timed out after " + timeoutMs + "ms"));
      }, timeoutMs);
      window.parent.postMessage({ type: REQUEST_TYPE, id: id, prompt: String(prompt) }, "*");
    });
  };
})();`;

/**
 * Programmatic variant of `APP_COMPLETE_IFRAME_SHIM_SCRIPT` — call once
 * from inside an iframe (typically the first thing the preview HTML
 * executes) to install `window.app.complete`. Equivalent to inlining
 * the script string in a `<script>` tag.
 */
export function installAppCompleteIframeShim(): void {
  // Function constructor runs the script in the global scope of the
  // iframe — same effect as a `<script>` tag, but available to hosts
  // that import this module as ES code.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
  new Function(APP_COMPLETE_IFRAME_SHIM_SCRIPT)();
}
