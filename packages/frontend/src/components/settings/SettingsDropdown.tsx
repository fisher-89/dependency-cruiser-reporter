import { useEffect, useRef, useState } from 'react';

import { useT } from '../../i18n';
import { useTheme } from '../../theme';
import { MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from '../icons';

export function SettingsDropdown() {
  const { t, lang, setLang } = useT();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} style={styles.container}>
      <button
        type="button"
        style={styles.toggle}
        onClick={() => setIsOpen((v) => !v)}
        title={t('settings.label')}
        data-testid="settings-toggle"
      >
        <SettingsIcon />
      </button>
      {isOpen && (
        <div style={styles.dropdown} data-testid="settings-dropdown">
          <div style={styles.section}>
            <div style={styles.sectionLabel}>{t('settings.language')}</div>
            <div style={styles.options}>
              <button
                type="button"
                style={{
                  ...styles.optionBtn,
                  ...(lang === 'en' ? styles.optionActive : {}),
                }}
                onClick={() => {
                  setLang('en');
                  setIsOpen(false);
                }}
                data-testid="lang-en"
              >
                EN
              </button>
              <button
                type="button"
                style={{
                  ...styles.optionBtn,
                  ...(lang === 'zh-CN' ? styles.optionActive : {}),
                }}
                onClick={() => {
                  setLang('zh-CN');
                  setIsOpen(false);
                }}
                data-testid="lang-zh"
              >
                中文
              </button>
            </div>
          </div>
          <div style={styles.section}>
            <div style={styles.sectionLabel}>{t('settings.theme')}</div>
            <div style={styles.options}>
              <button
                type="button"
                style={{
                  ...styles.optionBtn,
                  ...(theme === 'light' ? styles.optionActive : {}),
                }}
                onClick={() => setTheme('light')}
                title={t('theme.light')}
                data-testid="theme-light"
              >
                <SunIcon />
              </button>
              <button
                type="button"
                style={{
                  ...styles.optionBtn,
                  ...(theme === 'dark' ? styles.optionActive : {}),
                }}
                onClick={() => setTheme('dark')}
                title={t('theme.dark')}
                data-testid="theme-dark"
              >
                <MoonIcon />
              </button>
              <button
                type="button"
                style={{
                  ...styles.optionBtn,
                  ...(theme === 'auto' ? styles.optionActive : {}),
                }}
                onClick={() => setTheme('auto')}
                title={t('theme.auto')}
                data-testid="theme-auto"
              >
                <MonitorIcon />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { position: 'relative' },
  toggle: {
    padding: '6px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: '4px',
    color: 'var(--color-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    padding: '12px',
    minWidth: '160px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 100,
  },
  section: { marginBottom: '12px' },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    marginBottom: '6px',
    padding: '0 4px',
  },
  options: { display: 'flex', gap: '4px' },
  optionBtn: {
    padding: '4px 8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    background: 'var(--color-accent-bg)',
    color: 'var(--color-accent)',
  },
};
