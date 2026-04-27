import { useCallback, useState } from 'react';
import type { ProcessedGraph, ViewMode, ViolationInfo } from './types';

function App() {
  const [data, setData] = useState<ProcessedGraph | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ProcessedGraph;
      setData(parsed);
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

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Dependency Cruiser Reporter</h1>
        <nav style={styles.nav}>
          <button
            type="button"
            style={{ ...styles.navBtn, ...(viewMode === 'graph' ? styles.navBtnActive : {}) }}
            onClick={() => setViewMode('graph')}
            data-testid="nav-graph"
          >
            Graph
          </button>
          <button
            type="button"
            style={{ ...styles.navBtn, ...(viewMode === 'report' ? styles.navBtnActive : {}) }}
            onClick={() => setViewMode('report')}
            data-testid="nav-report"
          >
            Report
          </button>
          <button
            type="button"
            style={{ ...styles.navBtn, ...(viewMode === 'metrics' ? styles.navBtnActive : {}) }}
            onClick={() => setViewMode('metrics')}
            data-testid="nav-metrics"
          >
            Metrics
          </button>
        </nav>
      </header>

      <main style={styles.main}>
        {!data ? (
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
              <div>Drop JSON file here or click to upload</div>
              <div style={styles.uploadHint}>Upload dependency-cruiser JSON output</div>
            </label>
            {loading && <div data-testid="loading">Loading...</div>}
            {error && (
              <div style={styles.error} data-testid="error-message">
                {error}
              </div>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'graph' && <GraphView data={data} />}
            {viewMode === 'report' && <ReportView violations={data.violations} />}
            {viewMode === 'metrics' && <MetricsView data={data} />}
            <button
              type="button"
              style={styles.resetBtn}
              onClick={() => setData(null)}
              data-testid="reset-btn"
            >
              Upload New File
            </button>
          </>
        )}
      </main>
    </div>
  );
}

function GraphView({ data }: { data: ProcessedGraph }) {
  return (
    <div style={styles.graphContainer} data-testid="graph-view">
      <div style={styles.graphInfo}>
        <span data-testid="node-count">{data.meta.aggregated_node_count} nodes</span>
        <span data-testid="edge-count">{data.edges.length} edges</span>
        <span data-testid="agg-level">{data.meta.aggregation_level}</span>
      </div>
      <svg width="800" height="500" style={styles.graph} aria-label="Dependency graph">
        <title>Dependency Graph</title>
        {data.nodes.map((node, i) => {
          const x = 100 + (i % 5) * 150;
          const y = 100 + Math.floor(i / 5) * 100;
          return (
            <g key={node.id} transform={`translate(${x},${y})`}>
              <circle r="20" fill="#4a90d9" data-testid={`node-${node.id}`} />
              <text y="35" textAnchor="middle" fontSize="10">
                {node.label}
              </text>
            </g>
          );
        })}
        {data.edges.slice(0, 20).map((edge, i) => {
          const srcIdx = data.nodes.findIndex((n) => n.id === edge.source);
          const tgtIdx = data.nodes.findIndex((n) => n.id === edge.target);
          if (srcIdx < 0 || tgtIdx < 0) return null;
          const x1 = 100 + (srcIdx % 5) * 150;
          const y1 = 100 + Math.floor(srcIdx / 5) * 100;
          const x2 = 100 + (tgtIdx % 5) * 150;
          const y2 = 100 + Math.floor(tgtIdx / 5) * 100;
          return (
            <line
              key={`${edge.source}-${edge.target}-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#999"
              strokeWidth={Math.min(edge.weight, 3)}
              data-testid={`edge-${edge.source}-${edge.target}`}
            />
          );
        })}
      </svg>
    </div>
  );
}

function ReportView({ violations }: { violations: ViolationInfo[] }) {
  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warn');
  const infos = violations.filter((v) => v.severity === 'info');

  return (
    <div style={styles.reportContainer} data-testid="report-view">
      <div style={styles.summary}>
        <div style={{ ...styles.summaryCard, borderColor: '#ef4444' }}>
          <div style={styles.summaryNum}>{errors.length}</div>
          <div>Errors</div>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: '#f59e0b' }}>
          <div style={styles.summaryNum}>{warnings.length}</div>
          <div>Warnings</div>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: '#3b82f6' }}>
          <div style={styles.summaryNum}>{infos.length}</div>
          <div>Info</div>
        </div>
      </div>
      <div style={styles.violationList} data-testid="violation-list">
        {violations.length === 0 ? (
          <div style={styles.emptyState}>No violations found</div>
        ) : (
          violations.map((v, i) => (
            <div
              key={`${v.from}-${v.to}-${i}`}
              style={{
                ...styles.violationItem,
                borderLeftColor:
                  v.severity === 'error'
                    ? '#ef4444'
                    : v.severity === 'warn'
                      ? '#f59e0b'
                      : '#3b82f6',
              }}
              data-testid={`violation-${i}`}
            >
              <div style={styles.violationRule}>
                <span style={styles.violationSeverity}>{v.severity.toUpperCase()}</span>
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
          <div style={styles.metricLabel}>Original Nodes</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{data.meta.aggregated_node_count}</div>
          <div style={styles.metricLabel}>Aggregated Nodes</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{data.edges.length}</div>
          <div style={styles.metricLabel}>Dependencies</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricValue}>{data.meta.total_violations}</div>
          <div style={styles.metricLabel}>Violations</div>
        </div>
      </div>
      <div style={styles.edgeTypes}>
        <h3 style={styles.edgeTypesTitle}>Edge Types</h3>
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
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e293b',
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
    color: '#64748b',
  },
  navBtnActive: {
    background: '#e0f2fe',
    color: '#0284c7',
  },
  main: {
    padding: '24px',
  },
  uploadArea: {
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '48px',
    textAlign: 'center',
    background: '#fff',
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
    color: '#94a3b8',
    marginTop: '8px',
  },
  error: {
    color: '#ef4444',
    marginTop: '16px',
  },
  graphContainer: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  graphInfo: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#64748b',
  },
  graph: {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  },
  reportContainer: {
    background: '#fff',
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
    background: '#f8fafc',
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
    background: '#f8fafc',
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
    color: '#64748b',
  },
  violationMsg: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  emptyState: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '32px',
  },
  metricsContainer: {
    background: '#fff',
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
    background: '#f8fafc',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#1e293b',
  },
  metricLabel: {
    fontSize: '14px',
    color: '#64748b',
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
    background: '#f8fafc',
    marginBottom: '8px',
  },
  resetBtn: {
    marginTop: '16px',
    padding: '8px 16px',
    background: '#e2e8f0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default App;
