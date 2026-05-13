import type { EdgeType, NodeType } from '../types';

interface NodeStyle {
  fill: string;
  stroke: string;
}

interface EdgeStyle {
  stroke: string;
  lineDash: number[];
}

export const LIGHT_NODE_STYLES: Record<NodeType, NodeStyle> = {
  file: { fill: '#C6E5FF', stroke: '#5B8FF9' },
  directory: { fill: '#FFD591', stroke: '#FA8C16' },
  package: { fill: '#B7EB8F', stroke: '#52C41A' },
};

export const DARK_NODE_STYLES: Record<NodeType, NodeStyle> = {
  file: { fill: '#1e3a5f', stroke: '#93c5fd' },
  directory: { fill: '#78350f', stroke: '#fbbf24' },
  package: { fill: '#14532d', stroke: '#86efac' },
};

export const LIGHT_EDGE_STYLES: Record<EdgeType, EdgeStyle> = {
  local: { stroke: '#1890FF', lineDash: [] },
  npm: { stroke: '#52C41A', lineDash: [6, 4] },
  core: { stroke: '#722ED1', lineDash: [] },
  dynamic: { stroke: '#FA8C16', lineDash: [4, 4] },
};

export const DARK_EDGE_STYLES: Record<EdgeType, EdgeStyle> = {
  local: { stroke: '#60a5fa', lineDash: [] },
  npm: { stroke: '#86efac', lineDash: [6, 4] },
  core: { stroke: '#c084fc', lineDash: [] },
  dynamic: { stroke: '#fbbf24', lineDash: [4, 4] },
};
