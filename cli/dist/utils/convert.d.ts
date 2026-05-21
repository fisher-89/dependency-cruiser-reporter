import type { ProcessedGraph } from '@dcr-reporter/wasm';
/**
 * Convert raw dependency-cruiser JSON to ProcessedGraph.
 * Uses WASM if available, falls back to native binary.
 */
export declare function convert(dcJson: string, maxNodes?: number, expandedDirs?: string[]): Promise<ProcessedGraph>;
//# sourceMappingURL=convert.d.ts.map