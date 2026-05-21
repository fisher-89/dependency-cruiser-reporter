# 设计文档: sync-url-on-tab-switch

> **变更**: sync-url-on-tab-switch
> **日期**: 2026-05-20
> **状态**: 设计中

---

## 1. 架构组件

### 1.1 组件总览

```
┌──────────────────────────────────────────────────────────┐
│  main.tsx                                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ <BrowserRouter>                                    │  │
│  │  ┌───────────────────────────────────────────────┐ │  │
│  │  │ App.tsx                                        │ │  │
│  │  │  ┌──────────────┐                             │ │  │
│  │  │  │ routeConfigs  │ (唯一配置源)                  │ │  │
│  │  │  │ [path,label,  │                             │ │  │
│  │  │  │  testId,      │                             │ │  │
│  │  │  │  needsData]   │                             │ │  │
│  │  │  └──┬───────┬───┘                             │ │  │
│  │  │     │       │                                  │ │  │
│  │  │     ▼       ▼                                  │ │  │
│  │  │  ┌────────┐  ┌─────────────────────────┐      │ │  │
│  │  │  │ <Nav>   │  │ <Routes>                │      │ │  │
│  │  │  │ config  │  │  config.map() → <Route>  │      │ │  │
│  │  │  │ .map()  │  │  / → redirect           │      │ │  │
│  │  │  │ → NavLink│ │  * → redirect           │      │ │  │
│  │  │  └────────┘  └─────────────────────────┘      │ │  │
│  │  └───────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 1.2 组件明细

| 组件 | 文件 | 职责 | 技术 | 依赖 |
|------|------|------|------|------|
| `BrowserRouter` | `main.tsx` (新增包裹层) | 提供 History API 上下文，管理 URL 与 UI 同步，处理浏览器前进/后退 | `react-router-dom` v7 | 无 |
| `App` | `App.tsx` (重构) | 管理 `data`/`loading`/`error`/`expandedDirs`/`selectedNodeId` 状态；消费 `routeConfigs` 生成 `<NavLink>` 和 `<Route>`；处理文件上传、拖拽、重置 | React 19 | `react-router-dom` |
| `routeConfigs` | `App.tsx` (新增常量) | **唯一配置源** — 路由元数据数组（path, label, testId, needsData），驱动导航按钮和路由渲染，新增/删除视图只需修改此数组 | TypeScript | 无 |
| `<NavLink>` (由 config 生成) | `App.tsx` (替换 `<button>`) | 声明式导航按钮，由 `routeConfigs.map()` 动态生成，基于 `isActive` 自动高亮，HTML 表现为 `<a>` 标签 | `react-router-dom` v7 | `BrowserRouter`, `routeConfigs` |
| `<Routes>` + `<Route>` | `App.tsx` (新增) | URL 路径到视图组件的映射，由 `routeConfigs.map()` 生成 `<Route>` 元素，替代 `viewMode` 条件渲染 | `react-router-dom` v7 | `BrowserRouter`, `routeConfigs` |
| `ArchitectureView` | `components/ArchitectureView.tsx` (不变) | C4 架构图渲染，通过 `lazy()` 异步加载 | React 19, LikeC4 | 无变更 |
| `DependencyGraph` | `components/DependencyGraph/` (不变) | 依赖图可视化，接收 `data`/`selectedNodeId` 等 prop | React 19, AntV G6 | 无变更 |
| `DetailPanel` | `components/DetailPanel.tsx` (不变) | 选中节点的详细信息面板 | React 19 | 无变更 |
| `ReportView` | `App.tsx` (内联组件, 不变) | 违规报告列表，接收 `violations` prop | React 19 | 无变更 |
| `MetricsView` | `App.tsx` (内联组件, 不变) | 指标统计仪表板，接收 `data` prop | React 19 | 无变更 |
| `UploadArea` | `App.tsx` (保留内联渲染) | 文件上传区域，在 `data === null` 时展示给用户 | React 19 | 无变更 |

### 1.3 模块依赖关系（新增）

```
packages/frontend/
  package.json
    dependencies:
      + react-router-dom ^7.0.0
  src/
    main.tsx
      + import { BrowserRouter } from 'react-router-dom'
    App.tsx
      + import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
      - import { useState }           (移除 viewMode 相关)
      - import type { ViewMode }      (移除未使用的类型)
```

### 1.4 服务端影响

**无变更。** Express 服务端通过中间件注册顺序天然区分 API 与页面路由：

```
Express 中间件注册顺序 (server.ts):
  1. app.get('/api/architecture/model', ...)     ← API: C4 模型
  2. app.post('/api/architecture/generate', ...) ← API: C4 生成
  3. app.post('/api/graph', ...)                 ← API: 数据接口
  4. app.use(express.static(...))                ← 静态文件
  5. app.get('*', ...)                           ← SPA fallback
```

**`api/` 前缀约定：** 所有后端数据接口统一使用 `/api/` 前缀，与前端页面路由（`/graph`、`/report` 等）形成清晰边界。Express 中间件按顺序匹配：`/api/*` 请求命中对应的 API handler，其余路径全部落入 `*` fallback 返回 SPA。

```typescript
// server.ts (已有，无需修改)
// API 路由注册在 * fallback 之前，优先匹配
this.app.get('*', (_req: Request, res: Response) => {
  const indexPath = resolve(frontendDist, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  }
});
```

---

## 2. 数据流

### 2.1 视图切换流程（重构后）

```
routeConfigs (唯一配置源)
  ├─→ .map() 生成 NavLink 按钮（nav 区域）
  └─→ .map() 生成 Route 元素（Routes 内部）
        └─→ renderView(config.path, config, data) 决定渲染内容

用户点击 NavLink to="/report"
  → react-router-dom 阻止默认 <a> 跳转
  → history.pushState({}, '', '/report')     ← URL 更新
  → <Routes> 匹配 <Route path="/report">
  → renderView('/report', config, data) 执行
  → data !== null → 渲染 ReportView + ResetBtn
  → data === null → 渲染 UploadArea
  → 浏览器历史记录栈增加条目
  → 前进/后退按钮可用
```

### 2.2 数据状态与路由的关系

App.tsx 中管理的状态分为两类：

**路由无关状态（保持不变）：**
- `data: ProcessedGraph | null` — 从服务端获取或用户上传的图数据
- `loading: boolean` — 数据加载状态
- `error: string | null` — 错误信息
- `expandedDirs: Set<string>` — 目录展开状态
- `selectedNodeId: string | null` — 选中节点

**由路由替代的状态：**
- ~~`viewMode: ViewMode`~~ — 由当前 URL 路径隐式推断

**核心约束：** 数据状态的获取和管理完全在 App.tsx 中完成，不进入路由层。路由只负责"选择显示哪个视图"，视图从 App 的 props 或直接访问 data 状态获取数据。

### 2.3 数据流示意

```
┌──────────────────────────────────────────────────────────┐
│ App.tsx                                                   │
│                                                           │
│  useEffect → fetchGraph() → setData(response)             │
│  handleFileUpload(file) → setData(parsedJSON)             │
│                                                           │
│  routeConfigs ──→ .map() ──→ <NavLink to={path} />       │
│                                                           │
│  routeConfigs ──→ .map() ──→ <Route path={path}           │
│                                 element={                  │
│                                   renderView(config, data) │
│                                 }                          │
│                               />                           │
│                                                           │
│  renderView(config, data):                                │
│    needsData=false? → <ArchitectureView />                │
│    data === null?   → <UploadArea />                      │
│    path='/graph'?   → <DependencyGraph ...> + <Detail>    │
│    path='/report'?  → <ReportView />                      │
│    path='/metrics'? → <MetricsView />                     │
│    (all needsData routes also include <ResetBtn>)         │
└──────────────────────────────────────────────────────────┘
```

### 2.4 视图渲染策略

`renderView(path, config, data)` 函数根据 `routeConfigs` 中的配置决定渲染内容：

- `config.needsData === false`（`/architecture`）：
  - 始终渲染 `<Suspense>` 包裹的 `<ArchitectureView>`（由 `lazy()` 异步加载），无需检查 data
- `config.needsData === true` 且 `data !== null`（`/graph`, `/report`, `/metrics`）：
  - 渲染对应的数据视图组件 + 重置按钮
- `config.needsData === true` 且 `data === null`（`/graph`, `/report`, `/metrics`）：
  - 渲染上传区域，引导用户上传或拖拽文件

重置按钮 (`data-testid="reset-btn"`)：
- 在所有 `needsData: true` 且 `data !== null` 的视图下方显示
- 点击后 `setData(null)`，URL 保持不变

### 2.5 URL 路由映射

| URL 路径 | 视图内容 | needsData? | 代码逻辑 |
|----------|---------|-----------|---------|
| `/` | 重定向到 `DEFAULT_VIEW` | — | `<Route path="/">` — `<Navigate to={DEFAULT_VIEW} replace />` |
| `/graph` | 依赖图 + 详情面板 + 重置按钮；无数据时显示上传区 | `true` | `routeConfigs` 驱动 → `renderView('/graph', config, data)` |
| `/report` | 违规报告列表 + 重置按钮；无数据时显示上传区 | `true` | `routeConfigs` 驱动 → `renderView('/report', config, data)` |
| `/metrics` | 指标仪表板 + 重置按钮；无数据时显示上传区 | `true` | `routeConfigs` 驱动 → `renderView('/metrics', config, data)` |
| `/architecture` | C4 架构图（Suspense 包裹） | `false` | `routeConfigs` 驱动 → `renderView('/architecture', config, data)` |
| `/*` | 重定向到 `DEFAULT_VIEW` | — | `<Route path="*">` — `<Navigate to={DEFAULT_VIEW} replace />` |

---

## 3. 路由 / API 设计

### 3.1 路由配置定义（配置驱动）

所有路由元数据集中在一个 `routeConfigs` 数组中，作为唯一配置源。新增或修改视图只需编辑此数组，NavLink 和 Route 均由它驱动生成。

```typescript
// App.tsx — 路由配置常量（唯一配置源）
// 约束: path 不得以 /api/ 开头（该前缀由 Express 服务端 API 保留）
interface RouteConfig {
  path: string;        // 页面路由路径，必须以 / 开头，不得以 /api/ 开头
  label: TKey;         // i18n key
  testId: string;      // data-testid for nav button
  needsData: boolean;  // true = data 为空时显示上传区
}

const routeConfigs: RouteConfig[] = [
  { path: '/architecture', label: 'nav.architecture', testId: 'nav-architecture', needsData: false },
  { path: '/graph',        label: 'nav.graph',        testId: 'nav-graph',        needsData: true  },
  { path: '/report',       label: 'nav.report',       testId: 'nav-report',       needsData: true  },
  { path: '/metrics',      label: 'nav.metrics',      testId: 'nav-metrics',      needsData: true  },
];

const DEFAULT_VIEW = '/graph';
```

### 3.2 导航按钮 — 由配置驱动

```tsx
// <nav> 中的按钮由 routeConfigs.map() 生成，无需逐个硬编码
<nav style={styles.nav}>
  {routeConfigs.map(({ path, label, testId }) => (
    <NavLink
      key={path}
      to={path}
      style={({ isActive }) => ({
        ...styles.navBtn,
        ...(isActive ? styles.navBtnActive : {}),
      })}
      data-testid={testId}
    >
      {t(label)}
    </NavLink>
  ))}
</nav>
```

### 3.3 视图渲染 — 由配置驱动

通过一个 `renderView` 函数根据配置决定每个路由渲染的内容：`needsData: true` 的视图在 `data === null` 时显示上传区，否则渲染对应组件并附加重置按钮。

```tsx
// 根据 data 状态和路由配置决定渲染内容
function renderView(path: string, config: RouteConfig, data: ProcessedGraph | null) {
  if (!config.needsData) {
    // 无需数据的视图
    return (
      <Suspense fallback={<div>{t('architecture.loading')}</div>}>
        <ArchitectureView />
      </Suspense>
    );
  }

  if (!data) {
    return <UploadArea />;  // data 为空时统一显示上传区
  }

  // 有数据时按路径渲染对应视图
  switch (path) {
    case '/graph':
      return (
        <>
          <div style={styles.graphSplitLayout}>
            <DependencyGraph
              data={data}
              onToggleDir={handleToggleDir}
              onNodeSelect={handleNodeSelect}
              selectedNodeId={selectedNodeId}
            />
            <DetailPanel
              node={selectedNode}
              edges={data.edges}
              violations={data.violations}
              nodeMap={nodeMap}
            />
          </div>
          <button type="button" style={styles.resetBtn} onClick={() => setData(null)} data-testid="reset-btn">
            {t('upload.newFile')}
          </button>
        </>
      );
    case '/report':
      return (
        <>
          <ReportView violations={data.violations} />
          <button type="button" style={styles.resetBtn} onClick={() => setData(null)} data-testid="reset-btn">
            {t('upload.newFile')}
          </button>
        </>
      );
    case '/metrics':
      return (
        <>
          <MetricsView data={data} />
          <button type="button" style={styles.resetBtn} onClick={() => setData(null)} data-testid="reset-btn">
            {t('upload.newFile')}
          </button>
        </>
      );
    default:
      return <Navigate to={DEFAULT_VIEW} replace />;
  }
}
```

### 3.4 Routes 配置 — 由配置驱动

```tsx
<Routes>
  <Route path="/" element={<Navigate to={DEFAULT_VIEW} replace />} />
  {routeConfigs.map((config) => (
    <Route
      key={config.path}
      path={config.path}
      element={renderView(config.path, config, data)}
    />
  ))}
  <Route path="*" element={<Navigate to={DEFAULT_VIEW} replace />} />
</Routes>
```

### 3.5 路由前缀约定

| 前缀 | 用途 | 处理方 | 示例 |
|------|------|--------|------|
| `/api/` | 后端数据接口（JSON 响应） | Express handler | `/api/graph`, `/api/architecture/model` |
| `/` (无前缀) | 前端页面路由（SPA 视图切换） | React Router (客户端) | `/graph`, `/report`, `/metrics`, `/architecture` |

**规则：**
- 新增后端接口必须使用 `/api/` 前缀，在 Express 中间件链中注册于 `*` fallback 之前
- 新增前端视图在 `routeConfigs` 中追加配置，路径不得以 `/api/` 开头
- 前端通过 `fetch('/api/...')` 调用后端接口，与页面路由完全解耦

### 3.6 现有 API 端点（不变）

| 方法 | 路径 | 用途 | 变更 |
|------|------|------|------|
| POST | `/api/graph` | 获取图数据（含目录展开参数） | 无 |
| GET | `/api/architecture/model` | 获取 C4 模型 | 无 |
| POST | `/api/architecture/generate` | 生成初始 C4 文件 | 无 |
| GET | `*` | SPA fallback（返回 index.html） | 无 |

---

## 4. 设计决策（6 项）

### 决策 1：URL Path + React Router 方案

**选择方案：** URL Path（`/report`）+ `react-router-dom` v7 的 `BrowserRouter`

**备选方案 A：URL Search Params（`/?view=report`）**

| 对比维度 | URL Path + React Router（选中） | URL Search Params（备选） |
|---------|-------------------------------|-------------------------|
| 依赖引入 | 需引入 `react-router-dom` (~7KB gzip) | 无需新依赖，使用原生 URLSearchParams |
| 历史导航 | BrowserRouter 自动管理 history stack | 需手动监听 `popstate` 事件 |
| 声明式高亮 | `<NavLink>` 自动基于 `isActive` 高亮 | 需手动解析 `searchParams` 并与当前路径比较 |
| 代码侵入 | Nav 区域可用 `<NavLink>` 替代 `<button>` | Nav 按钮逻辑需重写，引入 URLSearchParams 同步 |
| URL 可读性 | `/metrics` 直观 | `/?view=metrics` 稍冗长 |
| 扩展性 | 未来可嵌套路由（如 `/graph/node/123`） | 需保持 flat param 结构 |

**决策理由：**
- React Router 提供免费、可靠的 history 管理（前进/后退），而 Search Params 方案需手动同步，易产生 **循环更新 bug**（URL 变化 → 解析 → setState → 渲染 → 可能再次触发 URL 变化）
- `<NavLink>` 的 `isActive` 声明式高亮比手动比较 `searchParams.get('view')` 更简洁
- 7KB gzip 的依赖代价可接受
- URL Path 方案更符合 RESTful 风格，未来扩展性更好

**备选方案 B：URL Hash（`#/report`）**

| 对比维度 | URL Path（选中） | URL Hash（备选） |
|---------|-----------------|-----------------|
| 搜索引擎索引 | 路径可被索引 | Hash 部分被忽略 |
| History API | 路径切换产生 history entry | 需手动触发 `hashchange` |
| 服务器要求 | 需 SPA fallback（已有） | 始终返回 `index.html` |
| 美观度 | `/metrics` 标准 URL | `/#/metrics` 过时风格 |

**决策理由：** Hash 方案对服务端友好但无法产生标准的 history entry。项目已配置 SPA fallback，使用 BrowserRouter 无额外成本。

### 决策 2：数据状态保留在 App.tsx，不进入路由

**选择方案：** 路由仅负责视图选择，数据状态继续由 App.tsx 通过 `useState` 管理

**备选方案：** 使用 React Context 或状态管理库分发数据

**决策理由：**
- 当前 `data`/`loading`/`error` 等状态仅在 App.tsx 及其子组件间流动，无跨层级共享需求
- 引入额外状态管理层将增加复杂度，不符合"手术式修改"原则
- 视图组件通过 props 接收数据，与路由完全解耦

### 决策 3：`<NavLink>` 替代 `<button>` 保留 `data-testid`

**选择方案：** 使用 `<NavLink>` 渲染为 `<a>` 标签，保留原 `data-testid` 属性

**理由：**
- `<NavLink>` 默认渲染为 `<a>` 元素，语义化更好
- React Router v7 的 `<NavLink>` 支持 `data-testid` 透传（通过 `className` 或直接 prop）
- 现有 E2E 测试通过 `data-testid` 定位导航按钮，保留后可无需修改测试

**备选方案：** 保留现有 `<button>` 元素，在 `onClick` 中添加 `useNavigate()` 调用并通过 `useLocation()` 手动管理激活样式

| 对比维度 | `<NavLink>`（选中） | `<button>` + `useNavigate`（备选） |
|---------|---------------------|------------------------------------|
| 语义化 | `<a>` 标签符合导航语义，支持浏览器原生行为（如在新标签页打开链接） | `<button>` 非导航语义，无原生链接行为 |
| 高亮处理 | `isActive` 自动判定，声明式绑定，无额外代码 | 需从 `useLocation().pathname` 手动比较当前路径并设置 `className` |
| 键盘可访问性 | 浏览器原生支持，无需额外事件处理 | 需手动处理键盘事件（如 Enter/Space）以模拟链接行为 |
| data-testid 兼容性 | 可直接通过 prop 传递，保留现有测试 | 同样可在 `<button>` 上保留，完全兼容 |
| E2E 测试兼容性 | DOM 元素从 `<button>` 变为 `<a>`，但 `data-testid` 定位不受影响 | 元素类型不变，最彻底的兼容 |

**决策理由：** `<NavLink>` 提供免费的 `isActive` 声明式高亮判定，避免手动编写路径比较逻辑；语义化的 `<a>` 标签带来更好的可访问性和浏览器原生行为（如右键在新标签页打开）。虽然 `<button>` 方案在 DOM 类型兼容性上最优，但 `data-testid` 定位不依赖元素类型，测试不受影响。

**注意事项：**
- `<NavLink>` 可能自动添加 `aria-current="page"` 属性到激活元素，不影响功能
- E2E 测试中的 `page.click("[data-testid='nav-report']")` 行为应完全一致（Playwright 按 testid 定位，不关心元素类型）

### 决策 4：不将 UploadArea 提取为独立组件

**选择方案：** 上传区域保持内联 JSX（在 App.tsx 的 Route element 中内联）

**备选方案：** 提取为 `<UploadArea>` 组件接收 `loading`/`error`/`handleFileUpload` props

**决策理由：**
- 上传区域仅在 3 个路由中重复，且完全相同的渲染逻辑
- 按"简单优先"原则，内联重复在当前规模下可接受
- 未来如需增加路由可再提取，避免提前抽象

### 决策 5：移除 `viewMode` 状态但保留 `ViewMode` 类型导出

**选择方案：** 移除 `App.tsx` 中的 `viewMode: useState<ViewMode>`，保留 `types.ts` 中的 `ViewMode` 类型导出

**理由：**
- `viewMode` 状态完全由 URL 路径替代，无需再维护两份状态
- `ViewMode` 类型作为公共 API 的一部分，移除可能破坏外部消费者
- 保留类型定义的成本为零，移除的收益也是零

**备选方案：** 从 `types.ts` 中彻底移除 `ViewMode` 类型定义

| 对比维度 | 保留类型定义（选中） | 彻底移除（备选） |
|---------|---------------------|-----------------|
| 内部引用 | App.tsx 不再引用该类型 | 同上，无内部引用 |
| 外部消费者 | `import type { ViewMode } from '...'` 继续可用 | 所有外部引用报错，需逐一查找并修改 |
| 维护成本 | 零（一行类型定义，无 runtime 开销） | 需在 CHANGELOG 中标记为 breaking change |
| 代码整洁度 | 存在一个当前无人引用的类型定义 | 完全干净，无死代码 |

**决策理由：** `ViewMode` 类型是 `types.ts` 导出的一部分，可能被外部代码引用（如用户自定义脚本、测试辅助函数）。移除该类型是零收益的破坏性变更：节省的代码量微不足道（一行类型别名），但潜在的外部破坏不可控。遵循最小变更原则，保留类型定义。

### 决策 6：配置驱动路由定义

**选择方案：** 将路由元数据抽取为 `routeConfigs: RouteConfig[]` 常量，NavLink 和 Route 均通过 `.map()` 由此数组动态生成

**理由：**
- **唯一配置源**：新增/删除视图只需修改一处（`routeConfigs` 数组），不会出现添加了 Route 但忘记添加 NavLink 的情况
- **消除重复**：4 个导航按钮的 `style`、`data-testid`、`i18n key` 模式完全一致，硬编码产生大量重复 JSX
- **类型安全**：`RouteConfig` 接口在编译期约束每个路由必须具备 path/label/testId/needsData
- **可扩展性**：未来如需添加路由级元数据（如 icon、badge、permission），只需在 `RouteConfig` 中增加字段，所有消费方自动获得

**备选方案：** 逐个硬编码 `<NavLink>` 和 `<Route>` 元素

| 对比维度 | 配置驱动（选中） | 硬编码（备选） |
|---------|-----------------|---------------|
| 新增视图 | 在 `routeConfigs` 中追加 1 行对象 | 需手工添加 1 个 `<NavLink>` + 1 个 `<Route>` + switch case |
| 导航与路由一致性 | 编译器保证同一数据源 | 人工保证，易出现 NavLink 有但 Route 无（或相反） |
| 代码量 | ~30 行配置 + ~10 行 map 逻辑 | 4 个 NavLink (~60 行) + N 个 Route (~50 行) |
| 可测试性 | 可独立测试 `routeConfigs` 的数据正确性 | 需渲染组件才能验证 |
| 类型约束 | `RouteConfig` 接口强制所有字段存在 | 无强制，易遗漏属性 |

**决策理由：** 4 个视图的结构一致性极高（每个视图有 1 个导航按钮 + 1 条路由），是配置驱动的理想场景。`routeConfigs` 作为唯一配置源消除了 NavLink 与 Route 不一致的风险——添加 `path: '/settings'` 的同时，导航栏自动获得对应的 `<NavLink>`。

---

## 5. 边界情况处理

| 条件 | 行为 |
|------|------|
| 用户在 `/graph` 时点击浏览器后退（历史栈底部） | URL 保持不变（仍为 `/graph`），BrowserRouter 不产生离开应用的行为 |
| 用户上传 JSON 文件后切换到 `/metrics`，然后刷新浏览器 | 页面重载，App 重新执行 `useEffect` → `fetchGraph()`。若服务端有数据则正常恢复视图，若无则显示上传区。URL 保持 `/metrics` |
| 用户访问 `/Report`（大小写敏感） | React Router 默认 case-sensitive 匹配，不匹配 `path="/report"`，回退到 `path="*"` 并重定向到 `/graph` |
| 用户访问 `/report/`（尾部斜杠） | React Router 精确匹配，不匹配 `path="/report"`，回退到 `path="*"` |
| 快速连续点击多个导航按钮 | 每次点击产生独立 history entry，BrowserRouter 按队列处理 URL 变化，无竞态或丢失 |
| Loading 状态时用户切换路由 | 数据获取异步进行，URL 立即更新，视图切换后 loading/error 状态共享（在 App.tsx 层），不影响路由切换 |
| 新增视图（如 `/settings`） | 在 `routeConfigs` 追加 1 行 `{ path: '/settings', label: 'nav.settings', testId: 'nav-settings', needsData: true }`，NavLink 和 Route 自动生成；（如需非标准渲染，在 `renderView` 的 switch 中添加 1 个 case） |

---

## 6. 依赖

### 6.1 新增运行时依赖

| 包名 | 版本 | 用途 | 大小 |
|------|------|------|------|
| `react-router-dom` | ^7.0.0 | 客户端路由：BrowserRouter、Routes、Route、NavLink、Navigate | ~7KB gzip |

**变更位置：** `packages/frontend/package.json` 的 `dependencies` 字段

### 6.2 新增开发依赖（测试）

| 包名 | 版本 | 用途 | 位置 |
|------|------|------|------|
| `vitest` | latest | 单元测试和集成测试运行器 | `packages/frontend/` |
| `@testing-library/react` | latest | React 组件渲染和断言 | `packages/frontend/` |
| `@testing-library/jest-dom` | latest | DOM 状态断言扩展（如 `toBeInTheDocument`） | `packages/frontend/` |
| `jsdom` | latest | Node.js 环境中的浏览器 API 模拟 | `packages/frontend/` |

### 6.3 依赖影响分析

- **包体积影响：** `react-router-dom` 约 7KB gzip，增量可接受
- **传递依赖风险：** `react-router-dom` 依赖 `@remix-run/router` 等内部包，均为同一组织维护，版本锁定后风险低
- **版本冲突风险：** 项目中无现有路由库，无冲突可能
- **构建兼容性：** Vite 内置对 React Router 的支持（ESM 格式，无 CJS 兼容问题）
- **移除的依赖：** 不变（`react-router-dom` 为纯新增依赖）

---

## 7. 风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| `<NavLink>` 渲染为 `<a>` 导致 E2E 测试中 `page.click` 对 `<a>` 元素的行为与 `<button>` 不同（如浏览器可能处理默认导航） | 中：测试失败或非预期导航 | 中 | 保持 `data-testid` 不变，Playwright 按 testid 定位不依赖元素类型；`<NavLink>` 默认阻止 `<a>` 的默认跳转行为 |
| 用户直接在浏览器地址栏输入 `/report` 等路径时，应用尚未加载 `data`（`data === null`） | 低：显示上传区而非视图内容 | 中 | `renderView` 中已处理 `data === null` 分支（显示上传区），行为与当前页签切换一致；这是预期行为而非错误 |
| 后续开发者在 `routeConfigs` 中新增视图时误用 `/api/` 前缀（如 `/api/settings`） | 中：页面路由被 Express API handler 拦截，返回 404 或 JSON 而非页面 | 低 | 代码审查检查清单明确页面路由不得以 `/api/` 开头；`RouteConfig` 接口注释标注此约束 |
| 浏览器前进/后退后 URL 变化但对应的视图组件未正确挂载/卸载 | 中：功能 bug，视图状态错乱 | 低 | 路由与视图为 1:1 映射关系，React Router 保证 Route 匹配后正确渲染/卸载；数据状态不依赖路由路径 |
| 未来需要嵌套路由（如 `/graph/node/123`）时，额外路由配置可能改变现有路由的匹配优先级 | 中：旧路径意外匹配新路由 | 低 | `routeConfigs` 数组中精确路径在上，通配 `*` 在下；新增嵌套路由应在其所属 `path` 的 `<Route>` 内部使用 `/*` 子路由，不放入 `routeConfigs` 顶层 |
| 新增 RouteConfig 时输入错误（如 `path` 拼写错误或 `testId` 遗漏） | 低：NavLink 导航到错误路径或测试定位失败 | 低 | `RouteConfig` 接口的 TypeScript 类型检查强制所有字段存在；`TKey` 类型约束 `label` 必须是有效 i18n key；E2E 测试覆盖所有 `data-testid` 定位 |
| 引入 `vitest` + `@testing-library` 等测试依赖后，测试配置与现有 `playwright` E2E 测试配置产生混淆 | 低：CI 中测试命令重复或冲突 | 低 | 明确区分单元/集成测试（`vitest run`）和 E2E 测试（`pnpm exec playwright test`），在 CI pipeline 中分别执行 |
