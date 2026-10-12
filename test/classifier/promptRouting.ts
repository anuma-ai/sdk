import "dotenv/config";
import { describe, expect, it } from "vitest";

import { createCryptoPricePreProcessor } from "../../src/lib/chat/cryptoPriceClassifier.js";
import type { PromptPreProcessor } from "../../src/lib/chat/preProcessor.js";
import { createStockPricePreProcessor } from "../../src/lib/chat/stockPriceClassifier.js";
import { createWeatherPreProcessor } from "../../src/lib/chat/weatherClassifier.js";
import { createWebSearchPreProcessor } from "../../src/lib/chat/webSearchClassifier.js";
import { generateEmbeddings } from "../../src/lib/memoryEngine/embeddings.js";

const config = {
  baseUrl: process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai",
  portalKey: process.env.PORTAL_API_KEY || "",
};

if (!config.portalKey) {
  throw new Error("PORTAL_API_KEY is required. Add it to .env or set the environment variable.");
}

interface PreProcessorUnderTest {
  name: string;
  makeObserver: () => { processor: PromptPreProcessor; didTrigger: () => boolean };
  minAccuracy: number;
}

const PRE_PROCESSORS: PreProcessorUnderTest[] = [
  {
    name: "webSearch",
    minAccuracy: 0.7,
    makeObserver: () => {
      let triggered = false;
      const processor = createWebSearchPreProcessor({
        fetchSearchResults: async () => {
          triggered = true;
          return "";
        },
      });
      return { processor, didTrigger: () => triggered };
    },
  },
  {
    name: "cryptoPrice",
    minAccuracy: 0.7,
    makeObserver: () => {
      let triggered = false;
      const processor = createCryptoPricePreProcessor({
        fetchCryptoPriceData: async () => {
          triggered = true;
          return "";
        },
      });
      return { processor, didTrigger: () => triggered };
    },
  },
  {
    name: "stockPrice",
    minAccuracy: 0.7,
    makeObserver: () => {
      let triggered = false;
      const processor = createStockPricePreProcessor({
        fetchStockPriceData: async () => {
          triggered = true;
          return "";
        },
      });
      return { processor, didTrigger: () => triggered };
    },
  },
  {
    name: "weather",
    minAccuracy: 0.7,
    makeObserver: () => {
      let triggered = false;
      const processor = createWeatherPreProcessor({
        fetchWeatherData: async () => {
          triggered = true;
          return "";
        },
      });
      return { processor, didTrigger: () => triggered };
    },
  },
];

interface LabeledPrompt {
  text: string;
  shouldTrigger: string[];
  mustNotTrigger?: string[];
}

const PROMPTS: LabeledPrompt[] = [
  {
    text: "What's the latest news about the OpenAI leadership changes?",
    shouldTrigger: ["webSearch"],
  },
  { text: "What did Elon Musk tweet about today?", shouldTrigger: ["webSearch"] },
  { text: "What was just announced at Google I/O?", shouldTrigger: ["webSearch"] },
  { text: "What happened in the world today?", shouldTrigger: ["webSearch"] },
  { text: "Any breaking news right now?", shouldTrigger: ["webSearch"] },

  {
    text: "What is Bitcoin's price right now?",
    shouldTrigger: ["cryptoPrice"],
    mustNotTrigger: ["webSearch"],
  },
  {
    text: "How is the S&P 500 performing today?",
    shouldTrigger: ["stockPrice"],
    mustNotTrigger: ["webSearch", "cryptoPrice"],
  },
  {
    text: "What's the current exchange rate for USD to EUR?",
    shouldTrigger: ["stockPrice"],
    mustNotTrigger: ["webSearch", "cryptoPrice"],
  },
  {
    text: "How much is Nvidia stock worth?",
    shouldTrigger: ["stockPrice"],
    mustNotTrigger: ["webSearch", "cryptoPrice"],
  },
  {
    text: "What's the market cap of Apple?",
    shouldTrigger: ["stockPrice"],
    mustNotTrigger: ["webSearch", "cryptoPrice"],
  },
  {
    text: "What are Ethereum gas fees right now?",
    shouldTrigger: ["webSearch"],
    mustNotTrigger: ["cryptoPrice"],
  },

  { text: "Who won the Super Bowl this year?", shouldTrigger: ["webSearch"] },
  { text: "What are the current NBA playoff standings?", shouldTrigger: ["webSearch"] },
  { text: "What's the score of the Manchester United match?", shouldTrigger: ["webSearch"] },
  { text: "When is the next UFC fight?", shouldTrigger: ["webSearch"] },
  { text: "Who's leading the Tour de France?", shouldTrigger: ["webSearch"] },

  {
    text: "What's the weather in San Francisco today?",
    shouldTrigger: ["weather"],
    mustNotTrigger: ["webSearch"],
  },
  {
    text: "Will it rain in New York this weekend?",
    shouldTrigger: ["weather"],
    mustNotTrigger: ["webSearch"],
  },
  {
    text: "What's the UV index in Miami right now?",
    shouldTrigger: ["weather"],
    mustNotTrigger: ["webSearch"],
  },
  {
    text: "Is there a flood warning in Houston?",
    shouldTrigger: ["weather"],
    mustNotTrigger: ["webSearch"],
  },

  {
    text: "Find Italian restaurants near me",
    shouldTrigger: ["webSearch"],
    mustNotTrigger: ["weather"],
  },
  {
    text: "Where is the nearest pharmacy open right now?",
    shouldTrigger: ["webSearch"],
    mustNotTrigger: ["weather"],
  },
  {
    text: "Coffee shops with wifi in downtown Austin",
    shouldTrigger: ["webSearch"],
    mustNotTrigger: ["weather"],
  },
  {
    text: "How do I get to JFK airport from Manhattan?",
    shouldTrigger: ["webSearch"],
    mustNotTrigger: ["weather"],
  },

  { text: "Show me pictures of the new Tesla Roadster", shouldTrigger: ["webSearch"] },
  { text: "Find me a YouTube tutorial on welding", shouldTrigger: ["webSearch"] },
  { text: "What does the new MacBook Pro look like?", shouldTrigger: ["webSearch"] },
  { text: "Show me photos of the Northern Lights in Iceland", shouldTrigger: ["webSearch"] },

  { text: "What are the best noise-cancelling headphones in 2026?", shouldTrigger: ["webSearch"] },
  { text: "Compare iPhone 16 vs Samsung Galaxy S25", shouldTrigger: ["webSearch"] },
  { text: "Best budget laptop for students this year", shouldTrigger: ["webSearch"] },
  { text: "Reviews of the Dyson V15 vacuum", shouldTrigger: ["webSearch"] },

  { text: "What version of React was released most recently?", shouldTrigger: ["webSearch"] },
  {
    text: "What are the current visa requirements for US citizens visiting Japan?",
    shouldTrigger: ["webSearch"],
  },
  { text: "What's new in Python 3.14?", shouldTrigger: ["webSearch"] },
  { text: "Did Next.js release a new version this month?", shouldTrigger: ["webSearch"] },

  { text: "Is the Golden Gate Bridge open to traffic right now?", shouldTrigger: ["webSearch"] },
  { text: "When is the next Apple keynote event?", shouldTrigger: ["webSearch"] },
  { text: "What time does Costco close today?", shouldTrigger: ["webSearch"] },
  { text: "Is there a sale going on at Amazon right now?", shouldTrigger: ["webSearch"] },

  { text: "What legislation did Congress pass this week?", shouldTrigger: ["webSearch"] },
  { text: "Who is the current prime minister of the UK?", shouldTrigger: ["webSearch"] },
  { text: "What did the Supreme Court rule on today?", shouldTrigger: ["webSearch"] },
  { text: "When is the next presidential debate?", shouldTrigger: ["webSearch"] },

  { text: "Ethereum price", shouldTrigger: ["cryptoPrice"] },
  { text: "weather tomorrow", shouldTrigger: ["weather"] },
  { text: "election results 2026", shouldTrigger: ["webSearch"] },
  { text: "flights to Tokyo", shouldTrigger: ["webSearch"] },
  { text: "Lakers score", shouldTrigger: ["webSearch"] },

  { text: "What is the ZETA token price?", shouldTrigger: ["cryptoPrice"] },
  { text: "Show me the BTC chart", shouldTrigger: ["cryptoPrice"] },
  { text: "How much is Solana worth in USD?", shouldTrigger: ["cryptoPrice"] },
  { text: "DOGE market cap", shouldTrigger: ["cryptoPrice"] },

  { text: "Tesla stock price", shouldTrigger: ["stockPrice"] },
  { text: "What is NVDA trading at", shouldTrigger: ["stockPrice"] },
  { text: "USD to JPY exchange rate today", shouldTrigger: ["stockPrice"] },
  { text: "Show me the QQQ ETF price", shouldTrigger: ["stockPrice"] },

  { text: "Forecast for Tokyo tomorrow", shouldTrigger: ["weather"] },
  { text: "What's the air quality in Delhi", shouldTrigger: ["weather"] },
  { text: "Will it snow in Aspen this weekend", shouldTrigger: ["weather"] },

  { text: "What is the price of gold today?", shouldTrigger: ["cryptoPrice", "stockPrice"] },
  { text: "Show me the price of silver", shouldTrigger: ["cryptoPrice", "stockPrice"] },

  {
    text: "Spot price of platinum",
    shouldTrigger: ["stockPrice"],
    mustNotTrigger: ["cryptoPrice"],
  },
  {
    text: "Oil price today",
    shouldTrigger: ["stockPrice"],
    mustNotTrigger: ["cryptoPrice"],
  },

  { text: "Is TikTok banned in the US?", shouldTrigger: ["webSearch"] },
  { text: "What's the interest rate right now?", shouldTrigger: ["webSearch"] },
  { text: "How many people have COVID this week?", shouldTrigger: ["webSearch"] },
  { text: "What's trending on Twitter?", shouldTrigger: ["webSearch"] },

  { text: "Write a haiku about autumn leaves", shouldTrigger: [] },
  { text: "Help me come up with a name for my startup", shouldTrigger: [] },
  { text: "Write a short horror story set in space", shouldTrigger: [] },
  { text: "Generate 10 taglines for a coffee brand", shouldTrigger: [] },

  { text: "Explain the difference between TCP and UDP", shouldTrigger: [] },
  { text: "Summarize the text I pasted above", shouldTrigger: [] },
  { text: "Why is bubble sort inefficient for large arrays?", shouldTrigger: [] },
  { text: "What's the difference between REST and GraphQL?", shouldTrigger: [] },

  { text: "Help me refactor this function to use async/await", shouldTrigger: [] },
  { text: "Write a Python function that checks if a number is prime", shouldTrigger: [] },
  { text: "Convert this SQL query to a Prisma query", shouldTrigger: [] },
  { text: "Why is my React component re-rendering infinitely?", shouldTrigger: [] },
  { text: "Write a regex that matches email addresses", shouldTrigger: [] },
  { text: "Add error handling to this Express route", shouldTrigger: [] },

  { text: "What is the time complexity of quicksort?", shouldTrigger: [] },
  { text: "Solve this equation: 2x + 5 = 15", shouldTrigger: [] },
  { text: "What is the integral of sin(x)dx?", shouldTrigger: [] },
  { text: "How do you calculate compound interest?", shouldTrigger: [] },

  { text: "Help me draft a resignation letter", shouldTrigger: [] },
  { text: "Rewrite this paragraph to sound more professional", shouldTrigger: [] },
  { text: "Proofread this email for grammar mistakes", shouldTrigger: [] },
  { text: "Write a thank-you note for a job interview", shouldTrigger: [] },

  { text: "Translate 'hello world' to French", shouldTrigger: [] },
  { text: "What's the grammatical difference between who and whom?", shouldTrigger: [] },
  { text: "How do you say 'good morning' in Japanese?", shouldTrigger: [] },

  { text: "How does photosynthesis work?", shouldTrigger: [] },
  { text: "What is the Pythagorean theorem?", shouldTrigger: [] },
  { text: "Explain how neural networks learn", shouldTrigger: [] },
  { text: "What causes tides in the ocean?", shouldTrigger: [] },
  { text: "How does a CPU execute instructions?", shouldTrigger: [] },

  { text: "Parse this CSV and give me the totals by category", shouldTrigger: [] },
  { text: "Format this JSON as a markdown table", shouldTrigger: [] },
  { text: "Write a SQL query to find duplicate rows", shouldTrigger: [] },
  { text: "How do I pivot this dataframe in pandas?", shouldTrigger: [] },

  { text: "Thanks, that was helpful", shouldTrigger: [] },
  { text: "Can you explain that again more simply?", shouldTrigger: [] },
  { text: "What did you mean by that?", shouldTrigger: [] },
  { text: "Go on", shouldTrigger: [] },

  { text: "How should I structure my resume for a tech job?", shouldTrigger: [] },
  { text: "Give me tips for a job interview", shouldTrigger: [] },
  { text: "What should I prioritize when learning to code?", shouldTrigger: [] },

  { text: "What is the speed of light?", shouldTrigger: [] },
  { text: "How many continents are there?", shouldTrigger: [] },
  { text: "What year did World War 2 end?", shouldTrigger: [] },
  { text: "Who wrote Romeo and Juliet?", shouldTrigger: [] },
  { text: "What is the capital of France?", shouldTrigger: [] },
  { text: "How does gravity work?", shouldTrigger: [] },
  { text: "What are the primary colors?", shouldTrigger: [] },
  { text: "Explain the water cycle", shouldTrigger: [] },

  { text: "fix this bug", shouldTrigger: [] },
  { text: "make it shorter", shouldTrigger: [] },
  { text: "add types", shouldTrigger: [] },
  { text: "explain this code", shouldTrigger: [] },
  { text: "why does this fail", shouldTrigger: [] },

  { text: "Explain how Bitcoin mining works", shouldTrigger: [] },
  { text: "How does ZetaChain enable cross-chain transfers?", shouldTrigger: [] },
  { text: "Write a smart contract that mints an ERC-20 token", shouldTrigger: [] },
  { text: "What is the difference between proof-of-stake and proof-of-work?", shouldTrigger: [] },
  { text: "Set up a Phantom wallet for me", shouldTrigger: [] },
  { text: "What is a Merkle tree?", shouldTrigger: [] },
  { text: "How do gas fees work conceptually on Ethereum?", shouldTrigger: [] },

  { text: "How do I open a brokerage account?", shouldTrigger: [] },
  { text: "What is an ETF?", shouldTrigger: [] },
  { text: "Explain the difference between bonds and stocks", shouldTrigger: [] },
  { text: "What is a dividend and how is it taxed?", shouldTrigger: [] },
  { text: "Should I invest in index funds or individual stocks?", shouldTrigger: [] },
  { text: "How does compound interest work in retirement accounts?", shouldTrigger: [] },

  { text: "What causes hurricanes to form?", shouldTrigger: [] },
  { text: "Explain the difference between climate and weather", shouldTrigger: [] },
  { text: "How do meteorologists predict tornadoes?", shouldTrigger: [] },
  { text: "Why is the sky blue?", shouldTrigger: [] },
  { text: "How does a barometer measure air pressure?", shouldTrigger: [] },
  { text: "What is the greenhouse effect?", shouldTrigger: [] },

  { text: "Explain how Google search ranks results", shouldTrigger: [] },
  { text: "What is SEO and why does it matter?", shouldTrigger: [] },
  { text: "How do search engines crawl the web?", shouldTrigger: [] },
  { text: "What's the difference between a search engine and a database?", shouldTrigger: [] },
  { text: "Recall what we discussed earlier in this thread", shouldTrigger: [] },

  {
    text: "What is the bitcoin price today?",
    shouldTrigger: ["cryptoPrice"],
    mustNotTrigger: ["webSearch"],
  },
  {
    text: "What is the bitcoin price?",
    shouldTrigger: ["cryptoPrice"],
    mustNotTrigger: ["webSearch"],
  },
  {
    text: "What's the current ETH price?",
    shouldTrigger: ["cryptoPrice"],
    mustNotTrigger: ["webSearch"],
  },

  {
    text: "OHLCV data for AAPL",
    shouldTrigger: ["stockPrice"],
    mustNotTrigger: ["webSearch", "cryptoPrice"],
  },
  {
    text: "What is the current stock price of Apple?",
    shouldTrigger: ["stockPrice"],
    mustNotTrigger: ["webSearch", "cryptoPrice"],
  },
  {
    text: "exchange rate USD to EUR",
    shouldTrigger: ["stockPrice"],
    mustNotTrigger: ["webSearch", "cryptoPrice"],
  },
  {
    text: "stock price of Apple",
    shouldTrigger: ["stockPrice"],
    mustNotTrigger: ["webSearch", "cryptoPrice"],
  },

  {
    text: "air quality in Beijing",
    shouldTrigger: ["weather"],
    mustNotTrigger: ["webSearch"],
  },
  {
    text: "flood forecast for Houston",
    shouldTrigger: ["weather"],
    mustNotTrigger: ["webSearch"],
  },
  {
    text: "historical weather data for 2023",
    shouldTrigger: ["weather"],
    mustNotTrigger: ["webSearch"],
  },
  {
    text: "marine weather forecast",
    shouldTrigger: ["weather"],
    mustNotTrigger: ["webSearch"],
  },
  {
    text: "temperature forecast for tomorrow",
    shouldTrigger: ["weather"],
    mustNotTrigger: ["webSearch"],
  },
  {
    text: "weather in San Francisco",
    shouldTrigger: ["weather"],
    mustNotTrigger: ["webSearch"],
  },

  { text: "Breaking news today", shouldTrigger: ["webSearch"] },
  { text: "What happened in 2025 today?", shouldTrigger: ["webSearch"] },
  { text: "What happened today?", shouldTrigger: ["webSearch"] },
  { text: "What happened with coder today?", shouldTrigger: ["webSearch"] },
  { text: "What is happening right now?", shouldTrigger: ["webSearch"] },
  { text: "What news is there about Tesla?", shouldTrigger: ["webSearch"] },
  { text: "What's the latest news about AI?", shouldTrigger: ["webSearch"] },
  { text: "What's the latest news about programming?", shouldTrigger: ["webSearch"] },
  { text: "What's the latest news on Tesla?", shouldTrigger: ["webSearch"] },
  { text: "latest news update on the election", shouldTrigger: ["webSearch"] },

  { text: "Did the team win the game?", shouldTrigger: ["webSearch"] },
  { text: "Is the concert streaming live?", shouldTrigger: ["webSearch"] },
  { text: "What was the score of the Lakers game?", shouldTrigger: ["webSearch"] },
  { text: "Who won the championship?", shouldTrigger: ["webSearch"] },

  { text: "What are the differences? Compare React vs Vue", shouldTrigger: ["webSearch"] },
  { text: "What are the pros and cons of Kubernetes?", shouldTrigger: ["webSearch"] },
  { text: "analyze the current market trends for AI", shouldTrigger: ["webSearch"] },
  { text: "climate projection for 2050", shouldTrigger: ["webSearch"] },
  { text: "comprehensive overview of blockchain technology", shouldTrigger: ["webSearch"] },
  { text: "recommend a good framework for mobile development", shouldTrigger: ["webSearch"] },
  { text: "which is better React or Vue for web development", shouldTrigger: ["webSearch"] },

  { text: "coffee shops nearby", shouldTrigger: ["webSearch"], mustNotTrigger: ["weather"] },
  {
    text: "hotels in New York City",
    shouldTrigger: ["webSearch"],
    mustNotTrigger: ["weather"],
  },
  { text: "restaurants near me", shouldTrigger: ["webSearch"], mustNotTrigger: ["weather"] },
  {
    text: "where is the nearest gas station",
    shouldTrigger: ["webSearch"],
    mustNotTrigger: ["weather"],
  },

  {
    text: "find ticker symbol for Apple",
    shouldTrigger: ["webSearch"],
    mustNotTrigger: ["stockPrice"],
  },
  {
    text: "what's the elevation of Denver",
    shouldTrigger: ["webSearch"],
    mustNotTrigger: ["weather"],
  },

  { text: "images of cute cats", shouldTrigger: ["webSearch"] },
  { text: "pasta cooking video tutorial", shouldTrigger: ["webSearch"] },
  { text: "pictures of mountains", shouldTrigger: ["webSearch"] },
  { text: "pictures of the Eiffel Tower", shouldTrigger: ["webSearch"] },
  { text: "youtube python tutorials", shouldTrigger: ["webSearch"] },

  { text: "Calculate the derivative of x^2", shouldTrigger: [] },
  { text: "Debug this code snippet", shouldTrigger: [] },
  { text: "Explain how neural networks work", shouldTrigger: [] },
  { text: "Explain local storage in JavaScript", shouldTrigger: [] },
  { text: "How do I deliver packages efficiently?", shouldTrigger: [] },
  { text: "How do I resize a window in macOS?", shouldTrigger: [] },
  {
    text: "How much is the painting of a sunset worth in terms of the amount I paid for it?",
    shouldTrigger: [],
  },
  { text: "How to configure npm run watch", shouldTrigger: [] },
  { text: "How to use local variables in Python", shouldTrigger: [] },
  { text: "I want to know how to cook pasta", shouldTrigger: [] },
  {
    text: "I wanted to follow up on our previous conversation about YouTube videos for workplace posture. Can you remind me of the Mayo Clinic video you recommended?",
    shouldTrigger: [],
  },
  {
    text: "I wanted to follow up on our previous conversation about fracking in the Marcellus Shale region. You mentioned that some states require fracking companies to monitor groundwater quality at nearby wells.",
    shouldTrigger: [],
  },
  { text: "List my calendar events for the next 7 days.", shouldTrigger: [] },
  { text: 'Now say the word "beta"', shouldTrigger: [] },
  { text: "Translate 'hello' to Spanish", shouldTrigger: [] },
  { text: "What a wonderful world this is", shouldTrigger: [] },
  { text: "What happened during World War 2?", shouldTrigger: [] },
  {
    text: "What is the current time at the location of IP address 8.8.8.8? First look up where it is, then get the current time for that timezone.",
    shouldTrigger: [],
  },
  { text: "What was life like in the 19th century?", shouldTrigger: [] },
  { text: "Where is the IP address 8.8.8.8 located?", shouldTrigger: [] },
  { text: "Who am I and where do I live?", shouldTrigger: [] },
  { text: "Write a Python function to sort a list", shouldTrigger: [] },
  { text: "Write a poem about nature", shouldTrigger: [] },
  { text: "Write a program to sort numbers", shouldTrigger: [] },
  {
    text: "You are an answer evaluator. Determine if the generated answer correctly answers the question",
    shouldTrigger: [],
  },
  { text: "create a picture of a forest", shouldTrigger: [] },
  { text: "draw me a diagram of a tree", shouldTrigger: [] },
  { text: "draw me an image of a dog", shouldTrigger: [] },
  { text: "generate an image of a turtle", shouldTrigger: [] },
  { text: "how to update flutter sdk", shouldTrigger: [] },
  { text: "illustrate this concept for me", shouldTrigger: [] },
  { text: "npm update not working", shouldTrigger: [] },
  { text: "paint a portrait of a woman", shouldTrigger: [] },
  { text: "sketch a wireframe for me", shouldTrigger: [] },
  { text: "webpack watch mode not working", shouldTrigger: [] },
  { text: "where is the bug in my code", shouldTrigger: [] },
  { text: "where is the error coming from", shouldTrigger: [] },
];

interface Stats {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

function newStats(): Stats {
  return { tp: 0, fp: 0, tn: 0, fn: 0 };
}

function accuracy(s: Stats): number {
  const total = s.tp + s.fp + s.tn + s.fn;
  return total === 0 ? 0 : (s.tp + s.tn) / total;
}

function precision(s: Stats): number {
  const denom = s.tp + s.fp;
  return denom === 0 ? 1 : s.tp / denom;
}

function recall(s: Stats): number {
  const denom = s.tp + s.fn;
  return denom === 0 ? 1 : s.tp / denom;
}

function f1(s: Stats): number {
  const p = precision(s);
  const r = recall(s);
  return p + r === 0 ? 0 : (2 * p * r) / (p + r);
}

describe("prompt routing to pre-processors", () => {
  it("triggers the expected pre-processors for each prompt", async () => {
    const embeddings = await generateEmbeddings(
      PROMPTS.map((p) => p.text),
      { apiKey: config.portalKey, baseUrl: config.baseUrl }
    );

    const stats = new Map<string, Stats>(PRE_PROCESSORS.map((p) => [p.name, newStats()]));
    const mismatches: string[] = [];
    const mustNotTriggerViolations: string[] = [];

    for (let i = 0; i < PROMPTS.length; i++) {
      const { text, shouldTrigger, mustNotTrigger } = PROMPTS[i];
      const embedding = embeddings[i];
      const expectedSet = new Set(shouldTrigger);
      const mustNotSet = new Set(mustNotTrigger ?? []);

      for (const name of mustNotSet) {
        expect(
          expectedSet.has(name),
          `Prompt "${text}": "${name}" appears in both shouldTrigger and mustNotTrigger`
        ).toBe(false);
      }

      const outcomes = await Promise.all(
        PRE_PROCESSORS.map(async ({ name, makeObserver }) => {
          const { processor, didTrigger } = makeObserver();
          await processor({ prompt: text, embedding });
          return { name, triggered: didTrigger() };
        })
      );

      for (const { name, triggered } of outcomes) {
        const expected = expectedSet.has(name);
        const s = stats.get(name)!;
        if (expected && triggered) s.tp++;
        else if (expected && !triggered) {
          s.fn++;
          mismatches.push(`  [FN] ${name} expected to trigger but didn't: "${text}"`);
        } else if (!expected && triggered) {
          s.fp++;
          mismatches.push(`  [FP] ${name} triggered but shouldn't have: "${text}"`);
          if (mustNotSet.has(name)) {
            mustNotTriggerViolations.push(
              `  [HARD] ${name} fired on a mustNotTrigger boundary case: "${text}"`
            );
          }
        } else s.tn++;
      }
    }

    console.log("\n╔══════════════════════════════════════════════════════════════════╗");
    console.log("║              PROMPT ROUTING REPORT                             ║");
    console.log("╠══════════════════════════════════════════════════════════════════╣");
    for (const { name, minAccuracy } of PRE_PROCESSORS) {
      const s = stats.get(name)!;
      const acc = accuracy(s);
      const gate = acc >= minAccuracy ? "PASS" : "FAIL";
      console.log(
        `║  ${name.padEnd(18)} acc=${(acc * 100).toFixed(1).padStart(5)}%  ` +
          `p=${(precision(s) * 100).toFixed(1).padStart(5)}%  ` +
          `r=${(recall(s) * 100).toFixed(1).padStart(5)}%  ` +
          `f1=${(f1(s) * 100).toFixed(1).padStart(5)}%  ` +
          `[${gate}] (min ${(minAccuracy * 100).toFixed(0)}%)`
      );
      console.log(
        `║    tp=${s.tp}  fp=${s.fp}  tn=${s.tn}  fn=${s.fn}  (${s.tp + s.fp + s.tn + s.fn} prompts)`
      );
    }
    console.log("╚══════════════════════════════════════════════════════════════════╝\n");

    if (mismatches.length > 0) {
      console.log(`── Mismatches (${mismatches.length}) ──`);
      for (const line of mismatches) console.log(line);
    }
    if (mustNotTriggerViolations.length > 0) {
      console.log(
        `\n── HARD failures: mustNotTrigger violations (${mustNotTriggerViolations.length}) ──`
      );
      for (const line of mustNotTriggerViolations) console.log(line);
    }

    expect(
      mustNotTriggerViolations,
      `${mustNotTriggerViolations.length} mustNotTrigger boundary case(s) violated`
    ).toEqual([]);

    for (const { name, minAccuracy } of PRE_PROCESSORS) {
      const acc = accuracy(stats.get(name)!);
      expect(
        acc,
        `${name} accuracy ${(acc * 100).toFixed(1)}% is below minimum ${(minAccuracy * 100).toFixed(0)}%`
      ).toBeGreaterThanOrEqual(minAccuracy);
    }
  });
});
