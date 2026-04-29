import { ForceLayout, Graph } from '@antv/g6';
import { useEffect, useMemo, useRef } from 'react';
import type { EdgeType, NodeType, ProcessedGraph } from '../types';
import { buildGraphData } from './buildGraphData';

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

export function DependencyGraph({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const graphData = useMemo(() => buildGraphData(data), [data]);

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
        'collapse-expand',
        {
          type: 'hover-activate',
          enable: (e: { targetType: string }) =>
            e.targetType === 'node' || e.targetType === 'combo',
          direction: 'out',
          inactiveState: 'inactive',
          degree: 1,
        },
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
      style={{
        width: '100%',
        height: 'calc(100% - 48px)',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
      }}
    />
  );
}
