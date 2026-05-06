import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { cwd } from 'node:process';
import { cruise } from 'dependency-cruiser';
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';
import extractTSConfig from 'dependency-cruiser/config-utl/extract-ts-config';

export interface AnalyzeOptions {
  path: string;
  output?: string;
  config?: string;
}

export async function analyze(options: AnalyzeOptions): Promise<string> {
  const { path: analyzePath, output, config } = options;

  // Resolve absolute path
  const absAnalyzePath = resolve(cwd(), analyzePath);
  const outputPath = output || resolve(cwd(), `${basename(absAnalyzePath)}-graph.json`);

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
    configPath = resolve(absAnalyzePath, '.dependency-cruiser.json');
    if (!existsSync(configPath)) {
      configPath = resolve(absAnalyzePath, '.dependency-cruiser.js');
    }
    if (!existsSync(configPath)) {
      configPath = resolve(cwd(), '.dependency-cruiser.json');
    }
    if (!existsSync(configPath)) {
      configPath = resolve(cwd(), '.dependency-cruiser.js');
    }
  }

  // Extract cruise options from config
  let cruiseOptions: Record<string, unknown> = {
    outputType: 'json',
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
  const tsConfigPath = resolve(absAnalyzePath, 'tsconfig.json');
  const transpilerOptions: { tsConfig?: object } = {};

  if (existsSync(tsConfigPath)) {
    console.log(`Using tsconfig: ${tsConfigPath}`);
    try {
      transpilerOptions.tsConfig = extractTSConfig(tsConfigPath);
    } catch (e) {
      console.warn(`Failed to extract tsconfig from ${tsConfigPath}:`, e);
    }
  }

  console.log(`Analyzing: ${absAnalyzePath}`);

  // Run dependency-cruiser via API
  const cruiseResult = await cruise(
    [absAnalyzePath],
    cruiseOptions,
    undefined, // resolveOptions (webpack)
    transpilerOptions
  );

  if (!cruiseResult.output) {
    console.error('dependency-cruiser did not produce output');
    process.exit(1);
  }

  // Save raw dependency-cruiser output (conversion is deferred to server/frontend)
  const rawOutput =
    typeof cruiseResult.output === 'string'
      ? cruiseResult.output
      : JSON.stringify(cruiseResult.output, null, 2);

  writeFileSync(outputPath, rawOutput);
  console.log(`Graph written to: ${outputPath}`);

  return outputPath;
}

export default analyze;
