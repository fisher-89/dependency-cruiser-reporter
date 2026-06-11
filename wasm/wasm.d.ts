/* tslint:disable */
/* eslint-disable */
export interface GraphCombo {
    id: string;
    label: string;
    combo?: string;
    rect?: Rect;
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

export interface GraphNode {
    id: string;
    label: string;
    node_type: NodeType;
    path?: string;
    violation_count: number;
    orphan?: boolean;
    children?: string[];
    combo?: string;
    rect?: Rect;
    instability?: number;
}

export interface ProcessedGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    combos: GraphCombo[];
    meta: GraphMeta;
    violations: ViolationInfo[];
}

export interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface ViolationInfo {
    from: string;
    to: string;
    rule: string;
    severity: string;
    message: string | undefined;
}

export type EdgeType = "local" | "npm" | "core" | "dynamic";

export type NodeType = "file" | "directory" | "package";


/**
 * WASM entry point: aggregate dependency-cruiser JSON output
 *
 * @param content - dependency-cruiser JSON string
 * @param maxNodes - maximum number of nodes in the output graph
 * @param expandedDirs - optional list of directory paths to expand (show files)
 * @returns ProcessedGraph with nodes, edges, combos, meta, and violations
 */
export function aggregate(content: string, maxNodes: number, expandedDirs?: string[] | null): ProcessedGraph;
