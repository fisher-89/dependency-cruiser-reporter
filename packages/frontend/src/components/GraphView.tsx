import { useMemo } from 'react';

import type { GraphNode, ProcessedGraph } from '../types';
import { DependencyGraph } from './DependencyGraph/DependencyGraph';
import { DetailPanel } from './DetailPanel';
import { DirTree } from './DirTree';

interface GraphViewProps {
  data: ProcessedGraph;
  expandedDirs: Set<string>;
  onToggleDir: (dir: string) => void;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
  stabilityHeatmap: boolean;
  nodeMap: Map<string, GraphNode>;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
}

export function GraphView({
  data,
  expandedDirs,
  onToggleDir,
  selectedNodeId,
  onNodeSelect,
  stabilityHeatmap,
  nodeMap,
  sidebarVisible,
  onToggleSidebar,
}: GraphViewProps) {
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return data.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [data.nodes, selectedNodeId]);

  return (
    <div style={styles.layout} data-testid="graph-view">
      <DirTree
        data={data}
        expandedDirs={expandedDirs}
        onToggleDir={onToggleDir}
        sidebarVisible={sidebarVisible}
        onToggleSidebar={onToggleSidebar}
      />
      <DependencyGraph
        data={data}
        onToggleDir={onToggleDir}
        onNodeSelect={onNodeSelect}
        selectedNodeId={selectedNodeId}
        stabilityHeatmap={stabilityHeatmap}
      />
      <DetailPanel
        node={selectedNode}
        edges={data.edges}
        violations={data.violations}
        nodeMap={nodeMap}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    gap: 0,
    flex: 1,
    minHeight: 0,
  },
};
