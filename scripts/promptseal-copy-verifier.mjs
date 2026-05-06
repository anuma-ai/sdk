/**
 * Copy the static verifier files into `dist/promptseal/verifier/` after the
 * tsup build. The published artifact must include these — the client repo's
 * postinstall step copies them from there into Next.js's `public/` directory.
 *
 * Asserts the four expected files land where they belong; fails the build
 * if any are missing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "..", "src", "promptseal", "verifier");
const DST = path.resolve(__dirname, "..", "dist", "promptseal", "verifier");

const REQUIRED = ["index.html", "verify.js", "canonical.js", "style.css"];

fs.mkdirSync(DST, { recursive: true });

for (const file of REQUIRED) {
  const from = path.join(SRC, file);
  const to = path.join(DST, file);
  if (!fs.existsSync(from)) {
    console.error(`[promptseal] missing source verifier file: ${from}`);
    process.exit(1);
  }
  fs.copyFileSync(from, to);
  console.log(`[promptseal] copied ${file} → ${path.relative(process.cwd(), to)}`);
}

// Smoke check
for (const file of REQUIRED) {
  const dst = path.join(DST, file);
  if (!fs.existsSync(dst)) {
    console.error(`[promptseal] verifier file missing after copy: ${dst}`);
    process.exit(1);
  }
}
console.log("[promptseal] verifier files in place at", path.relative(process.cwd(), DST));
