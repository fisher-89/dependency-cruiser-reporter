# Directory Tree Sidebar — Implementation Tasks

## 阶段一：服务端扩展

- [x] 在 `packages/cli/src/server/dep/graph.ts` 的 `POST /api/graph` 处理中，在调用 `convert()` 获得结果后，向 `meta` 注入 `source` 字段（值为 `graphFile` 绝对路径），使用 `{ ...graph, meta: { ...graph.meta, source: graphFile } }` 模式

## 阶段二：图标组件

- [x] 在 `packages/frontend/src/components/icons.tsx` 中新增 `ChevronRightIcon` 组件（右指向三角 ▶ SVG，16x16 viewBox，currentColor stroke）
- [x] 在 `packages/frontend/src/components/icons.tsx` 中新增 `ChevronDownIcon` 组件（下指向三角 ▼ SVG，16x16 viewBox，currentColor stroke）
- [x] 在 `packages/frontend/src/components/icons.tsx` 中新增 `SidebarToggleIcon` 组件（双角箭头 ◀/▶ SVG，接受 `direction: 'left' | 'right'` prop 控制方向）

## 阶段三：i18n 键

- [x] 在 `packages/frontend/src/i18n/en.ts` 中新增 `tree` 命名空间，包含 `title: 'Directories'`、`expand: 'Expand directory'`、`collapse: 'Collapse directory'`、`toggleSidebar: 'Toggle sidebar'`
- [x] 在 `packages/frontend/src/i18n/zh-CN.ts` 中新增 `tree` 命名空间，包含 `title: '目录'`、`expand: '展开目录'`、`collapse: '折叠目录'`、`toggleSidebar: '切换侧边栏'`

## 阶段四：useGraphData Hook 扩展

- [x] 在 `packages/frontend/src/hooks/useGraphData.ts` 中，扩展 `UseGraphDataReturn` 接口，新增 `sidebarVisible: boolean` 和 `setSidebarVisible: (visible: boolean) => void`
- [x] 在 `useGraphData` 中实现 `sidebarVisible` 状态，从 `localStorage['dcr:layout:graph:dir_tree']` 读取初始值（不存在则默认 `true`），变化时写回 localStorage
- [x] 在 `useGraphData` 的 `fetchGraph` 函数中，在首次调用且参数为空时，从 localStorage 读取 `dcr:source:{window.location.origin}` 和 `dcr:expanded:{source}` 作为缓存，传入请求的 `expanded_dirs`
- [x] 在 `useGraphData` 的 `fetchGraph` 成功处理分支中，在 `setData` 之后，将响应 `meta.source` 写入 `localStorage['dcr:source:{origin}']`，将 `meta.expanded_dirs` 写入 `localStorage['dcr:expanded:{source}']`（以服务端为准覆写缓存）

## 阶段五：DirTree 组件

- [x] 新建 `packages/frontend/src/components/DirTree.tsx`，定义组件 Props 接口：`data: ProcessedGraph`、`expandedDirs: Set<string>`、`onToggleDir: (dir: string) => void`、`sidebarVisible: boolean`、`onToggleSidebar: () => void`
- [x] 在 DirTree 中实现目录树构建逻辑：
  - 建立 combo id → GraphCombo 映射表
  - 按 combo 字段将节点分组为 comboId → GraphNode[]
  - 遍历 combos，筛选 `combo === null/undefined` 的作为根节点
  - 构建递归渲染结构，处理无限深度嵌套
- [x] 在 DirTree 中实现单层展开/折叠渲染逻辑：
  - 展开时仅显示当前目录的直接子 combo 和直接子节点
  - 根据 expandedDirs 判断展开/折叠状态
  - 点击展开图标（▶）调用 `onToggleDir(id)` 展开
  - 点击折叠图标（▼）调用 `onToggleDir(id)` 折叠
  - 点击标签文本不触发 toggle
- [x] 在 DirTree 中实现排序逻辑：每个目录层级内，目录条目排在文件条目之前，各组内按 label 字母序（case-insensitive）排列
- [x] 在 DirTree 中实现缩进逻辑：基础 padding-left 8px，每层深度增加 16px（depth 0: 8px, depth 1: 24px, depth 2: 40px, ...）
- [x] 在 DirTree 中实现侧边栏展开状态（sidebarVisible === true）的完整渲染：标题头（"Directories" + ◀ 关闭按钮）、目录树内容、展开/折叠图标
- [x] 在 DirTree 中实现侧边栏折叠状态（sidebarVisible === false）的窄手柄渲染：32px 宽度，垂直居中显示 ▶ 展开按钮
- [x] 在 DirTree 中应用 CSS 变量样式：使用 `var(--color-surface)` 背景、`var(--color-border)` 右边框、`var(--color-text-secondary)` 文本、`var(--color-text-muted)` 图标、hover 时 `var(--color-accent-bg)` @ 50% opacity

## 阶段六：GraphView 组件（封装三栏布局）

- [x] 新建 `packages/frontend/src/components/GraphView.tsx`，封装 DirTree + DependencyGraph + DetailPanel 为独立视图组件：
  - Props 接口：`data: ProcessedGraph`、`expandedDirs: Set<string>`、`onToggleDir: (dir: string) => void`、`sidebarVisible: boolean`、`onToggleSidebar: () => void`、`selectedNodeId: string | null`、`onNodeSelect: (nodeId: string) => void`、`stabilityHeatmap: boolean`、`nodeMap: Map<string, GraphNode>`
  - 使用 `useMemo` 从 `selectedNodeId` 和 `data.nodes` 计算 `selectedNode`
  - 渲染三栏 flex 容器（`data-testid="graph-view"`），左栏为 DirTree（260px，受 `sidebarVisible` 控制），中栏为 DependencyGraph（flex: 1），右栏为 DetailPanel（320px）
- [x] 在 GraphView 中集成 DirTree 与 DependencyGraph 的展开状态联动：DirTree 的 `onToggleDir` 和 DependencyGraph 的 `onToggleDir` 使用同一回调
- [x] 在 GraphView 中处理侧边栏折叠/展开时的 G6 画布 resize：DependencyGraph 内部已有的 ResizeObserver 自动处理容器尺寸变化

## 阶段七：视图组件抽取（ReportView / MetricsView）

- [x] 新建 `packages/frontend/src/components/ReportView.tsx`，从 App.tsx 抽取内联 ReportView 组件：
  - Props 接口：`violations: ViolationInfo[]`
  - 渲染违规报告，包含错误/警告/信息统计卡片和违规项列表
  - 保留 `data-testid="report-view"`
- [x] 新建 `packages/frontend/src/components/MetricsView.tsx`，从 App.tsx 抽取内联 MetricsView 组件：
  - Props 接口：`data: ProcessedGraph`
  - 渲染指标仪表板，包含统计卡片和边类型分布
  - 保留 `data-testid="metrics-view"`

## 阶段八：GraphViewLayout 确认（保持纯布局外壳）

- [x] 确认 `packages/frontend/src/components/GraphViewLayout.tsx` 的 Props 接口保持不变（`loading`、`onRefresh`、`children`、`stabilityHeatmap`、`onStabilityHeatmapChange`），不新增任何 DirTree 相关的 props
- [x] 确认 GraphViewLayout 的样式布局已有 `display: flex; flex-direction: column` 结构，children 区域使用 `flex: 1` 自然填充剩余空间，无需额外修改

## 阶段九：App 集成

- [x] 在 `packages/frontend/src/App.tsx` 中，从 `useGraphData()` 获取 `sidebarVisible` 和 `setSidebarVisible`，创建 `handleToggleSidebar` 回调
- [x] 在 App 中导入 GraphView、ReportView、MetricsView 三个新组件
- [x] `renderView` 中 `/graph` 分支改为：`<GraphViewLayout loading={loading} onRefresh={handleRefresh} stabilityHeatmap={stabilityHeatmap} onStabilityHeatmapChange={handleStabilityHeatmapChange}><GraphView data={data} expandedDirs={expandedDirs} onToggleDir={toggleDir} sidebarVisible={sidebarVisible} onToggleSidebar={handleToggleSidebar} selectedNodeId={selectedNodeId} onNodeSelect={handleNodeSelect} stabilityHeatmap={stabilityHeatmap} nodeMap={nodeMap} /></GraphViewLayout>`，移除内联的 DependencyGraph + DetailPanel 渲染
- [x] `renderView` 中 `/report` 分支改为使用 `<ReportView violations={data.violations} />`
- [x] `renderView` 中 `/metrics` 分支改为使用 `<MetricsView data={data} />`
- [x] 移除 App.tsx 中内联的 `ReportView` 和 `MetricsView` 函数组件定义
- [x] 从 App.tsx 的 `styles` 对象中移除已抽取到各组件中的样式键（`graphSplitLayout`、`reportContainer`、`summary`、`summaryCard`、`summaryNum`、`violationList`、`violationItem`、`violationRule`、`violationSeverity`、`violationFrom`、`violationMsg`、`emptyState`、`metricsContainer`、`metricsGrid`、`metricCard`、`metricValue`、`metricLabel`、`edgeTypes`、`edgeTypesTitle`、`edgeTypeItem`）
- [x] 移除 App 中不再需要的 `selectedNode` 相关 `useMemo` 计算（已移至 GraphView 组件内部）

## 阶段十：G6 画布 resize 协调

- [x] 在 GraphView 组件中，当 `sidebarVisible` 变化时，通过 ref 获取 DependencyGraph 内部 G6 实例并调用 `graph.resize()` 以适应容器尺寸变化（DependencyGraph 内部已有 ResizeObserver 自动处理，无需显式 resize 调用）
- [x] 确保 G6 画布在侧边栏折叠/展开后正确填充可用空间，无空白或溢出（ResizeObserver 监听容器尺寸变化自动触发）
