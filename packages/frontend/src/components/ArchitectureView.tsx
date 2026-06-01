import { LikeC4ModelProvider, ReactLikeC4 } from '@likec4/diagram';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { useT } from '../i18n';
import { RefreshIcon } from './icons';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; ArchitectureDiagram: ReactNode };

export function useArchitectureDiagram(): { state: State; reload: () => void } {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [viewId, setViewId] = useState<string>('');
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/architecture/model');
      if (!res.ok) {
        if (res.status === 404) {
          setState({ status: 'empty' });
        } else {
          const body = await res.json().catch(() => ({ error: res.statusText }));
          setState({ status: 'error', message: body.details || body.error || res.statusText });
        }
        return;
      }

      const data = await res.json();

      const [{ LikeC4Model }, { layoutLikeC4Model }] = await Promise.all([
        import('@likec4/core/model'),
        import('@likec4/layouts'),
      ]);

      const model = LikeC4Model.create(data);
      const layouted = await layoutLikeC4Model(model);

      const rawData = layouted.$data as unknown as Record<string, unknown>;
      if (!viewId) {
        const viewIds = Object.keys((rawData.views as Record<string, unknown>) || {});
        setViewId(viewIds.includes('all') ? 'all' : viewIds[0] || 'index');
      }
      setState({
        status: 'ready',
        ArchitectureDiagram: (
          <LikeC4ModelProvider likec4model={layouted}>
            <ReactLikeC4
              viewId={viewId}
              pannable={true}
              enableDynamicViewWalkthrough={true}
              enableFocusMode={true}
              enableRelationshipBrowser={true}
              enableElementDetails={true}
              enableRelationshipDetails={true}
              enableSearch={true}
              enableElementTags={true}
              enableNotes={true}
              enableCompareWithLatest={true}
              controls={true}
              fitView={true}
              showNavigationButtons={true}
              onNavigateTo={setViewId}
            />
          </LikeC4ModelProvider>
        ),
      });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [viewId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}

export function ArchitectureView() {
  const { t } = useT();
  const { state, reload } = useArchitectureDiagram();
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const prevState = useRef(state);

  useEffect(() => {
    if (prevState.current !== state) {
      setRefreshing(false);
      prevState.current = state;
    }
  }, [state]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    reload();
  }, [reload]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/architecture/generate', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        setGenerateError(body.details || body.error || res.statusText);
      } else {
        reload();
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }, [reload]);

  if (state.status === 'loading') {
    return (
      <div style={styles.center} data-testid="architecture-view">
        {t('architecture.loading')}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div style={styles.center} data-testid="architecture-view">
        <div style={styles.errorIcon}>!</div>
        <p>{t('architecture.error')}</p>
        <p style={styles.errorDetail}>{state.message}</p>
        <button type="button" style={styles.retryBtn} onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  if (state.status === 'empty') {
    return (
      <div style={styles.center} data-testid="architecture-view">
        <div style={styles.emptyIcon}>🏗</div>
        <p style={styles.emptyTitle}>{t('architecture.createPrompt')}</p>
        {generateError && <p style={styles.errorDetail}>{generateError}</p>}
        <button
          type="button"
          style={{ ...styles.retryBtn, ...(generating ? styles.btnDisabled : {}) }}
          onClick={handleGenerate}
          disabled={generating}
          data-testid="generate-architecture-btn"
        >
          {generating ? t('architecture.creating') : t('architecture.createBtn')}
        </button>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper} data-testid="architecture-view">
      <div style={styles.actionBar}>
        <button
          type="button"
          style={styles.actionBtn}
          onClick={handleRefresh}
          disabled={refreshing}
          title={t('nav.refresh')}
          aria-label={t('nav.refresh')}
        >
          <span className={refreshing ? 'spinning' : undefined} style={styles.actionBtnIcon}>
            <RefreshIcon />
          </span>
          {t('nav.refresh')}
        </button>
      </div>
      <div style={styles.diagramContainer}>{state.ArchitectureDiagram}</div>
    </div>
  );
}

export default ArchitectureView;

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    paddingBottom: '12px',
    flexShrink: 0,
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    cursor: 'pointer',
    borderRadius: '6px',
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
  },
  actionBtnIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--color-text-secondary)',
    fontSize: '16px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '16px',
    color: 'var(--color-text-secondary)',
    marginBottom: '24px',
    maxWidth: '400px',
    textAlign: 'center',
    lineHeight: '1.5',
  },
  errorIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'var(--color-error)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '16px',
  },
  errorDetail: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    maxWidth: '500px',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: '8px',
    padding: '10px 24px',
    background: 'var(--color-accent-bg)',
    color: 'var(--color-accent)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  diagramContainer: {
    flex: 1,
    minHeight: 0,
  },
};
