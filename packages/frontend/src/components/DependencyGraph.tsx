import { Graph } from '@antv/g6';
import { useEffect, useMemo, useRef } from 'react';
import type { EdgeType, NodeType, ProcessedGraph } from '../types';

interface Props {
  data: ProcessedGraph;
}

const NODE_STYLES: Record<NodeType, { fill: string; stroke: string; size: number }> = {
  file: { fill: '#C6E5FF', stroke: '#5B8FF9', size: 20 },
  directory: { fill: '#FFD591', stroke: '#FA8C16', size: 28 },
  package: { fill: '#B7EB8F', stroke: '#52C41A', size: 24 },
};

const EDGE_STYLES: Record<EdgeType, { stroke: string; lineDash: number[] }> = {
  local: { stroke: '#1890FF', lineDash: [] },
  npm: { stroke: '#52C41A', lineDash: [6, 4] },
  core: { stroke: '#722ED1', lineDash: [] },
  dynamic: { stroke: '#FA8C16', lineDash: [4, 4] },
};

/** 从节点 path 构建 G6 combo 层级数据 */
function buildGraphData(data: ProcessedGraph) {
  const comboMap = new Map<string, { id: string; label: string; combo?: string }>();

  // 为每个节点提取目录路径并构建 combo 层级
  const nodes = data.nodes.map((n) => {
    const pathParts = (n.path ?? n.id).split('/');
    // 目录路径 = 去掉最后一段文件名
    const dirParts = n.node_type === 'directory' ? pathParts : pathParts.slice(0, -1);
    const comboId = dirParts.length > 0 ? dirParts.join('/') : 'root';

    // 注册 combo 及其所有父级
    for (let i = 1; i <= dirParts.length; i++) {
      const id = dirParts.slice(0, i).join('/');
      if (!comboMap.has(id)) {
        comboMap.set(id, {
          id,
          label: dirParts[i - 1],
          combo: i > 1 ? dirParts.slice(0, i - 1).join('/') : 'root',
        });
      }
    }

    return {
      id: n.id,
      data: {
        label: n.label,
        node_type: n.node_type,
        violation_count: n.violation_count,
      },
      combo: comboId,
    };
  });

  // 确保有 root combo
  if (!comboMap.has('root')) {
    comboMap.set('root', { id: 'root', label: '/' });
  }
  // 没有目录路径的节点归入 root
  for (const n of nodes) {
    if (!n.combo) {
      n.combo = 'root';
    }
  }

  const edges = data.edges.map((e, i) => ({
    id: `${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
    data: {
      edge_type: e.edge_type,
      weight: e.weight,
    },
  }));

  const combos = Array.from(comboMap.values());

  return { nodes, edges, combos };
}

export function DependencyGraph({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const graphData = useMemo(() => buildGraphData(data), [data]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 600;

    const graph = new Graph({
      container,
      width,
      height,
      autoFit: 'view',
      padding: 20,
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
      layout: {
        type: 'comboCombined',
        outerLayout: { type: 'dagre', rankdir: 'LR' },
        innerLayout: { type: 'force', preventOverlap: true },
        comboPadding: 15,
        sortByCombo: true,
      },
      node: {
        style: (d: { data?: { node_type?: NodeType; label?: string } }) => {
          const nodeType = d.data?.node_type ?? 'file';
          const s = NODE_STYLES[nodeType] ?? NODE_STYLES.file;
          return {
            size: s.size,
            fill: s.fill,
            stroke: s.stroke,
            lineWidth: 2,
            labelText: d.data?.label ?? '',
            labelPlacement: 'bottom',
          };
        },
      },
      edge: {
        style: (d: { data?: { edge_type?: EdgeType } }) => {
          const edgeType = d.data?.edge_type ?? 'local';
          const s = EDGE_STYLES[edgeType] ?? EDGE_STYLES.local;
          return {
            stroke: s.stroke,
            lineWidth: 1.5,
            lineDash: s.lineDash,
            endArrow: true,
          };
        },
      },
    });

    graph.setData(graphData);
    graph.render();
    graphRef.current = graph;

    const onResize = () => {
      if (containerRef.current) {
        graph.resize(containerRef.current.clientWidth, 600);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      graph.destroy();
      graphRef.current = null;
    };
  }, [graphData]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '600px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
    />
  );
}
