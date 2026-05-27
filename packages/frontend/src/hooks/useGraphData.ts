import { useCallback, useState } from 'react';
import type { ProcessedGraph } from '../types';

export interface UseGraphDataReturn {
  data: ProcessedGraph | null;
  loading: boolean;
  error: string | null;
  expandedDirs: Set<string>;
  fetchGraph: (newExpandedDirs?: string[]) => Promise<void>;
  refresh: () => Promise<void>;
  toggleDir: (dir: string) => void;
}

export function useGraphData(): UseGraphDataReturn {
  const [data, setData] = useState<ProcessedGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const fetchGraph = useCallback(async (newExpandedDirs?: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expanded_dirs: newExpandedDirs }),
      });
      if (res.ok) {
        const graphData = (await res.json()) as ProcessedGraph;
        if (graphData.nodes && graphData.edges && graphData.meta) {
          setData(graphData);
          if (graphData.meta.expanded_dirs) {
            setExpandedDirs(new Set(graphData.meta.expanded_dirs));
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch graph');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    await fetchGraph([]);
  }, [fetchGraph]);

  const toggleDir = useCallback(
    (dir: string) => {
      const next = new Set(expandedDirs);
      let isExpand = true;
      for (const expandedPath of expandedDirs) {
        if (expandedPath.startsWith(dir)) {
          next.delete(expandedPath);
          isExpand = false;
        }
      }
      if (isExpand) {
        next.add(dir);
      }
      setExpandedDirs(next);
      fetchGraph(Array.from(next));
    },
    [expandedDirs, fetchGraph]
  );

  return { data, loading, error, expandedDirs, fetchGraph, refresh, toggleDir };
}
