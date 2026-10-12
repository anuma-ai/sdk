import { describe, expect, it } from "vitest";

import { INTERNAL_FLOW_MARKER, withInternalFlowMarker } from "./internalFlowMarker.js";

describe("internal flow marker", () => {
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
