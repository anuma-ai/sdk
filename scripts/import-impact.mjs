#!/usr/bin/env node

import { execSync } from "child_process";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const __dirname = dirname(fileURLToPath(import.meta.url));
const SDK_ROOT = resolve(__dirname, "..");

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { changed: [], apps: [], output: "" };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--changed" && args[i + 1]) {
      result.changed = args[++i].split(",").filter(Boolean);
    } else if (args[i] === "--apps" && args[i + 1]) {
      result.apps = args[++i].split(",").filter(Boolean);
    } else if (args[i] === "--output" && args[i + 1]) {
      result.output = args[++i];
    }
  }

  return result;
}

function getEntryPoints() {
  const pkg = JSON.parse(readFileSync(join(SDK_ROOT, "package.json"), "utf8"));
  const entryPoints = {};

  for (const [subpath, config] of Object.entries(pkg.exports)) {
    const typesPath = config.types;
    if (!typesPath) continue;

    const srcPath = typesPath.replace("./dist/", "src/").replace(".d.ts", ".ts");
    entryPoints[subpath] = srcPath;
  }

  return entryPoints;
}

function buildDependencyGraph() {
  const raw = execSync("pnpm depcruise src --config .dependency-cruiser.cjs --output-type json", {
    cwd: SDK_ROOT,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });

  const { modules } = JSON.parse(raw);

  const graph = {};

  for (const mod of modules) {
    graph[mod.source] = (mod.dependencies || []).map((d) => d.resolved).filter(Boolean);
  }

  return graph;
}

function getTransitiveDeps(graph, start) {
  const visited = new Set();
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    for (const dep of graph[current] || []) {
      if (!visited.has(dep)) queue.push(dep);
    }
  }

  return visited;
}

function buildSymbolMap(entryPoints) {
  const configPath = resolve(SDK_ROOT, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, SDK_ROOT);

  const program = ts.createProgram(
    Object.values(entryPoints).map((p) => resolve(SDK_ROOT, p)),
    { ...parsedConfig.options, skipLibCheck: true }
  );
  const checker = program.getTypeChecker();

  const symbolMap = {};

  for (const [subpath, srcPath] of Object.entries(entryPoints)) {
    const sourceFile = program.getSourceFile(resolve(SDK_ROOT, srcPath));
    if (!sourceFile) {
      console.warn(
        `[import-impact] Could not resolve source for entry point "${subpath}" (looked for ${srcPath}) — skipping`
      );
      continue;
    }

    const fileSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!fileSymbol) continue;

    symbolMap[subpath] = {};
    const exports = checker.getExportsOfModule(fileSymbol);

    for (const exp of exports) {
      let resolved = exp;
      if (resolved.flags & ts.SymbolFlags.Alias) {
        try {
          resolved = checker.getAliasedSymbol(resolved);
        } catch {
          continue;
        }
      }

      const decls = resolved.getDeclarations?.();
      if (!decls?.length) continue;

      const declFile = decls[0].getSourceFile().fileName;

      if (!declFile.startsWith(SDK_ROOT)) continue;

      symbolMap[subpath][exp.getName()] = relative(SDK_ROOT, declFile);
    }
  }

  return symbolMap;
}

function parseConsumerImports(appPath) {
  const imports = {};

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (
        ["node_modules", ".next", ".expo", "dist", ".git", "build", ".turbo"].includes(entry.name)
      )
        continue;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) continue;

      let content;
      try {
        content = readFileSync(fullPath, "utf8");
      } catch {
        continue;
      }

      const namedRegex =
        /import\s+(?:type\s+)?(?:\w+\s*,\s*)?{([^}]+)}\s+from\s+['"]@anuma\/sdk([^'"]*)['"]/g;
      let match;

      while ((match = namedRegex.exec(content)) !== null) {
        const symbols = match[1]
          .split(",")
          .map((s) =>
            s
              .trim()
              .split(/\s+as\s+/)[0]
              .trim()
          )
          .filter(Boolean);
        const subpath = match[2] ? `.${match[2]}` : ".";

        if (!imports[subpath]) imports[subpath] = new Set();
        for (const sym of symbols) {
          imports[subpath].add(sym);
        }
      }

      const wildcardRegex =
        /import\s+(?:type\s+)?\*\s+as\s+\w+\s+from\s+['"]@anuma\/sdk([^'"]*)['"]/g;
      while ((match = wildcardRegex.exec(content)) !== null) {
        const subpath = match[1] ? `.${match[1]}` : ".";
        if (!imports[subpath]) imports[subpath] = new Set();
        imports[subpath].add("*");
      }

      const defaultImportRegex =
        /import\s+(?!type\s+\*|type\s+{|\*|{)(\w+)\s+from\s+['"]@anuma\/sdk([^'"]*)['"]/g;
      while ((match = defaultImportRegex.exec(content)) !== null) {
        const subpath = match[2] ? `.${match[2]}` : ".";
        if (!imports[subpath]) imports[subpath] = new Set();
        imports[subpath].add("*");
      }
    }
  }

  walk(appPath);
  return imports;
}

function findAffectedSymbols(changedFiles, symbolMap, graph) {
  const depsCache = {};

  function getDeps(file) {
    if (!depsCache[file]) {
      depsCache[file] = getTransitiveDeps(graph, file);
    }
    return depsCache[file];
  }

  const affected = {};

  for (const [subpath, symbols] of Object.entries(symbolMap)) {
    for (const [symbolName, declaringFile] of Object.entries(symbols)) {
      const deps = getDeps(declaringFile);

      for (const changed of changedFiles) {
        if (deps.has(changed)) {
          if (!affected[subpath]) affected[subpath] = new Set();
          affected[subpath].add(symbolName);
          break;
        }
      }
    }
  }

  return affected;
}

function generateMarkdown(results, changedFiles) {
  const lines = [];

  lines.push("| App | Symbols used | Impacted |");
  lines.push("|-----|-------------|----------|");

  for (const r of results) {
    const icon = r.impactedSymbols.length > 0 ? "⚠️ Yes" : "✅ No";
    lines.push(
      `| ${r.app} | ${r.totalSymbols} across ${r.entryPointsUsed.length} entry points | ${icon} |`
    );
  }

  const impacted = results.filter((r) => r.impactedSymbols.length > 0);

  if (impacted.length > 0) {
    lines.push("");
    lines.push("#### Impact details");

    for (const r of impacted) {
      lines.push("");
      lines.push(`**${r.app}**`);

      const byEntryPoint = {};
      for (const { subpath, symbol } of r.impactedSymbols) {
        if (!byEntryPoint[subpath]) byEntryPoint[subpath] = [];
        byEntryPoint[subpath].push(symbol);
      }

      lines.push("");
      for (const [ep, syms] of Object.entries(byEntryPoint)) {
        const importPath = ep === "." ? "@anuma/sdk" : `@anuma/sdk${ep.slice(1)}`;
        lines.push(`- \`${importPath}\`: ${syms.map((s) => `\`${s}\``).join(", ")}`);
      }
    }
  }

  if (changedFiles.length > 0 && changedFiles.length <= 20) {
    lines.push("");
    lines.push(`<details><summary>Changed SDK files (${changedFiles.length})</summary>`);
    lines.push("");
    for (const f of changedFiles) {
      lines.push(`- \`${f}\``);
    }
    lines.push("");
    lines.push("</details>");
  }

  return lines.join("\n");
}

function main() {
  const { changed, apps, output } = parseArgs();

  if (changed.length === 0) {
    console.log("No changed files provided.");
    process.exit(0);
  }

  if (apps.length === 0) {
    console.log("No consumer apps provided.");
    process.exit(0);
  }

  const srcChanged = changed.filter((f) => f.startsWith("src/"));
  if (srcChanged.length === 0) {
    const md = "No SDK source files changed — no import impact to analyze.";
    if (output) writeFileSync(output, md);
    else console.log(md);
    process.exit(0);
  }

  const entryPoints = getEntryPoints();
  const graph = buildDependencyGraph();
  const symbolMap = buildSymbolMap(entryPoints);
  const affected = findAffectedSymbols(srcChanged, symbolMap, graph);

  const results = [];

  for (const appPath of apps) {
    const appName = appPath.split("/").pop();
    const consumerImports = parseConsumerImports(appPath);

    let totalSymbols = 0;
    for (const syms of Object.values(consumerImports)) {
      for (const sym of syms) {
        if (sym !== "*") totalSymbols++;
      }
    }

    const impactedSymbols = [];
    for (const [subpath, affectedSyms] of Object.entries(affected)) {
      const appSyms = consumerImports[subpath];
      if (!appSyms) continue;

      const usesAll = appSyms.has("*");
      for (const sym of affectedSyms) {
        if (usesAll || appSyms.has(sym)) {
          impactedSymbols.push({ subpath, symbol: sym });
        }
      }
    }

    results.push({
      app: appName,
      totalSymbols,
      entryPointsUsed: Object.keys(consumerImports),
      impactedSymbols,
    });
  }

  const md = generateMarkdown(results, srcChanged);

  if (output) {
    writeFileSync(output, md);
    console.log(`Report written to ${output}`);
  } else {
    console.log(md);
  }
}

main();
