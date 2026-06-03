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
 *     for `anuma:app:complete:connect` announcements from preview
 *     iframes and answers each one with a private {@link MessagePort}.
 *     Prompts then arrive only over that port and the host's async
 *     `complete(prompt)` is called per request.
 *
 *   IFRAME (preview HTML where the generated app runs):
 *     installs the shim via `installAppCompleteIframeShim()` (or by
 *     inlining `APP_COMPLETE_IFRAME_SHIM_SCRIPT`). The shim sets
 *     `window.app.complete` to a function that — on first use —
 *     handshakes with the host to obtain a port, then sends each
 *     prompt over that port and resolves with the response.
 *
 * Why a port handshake rather than posting the prompt straight up the
 * frame tree: the preview can't read its ancestors' origins
 * (cross-origin reads throw), so to *find* the host bridge it broadcasts
 * a connect announcement to every ancestor with targetOrigin "*". That
 * announcement carries no prompt — just a correlation id — so a frame
 * sitting between the preview and the host (a bundler/CDN frame, an
 * analytics or ad wrapper) sees only a content-free ping. The host
 * answers by transferring one end of a {@link MessageChannel} back to
 * the requesting frame; all prompt traffic flows over that entangled
 * port, which no other frame can observe. The prompt is therefore never
 * broadcast, even in nested-iframe topologies.
 *
 * The protocol is intentionally minimal — a connect announcement, a
 * connect-ack that carries the port, then request/response messages
 * (each with an id to correlate them) over the port. Sandbox-friendly:
 * the iframe never reaches outside its origin, the parent never lets the
 * iframe pick the backend, and `MessageChannel` works in sandboxed /
 * srcdoc previews whose origin is opaque ("null").
 *
 * @example Parent-side wiring:
 * ```ts
 * import { createAppCompleteBridge } from "@anuma/sdk/tools";
 *
 * const bridge = createAppCompleteBridge({
 *   // Restrict who can drive complete() — required (or pass `source`).
 *   allowedOrigins: ["https://preview.example"],
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

/** Announcement broadcast from iframe → ancestors so the host bridge can
 *  find the preview frame. Carries only a correlation id (no prompt), so
 *  posting it up the ancestor chain with targetOrigin "*" discloses
 *  nothing sensitive to intermediate frames. */
export const APP_COMPLETE_CONNECT_TYPE = "anuma:app:complete:connect";

/** Reply from parent → iframe acknowledging a connect. The transferred
 *  {@link MessagePort} (in the message's `ports`) is the private channel
 *  the iframe uses for all subsequent prompt traffic. */
export const APP_COMPLETE_CONNECT_ACK_TYPE = "anuma:app:complete:connect-ack";

/** Tagged request from iframe → parent, sent over the entangled
 *  {@link MessagePort} (never via window postMessage). Carries the prompt
 *  and a correlation id so the parent can route the reply to the right
 *  pending promise. */
export const APP_COMPLETE_REQUEST_TYPE = "anuma:app:complete:request";

/** Tagged response from parent → iframe, sent back over the same
 *  {@link MessagePort}. Either `result` (string) or `error` (string) is
 *  populated. */
export const APP_COMPLETE_RESPONSE_TYPE = "anuma:app:complete:response";

export interface AppCompleteBridgeOptions {
  /** Host's implementation. Receives the prompt string and resolves
   *  with the response. May throw / reject; the error message is
   *  forwarded to the iframe. */
  complete: (prompt: string) => Promise<string>;
  /** Origin to send the connect-ack (and its transferred port) to. When
   *  unset, the ack is targeted at the requesting frame's own
   *  `event.origin` so a document that later replaces the source window
   *  can't capture the channel — falling back to "*" only for opaque
   *  origins (sandboxed / srcdoc iframes, which serialize to "null" and
   *  can't be targeted by string). Note the "*" fallback cannot protect a
   *  null-origin preview against a same-window navigation race; pin a known
   *  origin here (or front the preview with a real origin) when that matters.
   *  Set explicitly to pin a known origin in production. */
  targetOrigin?: string;
  /** Filter connect announcements by source window. When set, connects
   *  from any other window are ignored. Useful when the parent embeds
   *  multiple iframes and wants to route them differently. */
  source?: Window;
  /** Restrict accepted `event.origin` values for connect announcements.
   *  Connects from any other origin are silently dropped — so a cross-origin
   *  script that gains a window handle can't open a channel and burn quota.
   *  Use the host's own origin (or the preview's, for cross-origin previews);
   *  for srcdoc/sandboxed previews whose origin is "null", prefer `source`.
   *  The single-element sentinel `["*"]` opts into accepting every origin
   *  (logs a one-time warning). Omitting both this and `source` throws — the
   *  bridge will not silently default to wide-open. */
  allowedOrigins?: readonly string[];
}

export interface AppCompleteBridge {
  /** Remove the message listener and close every open channel. Call when
   *  the preview is unmounted. */
  dispose(): void;
}

/** Warn at most once per process that a bridge was created with the explicit
 *  `allowedOrigins: ["*"]` wildcard. Module-scoped flag keeps it from spamming
 *  hosts that mount/unmount previews repeatedly. */
let warnedWideOpenBridge = false;
function warnWideOpenBridge(): void {
  if (warnedWideOpenBridge) return;
  warnedWideOpenBridge = true;
  console.warn(
    '[anuma] createAppCompleteBridge: `allowedOrigins` is ["*"] — the bridge will open a channel and run complete() for connect requests from ANY origin (any frame that can postMessage this window can spend your tokens and read the results). Prefer a specific origin allowlist or `source` in production.'
  );
}

/**
 * Install a parent-side bridge that answers `window.app.complete`
 * calls from one or more preview iframes. Returns a handle whose
 * `dispose()` removes the listener and closes open channels.
 *
 * @throws if neither `allowedOrigins` nor `source` is provided. The bridge
 * runs the host's `complete()` (which holds the API key/quota) for callers, so
 * it refuses to default to accepting every origin — pass `allowedOrigins`
 * and/or `source`, or opt in explicitly with `allowedOrigins: ["*"]`.
 */
export function createAppCompleteBridge(options: AppCompleteBridgeOptions): AppCompleteBridge {
  const { complete, targetOrigin, source, allowedOrigins } = options;
  const allowSet = allowedOrigins ? new Set(allowedOrigins) : null;
  const allowAnyOrigin = allowSet?.has("*") ?? false;

  // Default-deny. A bridge with no origin allowlist and no source-window filter
  // is a confused-deputy LLM proxy: any frame that can postMessage this window
  // (a sibling ad/analytics iframe, a hijacked CDN frame, a page that framed or
  // popped open the host) can open a channel and bill the host's `complete()`
  // for tokens while reading the responses. A console.warn wouldn't gate that,
  // so refuse to construct — the host must make an explicit choice.
  if (!allowSet && !source) {
    throw new Error(
      '[anuma] createAppCompleteBridge: refusing a wide-open bridge. Restrict callers with `allowedOrigins` (or `source` for srcdoc/sandboxed previews), or opt into accepting every origin explicitly with `allowedOrigins: ["*"]`.'
    );
  }
  // Explicit wildcard is permitted but genuinely risky; surface it once.
  if (allowAnyOrigin) warnWideOpenBridge();

  // Every channel we hand out, so dispose() can tear them all down. Ports
  // have no "peer went away" event, so a reloaded preview (which re-handshakes
  // under a fresh connect id) leaves its old host-side port here until
  // dispose() — a bounded per-reload cost, not a leak of data, since prompts
  // only ever travel over a live, entangled port.
  const openPorts = new Set<MessagePort>();

  // The shim re-broadcasts the same connect id every CONNECT_RETRY_MS until it
  // gets a port, so a single connect attempt arrives many times. Answer each
  // (source window, connect id) pair exactly once — otherwise every retry would
  // mint a fresh channel and orphan a host-side port. WeakMap-by-window lets the
  // bookkeeping be reclaimed when the frame goes away.
  const answered = new WeakMap<Window, Set<string>>();

  const serveRequest = async (port: MessagePort, event: MessageEvent): Promise<void> => {
    const data = event.data as
      | { type?: unknown; id?: unknown; prompt?: unknown }
      | null
      | undefined;
    if (!data || data.type !== APP_COMPLETE_REQUEST_TYPE) return;
    if (typeof data.id !== "string") return;

    const prompt = typeof data.prompt === "string" ? data.prompt : "";
    try {
      const result = await complete(prompt);
      port.postMessage({ type: APP_COMPLETE_RESPONSE_TYPE, id: data.id, result: String(result) });
    } catch (err) {
      port.postMessage({
        type: APP_COMPLETE_RESPONSE_TYPE,
        id: data.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleConnect = (event: MessageEvent): void => {
    if (source && event.source !== source) return;
    if (allowSet && !allowAnyOrigin && !allowSet.has(event.origin)) return;
    const data = event.data as { type?: unknown; id?: unknown } | null | undefined;
    if (!data || data.type !== APP_COMPLETE_CONNECT_TYPE) return;
    if (typeof data.id !== "string") return;

    const reply = event.source as Window | null;
    if (!reply) return;

    // Answer this connect id once per source window; ignore the shim's retries.
    let seen = answered.get(reply);
    if (!seen) {
      seen = new Set();
      answered.set(reply, seen);
    }
    if (seen.has(data.id)) return;
    seen.add(data.id);

    // Target the ack (and the port it carries) at the requester's own origin
    // unless the host pinned one. Opaque origins (sandboxed/srcdoc iframes)
    // serialize to "null" and can't be used as a postMessage targetOrigin, so
    // fall back to "*" there. The ack still reaches only `event.source` (a
    // single window), not every ancestor, so it does not reintroduce the
    // broadcast leak — but, unlike a pinned origin, "*" can't stop delivery to a
    // document that replaced the source frame between connect and ack (a
    // navigation race on the preview). Pin `targetOrigin`, or front the preview
    // with a real origin, when that race is in your threat model.
    const replyOrigin =
      targetOrigin ?? (event.origin && event.origin !== "null" ? event.origin : "*");

    const channel = new MessageChannel();
    const hostPort = channel.port1;
    openPorts.add(hostPort);
    // Assigning onmessage implicitly starts the port.
    hostPort.onmessage = (ev: MessageEvent): void => {
      void serveRequest(hostPort, ev);
    };
    reply.postMessage({ type: APP_COMPLETE_CONNECT_ACK_TYPE, id: data.id }, replyOrigin, [
      channel.port2,
    ]);
  };

  window.addEventListener("message", handleConnect);
  return {
    dispose(): void {
      window.removeEventListener("message", handleConnect);
      for (const port of openPorts) {
        try {
          port.close();
        } catch {
          /* port may already be closed */
        }
      }
      openPorts.clear();
    },
  };
}

/** Default timeout (ms) for `window.app.complete` calls inside the
 *  iframe shim. Covers the connect handshake plus the LLM completion —
 *  long enough for slow completions, short enough to surface a hung or
 *  absent parent bridge (e.g. unmounted preview). Hosts can override by
 *  setting `window.APP_COMPLETE_TIMEOUT_MS` in the iframe before the
 *  first call. */
export const APP_COMPLETE_DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Inline JavaScript source that installs `window.app.complete` in an
 * iframe. On first use it handshakes with the host bridge to obtain a
 * private {@link MessagePort}, then sends each prompt over that port.
 * Drop into a `<script>` tag of a preview HTML to enable in-app LLM
 * calls.
 *
 * Confidentiality: prompts are sent only over the entangled port, never
 * broadcast up the frame tree. The only thing posted to ancestor frames is
 * a content-free connect announcement (used to locate the host bridge), so
 * an intermediate frame that merely *reads* messages can't see prompts —
 * the passive-disclosure leak this transport was designed to close.
 *
 * What the default does NOT defend against: an actively-malicious ancestor
 * frame. The connect announcement (and its correlation id) is broadcast to
 * every ancestor, so such a frame can race a forged connect-ack carrying its
 * own port; if it wins, that port becomes the channel and it then reads
 * every prompt. The iframe cannot read an ancestor's origin to tell the real
 * host from an impostor, so closing this active path needs a trust anchor:
 * set `window.APP_COMPLETE_PARENT_ORIGIN` to the host's origin before the
 * first call and the shim accepts a connect-ack only from that origin (pair
 * it with `allowedOrigins` on the bridge). Strongly recommended whenever an
 * untrusted cross-origin frame can sit between the preview and the host.
 *
 * No-ops when there's no parent window (e.g. when the HTML is opened
 * directly via `file://` rather than embedded in an iframe). In that
 * case, hosts can provide their own `window.app.complete` stub or
 * leave it unset.
 *
 * Each call has a {@link APP_COMPLETE_DEFAULT_TIMEOUT_MS} ms timeout
 * (overridable via `window.APP_COMPLETE_TIMEOUT_MS`); on timeout the promise
 * rejects and its pending state is cleaned up, so a disposed or absent parent
 * bridge can't leave the app frozen. A timeout on the established channel also
 * drops it, so the next call re-handshakes — recovering if the bridge was torn
 * down and a new one has since mounted.
 */
export const APP_COMPLETE_IFRAME_SHIM_SCRIPT = `(function () {
  if (typeof window === "undefined" || !window.parent || window.parent === window) {
    return;
  }
  var CONNECT_TYPE = ${JSON.stringify(APP_COMPLETE_CONNECT_TYPE)};
  var CONNECT_ACK_TYPE = ${JSON.stringify(APP_COMPLETE_CONNECT_ACK_TYPE)};
  var REQUEST_TYPE = ${JSON.stringify(APP_COMPLETE_REQUEST_TYPE)};
  var RESPONSE_TYPE = ${JSON.stringify(APP_COMPLETE_RESPONSE_TYPE)};
  var DEFAULT_TIMEOUT_MS = ${APP_COMPLETE_DEFAULT_TIMEOUT_MS};
  // How often to re-announce while at least one call is waiting for a bridge.
  // The re-announce loop runs only while there are waiters and stops the
  // moment one connects, so a late-mounting bridge still gets found; the
  // bridge answers a given connect id once (ignoring the retries), so this
  // doesn't accumulate channels.
  var CONNECT_RETRY_MS = 300;
  // Optional: only trust a connect-ack from this exact origin (defends
  // against a malicious ancestor forging an ack to capture the channel).
  var EXPECTED_ORIGIN = (typeof window.APP_COMPLETE_PARENT_ORIGIN === "string" && window.APP_COMPLETE_PARENT_ORIGIN)
    ? window.APP_COMPLETE_PARENT_ORIGIN
    : null;

  // Post a content-free announcement up the ancestor chain (parent,
  // grandparent, ... up to top). The host bridge listens on whichever
  // ancestor frame it's mounted in, so this works whether the preview is a
  // direct child of the host (one iframe) or nested inside a bundler frame
  // (two iframes). Posting to each ancestor rather than just window.top can't
  // overshoot a host that is itself embedded. No prompt is in this message, so
  // the extra deliveries disclose nothing.
  function postUp(message) {
    var w = window;
    for (var i = 0; i < 10 && w.parent && w.parent !== w; i++) {
      try { w.parent.postMessage(message, "*"); } catch (e) {}
      w = w.parent;
    }
  }

  // Prefer a CSPRNG so ids aren't predictable; fall back gracefully for
  // contexts that expose neither (very old / non-secure preview frames).
  function newId(prefix) {
    try {
      var c = typeof crypto !== "undefined" ? crypto : null;
      if (c && typeof c.randomUUID === "function") return prefix + c.randomUUID();
      if (c && typeof c.getRandomValues === "function") {
        var bytes = c.getRandomValues(new Uint8Array(16));
        var hex = "";
        for (var i = 0; i < bytes.length; i++) hex += (bytes[i] + 256).toString(16).slice(1);
        return prefix + hex;
      }
    } catch (e) {}
    return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  var port = null;             // entangled MessagePort once connected
  var connecting = false;      // a connect attempt is in flight
  var retryTimer = null;
  var connectNonce = newId("k_"); // regenerated per attempt (see startConnecting)
  var waiters = [];            // [{ resolve, reject }] calls awaiting the port
  var pending = {};            // id -> { resolve, reject } awaiting a response

  function onPortMessage(event) {
    var data = event.data;
    if (!data || data.type !== RESPONSE_TYPE || typeof data.id !== "string") return;
    var entry = pending[data.id];
    if (!entry) return;
    delete pending[data.id];
    if (typeof data.error === "string") entry.reject(new Error(data.error));
    else entry.resolve(String(data.result == null ? "" : data.result));
  }

  function onConnectAck(event) {
    var data = event.data;
    if (!data || data.type !== CONNECT_ACK_TYPE || data.id !== connectNonce) return;
    if (EXPECTED_ORIGIN && event.origin !== EXPECTED_ORIGIN) return;
    var p = event.ports && event.ports[0];
    if (!p) return;
    if (port) { try { p.close(); } catch (e) {} return; } // ignore duplicate acks
    port = p;
    port.onmessage = onPortMessage; // implicitly starts the port
    stopConnecting();
    var ws = waiters; waiters = [];
    for (var i = 0; i < ws.length; i++) ws[i].resolve(port);
  }

  function sendConnect() { postUp({ type: CONNECT_TYPE, id: connectNonce }); }

  function startConnecting() {
    if (port || connecting) return;
    connecting = true;
    // Fresh id per attempt: the bridge answers a given id once, so a reconnect
    // (e.g. after the cached port went dead) needs a new id to be re-acked.
    connectNonce = newId("k_");
    window.addEventListener("message", onConnectAck);
    sendConnect();
    // Keep re-announcing until we connect; dropWaiter() stops this once the
    // last waiting call gives up, so the loop is bounded by the call timeouts.
    retryTimer = setInterval(function () {
      if (port) stopConnecting();
      else sendConnect();
    }, CONNECT_RETRY_MS);
  }

  function stopConnecting() {
    connecting = false;
    if (retryTimer !== null) { clearInterval(retryTimer); retryTimer = null; }
    window.removeEventListener("message", onConnectAck);
  }

  function dropWaiter(entry) {
    var idx = waiters.indexOf(entry);
    if (idx >= 0) waiters.splice(idx, 1);
    // When nobody is waiting and we never connected, stop announcing and drop
    // the listener so a never-present bridge leaves no timer behind.
    if (!port && waiters.length === 0) stopConnecting();
  }

  window.app = window.app || {};
  window.app.complete = function (prompt) {
    return new Promise(function (resolve, reject) {
      var id = newId("c_");
      var timeoutMs = (typeof window.APP_COMPLETE_TIMEOUT_MS === "number" && window.APP_COMPLETE_TIMEOUT_MS > 0)
        ? window.APP_COMPLETE_TIMEOUT_MS
        : DEFAULT_TIMEOUT_MS;
      var settled = false;
      var waiter = null;
      var usedPort = null;       // the port this call actually sent over, if any
      var timer = setTimeout(function () {
        // A timeout on a call that was using the cached port means that channel
        // is most likely dead (host bridge disposed, no peer-gone event to tell
        // us). Drop it so the next call re-handshakes instead of posting into a
        // dead port and waiting the full timeout again. Only drop it if it's
        // still the current port (a later reconnect may have replaced it), and
        // never the listener — in-flight calls keep routing via its onmessage.
        if (usedPort && port === usedPort) port = null;
        finish(function () {
          reject(new Error("window.app.complete timed out after " + timeoutMs + "ms"));
        });
      }, timeoutMs);

      function finish(act) {
        if (settled) return;
        settled = true;
        if (timer !== null) { clearTimeout(timer); timer = null; }
        delete pending[id];
        if (waiter) { dropWaiter(waiter); waiter = null; }
        act();
      }

      function send(p) {
        if (settled) return;
        usedPort = p;
        pending[id] = {
          resolve: function (v) { finish(function () { resolve(v); }); },
          reject: function (e) { finish(function () { reject(e); }); },
        };
        try {
          p.postMessage({ type: REQUEST_TYPE, id: id, prompt: String(prompt) });
        } catch (e) {
          finish(function () { reject(e instanceof Error ? e : new Error(String(e))); });
        }
      }

      if (port) { send(port); return; }
      waiter = {
        resolve: function (p) { waiter = null; send(p); },
        reject: function (e) { finish(function () { reject(e); }); },
      };
      waiters.push(waiter);
      startConnecting();
    });
  };
  // Announce readiness so the install can be confirmed from the preview
  // frame's console — window.app.complete lives only in the iframe, never the
  // top page, so "undefined" in the top-page console is expected, not a bug.
  try { console.info("[anuma] window.app.complete ready"); } catch (e) {}
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
