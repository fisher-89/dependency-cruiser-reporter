## Why

前端所有用户界面文本硬编码为英文，所有颜色硬编码为 hex 值。需要支持：
1. **国际化 (i18n)**：简体中文和英文界面，架构预留其他语言扩展
2. **深色模式**：用户可手动选择浅色/深色/跟随系统

## What Changes

- 新增 `src/i18n/` 目录：翻译文件 (`en.ts`, `zh-CN.ts`) + React Context + `useT()` hook
- 新增 `src/theme/` 目录：CSS 变量定义 + React Context + `useTheme()` hook
- 新增 `src/styles/variables.css`：语义化 CSS 自定义属性（浅色/深色两套）
- 新增 `src/components/icons.tsx`：SunIcon / MoonIcon / MonitorIcon 三个内联 SVG 组件
- 修改 `App.tsx`：替换所有硬编码文本为 `t()` 调用，替换所有硬编码颜色为 `var(--xxx)` 引用
- 修改 `DetailPanel.tsx`：同上
- 修改 `DependencyGraph.tsx`：G6 节点/边颜色从 theme context 读取
- 修改 `main.tsx`：包裹 `<ThemeProvider>` 和 `<I18nProvider>`
- 修改 `main.css`：引入 `variables.css`
- 新增 UI 控件：Header 中的语言切换按钮 (`EN | 中文`) 和主题循环按钮 (☀/🌙/🖥)

## Capabilities

### New Capabilities

- `i18n`：国际化翻译系统，支持多语言，当前包含 en 和 zh-CN
- `dark-mode`：主题系统，支持浅色/深色/自动三种模式

### Modified Capabilities

- `frontend`：组件结构、状态管理、样式规范更新

## Impact

- `packages/frontend/src/` — 新增 i18n/、theme/、styles/variables.css、components/icons.tsx
- `packages/frontend/src/App.tsx` — 颜色和文本替换
- `packages/frontend/src/components/DetailPanel.tsx` — 颜色和文本替换
- `packages/frontend/src/components/DependencyGraph.tsx` — G6 主题感知颜色
- `packages/frontend/src/main.tsx` — Provider 嵌套
- `packages/frontend/src/styles/main.css` — CSS 变量引入
- `packages/frontend/index.html` — `lang` 属性动态设置
