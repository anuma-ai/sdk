import { describe, it, expect, beforeEach } from "vitest";
import { PiiRedactor } from "./redactor";
import type { LlmapiMessage } from "../../client";

describe("PiiRedactor", () => {
  let redactor: PiiRedactor;

  beforeEach(() => {
    redactor = new PiiRedactor();
  });

  describe("redactText", () => {
    describe("emails", () => {
      it("redacts a single email", () => {
        const result = redactor.redactText("Contact me at john@example.com please");
        expect(result.text).toBe("Contact me at [EMAIL_1] please");
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0]).toEqual({
          category: "EMAIL",
          original: "john@example.com",
          placeholder: "[EMAIL_1]",
        });
      });

      it("redacts multiple emails with distinct placeholders", () => {
        const result = redactor.redactText("Email john@example.com or jane@corp.io");
        expect(result.text).toBe("Email [EMAIL_1] or [EMAIL_2]");
        expect(result.matches).toHaveLength(2);
      });

      it("reuses placeholder for the same email", () => {
        const result = redactor.redactText("john@example.com and john@example.com again");
        expect(result.text).toBe("[EMAIL_1] and [EMAIL_1] again");
        // Both matches reference the same placeholder
        expect(result.matches).toHaveLength(2);
        expect(result.matches[0].placeholder).toBe("[EMAIL_1]");
        expect(result.matches[1].placeholder).toBe("[EMAIL_1]");
      });

      it("does not backtrack quadratically on adversarial no-@ input (ReDoS guard)", () => {
        // "a.a.a…" with no "@" forced O(n²) backtracking before the
        // quantifiers were bounded. This must complete near-instantly.
        const input = "a.".repeat(50_000);
        const start = performance.now();
        const result = redactor.redactText(input);
        const elapsed = performance.now() - start;
        expect(result.matches.filter((m) => m.category === "EMAIL")).toHaveLength(0);
        expect(elapsed).toBeLessThan(500);
      });
    });

    describe("phone numbers", () => {
      it("redacts US phone with dashes", () => {
        const result = redactor.redactText("Call me at 555-123-4567");
        expect(result.text).toBe("Call me at [PHONE_1]");
      });

      it("redacts US phone with parentheses", () => {
        const result = redactor.redactText("Call (555) 123-4567");
        expect(result.text).toBe("Call [PHONE_1]");
      });

      it("redacts international phone", () => {
        const result = redactor.redactText("My number is +1 555-123-4567");
        expect(result.text).toBe("My number is [PHONE_1]");
      });

      it("does not match short digit sequences", () => {
        const result = redactor.redactText("I have 42 items and 100 pages");
        expect(result.matches.filter((m) => m.category === "PHONE")).toHaveLength(0);
      });
    });

    describe("SSNs", () => {
      it("redacts a valid SSN", () => {
        const result = redactor.redactText("My SSN is 123-45-6789");
        expect(result.text).toBe("My SSN is [SSN_1]");
      });

      it("rejects invalid area number 000", () => {
        const result = redactor.redactText("Number 000-12-3456");
        expect(result.matches.filter((m) => m.category === "SSN")).toHaveLength(0);
      });

      it("rejects invalid area number 666", () => {
        const result = redactor.redactText("Number 666-12-3456");
        expect(result.matches.filter((m) => m.category === "SSN")).toHaveLength(0);
      });
    });

    describe("credit cards", () => {
      it("redacts a Visa number", () => {
        const result = redactor.redactText("Card: 4532015112830366");
        expect(result.text).toContain("[CREDIT_CARD_1]");
        expect(result.matches[0].category).toBe("CREDIT_CARD");
      });

      it("redacts a card with spaces", () => {
        const result = redactor.redactText("Card: 4532 0151 1283 0366");
        expect(result.text).toContain("[CREDIT_CARD_1]");
      });

      it("rejects numbers that fail Luhn check", () => {
        const result = redactor.redactText("Number: 1234567890123456");
        expect(result.matches.filter((m) => m.category === "CREDIT_CARD")).toHaveLength(0);
      });
    });

    describe("IP addresses", () => {
      it("redacts a valid IP", () => {
        const result = redactor.redactText("Server at 192.168.1.100");
        expect(result.text).toBe("Server at [IP_ADDRESS_1]");
      });

      it("ignores localhost", () => {
        const result = redactor.redactText("Running on 127.0.0.1");
        expect(result.matches.filter((m) => m.category === "IP_ADDRESS")).toHaveLength(0);
      });
    });

    describe("API keys", () => {
      it("redacts sk_ prefixed keys", () => {
        const result = redactor.redactText("Key: sk_test_FAKE0000000000000000000");
        expect(result.text).toContain("[API_KEY_1]");
      });

      it("redacts bearer tokens", () => {
        const result = redactor.redactText("Authorization: bearer_abc123def456ghi789jkl012");
        expect(result.text).toContain("[API_KEY_1]");
      });
    });

    describe("US addresses", () => {
      it("redacts a street address", () => {
        const result = redactor.redactText("I live at 123 Main Street");
        expect(result.text).toBe("I live at [US_ADDRESS_1]");
      });

      it("redacts with abbreviated suffix", () => {
        const result = redactor.redactText("Office at 456 Oak Ave");
        expect(result.text).toBe("Office at [US_ADDRESS_1]");
      });
    });

    describe("dates of birth", () => {
      it("redacts MM/DD/YYYY format", () => {
        const result = redactor.redactText("DOB: 03/15/1990");
        expect(result.text).toBe("DOB: [DATE_OF_BIRTH_1]");
      });

      it("redacts MM-DD-YYYY format", () => {
        const result = redactor.redactText("Born on 12-25-1985");
        expect(result.text).toBe("Born on [DATE_OF_BIRTH_1]");
      });
    });

    describe("multiple categories", () => {
      it("redacts mixed PII in one string", () => {
        const result = redactor.redactText(
          "Contact john@example.com at 555-123-4567, SSN 123-45-6789"
        );
        expect(result.text).toContain("[EMAIL_1]");
        expect(result.text).toContain("[PHONE_1]");
        expect(result.text).toContain("[SSN_1]");
        expect(result.matches).toHaveLength(3);
      });
    });

    describe("no PII", () => {
      it("returns unchanged text when no PII found", () => {
        const input = "What is the weather like today?";
        const result = redactor.redactText(input);
        expect(result.text).toBe(input);
        expect(result.matches).toHaveLength(0);
      });
    });
  });

  describe("redactMessages", () => {
    it("redacts user messages", () => {
      const messages: LlmapiMessage[] = [
        {
          role: "user",
          content: [{ type: "text", text: "My email is test@example.com" }],
        },
      ];
      const result = redactor.redactMessages(messages);
      expect(result.messages[0].content![0].text).toBe("My email is [EMAIL_1]");
      expect(result.matches).toHaveLength(1);
    });

    it("redacts system messages", () => {
      const messages: LlmapiMessage[] = [
        {
          role: "system",
          content: [{ type: "text", text: "User's email is admin@corp.com" }],
        },
      ];
      const result = redactor.redactMessages(messages);
      expect(result.messages[0].content![0].text).toBe("User's email is [EMAIL_1]");
    });

    it("does not redact assistant messages", () => {
      const messages: LlmapiMessage[] = [
        {
          role: "assistant",
          content: [{ type: "text", text: "Send to user@test.com" }],
        },
      ];
      const result = redactor.redactMessages(messages);
      expect(result.messages[0].content![0].text).toBe("Send to user@test.com");
      expect(result.matches).toHaveLength(0);
    });

    it("does not mutate original messages", () => {
      const original = "My email is test@example.com";
      const messages: LlmapiMessage[] = [
        {
          role: "user",
          content: [{ type: "text", text: original }],
        },
      ];
      redactor.redactMessages(messages);
      expect(messages[0].content![0].text).toBe(original);
    });

    it("preserves non-text content parts", () => {
      const messages: LlmapiMessage[] = [
        {
          role: "user",
          content: [
            { type: "text", text: "See test@example.com" },
            { type: "image_url", image_url: { url: "https://example.com/img.png" } },
          ],
        },
      ];
      const result = redactor.redactMessages(messages);
      expect(result.messages[0].content![0].text).toBe("See [EMAIL_1]");
      expect(result.messages[0].content![1]).toEqual({
        type: "image_url",
        image_url: { url: "https://example.com/img.png" },
      });
    });

    it("handles messages with no content", () => {
      const messages: LlmapiMessage[] = [{ role: "user" }];
      const result = redactor.redactMessages(messages);
      expect(result.messages).toHaveLength(1);
      expect(result.matches).toHaveLength(0);
    });
  });

  describe("deAnonymize", () => {
    it("restores redacted email", () => {
      redactor.redactText("john@example.com");
      expect(redactor.deAnonymize("I'll email [EMAIL_1]")).toBe("I'll email john@example.com");
    });

    it("restores multiple categories", () => {
      redactor.redactText("john@example.com and 555-123-4567");
      const restored = redactor.deAnonymize("Contact [EMAIL_1] at [PHONE_1]");
      expect(restored).toContain("john@example.com");
      expect(restored).toContain("555-123-4567");
    });

    it("restores multiple occurrences of the same placeholder", () => {
      redactor.redactText("john@example.com");
      expect(redactor.deAnonymize("[EMAIL_1] and [EMAIL_1]")).toBe(
        "john@example.com and john@example.com"
      );
    });

    it("returns text unchanged if no placeholders", () => {
      expect(redactor.deAnonymize("No placeholders here")).toBe("No placeholders here");
    });
  });

  describe("cross-turn consistency", () => {
    it("maintains placeholder identity across multiple redactText calls", () => {
      const r1 = redactor.redactText("Email john@example.com");
      const r2 = redactor.redactText("Also email john@example.com again");
      expect(r1.text).toBe("Email [EMAIL_1]");
      expect(r2.text).toBe("Also email [EMAIL_1] again");
    });

    it("increments counters for new values", () => {
      redactor.redactText("Email john@example.com");
      const r2 = redactor.redactText("Also jane@other.com");
      expect(r2.text).toBe("Also [EMAIL_2]");
    });
  });

  describe("getMappings", () => {
    it("returns current mappings", () => {
      redactor.redactText("john@example.com and 555-123-4567");
      const mappings = redactor.getMappings();
      expect(mappings.get("[EMAIL_1]")).toBe("john@example.com");
      expect(mappings.get("[PHONE_1]")).toBe("555-123-4567");
    });
  });

  describe("clear", () => {
    it("resets all state", () => {
      redactor.redactText("john@example.com");
      expect(redactor.size).toBe(1);
      redactor.clear();
      expect(redactor.size).toBe(0);
      // After clear, same email gets [EMAIL_1] again
      const result = redactor.redactText("john@example.com");
      expect(result.text).toBe("[EMAIL_1]");
    });
  });
});
