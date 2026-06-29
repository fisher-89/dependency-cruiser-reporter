## 问题

当前依赖图谱视图使用两栏布局（G6 画布 + DetailPanel），用户通过双击 combo 或目录节点来展开/折叠目录层级。这种交互方式存在以下问题：

1. **目录层级不可见**：用户无法直观看到整个项目的目录结构。只有双击展开后，目录树才局部可见于画布
2. **导航效率低**：要定位某个深层目录下的模块，用户必须逐级双击展开 combo，无法直接看到完整路径
3. **展开状态不持久**：页面刷新后所有展开状态丢失，用户每次都需要重新展开感兴趣的目录
4. **缺少全局导航视角**：用户无法在浏览画布的同时，在侧边栏中观察当前展开的目录在整体结构中的位置

## 提案

在 graph 视图左侧新增一个可折叠的目录树侧边栏（DirTree），与现有的 G6 画布和 DetailPanel 组成三栏布局。

### 核心思路

- **数据驱动**：目录树不依赖外部文件扫描，直接从当前 `ProcessedGraph` 的 combos 和 nodes 构建
- **单层展开**：展开一个目录仅显示其直接子节点（子目录 + 文件），子目录默认折叠。与现有 `toggleDir` 行为一致
- **双向同步**：树和图共享同一 `expandedDirs` 状态。在树中展开/折叠目录触发 `toggleDir` → `fetchGraph` → 树和图同时从新的 `ProcessedGraph` 更新
- **状态持久化**：以 graph 文件路径为 key，localStorage 保存展开状态。首次请求即携带缓存，每次请求后用服务端返回的 `expanded_dirs` 更新缓存

### 数据流

```
[页面加载]
     │
     ├── localStorage[origin] → source 路径
     ├── localStorage[source] → 缓存的 expandedDirs
     │
     ▼
[fetchGraph(缓存的 expandedDirs)]  ← 首次请求即带缓存
     │
     ▼
[ProcessedGraph + meta.source]
     │
     ├── 构建目录树 → 渲染 DirTree
     ├── 渲染 DependencyGraph
     │
     ├── localStorage[origin] ← source
     ├── localStorage[source] ← meta.expanded_dirs   ← 以服务端为准
     │
     ▼
[用户 toggleDir] → [expandedDirs 更新] → [fetchGraph] → 循环

### 目录树构建规则

1. 从 combos 数组构建目录层级：根 combo（`combo === null`）为顶层目录，子 combo 通过 `combo` 字段引用父级
2. 每个 combo 下的文件节点（`node_type=file`）作为叶子节点
3. 目录节点（`node_type=directory`）作为可展开的目录项
4. 排序：目录在前、文件在后，各组内按 label 字母序排列
5. 缩进：每层深度 16px 左内边距

### 持久化策略

- localStorage 三级映射：
  - `dcr:source:{origin}` → graph 文件路径（source），用于页面加载时定位当前数据源
  - `dcr:expanded:{source}` → `string[]`，该数据源当前的展开目录列表
  - `dcr:layout:graph:dir_tree` → `boolean`，目录树侧边栏可见性
- **首次请求即带缓存**：`useGraphData` 初始化时从 `window.location.origin` 查找 source，再从 source 查找缓存的 expandedDirs，直接传入 `fetchGraph`
- **以服务端为准**：每次 `fetchGraph` 返回后，用响应 `meta.expanded_dirs` 覆写 `dcr:expanded:{source}`（服务端可能做了合并/裁剪）
- 无缓存时（首次使用或新数据源）发送空数组，由服务端 `compute_auto_expanded_dirs` 决定初始展开

### 三栏布局

```
┌─────────────────────────────────────────────────────────┐
│  Header                                                  │
├────────┬──────────────────────────┬──────────────────────┤
│        │                          │                      │
│ DirTree│   DependencyGraph        │    DetailPanel       │
│ (260px)│   (flex: 1)             │    (320px)           │
│        │                          │                      │
│ scroll │                          │                      │
│ ─────  │                          │                      │
│ ▶ src  │                          │                      │
│   ▶ cli│      [G6 canvas]        │   Click a node to    │
│   ▶ rn │                          │   view details       │
│     ...│                          │                      │
│   ▶ fe │                          │                      │
│ ▶ test │                          │                      │
├────────┴──────────────────────────┴──────────────────────┤
│ [Scan] [Heatmap] [Refresh]                               │
└─────────────────────────────────────────────────────────┘
```

### 服务端扩展

`POST /api/graph` 响应的 `GraphMeta` 新增一个字段，由 server 层（`graph.ts`）在返回前注入：

| 字段 | 类型 | 描述 |
|------|------|------|
| `source` | `string` | graph 文件的绝对路径，作为 localStorage 缓存键 |

## 关键决策

### 决策一：数据驱动树构建（从 ProcessedGraph combos 构建）

**决策**：目录树从当前 `ProcessedGraph` 的 `combos` 和 `nodes` 字段实时构建。

**备选方案 A：独立 API 端点（`GET /api/directory-tree`）**

创建一个专用的服务端端点，返回完整目录树结构。

**被拒原因**：引入额外的服务端端点意味着需维护独立的数据序列化和路由逻辑。更关键的是，树和图的展开状态必须严格同步——如果树从独立的端点获取数据，则存在时序竞争和状态不一致的风险。当前 `ProcessedGraph.combos` 已通过 `combo` 字段表达了完整的父子层级关系，TypeScript 侧遍历构建树的开销极低（O(n) 一次遍历即可建立 id → 节点映射），无必要增加服务端负担。

**备选方案 B：Rust/WASM 全量树预计算**

在 Rust 聚合阶段提前构建完整目录树结构，以额外字段注入 `ProcessedGraph`。

**被拒原因**：树的构建逻辑（排序、过滤、缩进计算）本质上是一个 UI 层关注点。将其下沉到 Rust 端会导致：每次 UI 交互细节变更（如排序规则调整）都需要修改 Rust 代码并重新编译；前端失去了对树渲染的灵活控制（如条件样式、本地过滤）。

### 决策二：单层展开（非递归展开所有子目录）

**决策**：展开一个目录仅显示其直接子节点（子目录 + 文件），子目录保持折叠状态。这与现有 `toggleDir` 的行为一致。

**备选方案 A：递归展开全部子目录**

首次展开一个目录时，递归展开其下所有层级的子目录。

**被拒原因**：对于深度较大的项目目录（如 `src/components/shared/hooks` 等 5+ 层级），递归展开将触发单次操作展开数十个目录的连锁效应。每次 `toggleDir` 调用均触发 `fetchGraph` API 请求和数据重处理，递归展开会产生 N+1 次请求、不可预测的数据量，且与现有 `toggleDir` 的语义不一致。单层展开保持了操作的可预测性和与现有双击 combo 行为的一致性。

### 决策三：localStorage + source 路径持久化

**决策**：以 graph 文件路径（`source`）为 key 存储展开状态到 localStorage。`dcr:source:{origin}` 映射 origin→source，`dcr:expanded:{source}` 存储展开目录列表。首次请求即读取缓存并传入 `fetchGraph`，每次响应后用服务端返回的 `expanded_dirs` 覆写缓存。

**备选方案 A：写回图文件或独立状态文件**

每次展开状态变更时，向文件系统写回（或更新一个独立的 `.dc-reporter/tree-state.json` 文件）。

**被拒原因**：文件写回引入 I/O 开销和并发写入的潜在竞态条件。当用户快速连续展开/折叠多个目录时，多次文件写入可能导致部分写入丢失或文件损坏。更重要的是，该方案要求服务端提供文件写入权限，而当前前端-服务端 API 设计是纯查询模式（无写端点），为此引入写端点增加了不必要的安全风险和复杂度。

**备选方案 B：URL query params（`?expanded=src,src/cli,...`）**

将展开状态编码到 URL 的 query string 中。

**被拒原因**：目录路径可能包含特殊字符，经过 URL 编码后长度急剧增长；URL 长度存在浏览器限制（约 2048 字符），大型项目完全展开的路径列表很可能超过该限制。另外，这是本地 CLI 工具而非面向公众的 Web 应用，URL 共享功能无关紧要，将状态编码到 URL 仅带来技术负担而无实际收益。

**备选方案 C：内容 hash 检测**

先用 hash 判断数据源是否变更，变更后交叉引用 old_dirs ∩ all_dirs 尽力恢复。

**被拒原因**：引入了 hash 计算、交叉引用恢复等额外复杂度，且需要服务端返回 `all_dirs`。而直接用 source 路径做 key 更直接——同一路径 = 同一数据源，切换数据源时自然隔离。localStorage 本身已提供 key 级别的隔离，不需要在 value 层再做 hash 判断。

### 决策四：固定侧边栏而非弹出层/覆盖层

**决策**：目录树作为固定侧边栏，始终占据屏幕左侧 260px 宽度（可折叠隐藏）。

**备选方案 A：浮动弹出层（Popover/Overlay）**

点击一个"目录树"按钮后，在画布上方弹出一个浮动面板显示树结构，点击外部或按 ESC 关闭。

**被拒原因**：弹出层模式意味着用户每次查看目录树都需要额外操作（点击打开、再关闭），而目录树的核心使用场景是**持续导航**——用户在浏览画布时需要频繁参考目录结构、展开/折叠不同目录来探索项目。浮动面板会遮挡画布内容，而侧边栏不遮挡。侧边栏的"始终可见"属性也降低了认知负担，用户无需记忆弹出层中的内容。

### 决策五：React + CSS 渲染目录树（非 G6 TreeGraph）

**决策**：目录树使用纯 React 组件 + CSS 样式渲染，不依赖 G6 的 TreeGraph。

**备选方案 A：G6 TreeGraph 渲染**

使用 AntV G6 的 TreeGraph 扩展来渲染目录树。

**被拒原因**：G6 TreeGraph 设计用于在 Canvas 上绘制树形图，其交互模型（缩放、平移、节点拖动）与侧边栏 UI 的需求不匹配。侧边栏需要的是标准的 DOM 树控件（滚动、点击展开/折叠、键盘导航），而非图形画布。使用 G6 TreeGraph 还意味着 G6 渲染循环会与 React 状态管理产生额外的耦合，增加了不必要的复杂度。React + CSS 方案利用标准 DOM 原语实现，易于测试和维护，且能自动继承应用的 CSS 变量体系和深色模式主题。

### 决策六：固定宽度 260px 不可拖拽调整

**决策**：侧边栏宽度固定为 260px，用户不可拖拽调整。

**备选方案 A：可拖拽调整宽度的侧边栏**

用户可通过拖拽侧边栏右边缘来调整宽度。

**被拒原因**：可拖拽调整宽度的交互实现涉及 mouse/touch 事件处理、最低/最高宽度约束、与 G6 画布 resize 的协调，复杂度显著增加。260px 宽度是基于项目中典型目录路径长度（最深约 4-5 层、每层约 15-25 字符）的经验值，足够容纳完整路径显示。在极少数超长路径场景下，CSS `text-overflow: ellipsis` 配合 title tooltip 提供了可接受的降级体验。折叠/展开机制提供了"全要或全不要"的控制，足够满足用户对空间的诉求。

## 能力

### 新增能力

- `dir-tree-sidebar`：目录树侧边栏，包括 DirTree 组件、树构建逻辑、展开/折叠交互、localStorage 持久化、与图谱视图的双向同步、服务端 meta 扩展

### 修改能力

- `frontend`：App.tsx 三栏布局改造、GraphViewLayout 集成 DirTree 侧边栏、组件层级更新

## 变更范围

### 范围内

| 模块 | 变更内容 |
|------|----------|
| `packages/cli/src/server/dep/graph.ts` | POST /api/graph 响应 meta 新增 source（graph 文件路径） |
| `packages/frontend/src/hooks/useGraphData.ts` | 新增 localStorage 持久化逻辑：source 路径映射、缓存读写、首次请求携带缓存、以服务端响应更新缓存、sidebarVisible 管理 |
| `packages/frontend/src/components/DirTree.tsx` | **新建**：目录树侧边栏组件，递归渲染、展开/折叠图标、缩进、排序、侧边栏折叠按钮 |
| `packages/frontend/src/components/icons.tsx` | 新增展开/折叠/侧边栏切换 SVG 图标 |
| `packages/frontend/src/components/GraphViewLayout.tsx` | 渲染 DirTree 侧边栏、传递 DirTreeProps、三栏布局容器 |
| `packages/frontend/src/App.tsx` | graph 视图渲染改为三栏布局（DirTree \| DependencyGraph \| DetailPanel） |
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

## 验收标准

| # | 标准 | 验证方法 |
|---|------|----------|
| 1 | DirTree 从 ProcessedGraph 正确构建目录层级 | 加载示例项目，左侧显示 src/cli/src/frontend 等根目录 |
| 2 | 展开目录图标点击触发 toggleDir 并更新图谱 | 点击 `▶ src`，G6 画布展开 src 目录，节点显示 |
| 3 | 折叠目录图标点击收起目录并更新图谱 | 点击 `▼ src`，G6 画布收起 src 目录 |
| 4 | 目录后跟文件，组内按字母序排列 | 同一目录下：子目录排在文件上方，各组内 A→Z |
| 5 | 每层深度正确缩进（16px × depth） | 视觉检查缩进对齐 |
| 6 | 侧边栏宽度 260px，可滚动 | 大量目录时侧边栏出现滚动条，内容不溢出 |
| 7 | 侧边栏可折叠/展开（toggle button） | 点击侧边栏收起按钮，DirTree 隐藏；点击展开按钮恢复 |
| 8 | 页面刷新后展开状态恢复（同一数据源） | 展开某些目录、刷新页面，缓存的 expandedDirs 随首次请求发送，目录保持展开状态 |
| 9 | 不同数据源各自独立缓存 | 切换不同 graph 文件启动服务，各自保持独立的展开状态，互不干扰 |
| 10 | 服务端 POST /api/graph 返回 meta.source | 查看 API 响应 meta.source 为 graph 文件路径 |
| 11 | 三栏布局在 graph 视图中正确渲染 | DirTree \| DependencyGraph \| DetailPanel 并排显示 |

## 风险

| 风险 | 影响 | 可能性 | 缓解措施 |
|------|------|--------|----------|
| 目录树与 G6 combo 层级不同步（tree expand 但 combo 未正确展开） | 界面状态不一致 | 中 | 两者使用同一 expandedDirs 状态和 toggleDir 回调，每次 toggle 均触发完整 fetchGraph |
| 大量目录/文件时的渲染性能 | 侧边栏滚动卡顿 | 低 | 树大小受 aggregated_node_count 约束（默认 200 节点上限）；必要时可添加虚拟滚动 |
| 同一端口先后启动不同 graph 文件 | origin→source 映射仍指向旧 source，缓存错配 | 低 | 首次请求发送 cached expandedDirs，服务端返回实际应用的 expanded_dirs（不存在的路径被忽略），自动修正 |
| localStorage 容量不足 | 持久化失效 | 极低 | 每个 source 仅存储一个短数组，典型项目 < 1KB |
| 侧边栏遮挡画布空间 | 可用画布面积减少 | 低 | 侧边栏宽度 260px，可折叠隐藏；大屏用户不受影响 |
