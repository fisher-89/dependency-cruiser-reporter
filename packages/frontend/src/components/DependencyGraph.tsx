import type { Element as G6Element, GraphData, IPointerEvent } from '@antv/g6';
import { Graph } from '@antv/g6';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { EdgeType, NodeType, ProcessedGraph } from '../types';
import type { G6NodeData } from './buildGraphData';
import { buildGraphData } from './buildGraphData';

interface Props {
  data: ProcessedGraph;
  onToggleDir?: (dir: string) => void;
  onNodeSelect?: (nodeId: string) => void;
  selectedNodeId?: string | null;
}

const NODE_STYLES: Record<NodeType, { fill: string; stroke: string }> = {
  file: { fill: '#C6E5FF', stroke: '#5B8FF9' },
  directory: { fill: '#FFD591', stroke: '#FA8C16' },
  package: { fill: '#B7EB8F', stroke: '#52C41A' },
};

const EDGE_STYLES: Record<EdgeType, { stroke: string; lineDash: number[] }> = {
  local: { stroke: '#1890FF', lineDash: [] },
  npm: { stroke: '#52C41A', lineDash: [6, 4] },
  core: { stroke: '#722ED1', lineDash: [] },
  dynamic: { stroke: '#FA8C16', lineDash: [4, 4] },
};

export function DependencyGraph({ data, onToggleDir, onNodeSelect, selectedNodeId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const graphDataRef = useRef<GraphData | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNodeSelectRef = useRef(onNodeSelect);
  onNodeSelectRef.current = onNodeSelect;

  const graphData = useMemo(() => buildGraphData(data), [data]);

  // Guard against invalid data - don't render graph
  if (!data?.nodes || !data?.edges || !data?.meta) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        No graph data available
      </div>
    );
  }

  const handleNodeClick = useCallback((event: IPointerEvent<G6Element>) => {
    if (event.targetType !== 'node') return;
    // Clear any pending timer from a previous click
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    const nodeId = event.target.id as string;
    // Wait 300ms to see if this is part of a double-click
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      onNodeSelectRef.current?.(nodeId);
    }, 300);
  }, []);

  const handleNodeDblClick = useCallback(
    (event: IPointerEvent<G6Element>) => {
      if (event.targetType !== 'node') return;
      // Cancel pending single-click selection
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      if (!onToggleDir) return;
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
      if (event.targetType !== 'combo') return;
      // Cancel pending single-click selection
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      if (!onToggleDir) return;
      const comboId = event.target.id;
      // Combo IDs are prefixed with "combo:", extract the actual path
      if (typeof comboId === 'string' && comboId.startsWith('combo:')) {
        const rawPath = comboId.slice(6); // Remove "combo:" prefix
        // Skip root combo - it's a synthetic container with no real directory
        if (rawPath === 'root') return;
        onToggleDir(rawPath);
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
        {
          type: 'hover-activate',
          enable: (e: { targetType: string }) => e.targetType === 'node',
          direction: 'out',
          inactiveState: 'inactive',
          degree: 1,
        },
      ],
      node: {
        style: (d) => {
          const nodeData = d.data as G6NodeData;
          const nodeType = nodeData.node_type ?? 'file';
          const s = NODE_STYLES[nodeType] ?? NODE_STYLES.file;
          return {
            fill: s.fill,
            stroke: s.stroke,
            lineWidth: 2,
            labelText: nodeData.label ?? '',
            labelPlacement: 'bottom',
          };
        },
        state: {
          selected: {
            stroke: '#1890FF',
            lineWidth: 4,
            halo: true,
            haloFill: '#1890FF',
            haloLineWidth: 0,
            haloOpacity: 0.15,
          },
        },
      },
      combo: {
        type: 'rect',
        style: (d: { label?: string; style?: { width?: number; height?: number } }) => {
          return {
            labelText: d.label ?? '',
            labelPlacement: 'top',
            padding: 20,
          };
        },
      },
      edge: {
        style: (d: {
          data?: { edge_type?: EdgeType; error_count?: number; warn_count?: number };
        }) => {
          const edgeType = d.data?.edge_type ?? 'local';
          const s = EDGE_STYLES[edgeType] ?? EDGE_STYLES.local;
          const stroke = d.data?.error_count
            ? '#f1280d'
            : d.data?.warn_count
              ? '#ffe100'
              : '#6a839bba';
          return {
            stroke: stroke,
            lineWidth: 1.5,
            lineDash: s.lineDash,
            endArrow: true,
          };
        },
      },
    });

    graphRef.current = graph;

    graph.on('node:click', handleNodeClick);
    graph.on('node:dblclick', handleNodeDblClick);
    graph.on('combo:dblclick', handleComboDblClick);

    const onResize = () => {
      if (containerRef.current) {
        graph.resize();
      }
    };
    window.addEventListener('resize', onResize);

    // ResizeObserver to handle container width changes (e.g., panel appearing)
    const ro = new ResizeObserver(() => {
      graph.resize();
    });
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      graph.off('node:click', handleNodeClick);
      graph.off('node:dblclick', handleNodeDblClick);
      graph.off('combo:dblclick', handleComboDblClick);
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      graph.destroy();
      graphRef.current = null;
    };
  }, [handleNodeClick, handleNodeDblClick, handleComboDblClick]);

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

  // Apply selected state to G6 node when selectedNodeId changes
  const prevSelectedRef = useRef<string | null | undefined>(null);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    // Clear previous selected state
    if (prevSelectedRef.current && prevSelectedRef.current !== selectedNodeId) {
      const prevStates = graph.getElementState(prevSelectedRef.current);
      graph.setElementState(
        prevSelectedRef.current,
        prevStates.filter((s) => s !== 'selected')
      );
    }

    // Apply new selected state
    if (selectedNodeId) {
      const currStates = graph.getElementState(selectedNodeId);
      if (!currStates.includes('selected')) {
        graph.setElementState(selectedNodeId, [...currStates, 'selected']);
      }
    }

    prevSelectedRef.current = selectedNodeId;
  }, [selectedNodeId]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
      }}
    />
  );
}
