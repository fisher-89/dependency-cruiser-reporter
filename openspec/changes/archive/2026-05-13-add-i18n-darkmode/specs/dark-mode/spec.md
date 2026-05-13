## ADDED Requirements

### Requirement: 主题系统架构

系统 SHALL 使用 CSS 自定义属性定义颜色令牌，React Context 管理主题状态，通过 `<html>` 元素的 `data-theme` 属性切换深浅色。

#### Scenario: CSS 变量定义

- WHEN 构建 CSS
- THEN 在 `:root` 定义浅色主题的 CSS 自定义属性
- AND 在 `[data-theme="dark"]` 定义深色主题的 CSS 自定义属性
- AND 变量覆盖语义化的颜色令牌（`--color-bg`、`--color-surface` 等）

#### Scenario: 内联样式引用

- WHEN 组件使用内联 `React.CSSProperties`
- THEN 颜色值使用 `var(--xxx)` 语法引用 CSS 变量
- AND 如 `background: 'var(--color-bg)'`

### Requirement: ThemeProvider

系统 SHALL 提供 `ThemeProvider` 组件，管理主题模式状态并同步到 DOM 和 localStorage。

#### Scenario: Provider 初始化

- WHEN ThemeProvider 挂载
- THEN 按优先级检测主题：localStorage `theme` → 默认 `'auto'`
- AND 设置 `<html>` 元素的 `data-theme` 属性（`'dark'` 或无属性表示浅色）
- AND 若模式为 `auto`，启动 `matchMedia('(prefers-color-scheme: dark)')` 监听

#### Scenario: 主题循环切换

- WHEN 调用 `cycleTheme()` 方法
- THEN 主题模式按 `light → dark → auto → light` 顺序切换
- AND 新主题模式写入 localStorage key `theme`
- AND `<html>` 的 `data-theme` 属性立即更新
- AND 所有 CSS 变量引用的颜色即时生效

#### Scenario: 系统偏好响应

- WHEN 主题模式为 `auto` 且系统深浅色偏好改变
- THEN `matchMedia` 的 `change` 事件触发
- AND `<html>` 的 `data-theme` 属性自动更新
- AND 无需用户手动操作

### Requirement: useTheme hook

系统 SHALL 提供 `useTheme()` hook，返回当前主题状态和切换方法。

#### Scenario: hook 返回值

- WHEN 组件调用 `useTheme()`
- THEN 返回 `{ theme: 'light' | 'dark' | 'auto', resolvedTheme: 'light' | 'dark', cycleTheme: () => void }`
- AND `theme` 为用户选择的模式（含 `auto`）
- AND `resolvedTheme` 为实际生效的颜色方案（`light` 或 `dark`）
- AND `cycleTheme` 为循环切换函数

### Requirement: G6 图形主题

系统 SHALL 为 G6 图形提供深浅色两套颜色映射，组件根据 `resolvedTheme` 选择对应颜色。

#### Scenario: 节点颜色主题

- WHEN resolvedTheme 为 `'light'`
- THEN G6 节点使用浅色颜色映射（浅色填充 + 鲜艳描边）
- WHEN resolvedTheme 为 `'dark'`
- THEN G6 节点使用深色颜色映射（深色填充 + 柔和描边）
- AND 节点类型（file/directory/package）可通过颜色区分

#### Scenario: 边颜色主题

- WHEN resolvedTheme 为 `'light'`
- THEN G6 边使用浅色颜色映射
- WHEN resolvedTheme 为 `'dark'`
- THEN G6 边颜色调整为深色背景可见

#### Scenario: 主题切换时图形更新

- WHEN resolvedTheme 变化
- THEN DependencyGraph 组件根据新主题重新选择颜色映射
- AND G6 图形以新颜色重新渲染

### Requirement: 主题颜色令牌

系统 SHALL 定义以下 CSS 自定义属性用于主题颜色：

| CSS 变量 | 浅色值 | 深色值 | 用途 |
|----------|--------|--------|------|
| `--color-bg` | `#f8fafc` | `#0f172a` | 页面背景 |
| `--color-surface` | `#ffffff` | `#1e293b` | 卡片/面板 |
| `--color-border` | `#e2e8f0` | `#334155` | 边框/分割线 |
| `--color-text-primary` | `#1e293b` | `#f1f5f9` | 主文字 |
| `--color-text-secondary` | `#64748b` | `#94a3b8` | 辅助文字 |
| `--color-text-muted` | `#94a3b8` | `#64748b` | 次要文字 |
| `--color-accent` | `#0284c7` | `#38bdf8` | 强调色 |
| `--color-accent-bg` | `#e0f2fe` | `#0c4a6e` | 强调色背景 |
| `--color-error` | `#ef4444` | `#f87171` | 错误 |
| `--color-warning` | `#f59e0b` | `#fbbf24` | 警告 |
| `--color-info` | `#3b82f6` | `#60a5fa` | 信息 |
| `--color-btn-bg` | `#e2e8f0` | `#334155` | 按钮背景 |
