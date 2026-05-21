## Context

前端目前是一个单文件应用（App.tsx ~510行），所有文本和颜色硬编码在组件中。需要同时添加国际化和深色模式，两者共享 Provider/Context 模式。

当前技术约束：
- React 19，使用内联 `React.CSSProperties` 样式对象
- AntV G6 5 图形库，颜色在 JS 中设置（非 CSS）
- 无外部状态管理库（仅 `useState`）
- 无 CSS 预处理器或 CSS-in-JS 库
- Vite 5 构建

## Goals / Non-Goals

**Goals:**
- 支持简体中文 (zh-CN) 和英文 (en) 界面
- 架构预留扩展：添加新语言只需增加一个翻译文件
- 支持浅色/深色/自动（跟随浏览器）三种主题模式
- 主题切换即时生效，无需刷新页面
- 语言和主题偏好持久化到 localStorage
- G6 图形颜色跟随主题变化
- 零外部依赖（不引入 i18next 或 CSS 框架）

**Non-Goals:**
- 日期/数字格式化（应用不需要）
- 复数规则引擎（手动处理简单英文复数）
- RTL 语言支持
- 运行时动态加载翻译文件（应用太小，无需代码分割）
- 主题自定义/颜色选择器（仅三态切换）

## Decisions

### Decision 1: 自定义 i18n 方案（非 i18next）

**方案**：React Context + JSON 翻译文件 + `as const` 类型推断。

**理由**：
- 应用仅有 ~60 个翻译键，无需 i18next 的命名空间/延迟加载/ICU 消息
- 自定义方案约 60 行代码，零依赖
- TypeScript `as const` 提供完美的键名自动补全和类型检查
- 翻译文件结构与 i18next 兼容，未来可平滑迁移

**翻译文件结构**：
```typescript
// en.ts
export default {
  app: { title: "Dependency Cruiser Reporter" },
  nav: { graph: "Graph", report: "Report", metrics: "Metrics" },
  upload: {
    prompt: "Drop JSON file here or click to upload",
    hint: "Upload dependency-cruiser JSON output",
    newFile: "Upload New File",
    loading: "Loading...",
  },
  report: { errors: "Errors", warnings: "Warnings", info: "Info", noViolations: "No violations found" },
  detail: {
    clickHint: "Click a node to view details",
    nodeDetails: "Node Details", stability: "Stability",
    dependencies: "Dependencies", dependents: "Dependents",
    violations: "Violations", noViolations: "No violations",
    stable: "Stable", balanced: "Balanced", unstable: "Unstable",
    naNoEdges: "N/A (no edges)", none: "None",
  },
  metrics: {
    originalNodes: "Original Nodes", aggregatedNodes: "Aggregated Nodes",
    dependencies: "Dependencies", violations: "Violations", edgeTypes: "Edge Types",
  },
  severity: { error: "ERROR", warn: "WARN", info: "INFO" },
  graph: { noData: "No graph data available" },
  theme: { light: "Light", dark: "Dark", auto: "Auto" },
} as const;
```

**替代方案**：i18next + react-i18next。拒绝原因：对 ~60 个翻译键来说过重，增加 ~15KB 依赖。

### Decision 2: CSS 自定义属性 + React Context 实现主题

**方案**：在 `variables.css` 中定义 `:root` 和 `[data-theme="dark"]` 的 CSS 变量，React Context 管理 `data-theme` 属性的设置和 localStorage 持久化。

**CSS 变量命名**（语义化，非设计令牌系统）：
```css
:root {
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-border: #e2e8f0;
  --color-text-primary: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
  --color-accent: #0284c7;
  --color-accent-bg: #e0f2fe;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;
  --color-btn-bg: #e2e8f0;
}
[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-border: #334155;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-accent: #38bdf8;
  --color-accent-bg: #0c4a6e;
  --color-error: #f87171;
  --color-warning: #fbbf24;
  --color-info: #60a5fa;
  --color-btn-bg: #334155;
}
```

**样式迁移**：内联 `React.CSSProperties` 中的硬编码 hex 值替换为 `var(--xxx)` 引用。CSS 变量在内联样式中完全有效。

**理由**：CSS 变量是浏览器原生能力，无需 JS 运行时开销。内联样式可直接引用。React Context 仅用于管理状态和触发 G6 颜色更新。

**替代方案**：纯 JS 主题对象（如 styled-components 的 ThemeProvider）。拒绝原因：需要将所有内联样式改为模板字符串，改动量大，CSS 变量更直接。

### Decision 3: 三态主题循环按钮

**方案**：单个按钮循环切换 Light → Dark → Auto，使用内联 SVG 图标显示当前状态，`title` 属性提示操作。

```
┌──────┐  click  ┌──────┐  click  ┌──────┐
│  ☀️   │───────▶│  🌙   │───────▶│  🖥   │
│ sun  │        │ moon │        │ monit│
└──────┘        └──────┘        └──────┘
    ▲                                │
    └────────────────────────────────┘
              click
```

**状态逻辑**：
1. 启动时检查 localStorage key `theme` → `'light' | 'dark' | 'auto'`
2. 若未设置，默认 `'auto'`
3. Auto 模式下使用 `matchMedia('(prefers-color-scheme: dark)')` 检测系统偏好
4. 监听 `matchMedia` 的 `change` 事件，系统切换时自动生效
5. 用户手动选择 light/dark 后脱离 auto 模式

**SVG 图标**：三个内联 SVG 组件（每个 ~8 行），使用 `currentColor` 继承文字颜色。不引入图标库。

### Decision 4: 语言检测策略

**优先级**：
1. localStorage key `lang` → 用户手动选择
2. `navigator.language` → 浏览器语言。若以 `zh` 开头 → `zh-CN`，否则 → `en`
3. 默认 `en`

**UI**：Header 中两个相邻按钮 `EN` | `中文`，激活态高亮。添加新语言时增加按钮即可。

### Decision 5: G6 图形颜色主题

G6 节点/边颜色在 JS 中设置，无法使用 CSS 变量。在 `theme/constants.ts` 中维护两套颜色映射：

```typescript
// 浅色
export const LIGHT_NODE_STYLES = {
  file:   { fill: '#C6E5FF', stroke: '#5B8FF9' },
  directory: { fill: '#FFD591', stroke: '#FA8C16' },
  package:   { fill: '#B7EB8F', stroke: '#52C41A' },
};
// 深色 → 降低亮度，保持色相
export const DARK_NODE_STYLES = {
  file:   { fill: '#1e3a5f', stroke: '#93c5fd' },
  directory: { fill: '#78350f', stroke: '#fbbf24' },
  package:   { fill: '#14532d', stroke: '#86efac' },
};
```

DependencyGraph 通过 `useTheme()` 获取当前主题，选择对应颜色映射。

## Architecture

```
main.tsx
└── <ThemeProvider>          ← 管理 data-theme 属性 + localStorage + matchMedia
    └── <I18nProvider>       ← 管理翻译字典 + 语言检测
        └── <App />
```

```
packages/frontend/src/
├── i18n/
│   ├── index.ts             # I18nProvider, useT() hook, 语言检测
│   ├── en.ts                # 英文翻译
│   └── zh-CN.ts             # 简体中文翻译
├── theme/
│   ├── index.ts             # ThemeProvider, useTheme() hook, 主题检测
│   └── constants.ts         # G6 浅色/深色颜色映射
├── styles/
│   ├── main.css             # 全局样式 + CSS reset
│   └── variables.css        # CSS 自定义属性（浅色/深色）
├── components/
│   └── icons.tsx            # SunIcon / MoonIcon / MonitorIcon SVG 组件
```

## Risks / Trade-offs

- **[色值一致性]** CSS 变量和内联 `var()` 引用之间没有编译时检查。缓解：手动审查 + 视觉测试。
- **[G6 重渲染]** 切换主题时 G6 颜色变化需要重新渲染图形。影响：切换主题时图形短暂闪烁。缓解：可接受（主题切换是低频操作）。
- **[翻译遗漏]** 新增组件时可能忘记添加翻译。缓解：TypeScript 类型系统确保键名有效，但无法静态检测遗漏。代码审查中关注。
