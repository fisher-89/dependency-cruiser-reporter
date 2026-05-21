import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { DependencyGraph } from './components/DependencyGraph/DependencyGraph';
import { DetailPanel } from './components/DetailPanel';
import { MonitorIcon, MoonIcon, SunIcon } from './components/icons';
import { useT } from './i18n';
import type { TKey } from './i18n';
import { useTheme } from './theme';
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

function App() {
  const { t, lang, setLang } = useT();
  const { theme, cycleTheme } = useTheme();
  const [data, setData] = useState<ProcessedGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const fetchGraph = useCallback(async (newExpandedDirs?: string[]) => {
    setLoading(true);
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
          setSelectedNodeId(null);
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

  const handleToggleDir = useCallback(
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

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ProcessedGraph;
      setData(parsed);
      setSelectedNodeId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse JSON');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith('.json')) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const themeIcon =
    theme === 'dark' ? <MoonIcon /> : theme === 'light' ? <SunIcon /> : <MonitorIcon />;
  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';

  /**
   * Renders the view for a given route configuration.
   * - `needsData: false` routes (e.g. `/architecture`) always render their view.
   * - `needsData: true` routes show the upload area when `data` is null.
   * - When data is available, renders the corresponding view component + reset button.
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
        <div
          style={styles.uploadArea}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          data-testid="upload-area"
        >
          <input
            type="file"
            accept=".json"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            style={styles.fileInput}
            id="file-input"
            data-testid="file-input"
          />
          <label htmlFor="file-input" style={styles.uploadLabel}>
            <div style={styles.uploadIcon}>📁</div>
            <div>{t('upload.prompt')}</div>
            <div style={styles.uploadHint}>{t('upload.hint')}</div>
          </label>
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
          <>
            <div style={styles.graphSplitLayout} data-testid="graph-view">
              <DependencyGraph
                data={data}
                onToggleDir={handleToggleDir}
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
            <button
              type="button"
              style={styles.resetBtn}
              onClick={() => setData(null)}
              data-testid="reset-btn"
            >
              {t('upload.newFile')}
            </button>
          </>
        );
      case '/report':
        return (
          <>
            <ReportView violations={data.violations} />
            <button
              type="button"
              style={styles.resetBtn}
              onClick={() => setData(null)}
              data-testid="reset-btn"
            >
              {t('upload.newFile')}
            </button>
          </>
        );
      case '/metrics':
        return (
          <>
            <MetricsView data={data} />
            <button
              type="button"
              style={styles.resetBtn}
              onClick={() => setData(null)}
              data-testid="reset-btn"
            >
              {t('upload.newFile')}
            </button>
          </>
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
          <div style={styles.langSwitcher}>
            <button
              type="button"
              style={{ ...styles.langBtn, ...(lang === 'en' ? styles.langBtnActive : {}) }}
              onClick={() => setLang('en')}
              data-testid="lang-en"
            >
              EN
            </button>
            <button
              type="button"
              style={{ ...styles.langBtn, ...(lang === 'zh-CN' ? styles.langBtnActive : {}) }}
              onClick={() => setLang('zh-CN')}
              data-testid="lang-zh"
            >
              中文
            </button>
          </div>
          <button
            type="button"
            style={styles.themeBtn}
            onClick={cycleTheme}
            title={t(`theme.${nextTheme}`)}
            data-testid="theme-toggle"
          >
            {themeIcon}
          </button>
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
  langSwitcher: {
    display: 'flex',
    gap: '2px',
  },
  langBtn: {
    padding: '4px 8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
  },
  langBtnActive: {
    background: 'var(--color-accent-bg)',
    color: 'var(--color-accent)',
  },
  themeBtn: {
    padding: '6px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: '4px',
    color: 'var(--color-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  fileInput: {
    display: 'none',
  },
  uploadLabel: {
    cursor: 'pointer',
    display: 'block',
  },
  uploadIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  uploadHint: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    marginTop: '8px',
  },
  error: {
    color: 'var(--color-error)',
    marginTop: '16px',
  },
  graphSplitLayout: {
    display: 'flex',
    gap: 16,
    height: '100%',
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
  resetBtn: {
    marginTop: '16px',
    padding: '8px 16px',
    background: 'var(--color-btn-bg)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
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
