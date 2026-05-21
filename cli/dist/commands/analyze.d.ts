export interface AnalyzeOptions {
    path: string;
    output?: string;
    config?: string;
    /** Workspace root directory (default ".") */
    cwd?: string;
}
export declare function analyze(options: AnalyzeOptions): Promise<string>;
export default analyze;
//# sourceMappingURL=analyze.d.ts.map