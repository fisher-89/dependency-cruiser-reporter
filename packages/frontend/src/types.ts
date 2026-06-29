export type {
  ProcessedGraph,
  GraphNode,
  GraphEdge,
  GraphCombo,
  GraphMeta,
  ViolationInfo,
  NodeType,
  EdgeType,
} from '@dcr-reporter/wasm';

/** Augment GraphMeta with the `source` field injected by the server (graph.ts) after WASM aggregation. */
declare module '@dcr-reporter/wasm' {
  interface GraphMeta {
    source?: string;
  }
}

export type ViewMode = 'architecture' | 'graph' | 'report' | 'metrics';
