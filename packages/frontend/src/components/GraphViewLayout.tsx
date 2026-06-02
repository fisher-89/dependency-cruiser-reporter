import type { ReactNode } from 'react';

import { useT } from '../i18n';
import { RefreshIcon, ScanIcon } from './icons';

interface GraphViewLayoutProps {
  loading: boolean;
  onRefresh: () => void;
  onScan?: () => void;
  scanning?: boolean;
  scanError?: string | null;
  children: ReactNode;
}

export function GraphViewLayout({
  loading,
  onRefresh,
  onScan,
  scanning,
  scanError,
  children,
}: GraphViewLayoutProps) {
  const { t } = useT();

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.actionBar}>
        {onScan && (
          <button
            type="button"
            style={styles.actionBtn}
            onClick={onScan}
            disabled={scanning}
            title={t('action.scan')}
            aria-label={t('action.scan')}
          >
            <span className={scanning ? 'spinning' : undefined} style={styles.actionBtnIcon}>
              <ScanIcon />
            </span>
            {scanning ? t('action.scanning') : t('action.scan')}
          </button>
        )}
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
      {scanError && (
        <div style={styles.errorText}>
          {t('action.scanError')}: {scanError}
        </div>
      )}
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
    gap: '8px',
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
  errorText: {
    color: 'var(--color-error)',
    fontSize: '13px',
    paddingBottom: '8px',
  },
};
