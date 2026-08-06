import { describe, expect, it } from "vitest";

import { INTERNAL_FLOW_MARKER, withInternalFlowMarker } from "./internalFlowMarker.js";

describe("internal flow marker", () => {
  // The portal does a plain case-sensitive substring match, so this literal IS the
  // cross-repo contract. It must stay byte-identical to
  // detection.FingerprintInternalUtility in ai-portal internal/detection/markers.go
  // and to INTERNAL_FLOW_MARKER in ai-memoryless-client
  // packages/hooks/src/internalFlowMarker.ts. Change one side alone and every
  // background memory op silently reads as a suspect again — and once
  // PORTAL_DETECTION_REJECT_MARKERLESS is on, gets 4xx'd for real users.
  it("must stay in sync with ai-portal detection/markers.go and the client", () => {
    expect(INTERNAL_FLOW_MARKER).toBe("Anuma internal first-party flow (not user chat).");
  });

  it("prepends the marker on its own line", () => {
    expect(withInternalFlowMarker("You extract durable user facts.")).toBe(
      `${INTERNAL_FLOW_MARKER}\nYou extract durable user facts.`
    );
  });

  it("is idempotent so layered callers cannot stack the marker", () => {
    const once = withInternalFlowMarker("prompt");
    expect(withInternalFlowMarker(once)).toBe(once);
    expect(once.split(INTERNAL_FLOW_MARKER)).toHaveLength(2);
  });

  it("leaves a prompt that already carries the marker mid-text untouched", () => {
    const embedded = `context\n${INTERNAL_FLOW_MARKER}\nmore`;
    expect(withInternalFlowMarker(embedded)).toBe(embedded);
  });

  it("does not disturb the prompt body", () => {
    const body = "line one\nline two";
    expect(withInternalFlowMarker(body).endsWith(body)).toBe(true);
  });
});
