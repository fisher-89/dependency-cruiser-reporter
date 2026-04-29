export interface ProcessedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: GraphMeta;
  violations: ViolationInfo[];
}

export interface GraphNode {
  id: string;
  label: string;
  node_type: NodeType;
  path?: string;
  violation_count: number;
  orphan?: boolean;
  children?: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  edge_type: EdgeType;
  weight: number;
  circular?: boolean;
}

export interface GraphMeta {
  original_node_count: number;
  aggregated_node_count: number;
  aggregation_level: AggregationLevel;
  total_violations: number;
  expanded_dirs?: string[];
}

export interface ViolationInfo {
  from: string;
  to: string;
  rule: string;
  severity: 'error' | 'warn' | 'info';
  message?: string;
}

export type NodeType = 'file' | 'directory' | 'package';

export type EdgeType = 'local' | 'npm' | 'core' | 'dynamic';

export type AggregationLevel = 'file' | 'directory' | 'package' | 'root';

export type ViewMode = 'graph' | 'report' | 'metrics';
