#!/usr/bin/env node
import { program } from 'commander';

import { version } from '../../../../package.json';
import { analyze, archiToRules, dashboard } from '../commands';

program.name('dep-report').description('dependency-cruiser result visualizer').version(version);

program.option('--cwd <path>', 'Workspace root directory', '.');
program.option('--storage-dir <path>', 'Storage root directory', '.dc-reporter');

program
  .command('analyze')
  .description('Analyze a project directory and generate visualization')
  .option('-p, --path <dir>', 'Project directory to analyze', '.')
  .option('-o, --output <path>', 'Output graph JSON file')
  .option('-c, --config <path>', 'dependency-cruiser config file')
  .action(async (options) => {
    try {
      const cwd = program.opts().cwd;
      const storageDir = program.opts().storageDir;
      const graphFile = await analyze({
        path: options.path,
        output: options.output,
        config: options.config,
        cwd,
        storageDir,
      });
      console.log(`\nTo view the result, run:\n  dep-report dashboard -f ${graphFile}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('dashboard')
  .description('Start dashboard web viewer with HTTP server')
  .option('-f, --file <path>', 'Pre-processed graph JSON to load')
  .option('-p, --port <number>', 'Server port', '3000')
  .option('--host <host>', 'Server host', 'localhost')
  .action(async (options) => {
    const cwd = program.opts().cwd;
    const storageDir = program.opts().storageDir;
    await dashboard({
      file: options.file,
      port: Number.parseInt(options.port, 10),
      host: options.host,
      cwd,
      storageDir,
    });
  });

program
  .command('archi-to-rules')
  .description('Convert C4 architecture model to dependency-cruiser rules')
  .option('-o, --output <path>', 'Output rules JSON file path')
  .action(async (options) => {
    try {
      const cwd = program.opts().cwd;
      const storageDir = program.opts().storageDir;
      await archiToRules({
        cwd,
        output: options.output,
        storageDir,
      });
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
