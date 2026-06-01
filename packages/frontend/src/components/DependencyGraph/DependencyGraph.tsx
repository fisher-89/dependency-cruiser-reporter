import {
  Graph,
  type ComboData,
  type Element as G6Element,
  type GraphData,
  type IPointerEvent,
} from '@antv/g6';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useT } from '../../i18n';
import { useTheme } from '../../theme';
import {
  DARK_EDGE_STYLES,
  DARK_NODE_STYLES,
  LIGHT_EDGE_STYLES,
  LIGHT_NODE_STYLES,
} from '../../theme/constants';
import type { EdgeType, NodeType, ProcessedGraph } from '../../types';
import { buildGraphData, type G6Node } from './buildGraphData';

export { registerCustomCombo } from './customCombo';

interface Props {
  data: ProcessedGraph;
  onToggleDir?: (dir: string) => void;
  onNodeSelect?: (nodeId: string) => void;
  selectedNodeId?: string | null;
}

export function DependencyGraph({ data, onToggleDir, onNodeSelect, selectedNodeId }: Props) {
  const { t } = useT();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const graphDataRef = useRef<GraphData | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNodeSelectRef = useRef(onNodeSelect);
  onNodeSelectRef.current = onNodeSelect;

  const NODE_STYLES: Record<NodeType, { fill: string; stroke: string }> = useMemo(
    () => (resolvedTheme === 'dark' ? DARK_NODE_STYLES : LIGHT_NODE_STYLES),
    [resolvedTheme],
  );

  const EDGE_STYLES: Record<EdgeType, { stroke: string; lineDash: number[] }> = useMemo(
    () => (resolvedTheme === 'dark' ? DARK_EDGE_STYLES : LIGHT_EDGE_STYLES),
    [resolvedTheme],
  );

  const SELECTED_COLOR = useMemo(
    () => (resolvedTheme === 'dark' ? '#60a5fa' : '#1890FF'),
    [resolvedTheme],
  );

  const LABEL_FILL = useMemo(
    () => (resolvedTheme === 'dark' ? '#f1f5f9' : '#1e293b'),
    [resolvedTheme],
  );

  const graphData = useMemo(() => buildGraphData(data), [data]);

  if (!data?.nodes || !data?.edges || !data?.meta) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        {t('graph.noData')}
      </div>
    );
  }

  const handleNodeClick = useCallback((event: IPointerEvent<G6Element>) => {
    if (event.targetType !== 'node') return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    const nodeId = event.target.id as string;
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      onNodeSelectRef.current?.(nodeId);
    }, 300);
  }, []);

  const handleNodeDblClick = useCallback(
    (event: IPointerEvent<G6Element>) => {
      if (event.targetType !== 'node') return;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      if (!onToggleDir) return;
      const nodeId = event.target.id;
      const node = data.nodes.find((n) => n.id === nodeId);
      if (node?.path) {
        onToggleDir(node.path);
      }
    },
    [data.nodes, onToggleDir],
  );

  const handleComboDblClick = useCallback(
    (event: IPointerEvent<G6Element>) => {
      if (event.targetType !== 'combo') return;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      if (!onToggleDir) return;
      const comboId = event.target.id;
      if (typeof comboId === 'string' && comboId.startsWith('combo:')) {
        const rawPath = comboId.slice(6);
        if (rawPath === 'root') return;
        onToggleDir(rawPath);
      }
    },
    [onToggleDir],
  );

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
        {
          type: 'hover-activate',
          enable: (e: { targetType: string }) => e.targetType === 'node',
          direction: 'out',
          inactiveState: 'inactive',
          degree: 1,
        },
      ],
      node: {
        style: (d: G6Node) => {
          const nodeData = d.data;
          const nodeType = nodeData?.node_type ?? 'file';
          const s = NODE_STYLES[nodeType] ?? NODE_STYLES.file;
          return {
            fill: s.fill,
            stroke: s.stroke,
            lineWidth: 2,
            labelText: nodeData?.label ?? '',
            labelPlacement: 'bottom',
            labelFill: LABEL_FILL,
          };
        },
        state: {
          selected: {
            stroke: SELECTED_COLOR,
            lineWidth: 4,
            halo: true,
            haloFill: SELECTED_COLOR,
            haloLineWidth: 0,
            haloOpacity: 0.15,
          },
        },
      },
      combo: {
        type: 'directory',
        style: (d: ComboData) => {
          return {
            labelText: d.label ?? '',
            labelPlacement: 'top',
            labelFill: LABEL_FILL,
            padding: 0,
          };
        },
      },
      edge: {
        style: (d: {
          data?: {
            edge_type?: EdgeType;
            error_count?: number;
            warn_count?: number;
          };
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
  }, [
    handleNodeClick,
    handleNodeDblClick,
    handleComboDblClick,
    NODE_STYLES,
    EDGE_STYLES,
    SELECTED_COLOR,
    LABEL_FILL,
  ]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphData) return;

    if (graphDataRef.current !== graphData) {
      graphDataRef.current = graphData;
      graph.setData(graphData);
      void graph.render().catch(console.error);
    }
  }, [graphData]);

  const prevSelectedRef = useRef<string | null | undefined>(null);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    if (prevSelectedRef.current && prevSelectedRef.current !== selectedNodeId) {
      const prevStates = graph.getElementState(prevSelectedRef.current);
      void graph
        .setElementState(
          prevSelectedRef.current,
          prevStates.filter((s) => s !== 'selected'),
        )
        .catch(console.error);
    }

    if (selectedNodeId) {
      const currStates = graph.getElementState(selectedNodeId);
      if (!currStates.includes('selected')) {
        void graph
          .setElementState(selectedNodeId, [...currStates, 'selected'])
          .catch(console.error);
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
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
      }}
    />
  );
}
