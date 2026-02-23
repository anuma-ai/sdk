import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const entryPoints = [
  { name: "reverbia-sdk", dtsPath: "dist/index.d.ts" },
  { name: "reverbia-sdk-react", dtsPath: "dist/react/index.d.ts" },
  { name: "reverbia-sdk-expo", dtsPath: "dist/expo/index.d.ts" },
  { name: "reverbia-sdk-polyfills", dtsPath: "dist/polyfills/index.d.ts" },
  { name: "reverbia-sdk-vercel", dtsPath: "dist/vercel/index.d.ts" },
  { name: "reverbia-sdk-next", dtsPath: "dist/next/index.d.ts" },
  { name: "reverbia-sdk-tools", dtsPath: "dist/tools/index.d.ts" },
];

const localBuild = process.argv.includes("--local");
let hasErrors = false;

for (const { name, dtsPath } of entryPoints) {
  console.log(`\n=== Extracting API for: ${name} ===`);

  const configPath = path.resolve(projectRoot, "api-extractor.base.json");
  const configObject = ExtractorConfig.loadFile(configPath);

  configObject.mainEntryPointFilePath = path.resolve(projectRoot, dtsPath);
  configObject.apiReport.reportFileName = `${name}.api.md`;
  configObject.docModel.apiJsonFilePath = path.resolve(projectRoot, `etc/${name}.api.json`);

  const extractorConfig = ExtractorConfig.prepare({
    configObject,
    configObjectFullPath: configPath,
    packageJsonFullPath: path.resolve(projectRoot, "package.json"),
  });

  const result = Extractor.invoke(extractorConfig, {
    localBuild,
    showVerboseMessages: false,
  });

  if (!result.succeeded) {
    console.error(`API Extractor failed for ${name}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log("\nAll API reports generated successfully.");
