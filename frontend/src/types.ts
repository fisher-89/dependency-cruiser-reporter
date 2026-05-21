export type {
  ProcessedGraph,
  GraphNode,
  GraphEdge,
  ViolationInfo,
  NodeType,
  EdgeType,
} from '@dcr-reporter/wasm';

export type ViewMode = 'architecture' | 'graph' | 'report' | 'metrics';

export interface AppConfig {
  cwd: string;
  hasArchitectureDir: boolean;
  hasGraphFile: boolean;
}
