export interface ServerOptions {
    port: number;
    host: string;
    graphFile?: string;
    maxNodes?: number;
    cwd?: string;
}
export declare class DcrServer {
    private app;
    private _port;
    private host;
    private graphFile?;
    private maxNodes;
    private cwd;
    private server?;
    /** Get the actual port the server is listening on */
    get port(): number;
    constructor(options: ServerOptions);
    private setupRoutes;
    start(): Promise<void>;
    stop(): void;
}
export declare function createServer(options: ServerOptions): DcrServer;
export default DcrServer;
//# sourceMappingURL=server.d.ts.map