import { useT } from '../i18n';
import type { ViolationInfo } from '../types';

interface ReportViewProps {
  violations?: ViolationInfo[];
}

export function ReportView({ violations = [] }: ReportViewProps) {
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
                <span style={styles.violationSeverity}>{t(`severity.${v.severity}`)}</span>
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

const styles: Record<string, React.CSSProperties> = {
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
};
