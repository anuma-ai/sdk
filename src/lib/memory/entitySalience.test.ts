import { describe, expect, it } from "vitest";

import { TOPIC_CASES } from "../../../test/memory/src/topic/dataset";
import type { NerDetector, PiiSpan } from "../pii/ner";
import { PiiRedactor } from "../pii/redactor";
import { parseEntities } from "./autoExtract";
import {
  isGenericEntityName,
  isIdentifierOrAmountEntityName,
  restoreEntityName,
} from "./entitySalience";

describe("isGenericEntityName", () => {
  it("drops the bare generic nouns the models leak as topics", () => {
    for (const name of ["Home", "home", "Work", "Meeting", "Lunch", "Birthday", "Appointment"]) {
      expect(isGenericEntityName(name)).toBe(true);
    }
  });

  it("drops pure date noise", () => {
    for (const name of ["Today", "tomorrow", "Friday", "March", "next week", "this weekend"]) {
      expect(isGenericEntityName(name)).toBe(true);
    }
  });

  it("keeps a phrase with any distinctive token", () => {
    for (const name of [
      "Chicago Marathon",
      "Blue Bottle on Valencia",
      "Hollowpoint Labs",
      "Japan trip",
      "Monday Night Football",
      "Next.js",
      "The Last Supper",
    ]) {
      expect(isGenericEntityName(name)).toBe(false);
    }
  });

  it("drops an all-generic phrase held together by modifiers", () => {
    for (const name of [
      "my home office",
      "a birthday dinner",
      "meeting at home",
      "work from home",
      "home and work",
      "next week",
    ]) {
      expect(isGenericEntityName(name)).toBe(true);
    }
  });

  it("drops plural generics too", () => {
    for (const name of ["Meetings", "Trips", "Calls", "weekends", "Appointments"]) {
      expect(isGenericEntityName(name)).toBe(true);
    }
  });

  it("keeps an article + single noun, which reads as a title", () => {
    expect(isGenericEntityName("The Office")).toBe(false);
    expect(isGenericEntityName("The Trip")).toBe(false);
    expect(isGenericEntityName("my office")).toBe(true);
    expect(isGenericEntityName("this trip")).toBe(true);
    expect(isGenericEntityName("the weekend")).toBe(false);
  });

  it("never drops a gold entity from the topic-extraction eval dataset", () => {
    const dropped = TOPIC_CASES.flatMap((c) => c.gold)
      .map((g) => g.name)
      .filter((name) => isGenericEntityName(name));
    expect(dropped).toEqual([]);
  });

  it("keeps the connectors a personal memory graph needs", () => {
    for (const name of ["Mom", "wife", "boss", "coffee", "matcha", "Spanish", "machine learning"]) {
      expect(isGenericEntityName(name)).toBe(false);
    }
  });

  it("treats a name with no letters or digits as generic", () => {
    expect(isGenericEntityName("---")).toBe(true);
  });
});

describe("parseEntities — salience gate", () => {
  it("drops generic entities from both the object and bare-string shapes", () => {
    expect(
      parseEntities([
        { name: "Home", kind: "place" },
        { name: "Hollowpoint Labs", kind: "organization" },
        "Meeting",
        "Whoop",
      ])
    ).toEqual([{ name: "Hollowpoint Labs", kind: "organization" }, { name: "Whoop" }]);
  });

  it("still returns an empty array rather than throwing when everything is generic", () => {
    expect(parseEntities([{ name: "Today" }, "Lunch"])).toEqual([]);
  });

  it("maps a known salience to its weight and ignores an unknown one", () => {
    expect(
      parseEntities([
        { name: "Chicago Marathon", kind: "event", salience: "primary" },
        { name: "Ana", salience: "secondary" },
        { name: "Nike", salience: "mention" },
        { name: "Whoop", salience: "central" },
        { name: "Oura", salience: "constructor" },
      ])
    ).toEqual([
      { name: "Chicago Marathon", kind: "event", weight: 1 },
      { name: "Ana", weight: 0.6 },
      { name: "Nike", weight: 0.3 },
      { name: "Whoop" },
      { name: "Oura" },
    ]);
  });
});

describe("isIdentifierOrAmountEntityName", () => {
  it("drops base58 strings of 32 to 88 characters", () => {
    for (const name of [
      "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T",
      "5VERv8NMvzbJMEkV8xnrLkEaWRtSz2CosKDYMCV",
    ]) {
      expect(isIdentifierOrAmountEntityName(name)).toBe(true);
    }
  });

  it("drops 0x-prefixed 40 and 64 hex strings", () => {
    for (const name of [
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060",
    ]) {
      expect(isIdentifierOrAmountEntityName(name)).toBe(true);
    }
  });

  it("drops long bare hex and key-like strings", () => {
    for (const name of [
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "d41d8cd98f00b204e9800998ecf8427e",
      "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      "token_Ab3dE5fG7hJ9kL2mN4pQ6rS8",
      "key_Xq7Lm2Rt9Vb4Nc8Wd3Kf6Hj1",
      "sk-proj-Ab3dE5fG7hJ9kL2mN4pQ6rS8tU0vW",
      "github_pat_11ABCDEFG0123456789_abcdefghijKLMNOPQRstuvwxyz0123456789",
      "AKIAIOSFODNN7EXAMPLE",
      "550e8400-e29b-41d4-a716-446655440000",
    ]) {
      expect(isIdentifierOrAmountEntityName(name)).toBe(true);
    }
  });

  it("drops a name that carries an identifier next to a word", () => {
    expect(
      isIdentifierOrAmountEntityName("wallet 0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    ).toBe(true);
    expect(
      isIdentifierOrAmountEntityName("Phantom (7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU)")
    ).toBe(true);
  });

  it("drops values that are mainly a number or amount", () => {
    for (const name of [
      "50k",
      "$1,200",
      "3.5 SOL",
      "3.5 sol",
      "100 ETH",
      "0.25 BTC",
      "1.2M",
      "$2.5M",
      "€300",
      "USD 1,200",
      "1,200 USD",
      "2000 USDC",
      "12%",
      "-4.5%",
      "~$40k",
      "10x",
      "50k position",
      "500 shares",
      "100 shares of AAPL",
      "1.5 million dollars",
      "4111 1111 1111 1111",
      "12345",
      "50K",
      "100k",
      "$3M",
      "1,000 AAPL",
      "1.200,50 EUR",
      "EUR 1.200,50",
      "1.200,50 €",
      "USD $ 1,200",
      "$ 1,200",
      "€ 300",
    ]) {
      expect(isIdentifierOrAmountEntityName(name)).toBe(true);
    }
  });

  it("drops truncated addresses", () => {
    for (const name of [
      "0x742d…f44e",
      "0x742d...f44e",
      "wallet 0x742d…f44e",
      "7xKX…gAsU",
      "7xKX...gAsU",
    ]) {
      expect(isIdentifierOrAmountEntityName(name)).toBe(true);
    }
  });

  it("drops a name that pairs an amount with a subject word", () => {
    for (const name of [
      "rent $1,200",
      "Bitcoin $60k",
      "3.5 SOL staked",
      "$1200/mo",
      "100 shares of Apple",
      "paid €300 deposit",
      "2 ETH stake",
    ]) {
      expect(isIdentifierOrAmountEntityName(name)).toBe(true);
    }
  });

  it("drops emails, phone numbers, SSNs and card numbers", () => {
    for (const name of [
      "alice@example.com",
      "Alice (alice@example.com)",
      "(415) 555-1234",
      "+1 415-555-1234",
      "123-45-6789",
      "4111-1111-1111-1111",
    ]) {
      expect(isIdentifierOrAmountEntityName(name)).toBe(true);
    }
  });

  it("drops account and order numbers", () => {
    for (const name of ["order #123456789", "account 12345678", "invoice 1234567"]) {
      expect(isIdentifierOrAmountEntityName(name)).toBe(true);
    }
  });

  it("drops names of 12 or more words, such as seed phrases", () => {
    const words = [
      "abandon",
      "ability",
      "able",
      "about",
      "above",
      "absent",
      "absorb",
      "abstract",
      "absurd",
      "abuse",
      "access",
      "accident",
    ];
    expect(isIdentifierOrAmountEntityName(words.join(" "))).toBe(true);
    expect(isIdentifierOrAmountEntityName([...words, ...words].join(" "))).toBe(true);
    expect(isIdentifierOrAmountEntityName(words.slice(0, 11).join(" "))).toBe(false);
  });

  it("drops names longer than 120 characters", () => {
    expect(isIdentifierOrAmountEntityName("x".repeat(121))).toBe(true);
    expect(isIdentifierOrAmountEntityName("x".repeat(120))).toBe(false);
  });

  it("handles long punctuation runs in linear time", () => {
    const started = performance.now();
    expect(isIdentifierOrAmountEntityName(`a${"!".repeat(50_000)}a`)).toBe(true);
    expect(isIdentifierOrAmountEntityName(`1${",".repeat(100_000)}z`)).toBe(true);
    expect(isIdentifierOrAmountEntityName(`a${"!".repeat(110)}a`)).toBe(false);
    expect(performance.now() - started).toBeLessThan(250);
  });

  it("keeps hyphenated and dotted AI model IDs", () => {
    for (const name of [
      "claude-sonnet-4-5-20250929",
      "claude-3-5-sonnet-20241022",
      "Meta-Llama-3.1-405B-Instruct",
      "Qwen2.5-Coder-32B-Instruct",
      "DeepSeek-R1-Distill-Qwen-32B",
      "Mistral-7B-Instruct-v0.2",
      "gemini-2.5-pro-preview-05-06",
      "gpt-4o-mini-2024-07-18",
      "Mixtral-8x22B-Instruct-v0.1",
    ]) {
      expect(isIdentifierOrAmountEntityName(name)).toBe(false);
    }
  });

  it("keeps ordinary subjects, tickers and names that merely contain a number", () => {
    for (const name of [
      "SOL",
      "ETH",
      "bitcoin",
      "Solana",
      "trading",
      "2024 trip",
      "Bitcoin 2024",
      "ETH 2.0",
      "1984",
      "Apollo 11",
      "Area 51",
      "Formula 1",
      "F1",
      "Web3",
      "COVID-19",
      "iPhone 15",
      "PS5",
      "30 Rock",
      "30 ROCK",
      "50 Cent",
      "3M",
      "401k",
      "401K",
      "403b",
      "4K",
      "7 Wonders",
      "21 Savage",
      "Porsche 911",
      "Q3 2024",
      "Chicago Marathon",
      "Hollowpoint Labs",
      "Next.js",
      "machine learning",
      "Pneumonoultramicroscopicsilicovolcanoconiosis",
      "Python 3.12 API",
      "99 Percent Invisible",
      "Ocean's Eleven",
      "Wait...What",
    ]) {
      expect(isIdentifierOrAmountEntityName(name)).toBe(false);
    }
  });

  it("never drops a gold entity from the topic-extraction eval dataset", () => {
    const dropped = TOPIC_CASES.flatMap((c) => c.gold)
      .map((g) => g.name)
      .filter((name) => isIdentifierOrAmountEntityName(name));
    expect(dropped).toEqual([]);
  });

  it("treats an empty name as not an identifier", () => {
    expect(isIdentifierOrAmountEntityName("   ")).toBe(false);
  });
});

describe("parseEntities — identifier and amount gate", () => {
  it("drops identifier and amount names from both shapes and keeps the subjects", () => {
    expect(
      parseEntities([
        { name: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", kind: "thing" },
        { name: "Solana", kind: "product", salience: "primary" },
        "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        { name: "3.5 SOL", kind: "thing" },
        "$1,200",
        "SOL",
        { name: "2024 trip", kind: "event" },
        { name: "3M", kind: "organization" },
        { name: "1.200,50 EUR", kind: "thing" },
        "USD $ 1,200",
      ])
    ).toEqual([
      { name: "Solana", kind: "product", weight: 1 },
      { name: "SOL" },
      { name: "2024 trip", kind: "event" },
      { name: "3M", kind: "organization" },
    ]);
  });
});

describe("restoreEntityName", () => {
  const secrets = [
    "alice@example.com",
    "sk_live_Ab3dE5fG7hJ9kL2",
    "sk_live_AbcdEfghIjklMnopQrstUv",
    "(415) 555-1234",
    "123-45-6789",
    "4111-1111-1111-1111",
    "123 Main Street",
  ];

  function redactorFor(text: string): PiiRedactor {
    const redactor = new PiiRedactor();
    redactor.redactText(text);
    return redactor;
  }

  it("drops a name that holds a structured placeholder, whatever the restored value looks like", () => {
    const redactor = redactorFor(`notes: ${secrets.join(" ; ")}`);
    const placeholders = [...redactor.getMappings().keys()];
    expect(placeholders).toEqual([
      "[EMAIL_1]",
      "[SSN_1]",
      "[CREDIT_CARD_1]",
      "[PHONE_1]",
      "[API_KEY_1]",
      "[API_KEY_2]",
      "[US_ADDRESS_1]",
    ]);
    for (const placeholder of placeholders) {
      expect(restoreEntityName(placeholder, redactor)).toBeNull();
      expect(restoreEntityName(placeholder.slice(1, -1).toLowerCase(), redactor)).toBeNull();
      expect(restoreEntityName(`Stripe ${placeholder}`, redactor)).toBeNull();
    }
  });

  it("restores a name redacted by the NER layer", async () => {
    const detector: NerDetector = {
      async detect(text: string): Promise<PiiSpan[]> {
        const at = text.indexOf("Marguerite");
        return at === -1 ? [] : [{ start: at, end: at + 10, category: "PERSON" }];
      },
    };
    const redactor = new PiiRedactor({ nerDetector: detector });
    await redactor.redactTextAsync("Met Marguerite at alice@example.com");
    expect(restoreEntityName("[PERSON_1]", redactor)).toBe("Marguerite");
    expect(restoreEntityName("[PERSON_1] [EMAIL_1]", redactor)).toBeNull();
  });

  it("keeps a name without placeholders and drops an unresolved placeholder", () => {
    const redactor = redactorFor("mail alice@example.com");
    expect(restoreEntityName("Stripe", redactor)).toBe("Stripe");
    expect(restoreEntityName("STEP_1", redactor)).toBe("STEP_1");
    expect(restoreEntityName("[EMAIL_9]", redactor)).toBeNull();
    expect(restoreEntityName("3.5 SOL", redactor)).toBeNull();
  });
});
