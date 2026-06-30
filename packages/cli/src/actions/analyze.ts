import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

import { cruise, type ICruiseOptions } from 'dependency-cruiser';
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';
import extractTSConfig from 'dependency-cruiser/config-utl/extract-ts-config';

import { parseStorageDir } from '../utils/storage.js';

export interface AnalyzeOptions {
  path: string;
  output?: string;
  config?: string;
  /** Workspace root directory (default ".") */
  cwd?: string;
  /** Storage root directory (default ".dc-reporter") */
  storageDir?: string;
}

export async function analyze(options: AnalyzeOptions): Promise<string> {
  const { path: analyzePath, output, config, cwd: workspaceRoot = '.' } = options;
  const absCwd = resolve(workspaceRoot);

  // Resolve storage directory
  const storageDir = options.storageDir || '.dc-reporter';
  const absStorageDir = parseStorageDir(storageDir, absCwd);

  // Resolve absolute path
  const absAnalyzePath = resolve(absCwd, analyzePath);
  const outputPath =
    output || resolve(absStorageDir, 'scans', `${basename(absAnalyzePath)}-graph.json`);

  // Ensure output directory exists
  const parentDir = dirname(outputPath);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  // Find dependency-cruiser config
  const CONFIG_NAMES = [
    '.dependency-cruiser.json',
    '.dependency-cruiser.js',
    '.dependency-cruiser.cjs',
    '.dependency-cruiser.mjs',
  ];
  let configPath: string | undefined;
  if (config) {
    configPath = resolve(absCwd, config);
  } else {
    for (const name of CONFIG_NAMES) {
      const candidate = resolve(absAnalyzePath, name);
      if (existsSync(candidate)) {
        configPath = candidate;
        break;
      }
    }
    if (!configPath) {
      for (const name of CONFIG_NAMES) {
        const candidate = resolve(absCwd, name);
        if (existsSync(candidate)) {
          configPath = candidate;
          break;
        }
      }
    }
  }

  // Extract cruise options from config
  let cruiseOptions: ICruiseOptions = {
    outputType: 'json',
    baseDir: absCwd,
    skipAnalysisNotInRules: false,
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

  // Safety net: always exclude node_modules if no exclude was loaded from config
  if (!cruiseOptions.exclude) {
    cruiseOptions.exclude = { path: 'node_modules' };
  }

  // Find and extract tsconfig.json for TypeScript support
  const tsConfigPath = cruiseOptions.tsConfig?.fileName
    ? cruiseOptions.tsConfig.fileName
    : resolve(absAnalyzePath, 'tsconfig.json');
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
  const startAt = Date.now();
  const relativeAnalyzePath = relative(
    String(cruiseOptions.baseDir ?? process.cwd()),
    absAnalyzePath,
  );

  // Run dependency-cruiser via API
  const cruiseResult = await cruise(
    [relativeAnalyzePath],
    cruiseOptions,
    undefined, // resolveOptions (webpack)
    transpilerOptions,
  );

  if (!cruiseResult.output) {
    throw new Error('dependency-cruiser did not produce output');
  }

  // Save raw dependency-cruiser output (conversion is deferred to server/frontend)
  const rawOutput =
    typeof cruiseResult.output === 'string'
      ? cruiseResult.output
      : JSON.stringify(cruiseResult.output, null, 2);

  writeFileSync(outputPath, rawOutput);
  const duration = Math.round((Date.now() - startAt) / 1000);
  console.log(`Graph written to: ${outputPath}, takes ${duration} s`);

  return outputPath;
}
