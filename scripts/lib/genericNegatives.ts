/**
 * Shared "generic NO" reference phrases for the classifier centroid scripts.
 *
 * Each classifier (crypto-price, stock-price, weather, plus webSearch's
 * NO_SEARCH_PHRASES separately) needs negative examples that are clearly
 * outside its domain — programming, reasoning, creative writing, math,
 * translation, conversational, personal advice. These don't change
 * per-classifier, so they live here and each script spreads them into
 * its own NO list alongside the domain-specific negatives.
 *
 * If you add a new generic category here, every classifier picks it up on
 * the next regen. Domain-specific negatives (e.g. "stock queries should
 * NOT trigger crypto") stay in the individual scripts.
 */

export const GENERIC_NEGATIVE_PHRASES: readonly string[] = [
  // General programming / engineering
  "Write a Python function that checks if a number is prime",
  "Refactor this code to use async/await",
  "Why is my React component re-rendering",
  "How do I configure a Postgres connection pool",

  // Reasoning / analysis
  "Summarize the article I pasted above",
  "What are the pros and cons of microservices",
  "Explain the differences between TCP and UDP",

  // Creative
  "Write me a short poem about the ocean",
  "Generate 5 startup name ideas",
  "Tell me a joke about programming",

  // Translation / language
  "Translate 'good morning' into Japanese",

  // Math / physics / general knowledge
  "What is the derivative of x squared",
  "Explain how gravity works",
  "What year did World War 2 end",
  "How does photosynthesis work",

  // Personal / advice
  "Help me draft a resignation letter",
  "Give me tips for a job interview",

  // Conversational
  "Hello how are you",
  "Thank you for your help",
  "Can you explain that again",
];
