# Directory Tree Sidebar — Design Document

## 架构总览

```
App (state: selectedNodeId, sidebarVisible, stabilityHeatmap, etc.)
│
└── GraphViewLayout (action bar + children slot)
    │                        ← loading / onRefresh / stabilityHeatmap / onStabilityHeatmapChange
    │
    ├── [report/metrics routes] → ReportView / MetricsView (全宽)
    │
    └── [/graph route] → GraphView (封装 DirTree + DependencyGraph + DetailPanel)
                          │
                          ├── DirTree (260px, collapsible)
                          ├── DependencyGraph (flex: 1)
                          └── DetailPanel (320px)
```

## 架构组件

### 1. `DirTree` 组件（新增）
- **路径**: `packages/frontend/src/components/DirTree.tsx`
- **职责**: 从 `ProcessedGraph.combos` 和 `ProcessedGraph.nodes` 构建目录层级树；渲染可展开/折叠的目录树侧边栏；处理展开/折叠图标点击事件；管理侧边栏自身的折叠/展开控制；不同数据源分别独立缓存展开状态
- **Props**:
  - `data: ProcessedGraph` — 当前图数据，用于构建目录树
  - `expandedDirs: Set<string>` — 当前展开的目录路径集合
  - `onToggleDir: (dir: string) => void` — 展开/折叠目录的回调
  - `sidebarVisible: boolean` — 侧边栏可见性
  - `onToggleSidebar: () => void` — 切换侧边栏可见性回调
- **依赖**: React, `useT()` (i18n), `ChevronRightIcon` / `ChevronDownIcon` / `SidebarToggleIcon` (icons)
- **技术**: React 函数组件, CSS-in-JS (inline styles), localStorage 通过 `useGraphData` 间接访问

### 2. `useGraphData` Hook（修改）
- **路径**: `packages/frontend/src/hooks/useGraphData.ts`
- **职责**: 管理图数据获取、展开目录状态、localStorage 持久化。新增职责：首次请求携带缓存的 expandedDirs；每次响应后以服务端返回的 `expanded_dirs` 和 `source` 更新缓存；管理 `sidebarVisible` 状态及其 localStorage 持久化
- **新增返回字段**:
  - `sidebarVisible: boolean` — 目录树侧边栏可见性
  - `setSidebarVisible: (visible: boolean) => void` — 设置侧边栏可见性
- **localStorage 键映射**:
  - `dcr:source:{origin}` → graph 文件绝对路径（source），用于页面加载时定位当前数据源
  - `dcr:expanded:{source}` → `JSON.stringify(string[])`，该数据源当前的展开目录列表
  - `dcr:layout:graph:dir_tree` → `'true' | 'false'`，目录树侧边栏可见性
- **技术**: React `useState` + `useCallback`, 浏览器 localStorage API

### 3. `GraphView` 组件（新增）
- **路径**: `packages/frontend/src/components/GraphView.tsx`
- **职责**: 封装 DirTree + DependencyGraph + DetailPanel 为独立视图组件，组成三栏布局；计算 `selectedNode`（从 `selectedNodeId` 和 `data.nodes` 通过 `useMemo` 推导）；作为 graph 路由下 GraphViewLayout 的 children 渲染
- **Props**:
  - `data: ProcessedGraph` — 当前图数据，同时用于 DirTree 和 DependencyGraph
  - `expandedDirs: Set<string>` — 当前展开的目录路径集合，透传给 DirTree
  - `onToggleDir: (dir: string) => void` — 展开/折叠目录回调，透传给 DirTree 和 DependencyGraph
  - `sidebarVisible: boolean` — 目录树侧边栏可见性，透传给 DirTree
  - `onToggleSidebar: () => void` — 切换侧边栏可见性回调，透传给 DirTree
  - `selectedNodeId: string | null` — 当前选中的节点 ID，透传给 DependencyGraph
  - `onNodeSelect: (nodeId: string) => void` — 节点选择回调，透传给 DependencyGraph
  - `stabilityHeatmap: boolean` — 稳定性热力图开关，透传给 DependencyGraph
  - `nodeMap: Map<string, GraphNode>` — 节点 ID → GraphNode 映射表，用于 DetailPanel
- **内部布局**:
  - 三栏 flex 容器: `display: flex; gap: 0; flex: 1; min-height: 0`
  - 左栏: DirTree（`sidebarVisible` 控制显示/折叠为窄手柄）
  - 中栏: DependencyGraph（flex: 1）
  - 右栏: DetailPanel（320px 固定宽度）
- **依赖**: React, DirTree, DependencyGraph, DetailPanel
- **技术**: React 函数组件, CSS-in-JS (inline styles), `useMemo`
- **data-testid**: `graph-view`（位于内部 flex 容器上）

### 4. `ReportView` 组件（抽取）
- **路径**: `packages/frontend/src/components/ReportView.tsx`
- **职责**: 渲染违反规则报告视图，包括错误/警告/信息统计卡片和违规项列表。从 `App.tsx` 内联组件抽取为独立文件
- **Props**:
  - `violations: ViolationInfo[]` — 违规项数组
- **依赖**: React, `useT()` (i18n)
- **技术**: React 函数组件, CSS-in-JS (inline styles)
- **data-testid**: `report-view`

### 5. `MetricsView` 组件（抽取）
- **路径**: `packages/frontend/src/components/MetricsView.tsx`
- **职责**: 渲染指标仪表板，包括节点数、依赖数、违规数等统计卡片和边类型分布。从 `App.tsx` 内联组件抽取为独立文件
- **Props**:
  - `data: ProcessedGraph` — 当前图数据
- **依赖**: React, `useT()` (i18n)
- **技术**: React 函数组件, CSS-in-JS (inline styles)
- **data-testid**: `metrics-view`

### 6. `GraphViewLayout` 组件（保持不变）
- **路径**: `packages/frontend/src/components/GraphViewLayout.tsx`
- **职责**: 纯布局外壳，不感知 DirTree 或侧边栏相关状态。渲染 action bar（Scan / Heatmap / Refresh）+ children slot + ScanOverlay
- **Props**（不变）:
  - `loading: boolean` — 加载状态，Refresh 按钮禁用
  - `onRefresh: () => void` — 刷新回调
  - `children: ReactNode` — 视图组件（GraphView / ReportView / MetricsView）
  - `stabilityHeatmap: boolean` — 热力图开关状态
  - `onStabilityHeatmapChange: (value: boolean) => void` — 切换热力图回调
- **技术**: React 函数组件, CSS Flexbox
- **关键设计决策**: 不新增任何 DirTree 相关的 props，保持纯布局外壳的职责单一

### 7. `App` 组件（修改）
- **路径**: `packages/frontend/src/App.tsx`
- **职责**: 顶层应用组件，管理路由和共享状态。`renderView` 函数根据路由渲染 `GraphViewLayout` 并传入对应的视图组件（`GraphView`、`ReportView` 或 `MetricsView`）；管理 `sidebarVisible`、`selectedNodeId`、`stabilityHeatmap` 等共享状态；DirTree 相关的 props 传递给 GraphView，不传递给 GraphViewLayout
- **新增**: `sidebarVisible` 状态管理，从 `useGraphData` 获取，`onToggleSidebar` 回调
- **变更**:
  - 导入并使用 GraphView / ReportView / MetricsView 组件
  - renderView 中 `/graph` 路由渲染 `<GraphViewLayout loading={...} onRefresh={...} stabilityHeatmap={...} onStabilityHeatmapChange={...}><GraphView data={data} expandedDirs={expandedDirs} onToggleDir={toggleDir} sidebarVisible={sidebarVisible} onToggleSidebar={handleToggleSidebar} selectedNodeId={selectedNodeId} onNodeSelect={handleNodeSelect} stabilityHeatmap={stabilityHeatmap} nodeMap={nodeMap} /></GraphViewLayout>`
  - renderView 中 `/report` 路由渲染 `<GraphViewLayout loading={...} onRefresh={...}><ReportView violations={data.violations} /></GraphViewLayout>`
  - renderView 中 `/metrics` 路由渲染 `<GraphViewLayout loading={...} onRefresh={...}><MetricsView data={data} /></GraphViewLayout>`
  - 移除内联 ReportView 和 MetricsView 函数组件
  - 移除已抽取到各组件中的样式定义
  - `selectedNode` 计算移至 GraphView 组件
  - 文件预期从约 493 行缩减至约 200 行
- **技术**: React, react-router-dom, CSS-in-JS (inline styles)

### 8. Server Graph Route（修改）
- **路径**: `packages/cli/src/server/dep/graph.ts`
- **职责**: 在 `POST /api/graph` 响应的 `meta` 注入 `source` 字段（graph 文件绝对路径）
- **注入方式**: 在 `convert()` 返回后，使用 `{ ...graph, meta: { ...graph.meta, source: graphFile } }` 扩展 meta
- **技术**: TypeScript, Express.js

### 9. Icon 组件（新增）
- **路径**: `packages/frontend/src/components/icons.tsx`
- **新增图标**:
  - `ChevronRightIcon` — 折叠状态目录的展开图标
  - `ChevronDownIcon` — 展开状态目录的折叠图标
  - `SidebarToggleIcon` — 侧边栏折叠/展开按钮图标
- **技术**: 内联 SVG，与现有图标组件一致的 `width=16 height=16 viewBox="0 0 24 24"` 模式

### 10. i18n（修改）
- **路径**: `packages/frontend/src/i18n/en.ts` 和 `packages/frontend/src/i18n/zh-CN.ts`
- **新增键**:
  - `tree.title` — "Directories" / "目录"
  - `tree.expand` — "Expand directory" / "展开目录"
  - `tree.collapse` — "Collapse directory" / "折叠目录"
  - `tree.toggleSidebar` — "Toggle sidebar" / "切换侧边栏"

## 数据流

### 页面加载流程

```
[页面加载]
    |
    ├── useGraphData 初始化（无 data）
    |
    ├── App.useEffect 检测到路径 /graph，data === null
    |
    ├── useGraphData.fetchGraph() 首次调用
    |   |
    |   ├── 从 localStorage 读取 dcr:source:{origin} → source 路径
    |   ├── 从 localStorage 读取 dcr:expanded:{source} → 缓存的 expandedDirs
    |   |
    |   ├── fetch('POST /api/graph', { body: { expanded_dirs } })
    |   |   |
    |   |   ├── Server 端（graph.ts）：
    |   |   |   ├── 读取 graphFile
    |   |   |   ├── 调用 convert(dcJson, maxNodes, expandedDirs)
    |   |   |   |   → Rust/WASM aggregate() 处理
    |   |   |   ├── 在返回前注入 source: graphFile
    |   |   |   └── 返回完整 ProcessedGraph
    |   |   |
    |   |   └── useGraphData 设置 data
    |   |       ├── setExpandedDirs(graphData.meta.expanded_dirs)  ← 以服务端为准
    |   |       ├── localStorage['dcr:source:{origin}'] = meta.source
    |   |       └── localStorage['dcr:expanded:{source}'] = JSON.stringify(meta.expanded_dirs)
    |   |
    |   ├── App 渲染 <GraphViewLayout><GraphView data={data} ... /></GraphViewLayout>
    |   |   |
    |   |   ├── GraphView 内部 DirTree 从 data.combos 和 data.nodes 构建目录树
    |   |   ├── GraphView 内部 DependencyGraph 渲染 G6 画布
    |   |   └── GraphView 内部 DetailPanel 等待用户选择节点
```

### 用户展开/折叠目录流程

```
[用户点击 DirTree 中 ▶ 图标（展开 src）]
    |
    ├── DirTree.onToggleDir('src') 被调用
    |
    ├── GraphView 透传至 useGraphData.toggleDir('src')
    |   ├── 检查 src 是否已在 expandedDirs（不在则展开，在则折叠）
    |   ├── 更新 expandedDirs Set
    |   └── 调用 fetchGraph(Array.from(next))
    |
    ├── fetch('POST /api/graph', { body: { expanded_dirs: ['src'] } })
    |
    ├── Server 返回新的 ProcessedGraph（包含 src 目录下的子节点和子 combo）
    |
    ├── useGraphData 设置 data，触发 GraphView 内部 DirTree + DependencyGraph 同步更新
    |
    ├── DirTree 重新渲染：src 目录显示 ▼ 折叠图标，子目录/文件在下方显示
    |
    └── localStorage 同步更新：
        ├── dcr:source:{origin} = meta.source
        └── dcr:expanded:{source} = JSON.stringify(meta.expanded_dirs)
```

### 侧边栏折叠/展开流程

```
[用户点击 DirTree 头部的 ◀ 折叠按钮]
    |
    ├── onToggleSidebar() 被调用
    |
    ├── App.sidebarVisible = false
    |
    ├── DirTree 显示为 32px 窄手柄（仅 ▶ 展开按钮）
    |
    ├── DependencyGraph 宽度扩展填充释放空间
    |
    ├── DependencyGraph 调用 graph.resize() 适应新容器
    |
    └── localStorage['dcr:layout:graph:dir_tree'] = 'false'
```

### 目录树构建规则（数据变换）

```
输入：data.combos (GraphCombo[]) + data.nodes (GraphNode[])
输出：树形结构（递归渲染）

构建算法（O(n) 一次遍历）：
1. 建立 id → GraphCombo 映射表
2. 建立 id → GraphNode[] 映射表（按 combo 字段分组）
3. 遍历 combos，将 combo.combo === null/undefined 的作为根节点
4. 递归：对每个 combo，查找其 children（子 combo + 子 node）
5. 排序：目录在前、文件在后，各组内按 label 字母序（case-insensitive）
6. 缩进：depth * 16px 左内边距（基础 8px + depth * 16px）
7. 展开状态：检查 combo.id 是否在 expandedDirs 中
```

## 数据模型

### GraphMeta（扩展）

```typescript
// 现有字段（wasm.d.ts）
interface GraphMeta {
  original_node_count: number;
  aggregated_node_count: number;
  total_violations: number;
  expanded_dirs?: string[];

  // 新增字段（由 server/graph.ts 注入，非 Rust 端）
  source: string;  // graph 文件的绝对路径，用作 localStorage 缓存键
}
```

### DirTree 内部状态

| 数据 | 来源 | 类型 | 说明 |
|------|------|------|------|
| 目录层级树 | `data.combos` + `data.nodes` | 运行时计算 | 每次 render 时根据 data 引用变化重新计算 |
| `expandedDirs` | Props (from `useGraphData`) | `Set<string>` | 当前已展开的目录 ID 集合 |
| `sidebarVisible` | Props (from `App`) | `boolean` | 侧边栏是否可见 |
| localStorage 缓存 | `useGraphData` 维护 | 浏览器持久化 | 三级键映射：origin → source → expandedDirs |

### localStorage 缓存键

| 键 | 值 | 说明 |
|----|-----|------|
| `dcr:source:{origin}` | `string` | 最近使用的 graph 文件绝对路径 |
| `dcr:expanded:{source}` | `JSON.stringify(string[])` | 该数据源当前的展开目录ID列表 |
| `dcr:layout:graph:dir_tree` | `'true' \| 'false'` | 侧边栏可见性 |

## Route / API 设计

### POST /api/graph

**变更**: 响应 `meta` 对象新增 `source` 字段，其余不变。

**请求体**（不变）:
```json
{
  "expanded_dirs": ["src", "src/cli"]
}
```

**响应体**（meta 新增 `source`）:
```json
{
  "nodes": [],
  "edges": [],
  "combos": [],
  "meta": {
    "original_node_count": 100,
    "aggregated_node_count": 50,
    "total_violations": 5,
    "expanded_dirs": ["src", "src/cli"],
    "source": "/absolute/path/to/.dc-reporter/graph.json"
  },
  "violations": []
}
```

## 依赖

本次变更不引入新的外部 NPM 依赖，所有使用的依赖均为项目现有依赖。

### 运行时依赖

| 依赖 | 版本 | 类型 | 用途 |
|------|------|------|------|
| `react` | ^19 | runtime | DirTree 组件使用 React JSX、函数组件、`useState`/`useCallback` hooks |
| `react-dom` | ^19 | runtime | DOM 渲染挂载，DirTree 侧边栏在 DOM 树中的插入和移除 |
| `react-router-dom` | ^7 | runtime | 路由感知，DirTree 仅在 `/graph` 路由下渲染 |

### 构建依赖

| 依赖 | 用途 | 说明 |
|------|------|------|
| `typescript` | 类型检查与编译 | 项目已配置，所有组件及 props 接口均使用 TypeScript 类型标注 |
| `vite-plus` | 构建打包与开发服务器 | 项目已配置，通过 Vite 打包前端资源 |
| `@vitejs/plugin-react` | React JSX 编译支持 | 项目已配置，各组件使用 JSX 语法需此插件转换 |

### 测试依赖

| 依赖 | 用途 | 说明 |
|------|------|------|
| `@testing-library/react` | 组件渲染和交互测试 | 项目已有，DirTree 使用已有模式进行组件测试 |
| `jsdom` | 浏览器环境模拟 | 项目已有，提供 DOM API（包括 localStorage）模拟用于测试 |

### CSS 依赖

所有视图组件和 DirTree 使用 **内联样式（inline styles）** 渲染，不引入额外的 CSS 文件或 CSS-in-JS 库。所有颜色值通过 `var(--color-*)` CSS 变量引用，自动适配深色/浅色主题。项目已有的 `variables.css` 提供以下 CSS 变量：

| CSS 变量 | 用途 |
|----------|------|
| `var(--color-surface)` | 组件背景色 |
| `var(--color-border)` | 分割线颜色 |
| `var(--color-text-secondary)` | 次要文字颜色 |
| `var(--color-text-muted)` | 图标颜色 |
| `var(--color-accent-bg)` | hover 背景色 |
| `var(--color-error)` | 错误态颜色 |
| `var(--color-warning)` | 警告态颜色 |
| `var(--color-info)` | 信息态颜色 |
| `var(--color-bg)` | 卡片背景色 |

## 变更范围

### 范围内

| 模块 | 变更内容 |
|------|----------|
| `packages/cli/src/server/dep/graph.ts` | POST /api/graph 响应 meta 新增 source（graph 文件路径） |
| `packages/frontend/src/hooks/useGraphData.ts` | 新增 localStorage 持久化逻辑：source 路径映射、缓存读写、首次请求携带缓存、以服务端响应更新缓存、sidebarVisible 管理 |
| `packages/frontend/src/components/DirTree.tsx` | **新建**：目录树侧边栏组件，递归渲染、展开/折叠图标、缩进、排序、侧边栏折叠按钮 |
| `packages/frontend/src/components/icons.tsx` | 新增展开/折叠/侧边栏切换 SVG 图标 |
| `packages/frontend/src/components/GraphView.tsx` | **新建**：封装 DirTree + DependencyGraph + DetailPanel 的三栏视图组件 |
| `packages/frontend/src/components/ReportView.tsx` | **新建**：从 App.tsx 抽取的报告视图组件 |
| `packages/frontend/src/components/MetricsView.tsx` | **新建**：从 App.tsx 抽取的指标视图组件 |
| `packages/frontend/src/components/GraphViewLayout.tsx` | 不做 DirTree 相关的 props 变更；保持纯布局外壳 |
| `packages/frontend/src/App.tsx` | graph 视图渲染改为 `<GraphViewLayout><GraphView data={...} expandedDirs={...} ... /></GraphViewLayout>`，DirTree props 传入 GraphView |
| `packages/frontend/src/i18n/en.ts` | 新增 tree 相关 i18n 键（aria 标签） |
| `packages/frontend/src/i18n/zh-CN.ts` | 新增 tree 相关 i18n 键（aria 标签） |

### 测试文件

| 模块 | 变更内容 |
|------|----------|
| `packages/frontend/src/components/DirTree.tsx` | 组件本身（逻辑复杂，建议内聚） |
| `packages/cli/src/server/dep/graph.ts` | source 增量（配合 E2E 测试） |

### 不要修改

- 不修改 Rust 后端（`packages/rust/`）—— 树构建完全在 TypeScript 侧完成
- 不修改 DetailPanel 组件逻辑
- 不修改 DependencyGraph 组件逻辑（仅调整容器布局）
- 不修改 G6 的节点/边样式或数据映射
- 不修改 Report 或 Metrics 视图
- 不修改 `buildGraphData.ts`
- 不修改 E2E 测试已有用例（只需要在新增场景中验证 tree 渲染）

## 关键决策

### 决策一：DirTree 嵌入 GraphView 而非 GraphViewLayout

**结论**: DirTree 作为 GraphView 组件的内部子组件，GraphViewLayout 保持纯布局外壳，不感知 DirTree。

**备选方案**: DirTree 渲染在 GraphViewLayout 的 children slot 之外，由 GraphViewLayout 管理 DirTree 的 props 传递和条件渲染。

**被拒原因**: GraphViewLayout 是跨路由的通用布局组件（graph / report / metrics / architecture 共用）。将 DirTree 放入 GraphViewLayout 意味着 GraphViewLayout 需要感知 DirTree 相关 props（`data`、`expandedDirs`、`onToggleDir`、`sidebarVisible`、`onToggleSidebar`），即使 report/metrics 路由不使用。这破坏了 GraphViewLayout 的职责单一性，增加了非 graph 路由的无用 props 传递。DirTree 只与 `/graph` 路由相关，放入 GraphView 组件使相关逻辑内聚，GraphViewLayout 无需关心哪个路由在使用 children。

### 决策二：数据驱动树构建（从 ProcessedGraph combos 构建）

**结论**: 目录树从当前 `ProcessedGraph` 的 `combos` 和 `nodes` 实时构建。

**备选方案**: 独立 API 端点（`GET /api/directory-tree`）。

**被拒原因**: 引入额外端点意味着独立的数据序列化和路由逻辑，且树和图的状态必须严格同步——独立端点存在时序竞争和状态不一致的风险。当前 `ProcessedGraph.combos` 已通过 `combo` 字段表达了完整的父子层级关系，TypeScript 侧 O(n) 遍历即可构建树，无需增加服务端负担。

### 决策三：单层展开（非递归展开所有子目录）

**结论**: 展开一个目录仅显示其直接子节点（子目录 + 文件），子目录保持折叠。与现有 `toggleDir` 行为一致。

**备选方案**: 递归展开全部子目录。

**被拒原因**: 深度项目目录（5+ 层级）的递归展开将触发单次操作展开数十个目录的连锁效应，每次 `toggleDir` 均触发 `fetchGraph` API 请求，递归展开产生不可预测的请求量和数据量，且与现有 `toggleDir` 语义不一致。

### 决策四：localStorage + source 路径持久化

**结论**: 以 graph 文件路径（`source`）为 key 存储展开状态到 localStorage。首次请求即读取缓存并传入 `fetchGraph`，每次响应后用服务端返回的 `expanded_dirs` 覆写缓存。

**备选方案**: 写回图文件或独立状态文件（`.dc-reporter/tree-state.json`）。

**被拒原因**: 文件写回引入 I/O 开销和并发竞态条件。用户快速连续展开/折叠多个目录时，多次文件写入可能导致部分写入丢失。该方案还要求服务端提供写入权限，而当前 API 设计是纯查询模式，引入写端点增加安全风险和复杂度。

### 决策五：固定侧边栏而非弹出层/覆盖层

**结论**: 目录树作为固定侧边栏，始终占据屏幕左侧 260px 宽度（可折叠隐藏）。

**备选方案**: 浮动弹出层（Popover/Overlay）。

**被拒原因**: 弹出层每次查看都需要额外操作（打开再关闭），而目录树的核心使用场景是持续导航——用户需要频繁参考目录结构。浮动面板会遮挡画布内容，侧边栏不遮挡。侧边栏的"始终可见"属性降低了认知负担。

### 决策六：React + CSS 渲染目录树（非 G6 TreeGraph）

**结论**: 目录树使用纯 React 组件 + CSS 样式渲染。

**备选方案**: AntV G6 TreeGraph。

**被拒原因**: G6 TreeGraph 的交互模型（缩放、平移、节点拖动）与侧边栏 UI 需求不匹配。侧边栏需要标准 DOM 树控件（滚动、点击展开/折叠），而非图形画布。React + CSS 方案利用标准 DOM 原语，易于测试和维护，自动继承 CSS 变量体系和深色模式主题。

### 决策七：固定宽度 260px 不可拖拽调整

**结论**: 侧边栏宽度固定为 260px，用户不可拖拽调整。

**备选方案**: 可拖拽调整宽度的侧边栏。

**被拒原因**: 可拖拽交互涉及 mouse/touch 事件处理、宽度约束、与 G6 画布 resize 的协调，复杂度显著增加。260px 基于典型目录路径长度（最深约 4-5 层）的经验值，足够容纳完整路径。溢出场景使用 `text-overflow: ellipsis` 配合 title tooltip 降级。折叠/展开机制已满足用户对空间的诉求。

### 决策八：首次请求即携带缓存，非先查询后请求

**结论**: `useGraphData` 初始化时直接从 localStorage 读取 source 路径和缓存的 expandedDirs，直接传入第一次 `fetchGraph` 调用，不单独发送预检请求。

**备选方案**: 先发一个轻量请求获取 source，再用 source 查找缓存，最后请求完整图数据。

**被拒原因**: 增加一次往返延迟和额外的服务端端点/逻辑。由于 localStorage 的读取是同步且零成本的，且错误的缓存仅导致服务端返回空展开列表（自动修正），无需为"可能正确"的缓存增加预检开销。

### 决策九：视图组件抽取（GraphView / ReportView / MetricsView）

**结论**: 将 App.tsx 中的内联视图逻辑抽取为独立的 `GraphView`、`ReportView`、`MetricsView` 组件文件。

**备选方案**: 保持内联，仅在 App.tsx 中新增 DirTree 相关逻辑。

**被拒原因**: App.tsx 当前已 493 行，叠加 DirTree 侧边栏的三栏布局逻辑后将逼近 600+ 行。将每个视图抽取为独立组件带来以下优势：每个组件职责单一，文件大小可控（各约 50-200 行）；样式与组件逻辑内聚，修改某视图不会影响其他视图；未来为视图添加逻辑（如筛选、排序、导出）时不需要膨胀 App.tsx。抽取后 App.tsx 缩减至约 200 行，专注于路由调度和共享状态管理。特别是，将 DirTree 放入 GraphView 意味着所有三栏布局逻辑在 GraphView 内完成，不影响 App.tsx。
