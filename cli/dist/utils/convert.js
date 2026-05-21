// WASM module state
let wasmAggregate = null;
let wasmInitPromise = null;
async function initWasm() {
    if (wasmAggregate)
        return;
    if (wasmInitPromise)
        return wasmInitPromise;
    wasmInitPromise = (async () => {
        try {
            // Dynamic import for WASM module
            const wasm = await import('@dcr-reporter/wasm');
            wasmAggregate = wasm.aggregate;
        }
        catch (e) {
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
export async function convert(dcJson, maxNodes = 200, expandedDirs) {
    await initWasm();
    if (!wasmAggregate) {
        throw new Error('WASM module init failed');
    }
    return wasmAggregate(dcJson, maxNodes, expandedDirs || null);
}
//# sourceMappingURL=convert.js.map