## 1. Theme infrastructure

- [x] 1.1 Create `src/styles/variables.css` — CSS custom properties for light (`:root`) and dark (`[data-theme="dark"]`)
- [x] 1.2 Create `src/theme/constants.ts` — G6 node/edge color maps for light and dark themes
- [x] 1.3 Create `src/theme/index.ts` — ThemeProvider (Context + data-theme attr + localStorage + matchMedia), useTheme() hook
- [x] 1.4 Create `src/components/icons.tsx` — SunIcon, MoonIcon, MonitorIcon inline SVG components
- [x] 1.5 Update `src/styles/main.css` — import variables.css
- [x] 1.6 Update `src/main.tsx` — wrap App with ThemeProvider, apply initial data-theme attribute

## 2. i18n infrastructure

- [x] 2.1 Create `src/i18n/en.ts` — English translation dictionary
- [x] 2.2 Create `src/i18n/zh-CN.ts` — Simplified Chinese translation dictionary
- [x] 2.3 Create `src/i18n/index.ts` — I18nProvider (Context + language detection), useT() hook with typed keys

## 3. Migrate App.tsx

- [x] 3.1 Replace all hardcoded English text with `t()` calls
- [x] 3.2 Replace all hardcoded hex colors in style objects with `var(--xxx)` references
- [x] 3.3 Add theme toggle button and language switcher buttons to header
- [x] 3.4 Wrap App with I18nProvider in main.tsx

## 4. Migrate DetailPanel.tsx

- [x] 4.1 Replace all hardcoded English text with `t()` calls
- [x] 4.2 Replace all hardcoded hex colors in style objects with `var(--xxx)` references
- [x] 4.3 Make severity/type badge colors use CSS variables

## 5. Migrate DependencyGraph.tsx

- [x] 5.1 Replace hardcoded NODE_STYLES and EDGE_STYLES with theme-aware selection via useTheme()
- [x] 5.2 Replace hardcoded graph container border color with CSS variable
- [x] 5.3 Replace hardcoded "No graph data available" text with `t()` call

## 6. Verification

- [x] 6.1 Run `pnpm build` to verify TypeScript compilation and build
- [x] 6.2 Run `pnpm demo` and visually verify: Chinese/English switch, light/dark/auto theme toggle
- [x] 6.3 Verify graph canvas colors change with theme (nodes, combos, edges)
- [x] 6.4 Verify theme preference persists across page reload
- [x] 6.5 Verify language preference persists across page reload
- [x] 6.6 Run `pnpm test` to ensure no regressions
