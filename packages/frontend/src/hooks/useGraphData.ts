import { useCallback, useState } from 'react';

import type { ProcessedGraph } from '../types';

function getStoredSidebarVisible(): boolean {
  const stored = localStorage.getItem('dcr:layout:graph:dir_tree');
  return stored === null ? true : stored !== 'false';
}

export interface UseGraphDataReturn {
  data: ProcessedGraph | null;
  loading: boolean;
  error: string | null;
  expandedDirs: Set<string>;
  sidebarVisible: boolean;
  setSidebarVisible: (value: boolean | ((prev: boolean) => boolean)) => void;
  fetchGraph: (newExpandedDirs?: string[]) => Promise<void>;
  refresh: () => Promise<void>;
  toggleDir: (dir: string) => void;
}

export function useGraphData(): UseGraphDataReturn {
  const [data, setData] = useState<ProcessedGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [sidebarVisible, setSidebarVisibleState] = useState<boolean>(getStoredSidebarVisible);
  const setSidebarVisible = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setSidebarVisibleState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem('dcr:layout:graph:dir_tree', String(next));
      return next;
    });
  }, []);
  const fetchGraph = useCallback(async (newExpandedDirs?: string[]) => {
    setLoading(true);
    setError(null);
    try {
      let dirs = newExpandedDirs;

      // First call with no args: read cached expandedDirs from localStorage
      if (dirs === undefined) {
        const cachedSource = localStorage.getItem('dcr:source:' + window.location.origin);
        if (cachedSource) {
          const cached = localStorage.getItem('dcr:expanded:' + cachedSource);
          if (cached) {
            try {
              dirs = JSON.parse(cached);
            } catch {
              // ignore invalid JSON — fall through to undefined
            }
          }
        }
      }

      const res = await fetch('/api/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expanded_dirs: dirs }),
      });
      if (res.ok) {
        const graphData: ProcessedGraph = await res.json();
        if (graphData.nodes && graphData.edges && graphData.meta) {
          setData(graphData);
          if (graphData.meta.expanded_dirs) {
            setExpandedDirs(new Set(graphData.meta.expanded_dirs.filter(Boolean)));
          }

          // Update localStorage cache with server response
          const source = graphData.meta.source;
          if (source) {
            localStorage.setItem('dcr:source:' + window.location.origin, source);
            if (graphData.meta.expanded_dirs) {
              localStorage.setItem(
                'dcr:expanded:' + source,
                JSON.stringify(graphData.meta.expanded_dirs),
              );
            }
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
      void fetchGraph(Array.from(next));
    },
    [expandedDirs, fetchGraph],
  );

  return {
    data,
    loading,
    error,
    expandedDirs,
    sidebarVisible,
    setSidebarVisible,
    fetchGraph,
    refresh,
    toggleDir,
  };
}
