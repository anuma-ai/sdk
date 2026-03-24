/**
 * Vault Benchmark Dataset
 *
 * ~80 realistic vault memories across Personal, Work, and Interests folders,
 * plus ~60 queries spanning five retrieval challenge categories.
 *
 * Categories:
 *   1. direct    — straightforward recall, query closely matches stored content
 *   2. paraphrase — query uses completely different wording than the memory
 *   3. specificity — multiple similar memories compete, only one is correct
 *   4. temporal   — an older memory was superseded by a newer one
 *   5. composite  — answer requires surfacing multiple related memories
 */

export interface VaultMemoryEntry {
  id: string;
  content: string;
  folder: "Personal" | "Work" | "Interests" | null;
  /** ISO timestamp — used for temporal tests where recency matters */
  createdAt: string;
}

export interface BenchmarkQuery {
  query: string;
  category: "direct" | "paraphrase" | "specificity" | "temporal" | "composite";
  /** Memory IDs that MUST appear in the top-k results */
  expectedIds: string[];
  /** Memory IDs that must NOT rank above any expectedIds entry */
  mustNotRankAbove?: string[];
  k: number;
}

// ---------------------------------------------------------------------------
// Vault memories
// ---------------------------------------------------------------------------

export const VAULT_MEMORIES: VaultMemoryEntry[] = [
  // ── Personal (20) ──────────────────────────────────────────────────────
  {
    id: "p01",
    content: "My name is Alex Chen",
    folder: "Personal",
    createdAt: "2025-12-01T10:00:00Z",
  },
  {
    id: "p02",
    content: "Born on March 15, 1992",
    folder: "Personal",
    createdAt: "2025-12-01T10:01:00Z",
  },
  {
    id: "p03",
    content: "Lives in San Francisco, works remotely three days a week",
    folder: "Personal",
    createdAt: "2025-12-01T10:02:00Z",
  },
  {
    id: "p04",
    content: "Prefers dark mode in all editors and terminals",
    folder: "Personal",
    createdAt: "2025-12-01T10:03:00Z",
  },
  {
    id: "p05",
    content: "Uses vim keybindings everywhere — VS Code, IntelliJ, browser",
    folder: "Personal",
    createdAt: "2025-12-01T10:04:00Z",
  },
  {
    id: "p06",
    content: "Morning person, most productive between 7am and 10am",
    folder: "Personal",
    createdAt: "2025-12-01T10:05:00Z",
  },
  {
    id: "p07",
    content: "Dyslexic — appreciates clear visual hierarchy and large fonts in docs",
    folder: "Personal",
    createdAt: "2025-12-01T10:06:00Z",
  },
  {
    id: "p08",
    content: "Allergic to shellfish",
    folder: "Personal",
    createdAt: "2025-12-01T10:07:00Z",
  },
  {
    id: "p09",
    content: "Has a golden retriever named Biscuit",
    folder: "Personal",
    createdAt: "2025-12-01T10:08:00Z",
  },
  {
    id: "p10",
    content: "Partner's name is Jordan, they are an architect",
    folder: "Personal",
    createdAt: "2025-12-01T10:09:00Z",
  },
  {
    id: "p11",
    content: "Prefers async communication over meetings — Slack threads over calls",
    folder: "Personal",
    createdAt: "2025-12-01T10:10:00Z",
  },
  {
    id: "p12",
    content: "Drinks oat milk lattes, no coffee after 2pm",
    folder: "Personal",
    createdAt: "2025-12-01T10:11:00Z",
  },
  {
    id: "p13",
    content: "Speaks English and Mandarin fluently, learning Japanese",
    folder: "Personal",
    createdAt: "2025-12-01T10:12:00Z",
  },
  {
    id: "p14",
    content: "Uses a standing desk and takes a walk every 90 minutes",
    folder: "Personal",
    createdAt: "2025-12-01T10:13:00Z",
  },
  {
    id: "p15",
    content: "Favorite book is Designing Data-Intensive Applications by Martin Kleppmann",
    folder: "Personal",
    createdAt: "2025-12-01T10:14:00Z",
  },
  {
    id: "p16",
    content: "Uses 1Password for password management",
    folder: "Personal",
    createdAt: "2025-12-01T10:15:00Z",
  },
  {
    id: "p17",
    content: "Prefers tabs over spaces, 2-space width",
    folder: "Personal",
    createdAt: "2025-12-01T10:16:00Z",
  },
  {
    id: "p18",
    content: "Email is alex@example.com, prefers Slack for work comms",
    folder: "Personal",
    createdAt: "2025-12-01T10:17:00Z",
  },
  // Temporal pair: moved cities
  {
    id: "p19",
    content: "Lives in Portland, Oregon",
    folder: "Personal",
    createdAt: "2025-06-01T10:00:00Z",
  },
  {
    id: "p20",
    content: "Relocated from Portland to San Francisco in November 2025",
    folder: "Personal",
    createdAt: "2025-11-15T10:00:00Z",
  },

  // ── Work (36) ──────────────────────────────────────────────────────────
  {
    id: "w01",
    content: "Senior backend engineer at Nimbus Labs, joined in 2023",
    folder: "Work",
    createdAt: "2025-12-01T10:00:00Z",
  },
  {
    id: "w02",
    content: "Primary language is TypeScript, also writes Go for performance-critical services",
    folder: "Work",
    createdAt: "2025-12-01T10:01:00Z",
  },
  {
    id: "w03",
    content: "Uses PostgreSQL 15 with read replicas for the main product database",
    folder: "Work",
    createdAt: "2025-12-01T10:02:00Z",
  },
  {
    id: "w04",
    content: "Redis is used for session caching and rate limiting",
    folder: "Work",
    createdAt: "2025-12-01T10:03:00Z",
  },
  {
    id: "w05",
    content: "API latency target is under 100ms at p99",
    folder: "Work",
    createdAt: "2025-12-01T10:04:00Z",
  },
  {
    id: "w06",
    content: "Uses Docker for local development, Kubernetes in production",
    folder: "Work",
    createdAt: "2025-12-01T10:05:00Z",
  },
  {
    id: "w07",
    content: "CI/CD runs on GitHub Actions with a 15-minute timeout",
    folder: "Work",
    createdAt: "2025-12-01T10:06:00Z",
  },
  {
    id: "w08",
    content: "Deploys to AWS us-west-2 region, with disaster recovery in us-east-1",
    folder: "Work",
    createdAt: "2025-12-01T10:07:00Z",
  },
  {
    id: "w09",
    content: "Uses Terraform for infrastructure, Terragrunt for environment separation",
    folder: "Work",
    createdAt: "2025-12-01T10:08:00Z",
  },
  {
    id: "w10",
    content: "Monitoring stack is Datadog for metrics and PagerDuty for alerting",
    folder: "Work",
    createdAt: "2025-12-01T10:09:00Z",
  },
  {
    id: "w11",
    content: "Error tracking uses Sentry with a 1% sample rate in production",
    folder: "Work",
    createdAt: "2025-12-01T10:10:00Z",
  },
  {
    id: "w12",
    content: "Team uses trunk-based development — short-lived feature branches merged daily",
    folder: "Work",
    createdAt: "2025-12-01T10:11:00Z",
  },
  {
    id: "w13",
    content: "Code reviews require at least one approval before merge",
    folder: "Work",
    createdAt: "2025-12-01T10:12:00Z",
  },
  {
    id: "w14",
    content: "Uses Prisma as the ORM for TypeScript services",
    folder: "Work",
    createdAt: "2025-12-01T10:13:00Z",
  },
  {
    id: "w15",
    content: "REST API for external clients, gRPC for internal service-to-service communication",
    folder: "Work",
    createdAt: "2025-12-01T10:14:00Z",
  },
  {
    id: "w16",
    content: "Auth uses JWTs with 15-minute access tokens and 7-day refresh tokens",
    folder: "Work",
    createdAt: "2025-12-01T10:15:00Z",
  },
  {
    id: "w17",
    content: "Feature flags managed through LaunchDarkly",
    folder: "Work",
    createdAt: "2025-12-01T10:16:00Z",
  },
  {
    id: "w18",
    content: "BigQuery is used for analytics and data warehouse queries",
    folder: "Work",
    createdAt: "2025-12-01T10:17:00Z",
  },
  {
    id: "w19",
    content:
      "Testing philosophy: integration tests for critical paths, unit tests for business logic",
    folder: "Work",
    createdAt: "2025-12-01T10:18:00Z",
  },
  {
    id: "w20",
    content: "Uses vitest for unit tests and Playwright for end-to-end tests",
    folder: "Work",
    createdAt: "2025-12-01T10:19:00Z",
  },
  {
    id: "w21",
    content: "S3 for file storage with CloudFront CDN in front",
    folder: "Work",
    createdAt: "2025-12-01T10:20:00Z",
  },
  {
    id: "w22",
    content: "Database migrations managed by Prisma Migrate, run in CI before deploy",
    folder: "Work",
    createdAt: "2025-12-01T10:21:00Z",
  },
  {
    id: "w23",
    content: "On-call rotation is weekly, team of 5 engineers",
    folder: "Work",
    createdAt: "2025-12-01T10:22:00Z",
  },
  {
    id: "w24",
    content: "Sprint cycles are 2 weeks, planning on Mondays",
    folder: "Work",
    createdAt: "2025-12-01T10:23:00Z",
  },
  {
    id: "w25",
    content: "Uses Linear for issue tracking and project management",
    folder: "Work",
    createdAt: "2025-12-01T10:24:00Z",
  },
  {
    id: "w26",
    content: "Logging uses structured JSON logs shipped to Datadog via Fluentd",
    folder: "Work",
    createdAt: "2025-12-01T10:25:00Z",
  },
  {
    id: "w27",
    content: "Rate limiting is 100 requests per second per API key",
    folder: "Work",
    createdAt: "2025-12-01T10:26:00Z",
  },
  {
    id: "w28",
    content: "GraphQL is NOT used — team decided REST is simpler for their use case",
    folder: "Work",
    createdAt: "2025-12-01T10:27:00Z",
  },
  {
    id: "w29",
    content: "Node.js services run on version 20 LTS",
    folder: "Work",
    createdAt: "2025-12-01T10:28:00Z",
  },
  {
    id: "w30",
    content: "Secrets managed through AWS Secrets Manager, rotated quarterly",
    folder: "Work",
    createdAt: "2025-12-01T10:29:00Z",
  },
  // Temporal pair: switched state management
  {
    id: "w31",
    content: "Frontend state management uses Redux with Redux Toolkit",
    folder: "Work",
    createdAt: "2025-03-01T10:00:00Z",
  },
  {
    id: "w32",
    content: "Migrated from Redux to Zustand in Q3 2025 for simpler state management",
    folder: "Work",
    createdAt: "2025-09-15T10:00:00Z",
  },
  // Temporal pair: switched testing framework
  {
    id: "w33",
    content: "End-to-end tests use Cypress with Chrome-only testing",
    folder: "Work",
    createdAt: "2025-01-01T10:00:00Z",
  },
  {
    id: "w34",
    content: "Replaced Cypress with Playwright in August 2025 for cross-browser support",
    folder: "Work",
    createdAt: "2025-08-10T10:00:00Z",
  },
  // Temporal pair: changed deploy cadence
  {
    id: "w35",
    content: "Deploys happen weekly on Thursdays after QA sign-off",
    folder: "Work",
    createdAt: "2025-02-01T10:00:00Z",
  },
  {
    id: "w36",
    content: "Switched to continuous deployment in October 2025 — every merged PR auto-deploys",
    folder: "Work",
    createdAt: "2025-10-01T10:00:00Z",
  },

  // ── Interests (15) ─────────────────────────────────────────────────────
  {
    id: "i01",
    content: "Learning Rust for systems programming and WebAssembly",
    folder: "Interests",
    createdAt: "2025-12-01T10:00:00Z",
  },
  {
    id: "i02",
    content: "Runs a home lab with a 3-node Kubernetes cluster on Intel NUCs",
    folder: "Interests",
    createdAt: "2025-12-01T10:01:00Z",
  },
  {
    id: "i03",
    content: "Interested in distributed systems and consensus algorithms like Raft",
    folder: "Interests",
    createdAt: "2025-12-01T10:02:00Z",
  },
  {
    id: "i04",
    content: "Follows the TypeScript and Deno ecosystems closely",
    folder: "Interests",
    createdAt: "2025-12-01T10:03:00Z",
  },
  {
    id: "i05",
    content: "Plays chess online — rated around 1600 ELO on Lichess",
    folder: "Interests",
    createdAt: "2025-12-01T10:04:00Z",
  },
  {
    id: "i06",
    content: "Enjoys hiking in Marin County on weekends",
    folder: "Interests",
    createdAt: "2025-12-01T10:05:00Z",
  },
  {
    id: "i07",
    content: "Reading through the MIT 6.824 distributed systems course materials",
    folder: "Interests",
    createdAt: "2025-12-01T10:06:00Z",
  },
  {
    id: "i08",
    content: "Interested in local-first software and CRDTs",
    folder: "Interests",
    createdAt: "2025-12-01T10:07:00Z",
  },
  {
    id: "i09",
    content: "Follows AI/ML developments, especially on-device inference and small language models",
    folder: "Interests",
    createdAt: "2025-12-01T10:08:00Z",
  },
  {
    id: "i10",
    content: "Wants to build a personal knowledge management tool someday",
    folder: "Interests",
    createdAt: "2025-12-01T10:09:00Z",
  },
  {
    id: "i11",
    content: "Fan of mechanical keyboards, currently using a Keychron Q1 with tactile switches",
    folder: "Interests",
    createdAt: "2025-12-01T10:10:00Z",
  },
  {
    id: "i12",
    content: "Listens to lo-fi hip hop and jazz while coding",
    folder: "Interests",
    createdAt: "2025-12-01T10:11:00Z",
  },
  {
    id: "i13",
    content: "Maintains a small open-source CLI tool for JSON schema validation",
    folder: "Interests",
    createdAt: "2025-12-01T10:12:00Z",
  },
  {
    id: "i14",
    content: "Interested in WebGPU and GPU-accelerated web applications",
    folder: "Interests",
    createdAt: "2025-12-01T10:13:00Z",
  },
  {
    id: "i15",
    content: "Prefers podcasts over video — favorites are Changelog and Software Engineering Daily",
    folder: "Interests",
    createdAt: "2025-12-01T10:14:00Z",
  },

  // ── Unfiled (8) ────────────────────────────────────────────────────────
  {
    id: "u01",
    content: "Dislikes meeting invites without agendas — will decline them",
    folder: null,
    createdAt: "2025-12-01T10:00:00Z",
  },
  {
    id: "u02",
    content: "Prefers bullet-point summaries over long paragraphs",
    folder: null,
    createdAt: "2025-12-01T10:01:00Z",
  },
  {
    id: "u03",
    content: "Timezone is US Pacific (PT)",
    folder: null,
    createdAt: "2025-12-01T10:02:00Z",
  },
  {
    id: "u04",
    content: "Has a secondary monitor in portrait mode for reading docs",
    folder: null,
    createdAt: "2025-12-01T10:03:00Z",
  },
  {
    id: "u05",
    content: "Prefers explicit error handling over try-catch-swallow patterns",
    folder: null,
    createdAt: "2025-12-01T10:04:00Z",
  },
  {
    id: "u06",
    content: "Avoids ORMs for complex queries — prefers raw SQL with query builders",
    folder: null,
    createdAt: "2025-12-01T10:05:00Z",
  },
  {
    id: "u07",
    content: "Uses tmux with a custom config for terminal multiplexing",
    folder: null,
    createdAt: "2025-12-01T10:06:00Z",
  },
  {
    id: "u08",
    content: "Keeps a brag document updated quarterly for performance reviews",
    folder: null,
    createdAt: "2025-12-01T10:07:00Z",
  },
];

// ---------------------------------------------------------------------------
// Benchmark queries
// ---------------------------------------------------------------------------

export const BENCHMARK_QUERIES: BenchmarkQuery[] = [
  // ── Direct recall (12) ─────────────────────────────────────────────────
  {
    query: "What is the user's name?",
    category: "direct",
    expectedIds: ["p01"],
    k: 3,
  },
  {
    query: "What pet does the user have?",
    category: "direct",
    expectedIds: ["p09"],
    k: 3,
  },
  {
    query: "What database does the team use?",
    category: "direct",
    expectedIds: ["w03"],
    k: 3,
  },
  {
    query: "What is the API latency target?",
    category: "direct",
    expectedIds: ["w05"],
    k: 3,
  },
  {
    query: "What monitoring tools are used?",
    category: "direct",
    expectedIds: ["w10"],
    k: 3,
  },
  {
    query: "What is the user's chess rating?",
    category: "direct",
    expectedIds: ["i05"],
    k: 3,
  },
  {
    query: "What keyboard does the user use?",
    category: "direct",
    expectedIds: ["i11"],
    k: 3,
  },
  {
    query: "What is the deployment region?",
    category: "direct",
    expectedIds: ["w08"],
    k: 3,
  },
  {
    query: "What ORM does the team use?",
    category: "direct",
    expectedIds: ["w14"],
    k: 3,
  },
  {
    query: "What CI/CD platform is used?",
    category: "direct",
    expectedIds: ["w07"],
    k: 3,
  },
  {
    query: "What languages does the user speak?",
    category: "direct",
    expectedIds: ["p13"],
    k: 3,
  },
  {
    query: "What project management tool does the team use?",
    category: "direct",
    expectedIds: ["w25"],
    k: 3,
  },

  // ── Paraphrase (12) ────────────────────────────────────────────────────
  {
    query: "How does the user feel about synchronous communication?",
    category: "paraphrase",
    expectedIds: ["p11"],
    k: 3,
  },
  {
    query: "What containerization setup is used for local dev?",
    category: "paraphrase",
    expectedIds: ["w06"],
    k: 3,
  },
  {
    query: "How are infrastructure resources provisioned?",
    category: "paraphrase",
    expectedIds: ["w09"],
    k: 3,
  },
  {
    query: "What happens when someone gets paged?",
    category: "paraphrase",
    expectedIds: ["w10"],
    k: 5,
  },
  {
    query: "How does the team handle secret rotation?",
    category: "paraphrase",
    expectedIds: ["w30"],
    k: 3,
  },
  {
    query: "What branching strategy does the team follow?",
    category: "paraphrase",
    expectedIds: ["w12"],
    k: 3,
  },
  {
    query: "Does the user have any accessibility needs?",
    category: "paraphrase",
    expectedIds: ["p07"],
    k: 3,
  },
  {
    query: "What does the user do for exercise?",
    category: "paraphrase",
    expectedIds: ["i06"],
    k: 5,
  },
  {
    query: "How are application errors captured and reported?",
    category: "paraphrase",
    expectedIds: ["w11"],
    k: 3,
  },
  {
    query: "What does the user listen to while working?",
    category: "paraphrase",
    expectedIds: ["i12"],
    k: 3,
  },
  {
    query: "How does the team manage feature rollouts?",
    category: "paraphrase",
    expectedIds: ["w17"],
    k: 3,
  },
  {
    query: "What distributed computing topics interest the user?",
    category: "paraphrase",
    expectedIds: ["i03"],
    k: 5,
  },

  // ── Specificity (12) ───────────────────────────────────────────────────
  {
    query: "What database is used for real-time transactional queries?",
    category: "specificity",
    expectedIds: ["w03"],
    mustNotRankAbove: ["w18"], // BigQuery is analytics, not OLTP
    k: 3,
  },
  {
    query: "What database is used for analytics?",
    category: "specificity",
    expectedIds: ["w18"],
    mustNotRankAbove: ["w03"], // Postgres is OLTP, not analytics
    k: 3,
  },
  {
    query: "How do external clients communicate with the API?",
    category: "specificity",
    expectedIds: ["w15"],
    mustNotRankAbove: ["w28"], // GraphQL is NOT used
    k: 3,
  },
  {
    query: "What caching layer is used for sessions?",
    category: "specificity",
    expectedIds: ["w04"],
    mustNotRankAbove: ["w21"], // S3/CloudFront is file caching, not sessions
    k: 3,
  },
  {
    query: "What is the user's preferred formatting for documents?",
    category: "specificity",
    expectedIds: ["u02"],
    mustNotRankAbove: ["p07"], // dyslexia is about visual hierarchy, not formatting preference
    k: 3,
  },
  {
    query: "Where does the user hike?",
    category: "specificity",
    expectedIds: ["i06"],
    mustNotRankAbove: ["p03"], // lives in SF is location, not hiking
    k: 3,
  },
  {
    query: "What testing framework is used for unit tests?",
    category: "specificity",
    expectedIds: ["w20"],
    mustNotRankAbove: ["w33"], // Cypress was E2E, not unit
    k: 3,
  },
  {
    query: "How are logs collected and shipped?",
    category: "specificity",
    expectedIds: ["w26"],
    mustNotRankAbove: ["w10"], // Datadog metrics, not log shipping
    k: 3,
  },
  {
    query: "What rate limits apply to the API?",
    category: "specificity",
    expectedIds: ["w27"],
    mustNotRankAbove: ["w04"], // Redis does rate limiting but w27 has the actual limit
    k: 3,
  },
  {
    query: "What is the user's food allergy?",
    category: "specificity",
    expectedIds: ["p08"],
    mustNotRankAbove: ["p12"], // coffee preference is not an allergy
    k: 3,
  },
  {
    query: "What text editor keybindings does the user prefer?",
    category: "specificity",
    expectedIds: ["p05"],
    mustNotRankAbove: ["p04"], // dark mode is editor preference but not keybindings
    k: 3,
  },
  {
    query: "What open source projects does the user maintain?",
    category: "specificity",
    expectedIds: ["i13"],
    mustNotRankAbove: ["i04"], // follows TS ecosystem ≠ maintains OSS
    k: 3,
  },

  // ── Temporal / update (12) ─────────────────────────────────────────────
  {
    query: "Where does the user currently live?",
    category: "temporal",
    expectedIds: ["p20"],
    mustNotRankAbove: ["p19"], // Portland is outdated
    k: 3,
  },
  {
    query: "What city is the user based in now?",
    category: "temporal",
    expectedIds: ["p20"],
    mustNotRankAbove: ["p19"],
    k: 3,
  },
  {
    query: "What state management library does the frontend use?",
    category: "temporal",
    expectedIds: ["w32"],
    mustNotRankAbove: ["w31"], // Redux is outdated
    k: 3,
  },
  {
    query: "What is the current frontend state management approach?",
    category: "temporal",
    expectedIds: ["w32"],
    mustNotRankAbove: ["w31"],
    k: 3,
  },
  {
    query: "What E2E testing tool does the team use?",
    category: "temporal",
    expectedIds: ["w34"],
    mustNotRankAbove: ["w33"], // Cypress is outdated
    k: 3,
  },
  {
    query: "How does the team run browser tests?",
    category: "temporal",
    expectedIds: ["w34"],
    mustNotRankAbove: ["w33"],
    k: 3,
  },
  {
    query: "How often does the team deploy?",
    category: "temporal",
    expectedIds: ["w36"],
    mustNotRankAbove: ["w35"], // weekly deploys is outdated
    k: 3,
  },
  {
    query: "What is the deployment cadence?",
    category: "temporal",
    expectedIds: ["w36"],
    mustNotRankAbove: ["w35"],
    k: 3,
  },
  {
    query: "Did the user recently move?",
    category: "temporal",
    expectedIds: ["p20"],
    k: 3,
  },
  {
    query: "What testing changes happened in 2025?",
    category: "temporal",
    expectedIds: ["w34"],
    k: 5,
  },
  {
    query: "What was the old state management before the migration?",
    category: "temporal",
    expectedIds: ["w31"],
    k: 3,
  },
  {
    query: "When did the team switch to continuous deployment?",
    category: "temporal",
    expectedIds: ["w36"],
    k: 3,
  },

  // ── Composite (12) ─────────────────────────────────────────────────────
  {
    query: "Give me an overview of the user's development environment setup",
    category: "composite",
    expectedIds: ["p04", "p05", "w06"],
    k: 5,
  },
  {
    query: "What is the user's tech stack?",
    category: "composite",
    expectedIds: ["w02", "w03", "w14"],
    k: 5,
  },
  {
    query: "Summarize the user's communication preferences",
    category: "composite",
    expectedIds: ["p11", "u01"],
    k: 5,
  },
  {
    query: "What does the user's observability setup look like?",
    category: "composite",
    expectedIds: ["w10", "w11", "w26"],
    k: 5,
  },
  {
    query: "Tell me about the user's testing approach",
    category: "composite",
    expectedIds: ["w19", "w20"],
    k: 5,
  },
  {
    query: "What infrastructure and cloud services does the team use?",
    category: "composite",
    expectedIds: ["w08", "w09", "w21"],
    k: 5,
  },
  {
    query: "What are the user's hobbies and interests outside of work?",
    category: "composite",
    expectedIds: ["i05", "i06", "i12"],
    k: 5,
  },
  {
    query: "How does the team handle security?",
    category: "composite",
    expectedIds: ["w16", "w30"],
    k: 5,
  },
  {
    query: "What does the user's workspace look like?",
    category: "composite",
    expectedIds: ["p14", "u04", "i11"],
    k: 5,
  },
  {
    query: "Tell me about the user as a person",
    category: "composite",
    expectedIds: ["p01", "p03", "w01"],
    k: 5,
  },
  {
    query: "What distributed systems knowledge does the user have?",
    category: "composite",
    expectedIds: ["i03", "i07"],
    k: 5,
  },
  {
    query: "Describe the team's development workflow",
    category: "composite",
    expectedIds: ["w12", "w13", "w36"],
    k: 5,
  },
];
