export interface ProcessedGraph {
  nodes: {
    id: string;
    label: string;
    node_type: 'file' | 'directory' | 'package';
    path?: string;
    violation_count: number;
    orphan?: boolean;
    children?: string[];
    combo?: string;
  }[];
  edges: {
    source: string;
    target: string;
    edge_type: 'local' | 'npm' | 'core' | 'dynamic';
    weight: number;
    circular?: boolean;
    error_count?: number;
    warn_count?: number;
    info_count?: number;
  }[];
  combos: {
    id: string;
    label: string;
    combo?: string;
  }[];
  meta: {
    original_node_count: number;
    aggregated_node_count: number;
    total_violations: number;
    expanded_dirs?: string[];
  };
  violations: {
    from: string;
    to: string;
    rule: string;
    severity: 'error' | 'warn' | 'info';
    message?: string;
  }[];
}

// WASM module state
let wasmAggregate: ((content: string, maxNodes: number, expandedDirs: string[] | null) => ProcessedGraph) | null = null;
let wasmInitPromise: Promise<void> | null = null;

async function initWasm(): Promise<void> {
  if (wasmAggregate) return;
  if (wasmInitPromise) return wasmInitPromise;

  wasmInitPromise = (async () => {
    try {
      // Dynamic import for WASM module
      const wasm = await import('@dcr-reporter/wasm');
      wasmAggregate = wasm.aggregate;
    } catch (e) {
      console.warn('WASM module not available, falling back to native binary:', e);
      wasmInitPromise = null;
      throw e;
    }
  })();

  return wasmInitPromise;
}

/**
 * Convert raw dependency-cruiser JSON to ProcessedGraph.
 * Uses WASM if available, falls back to native binary.
 */
export async function convert(
  dcJson: string,
  maxNodes = 200,
  expandedDirs?: string[]
): Promise<ProcessedGraph> {
  await initWasm();
  return wasmAggregate!(
    dcJson,
    maxNodes,
    expandedDirs || null
  );
}
