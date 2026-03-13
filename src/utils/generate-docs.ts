import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const includeCodeRe = /^\{@includeCode\s+(\S+?)(?:#(\S+))?\s*\}$/;
const regionMarkerRe = /^\s*\/\/\s*#(?:region|endregion)\b.*$/;

interface GenerateDocsOptions {
  /** Source directory containing markdown files (default: "documents") */
  srcDir?: string;
  /** Output directory for generated docs (default: "docs") */
  outDir?: string;
  /** GitHub base URL for source links (e.g. "https://github.com/org/repo/blob/main/") */
  githubBase?: string;
}

function resolveGithubBase(cwd: string): string {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return "";

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const url: string | undefined =
    typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;

  if (!url) return "";

  const cleaned = url.replace(/^git\+/, "").replace(/\.git$/, "");
  return `${cleaned}/blob/main/`;
}

export function generateDocs(options: GenerateDocsOptions = {}): void {
  const cwd = process.cwd();
  const srcDir = options.srcDir ?? "documents";
  const outDir = options.outDir ?? "docs";
  const githubBase = options.githubBase ?? resolveGithubBase(cwd);

  const docsOut = join(outDir, srcDir);

  let warnings = 0;
  function warn(msg: string) {
    console.warn(`  warn: ${msg}`);
    warnings++;
  }

  // --- File and region helpers ---

  const fileCache = new Map<string, string[] | null>();
  function readLines(filePath: string): string[] | null {
    if (fileCache.has(filePath)) return fileCache.get(filePath)!;
    if (!existsSync(filePath)) {
      fileCache.set(filePath, null);
      return null;
    }
    const lines = readFileSync(filePath, "utf8").split("\n");
    fileCache.set(filePath, lines);
    return lines;
  }

  function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function extractRegion(
    filePath: string,
    region: string | null
  ): { content: string[]; startLine: number; endLine: number } | null {
    const lines = readLines(filePath);
    if (!lines) {
      warn(`source file not found: ${filePath}`);
      return null;
    }
    if (!region) {
      const content = lines.filter((l) => !regionMarkerRe.test(l));
      return { content, startLine: 1, endLine: lines.length };
    }
    const escaped = escapeRegExp(region);
    const startRe = new RegExp(`^//\\s*#region\\s+${escaped}$`);
    const endRe = new RegExp(`^//\\s*#endregion\\s+${escaped}$`);
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (start === -1 && startRe.test(trimmed)) {
        start = i;
      } else if (start !== -1 && endRe.test(trimmed)) {
        const content = lines.slice(start + 1, i).filter((l) => !regionMarkerRe.test(l));
        return { content, startLine: start + 2, endLine: i };
      }
    }
    warn(`region "${region}" not found in ${filePath}`);
    return null;
  }

  function langFromExt(filePath: string) {
    const ext = extname(filePath).slice(1);
    return ext || "text";
  }

  // --- Collect source files ---

  function collectFiles(dir: string, ext: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...collectFiles(full, ext));
      else if (entry.name.endsWith(ext)) files.push(full);
    }
    return files;
  }

  // --- Generate ---

  if (existsSync(outDir)) rmSync(outDir, { recursive: true });

  for (const srcFile of collectFiles(srcDir, ".md")) {
    const outFile = join(outDir, srcFile);
    mkdirSync(dirname(outFile), { recursive: true });

    const srcLines = readFileSync(srcFile, "utf8").split("\n");
    const out: string[] = [];

    for (const line of srcLines) {
      const m = line.match(includeCodeRe);
      if (!m) {
        out.push(line);
        continue;
      }

      const refPath = relative(".", resolve(dirname(srcFile), m[1]));
      const region = m[2] || null;
      const extracted = extractRegion(refPath, region);

      if (!extracted) {
        out.push(line);
        continue;
      }

      const lang = langFromExt(refPath);
      out.push(`\`\`\`${lang}`);
      out.push(...extracted.content);
      out.push("```");

      if (githubBase) {
        const fragment = region ? `#L${extracted.startLine}-L${extracted.endLine}` : "";
        out.push(`\n[${refPath}](${githubBase}${refPath}${fragment})`);
      }
    }

    writeFileSync(outFile, out.join("\n"));
  }

  // Copy README into docs output.
  if (existsSync("README.md")) {
    mkdirSync(docsOut, { recursive: true });
    copyFileSync("README.md", join(docsOut, "index.md"));
  }

  // Copy _meta.js navigation files.
  for (const src of collectFiles(srcDir, "_meta.js")) {
    const dest = join(outDir, src);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }

  if (warnings > 0) {
    console.warn(`\n${warnings} warning(s) during doc generation`);
    process.exitCode = 1;
  }
}
