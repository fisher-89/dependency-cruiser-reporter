export interface OpenOptions {
    file?: string;
    port?: number;
    host?: string;
    /** Max nodes before auto-aggregation (default 500) */
    maxNodes?: number;
    /** Workspace root directory (default ".") */
    cwd?: string;
}
/**
 * Open web viewer with HTTP server
 */
export declare function open(options: OpenOptions): Promise<void>;
export default open;
//# sourceMappingURL=open.d.ts.map