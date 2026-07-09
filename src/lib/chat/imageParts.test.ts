import { describe, expect, it } from "vitest";

import { isSendableImageURL } from "./imageParts";

describe("isSendableImageURL", () => {
  it("accepts http(s) URLs", () => {
    expect(isSendableImageURL("http://example.com/a.png")).toBe(true);
    expect(isSendableImageURL("https://example.com/a.png")).toBe(true);
    expect(isSendableImageURL("HTTPS://EXAMPLE.COM/A.PNG")).toBe(true);
  });

  it("accepts data:image/ URIs", () => {
    expect(isSendableImageURL("data:image/jpeg;base64,aGk=")).toBe(true);
    expect(isSendableImageURL("data:image/png;base64,aGk=")).toBe(true);
  });

  it("rejects local file:// references (the moderation hard-block trigger)", () => {
    // Regression: a prior document/image stored with a file:// URL was re-sent as an
    // image_url every turn, tripping ai-portal's image_unscannable_blocked and bricking
    // the whole conversation with a ToS refusal.
    expect(isSendableImageURL("file:///var/mobile/Documents/report.pdf")).toBe(false);
    expect(isSendableImageURL("file:///tmp/photo.jpg")).toBe(false);
  });

  it("rejects file: upload-id references", () => {
    expect(isSendableImageURL("file:file-abc123")).toBe(false);
  });

  it("rejects non-image data: URIs", () => {
    expect(isSendableImageURL("data:application/pdf;base64,aGk=")).toBe(false);
    expect(isSendableImageURL("data:text/plain;base64,aGk=")).toBe(false);
  });

  it("rejects empty / missing URLs", () => {
    expect(isSendableImageURL(undefined)).toBe(false);
    expect(isSendableImageURL(null)).toBe(false);
    expect(isSendableImageURL("")).toBe(false);
  });
});
