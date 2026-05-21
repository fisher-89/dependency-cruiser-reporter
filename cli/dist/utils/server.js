import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { convert } from './convert.js';
const mainC4Template = [
    'specification {',
    '  element outer // 系统外实体（例：用户、其他服务）',
    '  element project // 工程',
    '  element package // 包',
    '  element module // 模块、组件',
    '',
    '  relationship dependency { // 依赖',
    '    line solid',
    '  }',
    '}',
    'model {',
    "  root = project 'Project' {",
    "    // 此处拆分packages 或 module",
    "  }",
    "  user = outer 'User'",
    "  user -> root",
    '}',
    'views {',
    '  view all of root {',
    '    title \'all\'',
    '    include *, root.**',
    '  }',
    '  view top {',
    '    title \'top-only\'',
    '    include root.*',
    '  }',
    '}',
    '',
].join('\n');
export class DcrServer {
    /** Get the actual port the server is listening on */
    get port() {
        return this._port;
    }
    constructor(options) {
        this._port = options.port;
        this.host = options.host;
        this.graphFile = options.graphFile;
        this.maxNodes = options.maxNodes ?? 200;
        this.cwd = options.cwd ?? '.';
        this.app = express();
        this.app.use(express.json());
        this.setupRoutes();
    }
    setupRoutes() {
        // Get frontend dist directory
        const cliDir = dirname(fileURLToPath(import.meta.url));
        const frontendDist = resolve(cliDir, '../../../frontend/dist');
        // API: Get architecture model (C4 parsing)
        this.app.get('/api/architecture/model', async (_req, res) => {
            const archDir = join(resolve(this.cwd), '.dc-reporter', 'architecture');
            if (!existsSync(archDir)) {
                res.status(404).json({ error: 'Architecture directory not found' });
                return;
            }
            let files;
            try {
                files = readdirSync(archDir).filter(f => f.endsWith('.c4'));
            }
            catch {
                res.status(500).json({ error: 'Failed to read architecture directory' });
                return;
            }
            if (files.length === 0) {
                res.status(404).json({ error: 'No .c4 files found in architecture directory' });
                return;
            }
            try {
                const sources = {};
                for (const file of files) {
                    sources[file] = readFileSync(join(archDir, file), 'utf-8');
                }
                const { fromSources } = await import('@likec4/language-services/node');
                const likec4 = await fromSources(sources);
                if (likec4.hasErrors()) {
                    const errors = likec4.getErrors();
                    res.status(422).json({ error: 'C4 parse errors', details: JSON.stringify(errors) });
                    return;
                }
                const computed = likec4.syncComputedModel();
                res.json(computed.$data);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                res.status(422).json({ error: 'Failed to parse C4 files', details: message });
            }
        });
        // API: Generate architecture model (create starter .c4 file)
        this.app.post('/api/architecture/generate', async (_req, res) => {
            const archDir = join(resolve(this.cwd), '.dc-reporter', 'architecture');
            try {
                if (!existsSync(archDir)) {
                    mkdirSync(archDir, { recursive: true });
                }
                writeFileSync(join(archDir, 'main.c4'), mainC4Template, 'utf-8');
                res.json({ success: true });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                res.status(500).json({ error: 'Failed to generate architecture model', details: message });
            }
        });
        // API: Get graph data (auto-converts raw dependency-cruiser JSON)
        this.app.post('/api/graph', async (req, res) => {
            if (!this.graphFile) {
                res.status(404).json({ error: 'No graph file specified' });
                return;
            }
            if (!existsSync(this.graphFile)) {
                res.status(404).json({ error: `Graph file not found: ${this.graphFile}` });
                return;
            }
            try {
                const content = readFileSync(this.graphFile, 'utf-8');
                const parsed = JSON.parse(content);
                const expandedDirs = req.body?.expanded_dirs?.length
                    ? req.body.expanded_dirs
                    : undefined;
                if (parsed.modules && Array.isArray(parsed.modules)) {
                    const graph = await convert(content, this.maxNodes, expandedDirs);
                    res.json(graph);
                    return;
                }
                // Unknown format
                res.status(400).json({ error: 'Unrecognized graph file format' });
            }
            catch (error) {
                res.status(500).json({ error: 'Failed to read graph file', details: String(error) });
            }
        });
        // Serve frontend static files
        this.app.use(express.static(frontendDist));
        // SPA fallback
        this.app.get('*', (_req, res) => {
            const indexPath = resolve(frontendDist, 'index.html');
            if (existsSync(indexPath)) {
                res.sendFile(indexPath);
            }
            else {
                res.status(404).send("Frontend not built. Run 'pnpm build' in packages/frontend");
            }
        });
    }
    async start() {
        return new Promise((resolve, reject) => {
            const tryListen = (port) => {
                const server = this.app.listen(port, this.host, () => {
                    this._port = port;
                    this.server = server;
                    resolve();
                });
                server.on('error', (err) => {
                    if (err.code === 'EADDRINUSE' && port < 65535) {
                        console.log(`Port ${port} is in use, trying ${port + 1}...`);
                        server.close();
                        tryListen(port + 1);
                    }
                    else {
                        reject(err);
                    }
                });
            };
            tryListen(this.port);
        });
    }
    stop() {
        this.server?.close();
    }
}
export function createServer(options) {
    return new DcrServer(options);
}
export default DcrServer;
//# sourceMappingURL=server.js.map