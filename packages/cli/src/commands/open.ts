import { createServer, type ServerOptions } from "../server.js";

export interface OpenOptions {
	file?: string;
	port?: number;
	host?: string;
}

/**
 * Open web viewer with HTTP server
 */
export async function open(options: OpenOptions): Promise<void> {
	const { file, port = 3000, host = "localhost" } = options;

	const serverOptions: ServerOptions = {
		port,
		host,
		graphFile: file,
	};

	const server = createServer(serverOptions);

	await server.start();

	console.log(`Server running at http://${host}:${port}`);
	if (file) {
		console.log(`Graph file: ${file}`);
	}
	console.log("Press Ctrl+C to stop");

	// Keep process running
	process.on("SIGINT", () => {
		console.log("\nShutting down...");
		server.stop();
		process.exit(0);
	});
}

export default open;