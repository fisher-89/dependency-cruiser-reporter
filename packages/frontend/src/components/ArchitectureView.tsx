import { type ReactNode, useEffect, useState } from 'react';
import { useT } from '../i18n';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; ArchitectureDiagram: ReactNode };

export function useArchitectureDiagram(): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/architecture/model');
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) setState({ status: 'empty' });
          } else {
            const body = await res.json().catch(() => ({ error: res.statusText }));
            if (!cancelled)
              setState({ status: 'error', message: body.details || body.error || res.statusText });
          }
          return;
        }

        const data = await res.json();

        const [{ LikeC4Model }, { layoutLikeC4Model }, diagram] = await Promise.all([
          import('@likec4/core/model'),
          import('@likec4/layouts'),
          import('@likec4/diagram'),
        ]);

        const model = LikeC4Model.create(data);
        const layouted = await layoutLikeC4Model(model);

        if (!cancelled) {
          const rawData = layouted.$data as unknown as Record<string, unknown>;
          const viewIds = Object.keys((rawData.views as Record<string, unknown>) || {});
          const firstViewId = viewIds[0] || 'index';
          const { LikeC4ModelProvider, ReactLikeC4 } = diagram;
          setState({
            status: 'ready',
            ArchitectureDiagram: (
              <LikeC4ModelProvider likec4model={layouted}>
                <ReactLikeC4 viewId={firstViewId} />
              </LikeC4ModelProvider>
            ),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function ArchitectureView() {
  const { t } = useT();
  const state = useArchitectureDiagram();

  if (state.status === 'loading') {
    return <div style={styles.center}>{t('architecture.loading')}</div>;
  }

  if (state.status === 'error') {
    return (
      <div style={styles.center}>
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
      <div style={styles.center}>
        <p>{t('architecture.empty')}</p>
      </div>
    );
  }

  return <div style={styles.diagramContainer}>{state.ArchitectureDiagram}</div>;
}

export default ArchitectureView;

const styles: Record<string, React.CSSProperties> = {
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--color-text-secondary)',
    fontSize: '16px',
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
    marginTop: '16px',
    padding: '8px 16px',
    background: 'var(--color-accent-bg)',
    color: 'var(--color-accent)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  diagramContainer: {
    width: '100%',
    height: '100%',
  },
};
