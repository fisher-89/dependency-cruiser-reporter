#!/usr/bin/env node
import { program } from "commander";
import { scan, open } from "../dist/index.js";

program
	.name("dep-report")
	.description("dependency-cruiser result visualizer")
	.version("0.1.0");

program
	.command("analyze")
	.description("Analyze a project directory and generate visualization")
	.requiredOption("-p, --path <dir>", "Project directory to Analyze")
	.option("-o, --output <path>", "Output graph JSON file")
	.option("-c, --config <path>", "dependency-cruiser config file")
	.action(async (options) => {
		const graphFile = await scan({
			path: options.path,
			output: options.output,
			config: options.config,
		});
		console.log(`\nTo view the result, run:\n  dep-report open -f ${graphFile}`);
	});

program
	.command("open")
	.description("Open web viewer with HTTP server")
	.option("-f, --file <path>", "Pre-processed graph JSON to load")
	.option("-p, --port <number>", "Server port", "3000")
	.option("--host <host>", "Server host", "localhost")
	.action(async (options) => {
		await open({
			file: options.file,
			port: parseInt(options.port, 10),
			host: options.host,
		});
	});

program.parse();