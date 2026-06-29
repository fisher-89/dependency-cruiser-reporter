# 测试设计: add-directory-tree-sidebar

> **变更**: add-directory-tree-sidebar
> **日期**: 2026-06-25

---

## 测试策略

### 分层策略

| 层级 | 覆盖范围 | 运行方式 | 断言风格 |
|------|----------|----------|----------|
| CLI 单元测试 | `graph.ts` `source` 字段注入逻辑 | `vp test` (vitest) | expect.toBe, expect.toEqual |
| 前端纯逻辑测试 | `useGraphData` localStorage 持久化、缓存读写、sidebarVisible 状态管理 | `vp test` (vitest) | expect.toBe, expect.toEqual, vi.spyOn |
| 前端组件测试 | `DirTree` 树构建/渲染/交互、`GraphView` 三栏布局、`App` 状态管理、`ReportView`/`MetricsView` 抽取组件、`icons` SVG 渲染 | `vp test` + `@testing-library/react` | screen.getByTestId, fireEvent.click, expect.toHaveStyle |
| 前端集成测试 | DirTree 渲染/交互全流程、侧边栏切换、localStorage 持久化 | `vp test` + `@testing-library/react` | screen.getByTestId, waitFor, vi.spyOn |
| CLI 集成测试 | `POST /api/graph` meta.source 返回 | `vp test` (vitest) | expect.toHaveProperty |
| 前端 i18n 验证 | 翻译键存在性校验 | `vp test` | expect.toBeDefined |

### 文件组织

```
packages/cli/src/server/dep/
  graph.test.ts              -- graph.ts meta.source 单元测试

packages/cli/__tests__/
  graph-source-meta/
    graph-source-meta.test.ts -- CLI 集成测试：POST /api/graph meta.source

packages/frontend/src/components/
  DirTree.test.tsx            -- DirTree 组件单元测试
  GraphView.test.tsx          -- GraphView 三栏布局单元测试
  GraphViewLayout.test.tsx    -- GraphViewLayout 布局测试（已有，无需新增用例）
  ReportView.test.tsx         -- ReportView 抽取组件单元测试
  MetricsView.test.tsx        -- MetricsView 抽取组件单元测试
  icons.test.tsx              -- 新增 SVG 图标单元测试

packages/frontend/src/hooks/
  useGraphData.test.ts        -- useGraphData localStorage 持久化单元测试

packages/frontend/src/
  App.test.tsx                -- App sidebarVisible 状态管理单元测试

packages/frontend/src/i18n/
  en.test.ts                  -- en.ts 翻译键单元测试
  zh-CN.test.ts               -- zh-CN.ts 翻译键单元测试

packages/frontend/__tests__/
  dir-tree-rendering/
    dir-tree-rendering.test.tsx  -- DirTree 渲染集成测试
  dir-tree-interaction/
    dir-tree-interaction.test.tsx -- 展开/折叠交互集成测试
  sidebar-toggle/
    sidebar-toggle.test.tsx      -- 侧边栏折叠/展开集成测试
  state-persistence/
    state-persistence.test.tsx   -- 状态持久化集成测试
```

### 命名约定

- **F-N**: Forward acceptance criteria (正向验收路径)
- **R-N**: Reverse acceptance criteria (反向/错误处理路径)
- **B-N**: Boundary case (边界条件)

---

## 验收范围

| # | 验收标准 | 对应测试 | 层级 | 测试文件 |
|---|----------|----------|------|----------|
| 1 | DirTree 从 ProcessedGraph 正确构建目录层级 | F-1, F-2, F-3, F-4, F-5 | 前端组件测试 | `DirTree.test.tsx` |
| 1 | DirTree 渲染根级目录项（集成） | F-1 (E2E), F-4 (E2E) | 前端集成测试 | `dir-tree-rendering.test.tsx` |
| 2 | 展开目录图标点击触发 toggleDir 并更新图谱 | F-6, F-7 | 前端组件测试 | `DirTree.test.tsx` |
| 2 | 展开交互全流程 | F-6 (E2E) | 前端集成测试 | `dir-tree-interaction.test.tsx` |
| 3 | 折叠目录图标点击收起目录并更新图谱 | F-8 | 前端组件测试 | `DirTree.test.tsx` |
| 3 | 折叠交互全流程 | F-8 (E2E) | 前端集成测试 | `dir-tree-interaction.test.tsx` |
| 4 | 目录后跟文件，组内按字母序排列 | F-9, F-10 | 前端组件测试 | `DirTree.test.tsx` |
| 4 | 排序集成验证 | F-4 (E2E) | 前端集成测试 | `dir-tree-rendering.test.tsx` |
| 5 | 每层深度正确缩进（16px x depth） | F-11, F-12 | 前端组件测试 | `DirTree.test.tsx` |
| 5 | 深层缩进集成验证 | F-11 (E2E) | 前端集成测试 | `dir-tree-rendering.test.tsx` |
| 6 | 侧边栏宽度 260px，可滚动 | F-13, F-13a, F-13b, F-13c | 前端组件测试 | `DirTree.test.tsx` |
| 6 | 宽度 260px 集成验证 | F-13 (E2E) | 前端集成测试 | `dir-tree-rendering.test.tsx` |
| 7 | 侧边栏可折叠/展开（toggle button） | F-14, F-15, F-16 | 前端组件测试 | `DirTree.test.tsx` |
| 7 | 侧边栏折叠/展开全流程 | F-14 (E2E), F-14a (E2E), F-16 (E2E) | 前端集成测试 | `sidebar-toggle.test.tsx` |
| 8 | 页面刷新后展开状态恢复（同一数据源） | F-17, F-18, F-18a | 前端纯逻辑测试 | `useGraphData.test.ts` |
| 8 | 状态持久化全流程 | F-17 (E2E) | 前端集成测试 | `state-persistence.test.tsx` |
| 9 | 不同数据源各自独立缓存 | F-19, F-20 | 前端纯逻辑测试 | `useGraphData.test.ts` |
| 9 | 数据源隔离集成验证 | F-19 (E2E) | 前端集成测试 | `state-persistence.test.tsx` |
| 10 | 服务端 POST /api/graph 返回 meta.source | F-21, F-22 | CLI 单元测试 | `graph.test.ts` |
| 10 | meta.source 集成验证 | F-21 (E2E), F-22 (E2E) | CLI 集成测试 | `graph-source-meta.test.ts` |
| 11 | 三栏布局在 graph 视图中正确渲染 | F-23, F-24, F-24a | 前端组件测试 | `GraphView.test.tsx` |
| 11 | 三栏布局集成验证 | F-23 (E2E) | 前端集成测试 | `dir-tree-interaction.test.tsx` |
| -- | GraphView props 传递 | F-25, F-26, F-27 | 前端组件测试 | `GraphView.test.tsx` |
| -- | 侧边栏可见性默认状态与切换 | F-32, F-33, F-34, F-35 | 前端组件测试 | `App.test.tsx` |
| -- | 侧边栏状态路由切换保持 | R-11 | 前端组件测试 | `App.test.tsx` |
| -- | ReportView 渲染违规统计与列表 | F-28, F-29 | 前端组件测试 | `ReportView.test.tsx` |
| -- | ReportView 空状态 | R-8, R-9 | 前端组件测试 | `ReportView.test.tsx` |
| -- | MetricsView 渲染统计卡片与边分布 | F-30, F-31 | 前端组件测试 | `MetricsView.test.tsx` |
| -- | MetricsView 空数据 | R-10 | 前端组件测试 | `MetricsView.test.tsx` |
| -- | 新增 SVG 图标渲染 | F-36, F-37, F-38, F-39 | 前端组件测试 | `icons.test.tsx` |
| -- | en.ts i18n 翻译键 | F-40, F-41, F-42, F-43 | 前端 i18n 验证 | `en.test.ts` |
| -- | zh-CN.ts i18n 翻译键 | F-44, F-45, F-46, F-47 | 前端 i18n 验证 | `zh-CN.test.ts` |

> 注：`#` 列中的编号对应 proposal.md 验收标准编号。`--` 表示该测试直接对应 proposal 标准之外但属于本次变更设计范围的质量保障测试。

---

## 前端测试清单

### 1. DirTree 组件单元测试 (DirTree.test.tsx)

**实现状态**: 待实现。使用 `@testing-library/react` 渲染组件，直接传入 props（data, expandedDirs, onToggleDir, sidebarVisible, onToggleSidebar）。i18n mock 返回固定翻译字符串，icon stub 使用 `data-testid` 验证存在性。

**测试数据**: 内联构建 `ProcessedGraph` fixture 模拟不同目录层级结构。

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-1 | renders root combos as top-level entries | 根级 combo 渲染为顶层目录项 | combos: 2 个根 combo (`src`, `test`) | 显示 "src" 和 "test" 两个条目 |
| F-2 | renders nested combos as subdirectory entries | 嵌套 combo 渲染为子目录 | combo `src/frontend` 的 `combo` 为 `src` | `src` 展开后显示 `frontend` 子目录 |
| F-3 | renders file nodes as leaf entries | 文件节点渲染为叶子条目 | `src/index.ts` 文件节点在 `src` combo 下 | `src` 展开后显示 `index.ts` |
| F-4 | renders directory nodes as expandable entries | 目录节点渲染为可展开条目 | `node_type=directory` 且 `children.length > 0` | 显示展开图标，可点击 |
| F-5 | renders minimal display (label only, no extension) | 最小化显示（仅标签、无扩展名） | 文件节点 `label=index.ts` | 显示 "index.ts"，无额外路径前缀 |

#### 反向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| R-1 | empty combos renders no directory entries | 空 combos 列表 | combos: [], nodes: [] | 无树条目渲染，显示空状态 |
| R-2 | nodes without matching combo are not rendered | 无对应 combo 的节点不渲染 | nodes 的 combo 引用不存在的 combo id | 该节点不在树中显示 |
| R-3 | non-expandable directory has no icon | 无子目录的目录无展开图标 | `children.length === 0` | 不显示展开/折叠图标，标签与图标偏移对齐 |
| R-4 | file entry has no icon | 文件节点无图标 | `node_type=file` | 不显示展开/折叠图标 |
| R-5 | click on label text does not toggle | 点击标签文字不触发 toggle | 点击目录条目标签文字 | `onToggleDir` 不被调用 |
| R-6 | sidebarVisible=false renders nothing | 侧边栏隐藏时渲染为空 | `sidebarVisible={false}` | 返回 `null` 或空容器 |

#### 边界情况

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| B-1 | deeply nested combos render at correct depth | 深层嵌套（5 层） | combos 嵌套 5 层，根到 `a/b/c/d/e` | 5 层递归渲染，每层缩进正确 |
| B-2 | combos with very long labels use text-overflow | 超长标签 | label 长度 > 50 字符 | CSS `text-overflow: ellipsis` 应用，title tooltip 包含完整路径 |
| B-3 | data prop reference change rebuilds tree | data 引用变化重建树 | 初始和更新 data 不同 | 树内容随 data 变化完全刷新 |
| B-4 | expandedDirs set with non-existent paths | 展开集合含不存在的路径 | expandedDirs 包含不存在于 combos 的路径 | 该路径对应目录不展开，不抛异常 |
| B-5 | expandedDirs is empty set | 空展开集合 | expandedDirs: new Set() | 所有目录显示折叠状态（`>` 图标） |
| B-6 | node_type=directory with empty children | 空子目录（有 children 但为空数组） | `children: []` | 不显示展开/折叠图标 |
| B-7 | combo with null/undefined label | label 为空 | `label: null` | 使用 id 或空字符串作为后备显示 |

### 2. DirTree 排序测试 (DirTree.test.tsx - 同上文件)

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-9 | directories before files within same level | 目录在文件前 | 1 个子目录 `zebra` + 1 个文件 `main.ts` | `zebra` 在 `main.ts` 之前 |
| F-10 | case-insensitive alphabetical sort within groups | 组内字母序排列 | 目录 `alpha`, `Zeta`；文件 `main.ts`, `utils.ts` | `alpha`, `Zeta`; `main.ts`, `utils.ts` |

#### 边界情况

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| B-8 | single child directory | 单子目录 | 1 个目录、0 个文件 | 仅显示目录条目，无排序问题 |
| B-9 | single file entry | 单文件 | 0 个目录、1 个文件 | 仅显示文件条目 |
| B-10 | mixed case labels sort case-insensitively | 大小写混合 | `A-bb`, `a-aa`, `B-cc` | `a-aa`, `A-bb`, `B-cc` |
| B-11 | special characters in labels | 特殊字符标签 | `_hooks`, `@types`, `$utils` | 按字符码点顺序排列（与 JS 默认 sort 一致） |

### 3. DirTree 缩进测试 (DirTree.test.tsx - 同上文件)

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-11 | root level items have base 8px padding | 根级项基础 padding | depth 0 条目 | `paddingLeft: "8px"` |
| F-12 | nested items add 16px per depth level | 嵌套项递进缩进 | depth 1: 24px, depth 2: 40px, depth 3: 56px | 内联样式 `paddingLeft` 分别为 `24px`, `40px`, `56px` |

### 4. DirTree 侧边栏样式测试 (DirTree.test.tsx - 同上文件)

#### 正向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-13 | sidebar has 260px fixed width and overflow-y auto | 侧边栏样式 | 容器 style 含 `width: "260px"`、`overflowY: "auto"`、`height: "100%"` |
| F-13a | sidebar uses CSS variable colors | CSS 变量颜色 | 背景 `var(--color-surface)`、右边框 `var(--color-border)` |
| F-13b | tree item hover uses accent-bg | hover 样式 | 悬停时背景 `var(--color-accent-bg)` 透明度 50% |
| F-13c | tree item text uses text-secondary | 文字颜色 | label 使用 `var(--color-text-secondary)`，图标使用 `var(--color-text-muted)` |

### 5. DirTree Header 测试 (DirTree.test.tsx)

#### 正向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-14 | sidebar header shows title and collapse button | 侧边栏打开时的 header | 标题显示 "Directories"（翻译），右侧有折叠按钮（`SidebarToggleIcon`） |
| F-15 | collapsed sidebar shows expand handle | 侧边栏折叠时的手柄 | 仅 32px 宽手柄，显示展开按钮（`SidebarToggleIcon` 反转方向） |
| F-16 | sidebar collapse button calls onToggleSidebar | 折叠按钮点击 | `onToggleSidebar` 被调用 |

### 6. DirTree 展开/折叠图标测试 (DirTree.test.tsx)

#### 正向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-6 | expandable directory shows collapse icon when expanded | 展开状态显示折叠图标 | combo id 在 `expandedDirs` 中时显示 `ChevronDownIcon` |
| F-7 | clicking collapse icon calls onToggleDir | 点击折叠图标触发回调 | `onToggleDir(comboId)` 被调用 |
| F-8 | expandable directory shows expand icon when collapsed | 折叠状态显示展开图标 | combo id 不在 `expandedDirs` 中时显示 `ChevronRightIcon` |

### 7. GraphView 三栏布局测试 (GraphView.test.tsx)

**实现状态**: 待实现。渲染 `GraphView` 组件，mock 子组件为 stub 追踪 props 传递。

#### 正向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-23 | renders three-column flex layout | 三栏 flex 布局 | `data-testid="graph-view"` 容器为 `display: flex`，包含 DirTree/DependencyGraph/DetailPanel 三个子元素 |
| F-24 | sidebarVisible=true renders DirTree at 260px | DirTree 可见时 | DirTree 渲染，宽度 260px |
| F-24a | sidebarVisible=false hides DirTree | DirTree 隐藏时 | DirTree 不渲染，容器显示 32px 窄手柄 |

#### 反向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| R-7 | sidebarVisible toggle removes/restores DirTree from DOM | 切换可见性 | 隐藏时 DirTree DOM 移除，恢复时重新渲染 |

### 8. GraphView Props 传递测试 (GraphView.test.tsx)

#### 正向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-25 | DirTree receives correct props from GraphView | props 传递 | DirTree 收到 `data`, `expandedDirs`, `onToggleDir`, `sidebarVisible`, `onToggleSidebar` |
| F-26 | DependencyGraph receives correct props | 中转 props | DependencyGraph 收到 `data`, `expandedDirs`, `onToggleDir`, `selectedNodeId`, `onNodeSelect`, `stabilityHeatmap` |
| F-27 | DetailPanel receives correct props | 面板 props | DetailPanel 收到 `node`, `nodeMap` |

#### 边界情况

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| B-12 | data=null renders no DirTree | data 为 null | DirTree 不渲染（或无数据提示） |
| B-13 | selectedNodeId=null passes null to DetailPanel | 未选中节点 | DetailPanel 收到 `node=null` |

### 9. ReportView 组件测试 (ReportView.test.tsx)

**实现状态**: 待实现。渲染提取后的 `ReportView` 组件，验证 violations 渲染。

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-28 | renders violation statistics cards | 违规统计卡片 | 显示错误/警告/信息统计数量的卡片 |
| F-29 | renders violation list | 违规列表 | 违规项逐行显示 |
| R-8 | empty violations array renders "no violations" | 无违规 | 显示无违规提示文本 |
| R-9 | violations undefined renders empty state | undefined | 不抛异常，显示空状态 |
| F-29a | component has data-testid="report-view" | data-testid | `data-testid="report-view"` 存在 |

### 10. MetricsView 组件测试 (MetricsView.test.tsx)

**实现状态**: 待实现。渲染提取后的 `MetricsView` 组件，验证统计数据渲染。

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-30 | renders statistics cards | 统计卡片 | 显示节点数、依赖数、违规数等卡片 |
| F-31 | renders edge type distribution | 边类型分布 | 显示各边类型计数 |
| R-10 | empty data renders default/zero states | 空数据 | 各统计值显示 0 或 N/A |
| F-31a | component has data-testid="metrics-view" | data-testid | `data-testid="metrics-view"` 存在 |

### 11. App 状态管理测试 (App.test.tsx)

**实现状态**: 待实现。使用 `vi.mock` 替换子组件为 stub，通过 `MemoryRouter` 控制路由。

**Mock 策略**: 与 `App.heatmap.test.tsx` 一致，mock `DependencyGraph`、`DetailPanel`、`ArchitectureView`、`GraphViewLayout`、`useGraphData`。新增 `GraphView` mock 追踪 `sidebarVisible` 和 `onToggleSidebar` prop。

#### 正向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-32 | sidebarVisible defaults to true on initial render | 默认可见 | `GraphView` 收到 `sidebarVisible=true` |
| F-33 | onToggleSidebar callback flips sidebarVisible | 切换可见性 | 调用 `onToggleSidebar` 后 `sidebarVisible` 翻转 |
| F-34 | GraphView receives sidebarVisible and onToggleSidebar | prop 传递 | App 将 `sidebarVisible` 和 `onToggleSidebar` 传递给 `GraphView` |
| F-35 | non-graph routes do not require sidebarVisible | 非 graph 路由 | `/report` 和 `/metrics` 路由不涉及 DirTree 侧边栏 |

#### 反向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| R-11 | sidebarVisible persists across route changes | 路由切换保持 | 设置 false -> 切到 `/report` -> 切回 `/graph` -> `sidebarVisible` 仍为 false |

### 12. icons 组件测试 (icons.test.tsx)

**实现状态**: 待实现。渲染新增 SVG 图标组件，验证 SVG 属性。

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-36 | ChevronRightIcon renders as right-pointing chevron | 右箭头图标 | 渲染 SVG，`width=16`, `height=16`, `viewBox="0 0 24 24"` |
| F-37 | ChevronDownIcon renders as down-pointing chevron | 下箭头图标 | 渲染 SVG，与现有图标模式一致 |
| F-38 | SidebarToggleIcon renders as double-chevron | 侧边栏切换图标 | 渲染 SVG，方向指示切换动作 |
| F-39 | SVG uses currentColor stroke | currentColor 描边 | `stroke="currentColor"` 或 `fill="currentColor"` |

### 13. i18n 翻译键测试

#### en.test.ts

**实现状态**: 待实现。直接 import 翻译字典常量进行纯数据层验证。

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-40 | en.ts tree.title is "Directories" | 英文 | `en.tree.title === "Directories"` |
| F-41 | en.ts tree.expand is "Expand directory" | 英文 | `en.tree.expand === "Expand directory"` |
| F-42 | en.ts tree.collapse is "Collapse directory" | 英文 | `en.tree.collapse === "Collapse directory"` |
| F-43 | en.ts tree.toggleSidebar is "Toggle sidebar" | 英文 | `en.tree.toggleSidebar === "Toggle sidebar"` |

#### zh-CN.test.ts

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-44 | zh-CN.ts tree.title is "目录" | 中文 | `zhCN.tree.title === "目录"` |
| F-45 | zh-CN.ts tree.expand is "展开目录" | 中文 | `zhCN.tree.expand === "展开目录"` |
| F-46 | zh-CN.ts tree.collapse is "折叠目录" | 中文 | `zhCN.tree.collapse === "折叠目录"` |
| F-47 | zh-CN.ts tree.toggleSidebar is "切换侧边栏" | 中文 | `zhCN.tree.toggleSidebar === "切换侧边栏"` |

---

## CLI 测试清单

### 14. graph.ts meta.source 单元测试 (graph.test.ts)

**实现状态**: 待实现。测试 `setupGraphRoute` 的 `POST /api/graph` 处理器在响应 `meta` 中注入 `source` 字段。

**测试策略**: 使用 `supertest` 或直接构造 Express 应用调用路由处理器，mock 文件系统和 `convert` 函数。

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-21 | response meta includes source field | source 字段存在 | `graphFile="/abs/path/graph.json"` | `response.body.meta.source === "/abs/path/graph.json"` |
| F-22 | source is graphFile absolute path | source 为绝对路径 | `graphFile="/abs/path/graph.json"` | `meta.source` 等于传入的 `graphFile` 值 |

#### 反向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| R-12 | graphFile undefined returns 404 without source | 无 graph 文件 | `graphFile=undefined` | `status 404`，无 `meta.source` |
| R-13 | file not found returns 404 | 文件不存在 | `graphFile="/nonexistent"` | `status 404`，`error` 包含 "not found" |
| R-14 | invalid format returns 400 | 无效格式 | 不是 `modules` 数组 | `status 400`，`error` 包含 "Unrecognized" |

#### 边界情况

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| B-14 | source path with spaces and special chars | 特殊字符路径 | `graphFile="C:/my project/graph (1).json"` | `meta.source` 为原始路径字符串，不转义 |
| B-15 | source is preserved after convert error | 异常转发的完整性 | `convert()` 抛异常 | `status 500`，`meta.source` 不存在 |
| B-16 | expanded_dirs from body do not affect source | expanded_dirs 不影响 source | `body.expanded_dirs: ["src"]` | `meta.source` 仍为 `graphFile`，不受 `expanded_dirs` 影响 |

### 15. useGraphData localStorage 持久化测试 (useGraphData.test.ts)

**实现状态**: 待实现。使用 `renderHook` 或模拟 `useGraphData` 的内部逻辑。测试 localStorage 的读写操作。

#### 正向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-17 | reads cached source from dcr:source:{origin} before first fetch | 首次请求前读取缓存 | `localStorage.getItem("dcr:source:{origin}")` 在 `fetchGraph` 调用前被读取 |
| F-18 | writes meta.source to dcr:source:{origin} after response | 响应后更新 source 缓存 | `localStorage.setItem("dcr:source:{origin}")` 被调用 |
| F-18a | writes meta.expanded_dirs to dcr:expanded:{source} | 响应后更新 expanded 缓存 | `localStorage.setItem("dcr:expanded:{source}")` 使用 `JSON.stringify(meta.expanded_dirs)` |
| F-19 | different source separated by dcr:source key | 不同 source 分离 | `source1` 和 `source2` 对应不同 localStorage key |
| F-20 | cold cache sends empty array | 冷缓存发送空数组 | 无缓存时 `fetchGraph` 参数为空数组 `[]` |

#### 反向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| R-15 | server expanded_dirs overrides local cache | 服务端覆写 | 服务端返回的 `expanded_dirs` 写入 localStorage，覆盖之前缓存 |
| R-16 | old source cached dirs sent but server returns new dirs | 旧缓存自动修正 | 请求发送旧缓存，服务端返回新的 `expanded_dirs`，缓存被覆写 |
| R-17 | sidebarVisible persists to dcr:layout:graph:dir_tree | 侧边栏可见性持久化 | `sidebarVisible` 变化时更新 `localStorage["dcr:layout:graph:dir_tree"]` |

#### 边界情况

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| B-17 | localStorage unavailable (quota exceeded or disabled) | localStorage 不可用 | `localStorage.setItem` 抛异常 | 不崩溃，功能降级，不影响渲染 |
| B-18 | corrupted JSON in localStorage | 损坏的 JSON | `localStorage["dcr:expanded:{source}"]` = `"{invalid}"` | 捕获 JSON.parse 异常，兜底为空数组 |
| B-19 | missing dcr:source:{origin} on mount | 无 origin 映射 | 首次使用 | `fetchGraph` 以空数组调用 |
| B-20 | rapid successive toggleDir calls | 快速连续展开/折叠 | `toggleDir("a")`, `toggleDir("b")` 连续调用 | 每次调用均触发 `fetchGraph` |

---

## 集成测试清单

### 16. DirTree 渲染集成测试 (dir-tree-rendering.test.tsx)

**实现状态**: 待实现。渲染完整的 `GraphView` 或 `App` 组件，使用 mock 的 `useGraphData` 提供带目录层级的 `ProcessedGraph` 数据。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-1 (E2E) | 加载含目录层级的数据后，DirTree 显示根级目录 | `data-testid="dir-tree"` 包含目录项元素，显示根 combo labels |
| F-4 (E2E) | 目录/文件按规则排序：目录在前、文件在后 | 同级目录条目在文件条目之前 |
| F-13 (E2E) | 侧边栏宽度为 260px | 容器 `offsetWidth` 约等于 260 |
| F-11 (E2E) | 深层目录正确缩进 | depth 2 的条目 `paddingLeft` 大于 depth 1 的条目 `paddingLeft` |

### 17. DirTree 交互集成测试 (dir-tree-interaction.test.tsx)

**实现状态**: 待实现。渲染 `App` 到 `/graph` 路由，mock `fetch` 控制 `POST /api/graph` 响应。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-6 (E2E) | 点击 DirTree 展开图标触发 `fetchGraph` | `fetch` 被调用，请求体包含对应目录 ID |
| F-8 (E2E) | 点击 DirTree 折叠图标收起目录 | 再次请求 `fetch`，展开目录 ID 从请求体中移除 |
| F-23 (E2E) | 三栏布局渲染（DirTree | DependencyGraph | DetailPanel） | 三个面板在 DOM 中并排渲染 |

### 18. 侧边栏切换集成测试 (sidebar-toggle.test.tsx)

**实现状态**: 待实现。渲染 `App` 到 `/graph` 路由，模拟用户点击侧边栏切换按钮。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-14 (E2E) | 侧边栏默认可见 | DirTree 在 DOM 中渲染 |
| F-14a (E2E) | 点击折叠按钮，侧边栏折叠为窄手柄 | DirTree 内容消失，窄手柄（`data-testid="sidebar-handle"`）出现 |
| F-16 (E2E) | 点击窄手柄展开按钮，侧边栏恢复 | DirTree 内容重新出现在 DOM 中 |

### 19. 状态持久化集成测试 (state-persistence.test.tsx)

**实现状态**: 待实现。渲染 `App` 到 `/graph` 路由，模拟页面生命周期。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-17 (E2E) | 展开目录后模拟页面刷新，状态恢复 | 第二次渲染时 `fetch` 请求体包含之前展开的目录 ID |
| F-19 (E2E) | 切换数据源后状态隔离 | 不同 origin 到 source 映射对应不同 localStorage key |

### 20. meta.source 集成测试 (graph-source-meta.test.ts)

**实现状态**: 待实现。构造 Express 应用并挂载 `setupGraphRoute`，使用 `supertest` 发送请求。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-21 (E2E) | POST /api/graph 响应 meta 包含 source | `response.body.meta.source` 为字符串 |
| F-22 (E2E) | source 值为 graphFile 绝对路径 | 值与 `setupGraphRoute` 传入的 `graphFile` 参数一致 |

---

## 测试数据策略

### DirTree 测试数据 (ProcessedGraph fixture)

```typescript
// DirTree.test.tsx 中使用的内联 fixture

/** 创建最小 ProcessedGraph 用于 DirTree 渲染测试 */
function makeProcessedGraph(overrides: Partial<ProcessedGraph> = {}): ProcessedGraph {
  return {
    nodes: [],
    edges: [],
    combos: [],
    meta: { original_node_count: 0, aggregated_node_count: 0, total_violations: 0 },
    violations: [],
    ...overrides,
  };
}

/** 创建目录树的 combo fixture */
function makeCombo(id: string, label: string, parentCombo?: string): GraphCombo {
  return {
    id: `combo:${id}`,
    label,
    node_type: 'directory',
    combo: parentCombo ?? null,
  };
}

/** 创建文件节点 fixture */
function makeFileNode(id: string, label: string, parentCombo: string): GraphNode {
  return {
    id,
    label,
    node_type: 'file',
    combo: parentCombo,
  };
}
```

### 测试场景数据矩阵

| 场景 | combos | nodes | expandedDirs | sidebarVisible |
|------|--------|-------|-------------|----------------|
| 空图 | `[]` | `[]` | `new Set()` | `true` |
| 单根目录 | `[{id: "combo:src", label:"src", combo:null}]` | `[{id:"src/index.ts", label:"index.ts", node_type:"file", combo:"combo:src"}]` | `new Set()` | `true` |
| 多层嵌套 | `[{id:"combo:src", label:"src", combo:null}, {id:"combo:src/cli", label:"cli", combo:"combo:src"}]` | `[{id:"src/cli/main.ts", label:"main.ts", node_type:"file", combo:"combo:src/cli"}]` | `new Set(["combo:src", "combo:src/cli"])` | `true` |
| 排序验证 | `[{id:"combo:src", label:"src", combo:null}]` | 子目录 + 文件混合排列 | `new Set(["combo:src"])` | `true` |
| 深层嵌套 | 5 层嵌套 combos | 对应文件节点 | `new Set(["combo:a", "combo:a/b", "combo:a/b/c"])` | `true` |
| 侧边栏隐藏 | `[]` | `[]` | `new Set()` | `false` |

### GraphView 测试数据

```typescript
// GraphView.test.tsx 中使用的 mock data
function createDefaultGraphViewProps(overrides = {}) {
  return {
    data: makeProcessedGraph(),
    expandedDirs: new Set<string>(),
    onToggleDir: vi.fn(),
    sidebarVisible: true,
    onToggleSidebar: vi.fn(),
    selectedNodeId: null,
    onNodeSelect: vi.fn(),
    stabilityHeatmap: false,
    nodeMap: new Map(),
    ...overrides,
  };
}
```

### CLI graph.ts 测试数据

```typescript
// graph.test.ts 中使用的 mock
const mockGraphFile = '/absolute/path/to/.dc-reporter/graph.json';

const mockGraphResponse = {
  nodes: [],
  edges: [],
  combos: [],
  meta: {
    original_node_count: 10,
    aggregated_node_count: 5,
    total_violations: 0,
    expanded_dirs: ['src'],
  },
  violations: [],
};
```

---

## 测试环境与 Mock 策略

### 前端 Mock 一览

| Mock 目标 | 被测试文件 | 策略 |
|-----------|-----------|------|
| `@/i18n` (useT) | `DirTree.test.tsx`, `GraphView.test.tsx`, `ReportView.test.tsx`, `MetricsView.test.tsx`, `icons.test.tsx` | `vi.mock` 返回固定映射 `{ tree.title: 'Directories', tree.expand: 'Expand', ... }` |
| `@/i18n` | `App.test.tsx` | `vi.mock` 返回 `t: (key) => key`（键名即值） |
| `@/theme` (useTheme) | 所有组件测试 | `vi.mock` 返回 `{ theme: 'light', resolvedTheme: 'light' }` |
| `@/components/icons` | `DirTree.test.tsx`, `GraphView.test.tsx` | `vi.mock` 替换为 `<span data-testid="chevron-right-icon"/>` stub |
| `@/components/DirTree` | `GraphView.test.tsx`, `App.test.tsx` | `vi.mock` 追踪 `sidebarVisible`, `onToggleSidebar` prop |
| `@/components/DependencyGraph` | `GraphView.test.tsx`, `App.test.tsx` | `vi.mock` 追踪 `expandedDirs`, `onToggleDir` prop |
| `@/components/DetailPanel` | `GraphView.test.tsx`, `App.test.tsx` | `vi.mock` 替换为轻量 stub |
| `@/components/GraphView` | `App.test.tsx` | `vi.mock` 追踪 `sidebarVisible`, `onToggleSidebar` prop |
| `@/components/GraphViewLayout` | `App.test.tsx` | `vi.mock` 追踪 props 传递（与现有模式一致） |
| `@/components/ArchitectureView` | `App.test.tsx` | `vi.mock` 替换为轻量 stub（与现有模式一致） |
| `@/hooks/useGraphData` | `App.test.tsx` | `vi.mock` 返回固定 mock 数据，包含 `sidebarVisible`, `setSidebarVisible` |
| `IntersectionObserver` | 所有组件测试 | `vi.stubGlobal` 提供空实现（与现有模式一致） |

### Mock 生命周期管理

| 钩子 | 操作 |
|------|------|
| `beforeEach` | `vi.clearAllMocks()`, `stubIntersectionObserver()`, `localStorage.clear()` |
| `afterEach` | `vi.unstubAllGlobals()`, fetchMock 恢复 |

### CLI Mock 策略

| Mock 目标 | 被测试文件 | 策略 |
|-----------|-----------|------|
| `fs.existsSync` / `fs.readFileSync` | `graph.test.ts` | `vi.spyOn` 返回可控值 |
| `convert` | `graph.test.ts` | `vi.mock` 或 `vi.spyOn` 返回 mock ProcessedGraph |
| `express Request/Response` | `graph.test.ts` | 使用 `supertest` 构造 HTTP 请求，或手动构造 `req`/`res` stub |

---

## 类型参数边界映射

### `boolean` (sidebarVisible)

| 值 | 预期行为 | 覆盖测试 |
|----|----------|----------|
| `true` | DirTree 渲染，宽度 260px | F-24, F-32 |
| `false` | DirTree 不渲染，显示 32px 手柄 | F-24a, R-6 |
| `undefined` | 视为 true（默认展开） | F-32 |

### `Set<string>` (expandedDirs)

| 边界值 | 预期 | 覆盖测试 |
|--------|------|----------|
| `new Set()` | 所有目录折叠状态 | B-5 |
| `new Set(["combo:src"])` | src 目录展开，显示 ChevronDownIcon | F-6 |
| `new Set(["nonexistent"])` | 不存在的路径，不展开，不抛异常 | B-4 |
| `new Set(["a", "a/b", "a/b/c"])` | 多层展开 | B-1 |

### `string` (combo label)

| 边界值 | 预期 | 覆盖测试 |
|--------|------|----------|
| `"src"` | 正常显示 | F-1 |
| `""` | 空标签 | B-7 (后备显示) |
| 超长 > 50 chars | `text-overflow: ellipsis` | B-2 |
| 含特殊字符 | 正常显示 | B-11 |
| 含 emoji/unicode | 正常显示 | 隐式覆盖 |

### `string[]` (expanded_dirs in API body)

| 边界值 | 预期 | 覆盖测试 |
|--------|------|----------|
| `[]` | 空数组，冷缓存首次请求 | F-20 |
| `["src"]` | 单目录展开 | F-17, F-18 |
| `["src", "src/cli", "src/frontend"]` | 多目录展开 | B-1 |
| `undefined` | 不发送 expanded_dirs | R-12（无 graph 文件） |

### `string | null` (meta.source)

| 边界值 | 预期 | 覆盖测试 |
|--------|------|----------|
| `"/abs/path/graph.json"` | 正常返回 | F-21, F-22 |
| 含空格的路径 | 不转义，原样返回 | B-14 |
| `undefined` (无 graphFile) | 404 响应，不包含 source | R-12 |

---

## 风险与缓解验证

| 风险 | 验证方式 | 对应测试 |
|------|----------|----------|
| R1: 目录树与 G6 combo 层级不同步 | 两者使用同一 `expandedDirs` 状态和 `toggleDir` 回调 | F-6, F-7, F-8, F-25 |
| R2: 大量目录/文件渲染性能 | 树大小受 `aggregated_node_count` 约束（默认 200 节点上限） | B-1（5 层嵌套验证渲染正确性） |
| R3: 同一端口不同 graph 文件时缓存错配 | `dcr:source:{origin}` 映射更新，服务端返回实际应用的 expanded_dirs | F-19, R-16 |
| R4: localStorage 不可用 | 防御性 try-catch 封装所有 localStorage 操作 | B-17 |
| R5: 侧边栏遮挡画布空间 | 260px 固定宽度，可折叠隐藏 | F-24, F-24a, F-14 (E2E) |

---

## 测试执行说明

### CLI 测试执行

```bash
# graph.ts 单元测试
cd packages/cli
vp test --include "src/server/dep/graph.test.ts"

# CLI 集成测试
vp test --include "__tests__/graph-source-meta/*.test.ts"
```

### 前端测试执行

```bash
# 全部单元测试（vitest include: src/**/*.test.{ts,tsx} 自动覆盖 co-located 测试）
cd packages/frontend
vp test --include "src/components/DirTree.test.tsx"
vp test --include "src/components/GraphView.test.tsx"
vp test --include "src/hooks/useGraphData.test.ts"
vp test --include "src/App.test.tsx"
vp test --include "src/components/ReportView.test.tsx"
vp test --include "src/components/MetricsView.test.tsx"
vp test --include "src/components/icons.test.tsx"
vp test --include "src/i18n/en.test.ts"
vp test --include "src/i18n/zh-CN.test.ts"

# 前端集成测试
vp test --include "__tests__/dir-tree-rendering/*.test.tsx"
vp test --include "__tests__/dir-tree-interaction/*.test.tsx"
vp test --include "__tests__/sidebar-toggle/*.test.tsx"
vp test --include "__tests__/state-persistence/*.test.tsx"
```

### 重要执行说明

1. **vitest 配置**：当前 `vitest.config.ts` 的 `test.include` 为 `['src/**/*.test.{ts,tsx}']`。`packages/frontend/__tests__/` 目录下的集成测试需要通过 `--include` 参数指定路径，或扩展 `vitest.config.ts` 的 `include` 数组。

2. **DirTree 使用内联样式**：DirTree 使用内联样式（CSS-in-JS）而非 class，因此测试中可以直接断言 `style` 属性（如 `paddingLeft`、`width`），无需计算样式。

3. **useGraphData 测试策略**：`useGraphData` 是自定义 hook，测试可以使用 `renderHook`（@testing-library/react）或直接测试其内部逻辑函数。由于 hook 依赖浏览器 `localStorage` API，测试前需要 mock `localStorage`（`vi.stubGlobal('localStorage', ...)` 或 `Object.defineProperty(window, 'localStorage', ...)`）。

4. **GraphView 测试策略**：`GraphView` 是本次新增组件，负责三栏布局。测试时 mock 子组件为 stub，通过 `data-testid` 验证布局结构，通过模块级变量追踪 prop 传递。

5. **ReportView/MetricsView 测试策略**：这两个组件是从 `App.tsx` 提取的现有逻辑，测试验证提取后的组件正确性。测试使用 stub 数据，无需 mock 子组件。

6. **集成测试数据**：集成测试使用的 `ProcessedGraph` fixture 复用 `packages/frontend/src/__tests__/from-change/` 中已有的 `sampleGraphData` 结构，扩展以包含 `combos` 和 `meta.source`。

7. **App.test.tsx 适配**：本次变更需要在现有 `App.test.tsx` 中新增侧边栏状态管理相关测试用例（F-32..F-35, R-11）。现有 App.test.tsx 中的 scan flow 测试用例保持不变。Mock 策略需新增 `GraphView` mock 以追踪 `sidebarVisible` 和 `onToggleSidebar` props。
