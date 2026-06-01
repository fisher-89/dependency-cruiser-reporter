import type { ProcessedGraph, aggregate } from '@dcr-reporter/wasm';

// WASM module state
let wasmAggregate: typeof aggregate | null = null;
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
  expandedDirs?: string[],
): Promise<ProcessedGraph> {
  await initWasm();
  if (!wasmAggregate) {
    throw new Error('WASM module init failed');
  }
  return wasmAggregate(dcJson, maxNodes, expandedDirs || null);
}
