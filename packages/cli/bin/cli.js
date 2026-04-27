#!/usr/bin/env node
import { program } from "commander";
import { analyze } from "../dist/commands/analyze.js";
import { open } from "../dist/commands/open.js";

program
	.name("dep-report")
	.description("dependency-cruiser result visualizer")
	.version("0.1.0");

program
	.command("analyze")
	.description("Analyze dependency-cruiser output and generate graph")
	.requiredOption("-i, --input <path>", "Input dependency-cruiser JSON file")
	.option("-o, --output <path>", "Output graph JSON file", "graph.json")
	.option("-l, --level <level>", "Aggregation level: file | directory | package | root")
	.option("-m, --max-nodes <number>", "Maximum nodes in output", "5000")
	.action(async (options) => {
		await analyze({
			input: options.input,
			output: options.output,
			level: options.level,
			maxNodes: parseInt(options.maxNodes, 10),
		});
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