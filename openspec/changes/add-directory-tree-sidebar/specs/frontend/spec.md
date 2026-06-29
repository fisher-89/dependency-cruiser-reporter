# 前端规范（修改增量）

## MODIFIED Requirements

### Requirement: 组件架构

系统 SHALL 实现以下组件层级：

```
main.tsx
└── <ThemeProvider>
    └── <I18nProvider>
        └── App (root, state: data, viewMode, loading, error, selectedNodeId, scanning, scanError, sidebarVisible)
            ├── <ScanOverlay> (full-screen, conditionally rendered when scanning)
            ├── Header
            │   ├── Title
            │   ├── LanguageSwitcher (EN | 中文 buttons)
            │   ├── ThemeToggle (sun/moon/monitor cycle button)
            │   └── Navigation (Architecture / Graph / Report / Metrics tabs)
            ├── DirectoryPicker (when no .dc-reporter found)
            ├── UploadArea (drag-and-drop + file input, fallback)
            ├── ArchitectureView (lazy-loaded, ReactLikeC4 + LikeC4ModelProvider)
            ├── GraphView (flex container: dir tree | canvas | detail panel)
            │   ├── DirTree (directory tree sidebar, collapsible)
            │   ├── DependencyGraph (G6 comboCombined layout)
            │   └── DetailPanel (node metadata, stability, deps, violations)
            ├── ReportView (violations by severity)
            └── MetricsView (summary stats)
```

#### Scenario: App 根组件

- WHEN App 挂载
- AND 检查是否已加载图文件
- AND 所有文本通过 `useT()` hook 获取翻译

#### Scenario: 视图切换

- WHEN 用户点击导航标签
- THEN 切换 `viewMode` 状态（`'architecture'` | `'graph'` | `'report'` | `'metrics'`）
- AND 条件渲染对应视图组件
- AND Architecture 视图使用 `React.lazy` 动态加载

#### Scenario: GraphViewLayout 扩展 props

- **WHEN** `GraphViewLayout` 渲染且 `onScan` prop 已提供
- **THEN** action bar 中 Refresh 按钮右侧显示 "Scan" 按钮
- **AND** `scanning` 为 true 时按钮 disabled 且文案显示 `t('action.scanning')`
- **AND** `scanning` 为 false 时按钮文案显示 `t('action.scan')`
- **AND** `onScan` 为 undefined 时不显示按钮（向后兼容）

#### Scenario: ScanOverlay 渲染位置

- **WHEN** `App` 渲染且 `scanning` 为 `true`
- **THEN** `<ScanOverlay>` 作为 App 根 `<div>` 的第一个子元素渲染
- **AND** 使用 `position: fixed; inset: 0; z-index: 9999` 覆盖所有内容
- **AND** 所有用户通过叠加层无法与底层元素交互

#### Scenario: ArchitectureView action bar 扩展

- **WHEN** `ArchitectureView` 渲染且 `state.status === 'ready'`
- **THEN** action bar 中 Refresh 按钮右侧显示 "Generate Rules" 按钮
- **AND** 点击后调用 `POST /api/archi-to-rules`
- **AND** 按钮在 loading/error/empty 状态下不显示

#### Scenario: App handleScan

- **WHEN** `App` 渲染 Graph/Report/Metrics 视图
- **THEN** `handleScan` 回调传递给 `GraphViewLayout` 的 `onScan` prop
- **AND** `scanning` 状态传递给 `GraphViewLayout` 的 `scanning` prop
- **AND** `handleScan` 先设置 `scanning` 为 `true`，发送 `POST /api/analyze`
- **AND** 响应 ok 后设置 `scanning` 为 `false`
- **AND** 响应 ok 后调用 `refresh()` 自动刷新图数据
- **AND** 扫描期间 `ScanOverlay` 全屏显示

#### Scenario: handleScan 失败流程

- **WHEN** `POST /api/analyze` 返回非 ok 状态码
- **THEN** 解析响应 JSON 提取 `details` 或 `error` 字段
- **AND** 设置 `scanError` 为提取的错误信息
- **AND** `scanning` 保持为 `true`（等待用户手动关闭遮罩层）

#### Scenario: handleScan 网络异常

- **WHEN** `POST /api/analyze` 抛出网络异常（如 `TypeError: Failed to fetch`）
- **THEN** 设置 `scanError` 为异常信息
- **AND** `scanning` 保持为 `true`（等待用户手动关闭遮罩层）

### Requirement: 状态管理

系统 SHALL 使用 React `useState` 管理状态（无外部状态管理库）：

| 状态 | 类型 | 所有者 |
|------|------|--------|
| `data` | `ProcessedGraph \| null` | App |
| `viewMode` | `'architecture' \| 'graph' \| 'report' \| 'metrics'` | App |
| `loading` | `boolean` | App |
| `error` | `string \| null` | App |
| `selectedNodeId` | `string \| null` | App |
| `scanning` | `boolean` | App |
| `scanError` | `string \| null` | App |
| `sidebarVisible` | `boolean` | App |

主题和语言状态 SHALL 由各自 Provider 管理（非 App 本地状态）。`sidebarVisible` 状态 SHALL 由 App 管理，通过 props 传递给 `GraphViewLayout` 和 `DirTree`。

#### Scenario: 状态转换

```
Idle → Loading
Loading → WorkspaceReady (加载成功)
Loading → NoWorkspace (无图文件)
WorkspaceReady → ArchitectureView/GraphView/ReportView/MetricsView (视图切换)
NoWorkspace → DirectoryPicker (选择项目目录)
Error → Loading (重试)
```

### Requirement: Graph view split layout

系统 SHALL 在 graph 视图使用 flex 三栏分割布局：左侧为 DirTree（固定宽度 260px，可折叠），中间为 G6 画布（flex: 1），右侧为 DetailPanel（固定宽度 320px）。

#### Scenario: 三栏布局渲染

- **WHEN** graph 视图处于活动状态
- **THEN** DirTree 侧边栏、G6 画布和 DetailPanel 从左到右依次渲染
- **AND** DirTree 宽度固定为 260px
- **AND** DetailPanel 宽度固定为 320px
- **AND** G6 画布填充剩余空间

#### Scenario: 侧边栏折叠时的布局

- **WHEN** 侧边栏处于折叠状态（sidebarVisible 为 false）
- **THEN** DirTree 显示为 32px 宽的窄手柄
- **AND** G6 画布填充原 DirTree 占用的空间

#### Scenario: 面板出现时 G6 调整大小

- **WHEN** 面板从占位符过渡到内容（首次选择节点时高度可能变化）
- **THEN** G6 画布调用 `graph.resize()` 以适应其容器

#### Scenario: 侧边栏切换时 G6 调整大小

- **WHEN** 用户切换侧边栏可见性（折叠或展开）
- **THEN** G6 画布调用 `graph.resize()` 以适应新的容器尺寸

### Requirement: 项目结构

前端 SHALL 按以下结构组织：

```
packages/frontend/
├── src/
│   ├── App.tsx                  # 主应用
│   ├── main.tsx                 # React 入口（Provider 嵌套）
│   ├── types.ts                 # TypeScript 类型定义
│   ├── i18n/
│   │   ├── index.ts             # I18nProvider + useT() hook
│   │   ├── en.ts                # 英文翻译
│   │   └── zh-CN.ts             # 简体中文翻译
│   ├── theme/
│   │   ├── index.ts             # ThemeProvider + useTheme() hook
│   │   └── constants.ts         # G6 主题颜色映射
│   ├── styles/
│   │   ├── main.css             # 全局样式 + CSS reset
│   │   └── variables.css        # CSS 自定义属性
│   └── components/
│       ├── ArchitectureView.tsx  # C4 架构图组件（NEW）
│       ├── DependencyGraph.tsx  # G6 图形组件
│       ├── DetailPanel.tsx      # 节点详情面板
│       ├── DirTree.tsx          # 目录树侧边栏（NEW）
│       ├── buildGraphData.ts    # G6 数据转换
│       └── icons.tsx            # 内联 SVG 图标
├── index.html
├── vite.config.ts
└── package.json
```

#### Scenario: 目录树侧边栏文件添加

- **WHEN** 实现目录树侧边栏
- **THEN** 新建 `packages/frontend/src/components/DirTree.tsx`
- **AND** 修改 `GraphViewLayout.tsx` 以渲染 DirTree
- **AND** 修改 `App.tsx` 以管理 sidebarVisible 状态

## ADDED Requirements

### Requirement: GraphViewLayout renders DirTree

`GraphViewLayout` SHALL render the `DirTree` component as part of the graph view content. The `DirTree` SHALL receive `data`, `expandedDirs`, and `onToggleDir` from the `useGraphData` hook, forwarded through `GraphViewLayout` props.

#### Scenario: GraphViewLayout props include DirTree data

- **WHEN** `GraphViewLayout` renders the graph view content
- **THEN** `GraphViewLayout` SHALL receive `data`, `expandedDirs`, `onToggleDir`, `sidebarVisible`, and `onToggleSidebar` props
- **AND** `GraphViewLayout` SHALL render `<DirTree>` to the left of the G6 canvas
- **AND** the DirTree props SHALL be forwarded from the `GraphViewLayout` props

### Requirement: three-column layout in App

The `App` component SHALL render the graph view route (`/graph`) with a three-column flex layout containing DirTree, DependencyGraph, and DetailPanel.

#### Scenario: Graph route renders DirTree

- **WHEN** the route is `/graph` and data is loaded
- **THEN** the content SHALL be a flex container with three children
- **AND** the first child SHALL be `DirTree` (when `sidebarVisible` is true) or the collapsed sidebar handle
- **AND** the second child SHALL be `DependencyGraph`
- **AND** the third child SHALL be `DetailPanel`
- **AND** the container SHALL use `display: flex; gap: 0; flex: 1; min-height: 0`

#### Scenario: DirTree not rendered for non-graph routes

- **WHEN** the route is `/report`, `/metrics`, or `/architecture`
- **THEN** DirTree SHALL NOT be rendered
- **AND** the layout SHALL NOT allocate space for the sidebar

#### Scenario: App manages sidebarVisible state

- **WHEN** `App` renders the graph view
- **THEN** `sidebarVisible` state SHALL default to `true`
- **AND** when the user toggles the sidebar, the `onToggleSidebar` callback SHALL flip the state
- **AND** the state SHALL be passed to `GraphViewLayout` as a prop

## Module Contract

### Component: GraphViewLayout (modified)

| Prop | Type | Change |
|------|------|--------|
| `data` | `ProcessedGraph` | ADDED — forwarded to DirTree for tree building |
| `expandedDirs` | `Set<string>` | ADDED — forwarded to DirTree for expand/collapse state |
| `onToggleDir` | `(dir: string) => void` | ADDED — forwarded to DirTree for expand/collapse actions |
| `sidebarVisible` | `boolean` | ADDED — controls DirTree visibility |
| `onToggleSidebar` | `() => void` | ADDED — callback when user toggles sidebar |

### Component: DirTree (added to project)

| Prop | Type |
|------|------|
| `data` | `ProcessedGraph` |
| `expandedDirs` | `Set<string>` |
| `onToggleDir` | `(dir: string) => void` |
| `sidebarVisible` | `boolean` |
| `onToggleSidebar` | `() => void` |

### State: App (modified)

| State | Type | Default | Change |
|-------|------|---------|--------|
| `sidebarVisible` | `boolean` | `true` | ADDED — controls DirTree sidebar visibility |

## References

- App: `packages/frontend/src/App.tsx`
- GraphViewLayout: `packages/frontend/src/components/GraphViewLayout.tsx`
- DirTree: `packages/frontend/src/components/DirTree.tsx` (NEW)
- i18n en: `packages/frontend/src/i18n/en.ts`
- i18n zh-CN: `packages/frontend/src/i18n/zh-CN.ts`
