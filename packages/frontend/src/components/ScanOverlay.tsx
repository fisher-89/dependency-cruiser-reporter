import { useEffect } from 'react';

import { useT } from '../i18n';
import { useTheme } from '../theme';
import { ScanIcon } from './icons';

interface ScanOverlayProps {
  visible: boolean;
  status: 'scanning' | 'error';
  errorMessage: string | null;
  onDismiss?: () => void;
}

export function ScanOverlay({ visible, status, errorMessage, onDismiss }: ScanOverlayProps) {
  const { t } = useT();
  const { resolvedTheme } = useTheme();

  // Block all keyboard events when visible
  useEffect(() => {
    if (!visible) return;

    const handler = (e: KeyboardEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };

    document.addEventListener('keydown', handler, true);
    document.addEventListener('keyup', handler, true);

    return () => {
      document.removeEventListener('keydown', handler, true);
      document.removeEventListener('keyup', handler, true);
    };
  }, [visible]);

  if (!visible) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const overlayBg = resolvedTheme === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)';

  return (
    <div
      style={{ ...styles.overlay, background: overlayBg }}
      data-testid="scan-overlay"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <div style={styles.card}>
        {status === 'scanning' ? (
          <>
            <span className="spinning" style={styles.icon}>
              <ScanIcon />
            </span>
            <div style={styles.statusText}>{t('action.scanning')}</div>
            <div style={styles.spinner} data-testid="scan-spinner" />
          </>
        ) : (
          <>
            <ErrorCircleIcon />
            <div style={styles.errorTitle}>{t('action.scanError')}</div>
            <div style={styles.errorMessage}>{errorMessage}</div>
            {onDismiss && (
              <button type="button" style={styles.dismissBtn} onClick={onDismiss}>
                {t('action.scanOverlayClose')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ErrorCircleIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-error)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Error"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(2px)',
    outline: 'none',
  },
  card: {
    background: 'var(--color-surface)',
    borderRadius: '12px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    minWidth: '280px',
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: '16px',
    color: 'var(--color-text-primary)',
    textAlign: 'center',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid var(--color-border)',
    borderTopColor: 'var(--color-accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--color-error)',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    textAlign: 'center',
    wordBreak: 'break-word',
    maxWidth: '400px',
  },
  dismissBtn: {
    marginTop: '8px',
    padding: '6px 12px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    cursor: 'pointer',
    borderRadius: '6px',
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
  },
};
