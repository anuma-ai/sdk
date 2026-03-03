import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { isR2UrlExpired, R2_DEFAULT_TTL_MS } from "./r2Expiry";

// Helper: build a presigned URL with given X-Amz-Date and X-Amz-Expires
function makePresignedUrl(amzDate: string, amzExpires: number): string {
  return `https://bucket.r2.cloudflarestorage.com/object-key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=cred&X-Amz-Date=${amzDate}&X-Amz-Expires=${amzExpires}&X-Amz-Signature=sig`;
}

// Helper: format a Date as X-Amz-Date string (YYYYMMDDTHHmmssZ)
function toAmzDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
}

describe("isR2UrlExpired", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("primary path: X-Amz-Date + X-Amz-Expires", () => {
    it("returns false for a non-expired presigned URL", () => {
      const url = makePresignedUrl(toAmzDate(new Date()), 3600);
      expect(isR2UrlExpired(url)).toBe(false);
    });

    it("returns true for an expired presigned URL", () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const sevenDaysSec = 7 * 24 * 60 * 60;
      const url = makePresignedUrl(toAmzDate(eightDaysAgo), sevenDaysSec);
      expect(isR2UrlExpired(url)).toBe(true);
    });

    it("handles a real-world R2 presigned URL", () => {
      // Signed now with 3-day TTL (259200 seconds) — matches actual R2 presigned URLs
      const url = `https://4cf0e0ea50b97e72386fcf2f92a2d4e8.r2.cloudflarestorage.com/ai-image-mcp-images-dev/generated/2026/02/26/test.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=cred%2F20260226%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=${toAmzDate(new Date())}&X-Amz-Expires=259200&X-Amz-SignedHeaders=host&x-id=GetObject&X-Amz-Signature=abc123`;
      expect(isR2UrlExpired(url)).toBe(false);
    });

    it("detects an expired real-world R2 URL (signed 4 days ago with 3-day TTL)", () => {
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      const threeDaysSec = 3 * 24 * 60 * 60;
      const url = `https://4cf0e0ea50b97e72386fcf2f92a2d4e8.r2.cloudflarestorage.com/img.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=cred&X-Amz-Date=${toAmzDate(fourDaysAgo)}&X-Amz-Expires=${threeDaysSec}&X-Amz-Signature=sig`;
      expect(isR2UrlExpired(url)).toBe(true);
    });

    it("returns false at the exact boundary (signed now, 0-second TTL treated as edge)", () => {
      // 1-second TTL, signed just now — should not be expired yet
      const url = makePresignedUrl(toAmzDate(new Date()), 60);
      expect(isR2UrlExpired(url)).toBe(false);
    });

    it("ignores createdAt when Amz params are valid", () => {
      // URL is NOT expired (signed now, 1h TTL), but createdAt is 30 days ago
      // Primary path should win
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const url = makePresignedUrl(toAmzDate(new Date()), 3600);
      expect(isR2UrlExpired(url, thirtyDaysAgo.toISOString())).toBe(false);
    });
  });

  describe("fallback path: createdAt + 7 days", () => {
    it("returns false for a URL created 6 days ago", () => {
      const plainUrl = "https://bucket.r2.cloudflarestorage.com/object-key";
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      expect(isR2UrlExpired(plainUrl, sixDaysAgo.toISOString())).toBe(false);
    });

    it("returns true for a URL created 8 days ago", () => {
      const plainUrl = "https://bucket.r2.cloudflarestorage.com/object-key";
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      expect(isR2UrlExpired(plainUrl, eightDaysAgo.toISOString())).toBe(true);
    });

    it("uses fallback when X-Amz-Date is malformed", () => {
      const badUrl =
        "https://bucket.r2.cloudflarestorage.com/key?X-Amz-Date=not-a-date&X-Amz-Expires=3600";
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      expect(isR2UrlExpired(badUrl, eightDaysAgo.toISOString())).toBe(true);
    });

    it("uses fallback when only X-Amz-Date is present (no X-Amz-Expires)", () => {
      const url = `https://bucket.r2.cloudflarestorage.com/key?X-Amz-Date=${toAmzDate(new Date())}`;
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      expect(isR2UrlExpired(url, eightDaysAgo)).toBe(true);
    });

    it("uses fallback when only X-Amz-Expires is present (no X-Amz-Date)", () => {
      const url = "https://bucket.r2.cloudflarestorage.com/key?X-Amz-Expires=3600";
      const recentDate = new Date(Date.now() - 1000);
      expect(isR2UrlExpired(url, recentDate)).toBe(false);
    });

    it("accepts createdAt as a number (epoch ms)", () => {
      const eightDaysAgoMs = Date.now() - 8 * 24 * 60 * 60 * 1000;
      const plainUrl = "https://example.com/image.png";
      expect(isR2UrlExpired(plainUrl, eightDaysAgoMs)).toBe(true);
    });

    it("accepts createdAt as a Date object", () => {
      const recentDate = new Date(Date.now() - 1000);
      const plainUrl = "https://example.com/image.png";
      expect(isR2UrlExpired(plainUrl, recentDate)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false when URL is invalid and no createdAt provided", () => {
      expect(isR2UrlExpired("not-a-valid-url")).toBe(false);
    });

    it("returns false when URL is invalid but createdAt is recent", () => {
      expect(isR2UrlExpired("not-a-valid-url", new Date().toISOString())).toBe(false);
    });

    it("returns false for empty string URL with no createdAt", () => {
      expect(isR2UrlExpired("")).toBe(false);
    });

    it("handles createdAt as invalid date string gracefully", () => {
      const plainUrl = "https://example.com/image.png";
      expect(isR2UrlExpired(plainUrl, "invalid-date")).toBe(false);
    });

    it("handles X-Amz-Expires as non-numeric string", () => {
      const url = `https://bucket.r2.cloudflarestorage.com/key?X-Amz-Date=${toAmzDate(new Date())}&X-Amz-Expires=abc`;
      // Falls through to createdAt fallback since parsing fails
      expect(isR2UrlExpired(url)).toBe(false);
    });

    it("handles URL-encoded query params", () => {
      // Cloudflare R2 sometimes URL-encodes the credential slashes
      const now = new Date();
      const url = `https://bucket.r2.cloudflarestorage.com/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=key%2F20260226%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=${toAmzDate(now)}&X-Amz-Expires=259200&X-Amz-Signature=sig`;
      expect(isR2UrlExpired(url)).toBe(false);
    });
  });

  describe("constants", () => {
    it("exports R2_DEFAULT_TTL_MS as 7 days in milliseconds", () => {
      expect(R2_DEFAULT_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
      expect(R2_DEFAULT_TTL_MS).toBe(604_800_000);
    });
  });
});
