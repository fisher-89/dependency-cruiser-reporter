import type { Element as G6Element, IPointerEvent } from '@antv/g6';
import type { GraphData } from '@antv/g6';
import { ForceLayout, Graph } from '@antv/g6';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { EdgeType, NodeType, ProcessedGraph } from '../types';
import { buildGraphData } from './buildGraphData';

interface Props {
  data: ProcessedGraph;
  onToggleDir?: (dir: string) => void;
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

export function DependencyGraph({ data, onToggleDir }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const graphDataRef = useRef<GraphData | null>(null);

  const graphData = useMemo(() => buildGraphData(data), [data]);

  // Guard against invalid data - don't render graph
  if (!data?.nodes || !data?.edges || !data?.meta) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        No graph data available
      </div>
    );
  }

  const handleNodeDblClick = useCallback(
    (event: IPointerEvent<G6Element>) => {
      if (!onToggleDir || event.targetType !== 'node') return;
      const nodeId = event.target.id;
      // Find the node to get its path
      const node = data.nodes.find((n) => n.id === nodeId);
      if (node?.path) {
        onToggleDir(node.path);
      }
    },
    [data.nodes, onToggleDir]
  );

  const handleComboDblClick = useCallback(
    (event: IPointerEvent<G6Element>) => {
      if (!onToggleDir || event.targetType !== 'combo') return;
      const comboId = event.target.id;
      // Combo IDs are prefixed with "combo:", extract the actual path
      if (typeof comboId === 'string' && comboId.startsWith('combo:')) {
        const dirPath = comboId.slice(6); // Remove "combo:" prefix
        onToggleDir(dirPath);
      }
    },
    [onToggleDir]
  );

  // Initialize graph once
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const graph = new Graph({
      container,
      autoFit: 'view',
      padding: 20,
      behaviors: [
        'drag-canvas',
        'zoom-canvas',
        'drag-element',
        // {
        //   type: 'hover-activate',
        //   enable: (e: { targetType: string }) =>
        //     e.targetType === 'node' || e.targetType === 'combo',
        //   direction: 'out',
        //   inactiveState: 'inactive',
        //   degree: 1,
        // },
      ],
      layout: {
        type: 'combo-combined',
        outerLayout: new ForceLayout({
          preventOverlap: true,
          nodeSpacing: 50,
        }),
        comboPadding: 20,
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
      combo: {
        type: 'rect',
        style: (d: { level: number; label: string }) => {
          return {
            labelText: d.label ?? '',
            labelPlacement: 'top',
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

    graphRef.current = graph;

    graph.on('node:dblclick', handleNodeDblClick);
    graph.on('combo:dblclick', handleComboDblClick);

    const onResize = () => {
      if (containerRef.current) {
        graph.resize(containerRef.current.clientWidth, 600);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      graph.off('node:dblclick', handleNodeDblClick);
      graph.off('combo:dblclick', handleComboDblClick);
      graph.destroy();
      graphRef.current = null;
    };
  }, [handleNodeDblClick, handleComboDblClick]);

  // Update data when graphData changes (don't recreate graph)
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphData) return;

    // Only update if data actually changed
    if (graphDataRef.current !== graphData) {
      graphDataRef.current = graphData;
      graph.setData(graphData);
      graph.render();
    }
  }, [graphData]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 'calc(100% - 48px)',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
      }}
    />
  );
}
