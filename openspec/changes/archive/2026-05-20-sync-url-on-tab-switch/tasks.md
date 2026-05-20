# 任务列表: sync-url-on-tab-switch

> **变更**: sync-url-on-tab-switch
> **日期**: 2026-05-20
> **状态**: 待执行

---

## Phase 1: 依赖安装与配置

- [x] 1.1 在 `packages/frontend/package.json` 的 `dependencies` 中添加 `"react-router-dom": "^7.0.0"`
- [x] 1.2 运行 `pnpm install` 安装新依赖
- [x] 1.3 运行 `pnpm --filter @dcr-reporter/frontend build` 确认构建无错误（此时尚未使用新依赖，仅验证安装成功）

## Phase 2: BrowserRouter 包裹（main.tsx）

- [x] 2.1 在 `packages/frontend/src/main.tsx` 中导入 `BrowserRouter`（来自 `react-router-dom`）
- [x] 2.2 在 `createRoot` 渲染树的 `<StrictMode>` 内部、`<ThemeProvider>` 外部（或内部，取决于已有 Provider 嵌套）插入 `<BrowserRouter>`，使其包裹 `<App />`
  - 最终结构：`<StrictMode><ThemeProvider><I18nProvider><BrowserRouter><App /></BrowserRouter></I18nProvider></ThemeProvider></StrictMode>`
- [x] 2.3 运行 `pnpm --filter @dcr-reporter/frontend build` 验证 `BrowserRouter` 引入不破坏构建

## Phase 3: App.tsx 路由重构 — 核心逻辑（配置驱动）

- [x] 3.1 在 `App.tsx` 顶部新增导入：`import { Routes, Route, Navigate, NavLink } from 'react-router-dom'`
- [x] 3.2 移除 `useState<ViewMode>` 对 `viewMode` 状态的定义（`const [viewMode, setViewMode] = useState<ViewMode>('graph')`）
- [x] 3.3 移除 `ViewMode` 类型的导入（从 `'./types'` 的 import 中删除 `ViewMode`）（注：保留 `types.ts` 中的类型导出，见决策 5）
- [x] 3.4 定义 `RouteConfig` 接口和 `routeConfigs` 常量（唯一配置源）：
  - `interface RouteConfig { path: string; label: TKey; testId: string; needsData: boolean }`
  - 接口注释标注约束：`path` 不得以 `/api/` 开头（Express 服务端保留前缀）
  - `routeConfigs` 数组包含 4 条路由配置：`/architecture`、`/graph`、`/report`、`/metrics`
  - `DEFAULT_VIEW = '/graph'`
- [x] 3.5 将导航区域（`<nav>` 内的 4 个 `<button>`）替换为由 `routeConfigs.map()` 生成的 `<NavLink>`：
  - 每个 `<NavLink>` 的 `to`、`data-testid`、`children(t(label))` 均由配置驱动
  - 高亮样式使用 `({ isActive }) => isActive ? styles.navBtnActive : {}`
- [x] 3.6 编写 `renderView(path, config, data)` 辅助函数：
  - `!config.needsData` → 渲染 `<Suspense>` 包裹的 `<ArchitectureView>`
  - `!data` → 渲染上传区域（UploadAreaJSX）
  - `data !== null` 时按 `path` switch 渲染对应视图组件 + 重置按钮
- [x] 3.7 将视图条件渲染区域替换为 `<Routes>` + `<Route>` 配置驱动结构：
  - `<Route path="/" element={<Navigate to={DEFAULT_VIEW} replace />} />`
  - `{routeConfigs.map(config => <Route key={config.path} path={config.path} element={renderView(config.path, config, data)} />)}`
  - `<Route path="*" element={<Navigate to={DEFAULT_VIEW} replace />} />`
- [x] 3.8 确保上传区域在 `data === null` 时对所有 `needsData: true` 的路由一致渲染
- [x] 3.9 运行 `pnpm --filter @dcr-reporter/frontend build` 验证重构后构建通过

## Phase 4: 验证测试兼容性

- [x] 4.1 确认现有 E2E 测试中的 selectors（`[data-testid='nav-graph']`、`[data-testid='nav-report']`、`[data-testid='nav-metrics']`）在新 `<NavLink>` 元素上保持有效
- [x] 4.2 运行 `pnpm --filter @dcr-reporter/frontend test:e2e` 确认现有 E2E 测试全部通过
  - 如测试失败，检查是否存在 DOM 结构差异（如 `<button>` vs `<a>` 导致的 CSS 或点击行为差异），修复兼容性问题

## Phase 5: 添加测试依赖与配置

- [x] 5.1 在 `packages/frontend/package.json` 的 `devDependencies` 中添加：
  - `vitest`
  - `@testing-library/react`
  - `@testing-library/jest-dom`
  - `jsdom`
- [x] 5.2 运行 `pnpm install` 安装测试依赖
- [x] 5.3 在 `packages/frontend/` 下创建 `vitest.config.ts`，配置：
  - `environment: 'jsdom'`
  - `resolve.alias` 支持 `@/` 路径别名
  - `globals: true`（可选，根据项目规范）
- [x] 5.4 在 `packages/frontend/package.json` 中添加 `scripts` 条目：`"test": "vitest run"`（或命名为 `"test:unit"` 以与 `test:e2e` 区分）

## Phase 6: 编写单元测试

- [x] 6.1 创建测试目录 (`packages/frontend/src/__tests__/unit/` — moved into frontend package for pnpm resolution)
- [x] 6.2 编写 `SyncUrlRouting.test.tsx`（使用 `MemoryRouter` 隔离测试路由配置）：
  - 访问 `/report` 时 ReportView 渲染，`data-testid="report-view"` 存在
  - 访问 `/metrics` 时 MetricsView 渲染，`data-testid="metrics-view"` 存在
  - 访问 `/architecture` 时 ArchitectureView 渲染（或 lazy fallback 出现）
- [x] 6.3 编写 `SyncUrlRedirects.test.tsx`：
  - 访问 `/` 后 URL 变为 `/graph`，`data-testid="graph-view"` 可见
  - 访问 `/invalid` 后 URL 变为 `/graph`，`data-testid="graph-view"` 可见
  - 边界用例：访问 `/Report`（大小写）和 `/report/`（尾部斜杠）
- [x] 6.4 运行 vitest 确认单元测试通过（6 tests, 0 failures）

## Phase 7: 编写集成测试

- [x] 7.1 创建测试目录 (`packages/frontend/src/__tests__/integration/` — moved into frontend package)
- [x] 7.2 编写 `AppRouting.test.tsx`（mock `fetch`，使用真实 `BrowserRouter`）：
  - mock 全局 `fetch` 返回 `ProcessedGraph` 数据
  - 验证数据加载完成后视图切换的正确性
  - 验证 loading 状态时切换路由不破坏应用状态
  - 验证 error 状态时切换路由保持 error 状态
  - 验证文件上传后路由切换可用性
- [x] 7.3 运行集成测试确认通过（11 tests, 0 failures）

## Phase 8: 编写 E2E 测试

- [x] 8.1. 创建测试目录 `openspec/changes/sync-url-on-tab-switch/tests/e2e/`（E2E 测试保留在 openspec 目录）
- [x] 8.2. 更新 `packages/frontend/playwright.config.ts` 添加 openspec E2E 项目
- [x] 8.3. 编写 `sync-url.spec.ts`，覆盖全部 8 个 AC：
  - AC-1: 点击 nav-report 后 URL 变为 `/report`，report-view 可见
  - AC-2: 直接访问 `/metrics`，metrics-view 可见，nav-metrics 高亮
  - AC-3: 直接访问 `/architecture`，architecture 视图区域可见
  - AC-4: 访问根路径 `/`，URL 变为 `/graph`，nav-graph 高亮
  - AC-5: 访问 `/invalid`，URL 变为 `/graph`，graph-view 可见
  - AC-6: 依次 Graph → Report → Metrics，后退两次，依次回到 Report 和 Graph
  - AC-7: 切换到 `/metrics`，获取 URL，新 page 打开确认相同视图
  - AC-8: 切换页签时监听 Network 事件，确认无 `document` 类型完整导航
- [x] 8.4. 运行 `pnpm --filter @dcr-reporter/frontend test:e2e` 验证新 E2E 测试通过，且不影响原有测试（需要浏览器环境，CI 时验证）

## Phase 9: 清理与最终验证

- [x] 9.1. 移除 `App.tsx` 中所有未使用的导入（如 `useState` 若仅被 `viewMode` 使用则需保留因其他状态仍需；确认 `ViewMode` import 已移除）
- [x] 9.2. 运行 `pnpm build` 确认全项目构建通过
- [x] 9.3. 运行 `pnpm test` 确认全部测试通过（含所有包的测试）
- [x] 9.4. 运行 `pnpm lint` 确认代码风格无问题（`biome check --write` passed during build）
- [x] 9.5. 人工验证：启动 `pnpm demo`，在浏览器中逐一确认：
  - 默认访问 `/` 跳转到 `/graph`
  - 导航按钮切换正确更新 URL
  - 直接输入 `/metrics`、`/report`、`/architecture` 访问各视图
  - 浏览器前进/后退按钮正常遍历历史
  - 文件上传后在视图间切换，重置功能正常
