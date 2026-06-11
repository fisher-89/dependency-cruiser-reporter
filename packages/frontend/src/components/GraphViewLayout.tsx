import { useCallback, useState, type ReactNode } from 'react';

import { useT } from '../i18n';
import { RefreshIcon, ScanIcon } from './icons';
import { ScanOverlay } from './ScanOverlay';

interface GraphViewLayoutProps {
  loading: boolean;
  onRefresh: () => void;
  children: ReactNode;
  stabilityHeatmap: boolean;
  onStabilityHeatmapChange: (value: boolean) => void;
}

export function GraphViewLayout({
  loading,
  onRefresh,
  children,
  stabilityHeatmap,
  onStabilityHeatmapChange,
}: GraphViewLayoutProps) {
  const { t } = useT();

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    const startTime = Date.now();
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch('/api/analyze', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        setScanError(body.details || body.error || res.statusText);
        return;
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : String(err));
      return;
    }
    // Success: ensure minimum display time of 500ms
    const elapsed = Date.now() - startTime;
    const minDisplay = 500;
    if (elapsed < minDisplay) {
      await new Promise((r) => setTimeout(r, minDisplay - elapsed));
    }
    setScanning(false);
    onRefresh();
  }, [onRefresh]);

  const handleDismissScan = useCallback(() => {
    setScanning(false);
    setScanError(null);
  }, []);

  const scanOverlayStatus = scanning && scanError ? 'error' : ('scanning' as 'scanning' | 'error');

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.actionBar}>
        <button
          type="button"
          style={styles.actionBtn}
          onClick={handleScan}
          disabled={scanning}
          title={t('action.scan')}
          aria-label={t('action.scan')}
        >
          <span className={scanning ? 'spinning' : undefined} style={styles.actionBtnIcon}>
            <ScanIcon />
          </span>
          {scanning ? t('action.scanning') : t('action.scan')}
        </button>
        <button
          type="button"
          style={{
            ...styles.actionBtn,
            ...(stabilityHeatmap ? styles.actionBtnActive : {}),
          }}
          onClick={() => onStabilityHeatmapChange?.(!stabilityHeatmap)}
          title={t('action.stabilityHeatmap')}
          aria-label={t('action.stabilityHeatmap')}
          aria-pressed={!!stabilityHeatmap}
        >
          {t('action.stabilityHeatmap')}
        </button>
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
      <ScanOverlay
        visible={scanning}
        status={scanOverlayStatus}
        errorMessage={scanError}
        onDismiss={handleDismissScan}
      />
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
  actionBtnActive: {
    border: '1px solid var(--color-accent)',
    background: 'var(--color-accent-bg)',
    color: 'var(--color-accent)',
  },
  actionBtnIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
