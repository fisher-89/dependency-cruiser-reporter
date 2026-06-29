import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';

import { GraphView } from './components/GraphView';
import { GraphViewLayout } from './components/GraphViewLayout';
import { MetricsView } from './components/MetricsView';
import { ReportView } from './components/ReportView';
import { SettingsDropdown } from './components/settings';
import { useGraphData } from './hooks/useGraphData';
import { type TKey, useT } from './i18n';
import type { GraphNode, ProcessedGraph } from './types';

const ArchitectureView = lazy(() => import('./components/ArchitectureView'));

/** Single source of truth for all page-level route metadata. */
interface RouteConfig {
  /** Page route path — must start with `/` and must NOT start with `/api/` (reserved for Express). */
  path: string;
  /** i18n translation key for the nav button label. */
  label: TKey;
  /** `data-testid` attribute for the nav button (used by E2E tests). */
  testId: string;
  /** When `true`, the view requires `data` — renders upload area when data is null. */
  needsData: boolean;
}

const routeConfigs: RouteConfig[] = [
  {
    path: '/architecture',
    label: 'nav.architecture',
    testId: 'nav-architecture',
    needsData: false,
  },
  { path: '/graph', label: 'nav.graph', testId: 'nav-graph', needsData: true },
  {
    path: '/report',
    label: 'nav.report',
    testId: 'nav-report',
    needsData: true,
  },
  {
    path: '/metrics',
    label: 'nav.metrics',
    testId: 'nav-metrics',
    needsData: true,
  },
];

const DEFAULT_VIEW = '/graph';

/** Routes whose data is managed by useGraphData. */
const GRAPH_ROUTES = new Set(['/graph', '/report', '/metrics']);

function App() {
  const { t } = useT();
  const location = useLocation();
  const {
    data,
    loading,
    error,
    fetchGraph,
    refresh,
    toggleDir,
    expandedDirs,
    sidebarVisible,
    setSidebarVisible,
  } = useGraphData();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [stabilityHeatmap, setStabilityHeatmap] = useState(false);

  // Lazy-load graph data when entering a route that needs it.
  // Normalize to lowercase because React Router matches routes case-insensitively
  // but location.pathname retains the original case (e.g. "/Report" → "/report").
  useEffect(() => {
    if (GRAPH_ROUTES.has(location.pathname.toLowerCase()) && !data && !loading && !error) {
      void fetchGraph();
    }
  }, [location.pathname, data, loading, error, fetchGraph]);

  const handleRefresh = useCallback(() => {
    setSelectedNodeId(null);
    void refresh();
  }, [refresh]);

  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarVisible((prev) => !prev);
  }, [setSidebarVisible]);

  const handleStabilityHeatmapChange = useCallback((value: boolean) => {
    setStabilityHeatmap(value);
  }, []);

  const nodeMap = useMemo(() => {
    if (!data) return new Map<string, GraphNode>();
    const map = new Map<string, GraphNode>();
    for (const n of data.nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [data]);

  /**
   * Renders the view for a given route configuration.
   * - `needsData: false` routes (e.g. `/architecture`) always render their view.
   * - `needsData: true` routes show the upload area when `data` is null.
   * - When data is available, renders the corresponding view component.
   */
  function renderView(config: RouteConfig, data: ProcessedGraph | null) {
    if (!config.needsData) {
      return (
        <Suspense fallback={<div style={styles.suspenseFallback}>{t('architecture.loading')}</div>}>
          <ArchitectureView />
        </Suspense>
      );
    }

    if (!data) {
      return (
        <div style={styles.uploadArea} data-testid="upload-area">
          {loading && <div data-testid="loading">{t('upload.loading')}</div>}
          {error && (
            <div style={styles.error} data-testid="error-message">
              {error}
            </div>
          )}
        </div>
      );
    }

    switch (config.path) {
      case '/graph':
        return (
          <GraphViewLayout
            loading={loading}
            onRefresh={handleRefresh}
            stabilityHeatmap={stabilityHeatmap}
            onStabilityHeatmapChange={handleStabilityHeatmapChange}
          >
            <GraphView
              data={data}
              expandedDirs={expandedDirs}
              onToggleDir={toggleDir}
              selectedNodeId={selectedNodeId}
              onNodeSelect={handleNodeSelect}
              stabilityHeatmap={stabilityHeatmap}
              nodeMap={nodeMap}
              sidebarVisible={sidebarVisible}
              onToggleSidebar={handleToggleSidebar}
            />
          </GraphViewLayout>
        );
      case '/report':
        return (
          <GraphViewLayout
            loading={loading}
            onRefresh={handleRefresh}
            stabilityHeatmap={stabilityHeatmap}
            onStabilityHeatmapChange={handleStabilityHeatmapChange}
          >
            <ReportView violations={data.violations} />
          </GraphViewLayout>
        );
      case '/metrics':
        return (
          <GraphViewLayout
            loading={loading}
            onRefresh={handleRefresh}
            stabilityHeatmap={stabilityHeatmap}
            onStabilityHeatmapChange={handleStabilityHeatmapChange}
          >
            <MetricsView data={data} />
          </GraphViewLayout>
        );
      default:
        return <Navigate to={DEFAULT_VIEW} replace />;
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{t('app.title')}</h1>
        <div style={styles.headerControls}>
          <SettingsDropdown />
          <nav style={styles.nav}>
            {routeConfigs.map(({ path, label, testId }) => (
              <NavLink
                key={path}
                to={path}
                style={({ isActive }) => ({
                  ...styles.navBtn,
                  ...(isActive ? styles.navBtnActive : {}),
                })}
                data-testid={testId}
              >
                {t(label)}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Navigate to={DEFAULT_VIEW} replace />} />
          {routeConfigs.map((config) => (
            <Route key={config.path} path={config.path} element={renderView(config, data)} />
          ))}
          <Route path="*" element={<Navigate to={DEFAULT_VIEW} replace />} />
        </Routes>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    background: 'var(--color-bg)',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    background: 'var(--color-surface)',
    boxShadow: '0 1px 0 0 var(--color-border)',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    lineHeight: '32px',
    color: 'var(--color-text-primary)',
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  nav: {
    display: 'flex',
    gap: '8px',
  },
  navBtn: {
    padding: '8px 16px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: '6px',
    fontSize: '14px',
    lineHeight: '16px',
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
  },
  navBtnActive: {
    background: 'var(--color-accent-bg)',
    color: 'var(--color-accent)',
  },
  main: {
    padding: '24px',
    height: 'calc(100% - 64px)',
  },
  uploadArea: {
    border: '2px dashed var(--color-border)',
    borderRadius: '12px',
    padding: '48px',
    textAlign: 'center',
    background: 'var(--color-surface)',
  },
  error: {
    color: 'var(--color-error)',
    marginTop: '16px',
  },
  suspenseFallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--color-text-secondary)',
    fontSize: '16px',
  },
};

export default App;
