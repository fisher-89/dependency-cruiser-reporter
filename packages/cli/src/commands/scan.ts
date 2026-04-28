import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { cwd } from "node:process";
import { cruise } from "dependency-cruiser";
import extractDepcruiseOptions from "dependency-cruiser/config-utl/extract-depcruise-options";
import extractTSConfig from "dependency-cruiser/config-utl/extract-ts-config";

export interface ScanOptions {
  path: string;
  output?: string;
  config?: string;
}

export async function scan(options: ScanOptions): Promise<string> {
  const { path: scanPath, output, config } = options;

  // Resolve absolute path
  const absScanPath = resolve(cwd(), scanPath);
  const outputPath = output || resolve(cwd(), `${basename(absScanPath)}-graph.json`);

  // Ensure output directory exists
  const parentDir = dirname(outputPath);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  // Find dependency-cruiser config
  let configPath: string | undefined;
  if (config) {
    configPath = resolve(cwd(), config);
  } else {
    configPath = resolve(absScanPath, ".dependency-cruiser.json");
    if (!existsSync(configPath)) {
      configPath = resolve(absScanPath, ".dependency-cruiser.js");
    }
    if (!existsSync(configPath)) {
      configPath = resolve(cwd(), ".dependency-cruiser.json");
    }
    if (!existsSync(configPath)) {
      configPath = resolve(cwd(), ".dependency-cruiser.js");
    }
  }

  // Extract cruise options from config
  let cruiseOptions: Record<string, unknown> = {
    outputType: "json",
  };

  if (configPath && existsSync(configPath)) {
    console.log(`Using config: ${configPath}`);
    try {
      const extractedOptions = await extractDepcruiseOptions(configPath);
      cruiseOptions = { ...extractedOptions, ...cruiseOptions };
    } catch (e) {
      console.warn(`Failed to extract config from ${configPath}:`, e);
    }
  }

  // Find and extract tsconfig.json for TypeScript support
  const tsConfigPath = resolve(absScanPath, "tsconfig.json");
  let transpilerOptions: { tsConfig?: object } = {};

  if (existsSync(tsConfigPath)) {
    console.log(`Using tsconfig: ${tsConfigPath}`);
    try {
      transpilerOptions.tsConfig = extractTSConfig(tsConfigPath);
    } catch (e) {
      console.warn(`Failed to extract tsconfig from ${tsConfigPath}:`, e);
    }
  }

  console.log(`Scanning: ${absScanPath}`);

  // Run dependency-cruiser via API
  const cruiseResult = await cruise(
    [absScanPath],
    cruiseOptions,
    undefined, // resolveOptions (webpack)
    transpilerOptions
  );

  if (!cruiseResult.output) {
    console.error("dependency-cruiser did not produce output");
    process.exit(1);
  }

  // Convert to ProcessedGraph
  const { convertDcOutput } = await import("./convert.js");
  let graph;
  try {
    // cruiseResult.output is already the parsed JSON object
    const dcJson = typeof cruiseResult.output === "string"
      ? cruiseResult.output
      : JSON.stringify(cruiseResult.output);
    graph = convertDcOutput(dcJson);
  } catch (e) {
    console.error("Failed to convert dependency-cruiser output:", e);
    process.exit(1);
  }

  writeFileSync(outputPath, JSON.stringify(graph, null, 2));
  console.log(`Graph written to: ${outputPath}`);

  return outputPath;
}

export default scan;