import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { cwd } from "node:process";

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
  const dcRawOutput = resolve(cwd(), `${basename(absScanPath)}-deps.json`);

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
  }

  const configArg = configPath && existsSync(configPath) ? ["-c", configPath] : [];

  // Step 1: Run dependency-cruiser and write raw output to file via --output-to
  // -T json: output type json
  // --output-to: write output to file instead of stdout
  const dcArgs = [
    "dependency-cruiser",
    ...configArg,
    "-T", "json",
    "--output-to", dcRawOutput,
    absScanPath,
  ];

  console.log(`Running: npx ${dcArgs.join(" ")}`);

  const dcResult = spawnSync("npx", dcArgs, {
    cwd: cwd(),
    shell: true,
    stdio: "inherit",
  });

  if (dcResult.error) {
    console.error(`Error running dependency-cruiser: ${dcResult.error.message}`);
    process.exit(1);
  }

  if (dcResult.status !== 0) {
    console.error(`dependency-cruiser exited with code ${dcResult.status}`);
    process.exit(dcResult.status ?? 1);
  }

  if (!existsSync(dcRawOutput)) {
    console.error("dependency-cruiser did not produce output file");
    process.exit(1);
  }

  // Step 2: Read raw output and convert to ProcessedGraph
  const dcOutput = readFileSync(dcRawOutput, "utf-8");
  if (!dcOutput.trim()) {
    console.error("dependency-cruiser output is empty");
    process.exit(1);
  }

  const { convertDcOutput } = await import("./convert.js");
  let graph;
  try {
    graph = convertDcOutput(dcOutput);
  } catch (e) {
    console.error("Failed to parse dependency-cruiser output:", e);
    process.exit(1);
  }

  writeFileSync(outputPath, JSON.stringify(graph, null, 2));
  console.log(`Graph written to: ${outputPath}`);

  return outputPath;
}

export default scan;