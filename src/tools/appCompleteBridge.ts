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
  const { complete, targetOrigin = "*", source } = options;

  const handler = async (event: MessageEvent): Promise<void> => {
    if (source && event.source !== source) return;
    const data = event.data as
      | { type?: unknown; id?: unknown; prompt?: unknown }
      | null
      | undefined;
    if (!data || data.type !== APP_COMPLETE_REQUEST_TYPE) return;
    if (typeof data.id !== "string") return;

    const reply = event.source as Window | null;
    if (!reply) return;

    try {
      const result = await complete(String(data.prompt ?? ""));
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

  window.addEventListener("message", handler);
  return {
    dispose(): void {
      window.removeEventListener("message", handler);
    },
  };
}

/**
 * Inline JavaScript source that installs `window.app.complete` in an
 * iframe, sending requests to the parent via postMessage. Drop into
 * a `<script>` tag of a preview HTML to enable in-app LLM calls.
 *
 * No-ops when there's no parent window (e.g. when the HTML is opened
 * directly via `file://` rather than embedded in an iframe). In that
 * case, hosts can provide their own `window.app.complete` stub or
 * leave it unset.
 */
export const APP_COMPLETE_IFRAME_SHIM_SCRIPT = `(function () {
  if (typeof window === "undefined" || !window.parent || window.parent === window) {
    return;
  }
  var REQUEST_TYPE = ${JSON.stringify(APP_COMPLETE_REQUEST_TYPE)};
  var RESPONSE_TYPE = ${JSON.stringify(APP_COMPLETE_RESPONSE_TYPE)};
  window.app = window.app || {};
  window.app.complete = function (prompt) {
    return new Promise(function (resolve, reject) {
      var id = "c_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      var onMessage = function (event) {
        var data = event.data;
        if (!data || data.type !== RESPONSE_TYPE || data.id !== id) return;
        window.removeEventListener("message", onMessage);
        if (typeof data.error === "string") reject(new Error(data.error));
        else resolve(String(data.result == null ? "" : data.result));
      };
      window.addEventListener("message", onMessage);
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
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(APP_COMPLETE_IFRAME_SHIM_SCRIPT)();
}
