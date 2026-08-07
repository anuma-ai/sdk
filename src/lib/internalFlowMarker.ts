/**
 * Genuine-flow marker for first-party BACKGROUND calls the SDK makes to the portal.
 *
 * The portal runs an abuse detector on its chat endpoints and — behind a flag — on
 * `/api/v1/utility/*`. Genuineness is judged purely from the RAW system-prompt text:
 * user chat carries >=2 fragments of the app's chat base prompt, and every other
 * first-party flow carries its own verbatim fingerprint (ai-portal
 * `internal/detection/markers.go`). The SDK's background memory ops build their own
 * task-specific prompts, so they match none of those and read as MARKERLESS — i.e.
 * indistinguishable from a scripted abuser on a free-tier wallet.
 *
 * That is harmless while the detector only refuses models priced above its floor
 * (these ops all run on cheap fixed models). It stops being harmless the moment the
 * portal refuses the markerless cohort regardless of price, which is what
 * `PORTAL_DETECTION_REJECT_MARKERLESS` does: fact extraction, topic sweeps,
 * consolidation and query decomposition would start 4xx-ing for real users. Carrying
 * the marker is what keeps them served.
 *
 * WHAT CARRIES IT: every caller of `callPortalJsonCompletion` (fact extraction, topic
 * extraction, consolidation, decay/injection classifiers, graph traversal, query
 * decomposition), profile-facet synthesis, and progressive history summarization
 * (`chat/summarize.ts`, which needs its own system message because it sends none).
 * All are background ops with no user waiting on a chat turn.
 *
 * WHAT DELIBERATELY DOES NOT: `reflect()` when it answers the user's own question.
 * That is a user-facing turn, not an internal flow, and mislabelling it would put the
 * wrong provenance on real chat traffic. Its background caller (profile synthesis)
 * marks its own prompt instead.
 *
 * ⚠ {@link INTERNAL_FLOW_MARKER} must stay BYTE-IDENTICAL to
 * `detection.FingerprintInternalUtility` in ai-portal `internal/detection/markers.go`
 * and to `INTERNAL_FLOW_MARKER` in ai-memoryless-client
 * `packages/hooks/src/internalFlowMarker.ts`. The server does a plain substring
 * match, so a stray edit in any one of the three silently turns these flows back into
 * suspects. All three carry a literal-pinning test.
 *
 * HONEST SCOPE: this raises the bar (it kills scripted farms that don't bother
 * copying our prompts) but it is client-supplied text and therefore copyable by
 * anyone who reads a request. It is not a cryptographic wall — a server-minted
 * short-TTL per-request token would be, and is a later phase.
 */

/**
 * The verbatim marker line. Deliberately semantically inert: it states provenance and
 * nothing else, so prepending it cannot change how a model answers an extraction or
 * classification prompt. Do not reword, translate, or interpolate.
 */
export const INTERNAL_FLOW_MARKER = "Anuma internal first-party flow (not user chat).";

/**
 * Prepend {@link INTERNAL_FLOW_MARKER} to a system prompt. Idempotent — a prompt that
 * already carries the marker is returned unchanged, so applying it at more than one
 * layer (or on a retry of an already-marked request) cannot stack it.
 */
export function withInternalFlowMarker(systemPrompt: string): string {
  if (systemPrompt.includes(INTERNAL_FLOW_MARKER)) return systemPrompt;
  return `${INTERNAL_FLOW_MARKER}\n${systemPrompt}`;
}
