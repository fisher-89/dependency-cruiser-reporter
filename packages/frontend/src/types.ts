export interface ProcessedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  combos: GraphCombo[];
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
  combo?: string;
}

export interface GraphCombo {
  id: string;
  label: string;
  combo?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  edge_type: EdgeType;
  weight: number;
  circular?: boolean;
  error_count?: number;
  warn_count?: number;
  info_count?: number;
}

export interface GraphMeta {
  original_node_count: number;
  aggregated_node_count: number;
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

export type ViewMode = 'graph' | 'report' | 'metrics';
