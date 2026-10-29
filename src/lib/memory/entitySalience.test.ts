import { describe, expect, it } from "vitest";

import { TOPIC_CASES } from "../../../test/memory/src/topic/dataset";
import { parseEntities } from "./autoExtract";
import { isGenericEntityName, isIdentifierOrAmountEntityName } from "./entitySalience";

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
    ]) {
      expect(isIdentifierOrAmountEntityName(name)).toBe(true);
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
      "50 Cent",
      "7 Wonders",
      "21 Savage",
      "Porsche 911",
      "Q3 2024",
      "Chicago Marathon",
      "Hollowpoint Labs",
      "Next.js",
      "machine learning",
      "Pneumonoultramicroscopicsilicovolcanoconiosis",
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
      ])
    ).toEqual([
      { name: "Solana", kind: "product", weight: 1 },
      { name: "SOL" },
      { name: "2024 trip", kind: "event" },
    ]);
  });
});
