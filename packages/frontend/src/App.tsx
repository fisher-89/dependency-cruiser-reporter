import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DependencyGraph } from './components/DependencyGraph/DependencyGraph';
import { DetailPanel } from './components/DetailPanel';
import { GraphViewLayout } from './components/GraphViewLayout';
import { SettingsDropdown } from './components/settings';
import { useGraphData } from './hooks/useGraphData';
import { useT } from './i18n';
import type { TKey } from './i18n';
import type { GraphNode, ProcessedGraph, ViolationInfo } from './types';

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
  { path: '/report', label: 'nav.report', testId: 'nav-report', needsData: true },
  { path: '/metrics', label: 'nav.metrics', testId: 'nav-metrics', needsData: true },
];

const DEFAULT_VIEW = '/graph';

/** Routes whose data is managed by useGraphData. */
const GRAPH_ROUTES = new Set(['/graph', '/report', '/metrics']);

function App() {
  const { t } = useT();
  const location = useLocation();
  const { data, loading, error, fetchGraph, refresh, toggleDir } = useGraphData();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Lazy-load graph data when entering a route that needs it.
  // Normalize to lowercase because React Router matches routes case-insensitively
  // but location.pathname retains the original case (e.g. "/Report" → "/report").
  useEffect(() => {
    if (GRAPH_ROUTES.has(location.pathname.toLowerCase()) && !data && !loading && !error) {
      fetchGraph();
    }
  }, [location.pathname, data, loading, error, fetchGraph]);

  const handleRefresh = useCallback(() => {
    setSelectedNodeId(null);
    refresh();
  }, [refresh]);

  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const selectedNode = useMemo(() => {
    if (!data || !selectedNodeId) return null;
    return data.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [data, selectedNodeId]);

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
          <GraphViewLayout loading={loading} onRefresh={handleRefresh}>
            <div style={styles.graphSplitLayout} data-testid="graph-view">
              <DependencyGraph
                data={data}
                onToggleDir={toggleDir}
                onNodeSelect={handleNodeSelect}
                selectedNodeId={selectedNodeId}
              />
              <DetailPanel
                node={selectedNode}
                edges={data.edges}
                violations={data.violations}
                nodeMap={nodeMap}
              />
            </div>
          </GraphViewLayout>
        );
      case '/report':
        return (
          <GraphViewLayout loading={loading} onRefresh={handleRefresh}>
            <ReportView violations={data.violations} />
          </GraphViewLayout>
        );
      case '/metrics':
        return (
          <GraphViewLayout loading={loading} onRefresh={handleRefresh}>
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

function ReportView({ violations }: { violations: ViolationInfo[] }) {
  const { t } = useT();
  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warn');
  const infos = violations.filter((v) => v.severity === 'info');

  return (
    <div style={styles.reportContainer} data-testid="report-view">
      <div style={styles.summary}>
        <div style={{ ...styles.summaryCard, borderColor: 'var(--color-error)' }}>
          <div style={styles.summaryNum}>{errors.length}</div>
          <div>{t('report.errors')}</div>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: 'var(--color-warning)' }}>
          <div style={styles.summaryNum}>{warnings.length}</div>
          <div>{t('report.warnings')}</div>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: 'var(--color-info)' }}>
          <div style={styles.summaryNum}>{infos.length}</div>
          <div>{t('report.info')}</div>
        </div>
      </div>
      <div style={styles.violationList} data-testid="violation-list">
        {violations.length === 0 ? (
          <div style={styles.emptyState}>{t('report.noViolations')}</div>
        ) : (
          violations.map((v, i) => (
            <div
              key={`${v.from}-${v.to}-${i}`}
              style={{
                ...styles.violationItem,
                borderLeftColor:
                  v.severity === 'error'
                    ? 'var(--color-error)'
                    : v.severity === 'warn'
                      ? 'var(--color-warning)'
                      : 'var(--color-info)',
              }}
              data-testid={`violation-${i}`}
            >
              <div style={styles.violationRule}>
                <span style={styles.violationSeverity}>{t(`severity.${v.severity}` as TKey)}</span>
                {v.rule}
              </div>
              <div style={styles.violationFrom}>
                {v.from} → {v.to}
              </div>
              {v.message && <div style={styles.violationMsg}>{v.message}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MetricsView({ data }: { data: ProcessedGraph }) {
  const { t } = useT();
  const edgeTypes = data.edges.reduce(
    (acc, e) => {
      acc[e.edge_type] = (acc[e.edge_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div style={styles.metricsContainer} data-testid="metrics-view">
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{data.meta.original_node_count}</div>
          <div style={styles.metricLabel}>{t('metrics.originalNodes')}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{data.meta.aggregated_node_count}</div>
          <div style={styles.metricLabel}>{t('metrics.aggregatedNodes')}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{data.edges.length}</div>
          <div style={styles.metricLabel}>{t('metrics.dependencies')}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{data.meta.total_violations}</div>
          <div style={styles.metricLabel}>{t('metrics.violations')}</div>
        </div>
      </div>
      <div style={styles.edgeTypes}>
        <h3 style={styles.edgeTypesTitle}>{t('metrics.edgeTypes')}</h3>
        {Object.entries(edgeTypes).map(([type, count]) => (
          <div key={type} style={styles.edgeTypeItem} data-testid={`edge-type-${type}`}>
            <span>{type}</span>
            <span>{count}</span>
          </div>
        ))}
      </div>
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
    borderBottom: '1px solid var(--color-border)',
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
  graphSplitLayout: {
    display: 'flex',
    gap: 16,
    flex: 1,
    minHeight: 0,
  },
  reportContainer: {
    background: 'var(--color-surface)',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  summary: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  },
  summaryCard: {
    flex: 1,
    padding: '16px',
    borderRadius: '8px',
    borderLeft: '4px solid',
    background: 'var(--color-bg)',
    textAlign: 'center',
  },
  summaryNum: {
    fontSize: '32px',
    fontWeight: 700,
  },
  violationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '600px',
    overflow: 'auto',
  },
  violationItem: {
    padding: '12px 16px',
    borderRadius: '8px',
    borderLeft: '4px solid',
    background: 'var(--color-bg)',
  },
  violationRule: {
    fontWeight: 600,
    fontSize: '14px',
    marginBottom: '4px',
  },
  violationSeverity: {
    marginRight: '8px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 700,
  },
  violationFrom: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
  },
  violationMsg: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginTop: '4px',
  },
  emptyState: {
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    padding: '32px',
  },
  metricsContainer: {
    background: 'var(--color-surface)',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  metricCard: {
    padding: '24px',
    borderRadius: '8px',
    background: 'var(--color-bg)',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: '36px',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
  },
  metricLabel: {
    fontSize: '14px',
    color: 'var(--color-text-secondary)',
    marginTop: '4px',
  },
  edgeTypes: {
    marginTop: '16px',
  },
  edgeTypesTitle: {
    fontSize: '16px',
    marginBottom: '12px',
  },
  edgeTypeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '6px',
    background: 'var(--color-bg)',
    marginBottom: '8px',
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
