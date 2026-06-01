import { useMemo } from 'react';

import { type TKey, useT } from '../i18n';
import type { GraphEdge, GraphNode, ViolationInfo } from '../types';

interface Props {
  node: GraphNode | null;
  edges: GraphEdge[];
  violations: ViolationInfo[];
  nodeMap: Map<string, GraphNode>;
}

const EDGE_TYPE_LABELS: Record<string, string> = {
  local: 'Local',
  npm: 'NPM',
  core: 'Core',
  dynamic: 'Dynamic',
};

const SEVERITY_VARS: Record<string, string> = {
  error: 'var(--color-error)',
  warn: 'var(--color-warning)',
  info: 'var(--color-info)',
};

export function DetailPanel({ node, edges, violations, nodeMap }: Props) {
  const { t } = useT();

  const deps = useMemo(() => {
    if (!node) return { outgoing: new Map(), incoming: new Map() };
    const outgoing = new Map<string, GraphEdge[]>();
    const incoming = new Map<string, GraphEdge[]>();
    for (const e of edges) {
      if (e.source === node.id) {
        const list = outgoing.get(e.edge_type);
        if (list) {
          list.push(e);
        } else {
          outgoing.set(e.edge_type, [e]);
        }
      }
      if (e.target === node.id) {
        const list = incoming.get(e.edge_type);
        if (list) {
          list.push(e);
        } else {
          incoming.set(e.edge_type, [e]);
        }
      }
    }
    return { outgoing, incoming };
  }, [node, edges]);

  const stability = useMemo(() => {
    if (!node) return null;
    let ce = 0;
    let ca = 0;
    for (const e of edges) {
      if (e.source === node.id) ce++;
      if (e.target === node.id) ca++;
    }
    const total = ce + ca;
    if (total === 0) return null;
    return { i: ce / total, ce, ca };
  }, [node, edges]);

  const nodeViolations = useMemo(() => {
    if (!node) return [];
    return violations.filter(
      (v) =>
        v.from === node.label || v.to === node.label || v.from === node.path || v.to === node.path,
    );
  }, [node, violations]);

  if (!node) {
    return (
      <div style={styles.panel}>
        <div style={styles.placeholder}>
          <div style={styles.placeholderIcon}>◉</div>
          <div style={styles.placeholderText}>{t('detail.clickHint')}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.scrollArea}>
        {/* Node Identity */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>{t('detail.nodeDetails')}</h3>
          <div style={styles.identityLabel}>{node.label}</div>
          {node.path && <div style={styles.identityPath}>{node.path}</div>}
          <div style={styles.identityMeta}>
            <span
              style={{
                ...styles.typeBadge,
                background:
                  node.node_type === 'directory'
                    ? '#fff7e6'
                    : node.node_type === 'package'
                      ? '#f6ffed'
                      : '#e6f7ff',
                color:
                  node.node_type === 'directory'
                    ? '#d46b08'
                    : node.node_type === 'package'
                      ? '#389e0d'
                      : '#096dd9',
                borderColor:
                  node.node_type === 'directory'
                    ? '#ffd591'
                    : node.node_type === 'package'
                      ? '#b7eb8f'
                      : '#91d5ff',
              }}
            >
              {node.node_type}
            </span>
            {node.violation_count > 0 && (
              <span style={styles.violationCount}>
                {node.violation_count} violation{node.violation_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </section>

        {/* Stability */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>{t('detail.stability')}</h3>
          {stability ? (
            <div>
              <div style={styles.stabilityValue}>
                <span>
                  I = {stability.ce} / ({stability.ce}+{stability.ca}) = {stability.i.toFixed(2)}
                </span>
              </div>
              <div style={styles.progressBarBg}>
                <div
                  style={{
                    ...styles.progressBarFill,
                    width: `${stability.i * 100}%`,
                    background:
                      stability.i > 0.7
                        ? 'var(--color-error)'
                        : stability.i > 0.3
                          ? 'var(--color-warning)'
                          : '#52c41a',
                  }}
                />
              </div>
              <div style={styles.stabilityLegend}>
                <span style={{ color: '#52c41a' }}>{t('detail.stable')}</span>
                <span style={{ color: 'var(--color-warning)' }}>{t('detail.balanced')}</span>
                <span style={{ color: 'var(--color-error)' }}>{t('detail.unstable')}</span>
              </div>
            </div>
          ) : (
            <div style={styles.naText}>{t('detail.naNoEdges')}</div>
          )}
        </section>

        {/* Dependencies (outgoing) */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>{t('detail.dependencies')}</h3>
          {deps.outgoing.size === 0 ? (
            <div style={styles.emptyText}>{t('detail.none')}</div>
          ) : (
            Array.from(deps.outgoing.entries()).map(([edgeType, edgeList]) => (
              <div key={edgeType} style={styles.edgeGroup}>
                <div style={styles.edgeGroupHeader}>
                  {EDGE_TYPE_LABELS[edgeType] ?? edgeType} ({edgeList.length})
                </div>
                <ul style={styles.edgeList}>
                  {edgeList.map((e: GraphEdge) => {
                    const targetNode = nodeMap.get(e.target);
                    return (
                      <li key={`${e.source}-${e.target}`} style={styles.edgeItem}>
                        {targetNode?.path ?? targetNode?.label ?? e.target}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </section>

        {/* Dependents (incoming) */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>{t('detail.dependents')}</h3>
          {deps.incoming.size === 0 ? (
            <div style={styles.emptyText}>{t('detail.none')}</div>
          ) : (
            Array.from(deps.incoming.entries()).map(([edgeType, edgeList]) => (
              <div key={edgeType} style={styles.edgeGroup}>
                <div style={styles.edgeGroupHeader}>
                  {EDGE_TYPE_LABELS[edgeType] ?? edgeType} ({edgeList.length})
                </div>
                <ul style={styles.edgeList}>
                  {edgeList.map((e: GraphEdge) => {
                    const sourceNode = nodeMap.get(e.source);
                    return (
                      <li key={`${e.source}-${e.target}`} style={styles.edgeItem}>
                        {sourceNode?.path ?? sourceNode?.label ?? e.source}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </section>

        {/* Violations */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>{t('detail.violations')}</h3>
          {nodeViolations.length === 0 ? (
            <div style={styles.emptyText}>{t('detail.noViolations')}</div>
          ) : (
            nodeViolations
              .sort((a, b) => {
                const order: Record<string, number> = { error: 0, warn: 1, info: 2 };
                return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
              })
              .map((v, i) => (
                <div
                  key={`${v.from}-${v.to}-${v.rule}-${i}`}
                  style={{
                    ...styles.violationItem,
                    borderLeftColor: SEVERITY_VARS[v.severity] ?? 'var(--color-text-muted)',
                  }}
                >
                  <div style={styles.violationHeader}>
                    <span
                      style={{
                        ...styles.violationSeverity,
                        background: SEVERITY_VARS[v.severity] ?? 'var(--color-text-muted)',
                      }}
                    >
                      {t(`severity.${v.severity}` as TKey)}
                    </span>
                    <span style={styles.violationRule}>{v.rule}</span>
                  </div>
                  <div style={styles.violationRel}>
                    {v.from} → {v.to}
                  </div>
                  {v.message && <div style={styles.violationMsg}>{v.message}</div>}
                </div>
              ))
          )}
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 320,
    minWidth: 320,
    height: 'calc(100% - 48px)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  scrollArea: {
    height: '100%',
    overflow: 'auto',
    padding: '16px',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--color-text-muted)',
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.3,
  },
  placeholderText: {
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    margin: '0 0 8px 0',
    letterSpacing: '0.5px',
  },
  identityLabel: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    wordBreak: 'break-all',
  },
  identityPath: {
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    marginTop: 4,
    wordBreak: 'break-all',
  },
  identityMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  typeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid',
  },
  violationCount: {
    fontSize: 12,
    color: 'var(--color-error)',
    fontWeight: 600,
  },
  stabilityValue: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  progressBarBg: {
    height: 8,
    background: 'var(--color-border)',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  stabilityLegend: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 4,
    fontSize: 10,
  },
  naText: {
    color: 'var(--color-text-muted)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  emptyText: {
    color: 'var(--color-text-muted)',
    fontSize: 13,
  },
  edgeGroup: {
    marginBottom: 8,
  },
  edgeGroupHeader: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: 4,
  },
  edgeList: {
    margin: 0,
    paddingLeft: 16,
    listStyle: 'disc',
  },
  edgeItem: {
    fontSize: 12,
    color: 'var(--color-text-primary)',
    lineHeight: '20px',
    wordBreak: 'break-all',
  },
  violationItem: {
    padding: '8px 12px',
    borderRadius: 6,
    borderLeft: '3px solid',
    background: 'var(--color-bg)',
    marginBottom: 6,
  },
  violationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  violationSeverity: {
    padding: '1px 6px',
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 700,
    color: '#fff',
    textTransform: 'uppercase',
  },
  violationRule: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  violationRel: {
    fontSize: 11,
    color: 'var(--color-text-secondary)',
  },
  violationMsg: {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    marginTop: 2,
  },
};
