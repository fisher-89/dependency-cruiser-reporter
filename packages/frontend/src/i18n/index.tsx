import { createContext, useCallback, useContext, useState } from 'react';

import en from './en-US';
import zhCN from './zh-CN';

const translations = { en, 'zh-CN': zhCN } as const;
type Lang = keyof typeof translations;
type TranslationDict = typeof en;

type Paths<T> = {
  [K in keyof T]: K extends string
    ? T[K] extends string
      ? K
      : T[K] extends Record<string, string>
        ? `${K}.${string & keyof T[K]}`
        : never
    : never;
}[keyof T];

export type TKey = Paths<TranslationDict>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

function detectLang(): Lang {
  const stored = localStorage.getItem('lang');
  if (stored === 'en' || stored === 'zh-CN') return stored;
  if (navigator.language.startsWith('zh')) return 'zh-CN';
  return 'en';
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = useCallback((newLang: Lang) => {
    localStorage.setItem('lang', newLang);
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const parts = key.split('.');
      let current: unknown = translations[lang];
      for (const part of parts) {
        if (!isRecord(current)) return key;
        current = current[part];
      }
      return typeof current === 'string' ? current : key;
    },
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within I18nProvider');
  return ctx;
}
