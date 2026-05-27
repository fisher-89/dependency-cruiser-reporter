import type { ReactNode } from 'react';
import { useT } from '../i18n';
import { RefreshIcon } from './icons';

interface GraphViewLayoutProps {
  loading: boolean;
  onRefresh: () => void;
  children: ReactNode;
}

export function GraphViewLayout({ loading, onRefresh, children }: GraphViewLayoutProps) {
  const { t } = useT();

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.actionBar}>
        <button
          type="button"
          style={styles.actionBtn}
          onClick={onRefresh}
          disabled={loading}
          title={t('nav.refresh')}
          aria-label={t('nav.refresh')}
        >
          <span className={loading ? 'spinning' : undefined} style={styles.actionBtnIcon}>
            <RefreshIcon />
          </span>
          {t('nav.refresh')}
        </button>
      </div>
      {children}
    </div>
  );
}

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
};
