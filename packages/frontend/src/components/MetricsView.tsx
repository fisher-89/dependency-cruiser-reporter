import { useT } from '../i18n';
import type { ProcessedGraph } from '../types';

interface MetricsViewProps {
  data: ProcessedGraph;
}

export function MetricsView({ data }: MetricsViewProps) {
  const { t } = useT();
  const edgeTypes = data.edges.reduce(
    (acc, e) => {
      acc[e.edge_type] = (acc[e.edge_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
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
};
