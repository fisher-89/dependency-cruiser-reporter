# 测试设计: sync-url-on-tab-switch

> **变更**: sync-url-on-tab-switch
> **日期**: 2026-05-20
> **状态**: 设计中

---

## 1. 测试级别

### 1.1 单元测试

| 属性 | 内容 |
|------|------|
| **范围** | 路由配置的正确性（Route path 匹配、Navigate 重定向逻辑）、NavLink active 样式判定、已知路径映射到对应视图组件 |
| **框架** | vitest + @testing-library/react |
| **运行命令** | `npx vitest run --config vitest.unit.config.ts`（在 `packages/frontend/` 下执行） |
| **文件位置** | `openspec/changes/sync-url-on-tab-switch/tests/unit/` |
| **目标覆盖率** | 路由配置分支覆盖率 100%（每个 Route path + 重定向路径）；NavLink active 判定覆盖 4 个视图 + 默认/回退路径 |

**说明：** 使用 MemoryRouter 隔离测试路由配置和组件渲染，不依赖真实浏览器 History API。需要为 `packages/frontend` 添加 vitest 依赖及配置文件。

### 1.2 集成测试

| 属性 | 内容 |
|------|------|
| **范围** | App 组件在 BrowserRouter 包裹下的完整渲染链路：数据状态（data/loading/error）与路由切换的交互、数据加载完成后视图切换的正确性、文件上传后路由切换的可用性 |
| **框架** | vitest + @testing-library/react |
| **运行命令** | `npx vitest run --config vitest.integration.config.ts`（在 `packages/frontend` 下执行） |
| **文件位置** | `openspec/changes/sync-url-on-tab-switch/tests/integration/` |
| **目标覆盖率** | AC-1 至 AC-5 的组件级验证；App.tsx 重构后数据流（data/loading/error）不受路由影响 |

**说明：** 集成测试使用真实的 BrowserRouter（在 JSDOM 环境中模拟 History API），验证路由与 App 状态管理的协作。`fetch` 全局 mock，确保不依赖后端服务。

### 1.3 E2E 测试

| 属性 | 内容 |
|------|------|
| **范围** | 浏览器级别的完整链路：URL 地址栏变化、直接输入 URL 访问、浏览器前进/后退按钮、复制 URL 在新标签页打开、Network 面板确认无完整页面刷新 |
| **框架** | @playwright/test |
| **运行命令** | `pnpm --filter @dcr-reporter/frontend test:e2e` |
| **文件位置** | `openspec/changes/sync-url-on-tab-switch/tests/e2e/` |
| **目标覆盖率** | 全部 8 个 AC 的浏览器级验证；playwright.config.ts 中需增加 sync-url spec 的 include 路径，或直接复用现有 `packages/frontend/e2e/` 目录的配置扩展 |

**说明：** 复用现有 Playwright 配置（`packages/frontend/playwright.config.ts`），新增 spec 文件放在本变更的 `tests/e2e/` 目录下，通过配置中扩展 `testDir` 或符号链接纳入执行。

---

## 2. 覆盖率映射

| AC | 测试级别 | 测试文件 | 测试用例 |
|----|---------|---------|---------|
| AC-1 | 单元 | `tests/unit/SyncUrlRouting.test.tsx` | 当访问 `/report` 时 ReportView 渲染且 nav-report 元素存在 |
| AC-1 | E2E | `tests/e2e/sync-url.spec.ts` | 点击 nav-report 后 URL 变为 `/report`，report-view 可见 |
| AC-2 | 单元 | `tests/unit/SyncUrlRouting.test.tsx` | 当访问 `/metrics` 时 MetricsView 渲染且 nav-metrics 高亮 |
| AC-2 | E2E | `tests/e2e/sync-url.spec.ts` | 直接访问 `/metrics`，metrics-view 可见，nav-metrics 样式含 active |
| AC-3 | 单元 | `tests/unit/SyncUrlRouting.test.tsx` | 当访问 `/architecture` 时 ArchitectureView 渲染（Suspense fallback 出现） |
| AC-3 | E2E | `tests/e2e/sync-url.spec.ts` | 直接访问 `/architecture`，architecture 视图区域可见 |
| AC-4 | 单元 | `tests/unit/SyncUrlRedirects.test.tsx` | 访问 `/` 后 URL 变为 `/graph`，graph-view 可见 |
| AC-4 | E2E | `tests/e2e/sync-url.spec.ts` | 访问根路径 `/`，浏览器 URL 变为 `/graph`，nav-graph 高亮 |
| AC-5 | 单元 | `tests/unit/SyncUrlRedirects.test.tsx` | 访问 `/invalid` 后 URL 变为 `/graph`，graph-view 可见 |
| AC-5 | E2E | `tests/e2e/sync-url.spec.ts` | 访问 `/invalid`，URL 变为 `/graph`，显示 Graph 视图 |
| AC-6 | E2E | `tests/e2e/sync-url.spec.ts` | 依次 Graph -> Report -> Metrics，后退两次，依次回到 Report 和 Graph |
| AC-7 | E2E | `tests/e2e/sync-url.spec.ts` | 切换到 `/metrics`，获取当前 URL，新 page 打开该 URL，确认 Metrics 视图 |
| AC-8 | E2E | `tests/e2e/sync-url.spec.ts` | 切换页签时监听 Network 事件，确认无 `document` 类型的完整导航请求 |

---

## 3. 测试策略

### 3.1 整体方法

采用 **测试金字塔** 策略，以 E2E 测试为主（URL 同步的核心行为依赖浏览器上下文），单元/集成测试为辅（验证路由配置的静态正确性和组件渲染）。

| 层级 | 占比 | 理由 |
|------|------|------|
| 单元测试 | 30% | 路由配置和 NavLink 逻辑可脱离浏览器验证，速度快、反馈及时 |
| 集成测试 | 20% | App 组件与路由的协作需验证，但可 mock API 调用避免后端依赖 |
| E2E 测试 | 50% | URL 变化、浏览器前进/后退、深层链接等核心行为只能在真实浏览器中验证 |

### 3.2 测试分类

#### 正向功能测试
- 每个有效路径（`/graph`, `/report`, `/metrics`, `/architecture`）渲染对应的视图组件
- 导航按钮点击后 URL 和视图同步更新
- 直接 URL 访问正确渲染视图
- 根路径 `/` 和无效路径 `/*` 重定向到 `/graph`

#### 历史导航测试
- 浏览器后退按钮按逆序遍历历史
- 浏览器前进按钮按正序遍历历史
- 在历史栈末尾后退不离开应用（`/graph` 时后退 URL 保持不变）

#### 深层链接测试
- 直接访问 `/report` 等路径在新标签页中打开
- 复制 URL 后他人打开看到相同视图
- URL 路径与视图的映射关系在刷新后保持

#### 性能/行为测试
- 页签切换不触发完整的页面加载（无 `document` 级别 navigation）
- 视图组件在路由切换时正确挂载/卸载（非同时渲染）

### 3.3 Mock 策略

| Mock 目标 | 层级 | 策略 |
|-----------|------|------|
| `fetch('/api/graph')` | 单元/集成 | 使用 `vi.spyOn(globalThis, 'fetch')` 返回 `ProcessedGraph` 模拟数据。确保 `data` 状态不为 `null`，使视图组件可渲染 |
| `window.location` | 单元 | MemoryRouter 自动处理 URL 状态，无需 mock |
| `window.history` | E2E | 不 mock，使用 Playwright 真实浏览器环境 |
| `IntersectionObserver` | 单元/集成 | 使用 vitest 的 `vi.stubGlobal` 提供空实现 |
| React.lazy/Suspense | 单元 | 对于 ArchitectureView，使用 `vi.mock` 将其替换为同步组件，避免 lazy loading 的异步等待 |

### 3.4 测试数据

复用 `packages/frontend/e2e/sample-data.json` 的 `ProcessedGraph` 结构作为通用测试夹具。单元测试中以内联 JS 对象形式提供。

---

## 4. 边界用例

| 编号 | 输入/条件 | 期望行为 | 目标测试文件 |
|------|-----------|---------|-------------|
| B-1 | 用户直接在地址栏输入 `/` （根路径） | URL 自动变为 `/graph`，Graph 视图渲染 | `tests/unit/SyncUrlRedirects.test.tsx`，`tests/e2e/sync-url.spec.ts` |
| B-2 | 用户访问不存在的路径如 `/settings` | URL 变为 `/graph`，Graph 视图渲染，浏览器地址栏同步更新 | `tests/unit/SyncUrlRedirects.test.tsx`，`tests/e2e/sync-url.spec.ts` |
| B-3 | 用户连续快速点击多个导航按钮（Graph -> Report -> Metrics -> Architecture） | 每次点击产生独立的 history entry，后退按钮按逆序依次回到之前的视图，无重复或遗漏 | `tests/e2e/sync-url.spec.ts` |
| B-4 | 用户在 `/graph` 视图点击浏览器后退按钮（历史栈底部） | URL 保持不变（仍为 `/graph`），Graph 视图继续显示，不离开应用 | `tests/e2e/sync-url.spec.ts` |
| B-5 | 用户直接访问 `/` 后再手动导航到 `/report`，然后浏览器后退 | 先回到 `/` 再立即重定向到 `/graph`，最终显示 Graph 视图（`/` 的 `replace` 重定向使 `/` 不出现在历史栈中） | `tests/e2e/sync-url.spec.ts` |
| B-6 | 用户上传 JSON 文件后切换到 `/metrics`，刷新浏览器 | 页面重新加载，由于无 data 状态，显示 upload area；URL 保持 `/metrics`（验证路由状态不依赖内存数据） | `tests/e2e/sync-url.spec.ts` |
| B-7 | 用户访问路径名大小写不同的 URL 如 `/Report` 或 `/REPORT` | React Router 默认 case-sensitive 匹配，不匹配任何 Route，重定向到 `/graph` | `tests/unit/SyncUrlRedirects.test.tsx` |
| B-8 | 用户访问路径尾部带斜杠如 `/report/` | React Router 默认不匹配（path 精确匹配），重定向到 `/graph` | `tests/unit/SyncUrlRedirects.test.tsx` |
| B-9 | 应用在 loading 状态（fetchGraph 进行中）时用户切换路由 | URL 更新，视图切换后 loading 状态仍由 App 管理，视图组件内可显示 loading 指示器 | `tests/integration/AppRouting.test.tsx` |
| B-10 | 应用在 error 状态（fetchGraph 失败）时用户切换到 `/metrics` | error 状态保持，URL 变为 `/metrics`，在未成功加载数据时各视图应正确展示空/loading/error 状态 | `tests/integration/AppRouting.test.tsx` |

---

## 5. 测试环境与依赖

| 项目 | 说明 |
|------|------|
| **新增依赖** | `packages/frontend/` 需添加 `vitest`、`@testing-library/react`、`@testing-library/jest-dom`、`jsdom` |
| **配置文件** | `packages/frontend/vitest.config.ts` — 定义测试环境为 jsdom，解析 `@/` 路径别名 |
| **E2E 配置** | 复用 `packages/frontend/playwright.config.ts`，扩展 `testDir` 以包含本变更的 `tests/e2e/` 目录 |
| **CI 集成** | 在 `pnpm test` 中新增 `vitest run` 步骤；E2E 测试保持现有 CI 配置 |
| **测试夹具** | 复制或引用 `packages/frontend/e2e/sample-data.json` 中的 ProcessedGraph 结构 |

---

## 6. 回归测试注意事项

1. **现有 E2E 测试不受影响：** `packages/frontend/e2e/app.spec.ts` 中的 `data-testid` 属性（`nav-report`、`nav-graph`、`nav-metrics` 等）必须保留。导航按钮由 `<button>` 改为 `<NavLink>` 时需确保 `data-testid` 保留在 DOM 元素上。
2. **ArchitectureView 路由适配：** 当前 Architecture 视图通过 `<Suspense>` + `lazy()` 加载，改为路由后需确保 `lazy()` 与 `<Route>` 的 `element` prop 配合正常。
3. **数据流不变性：** `App.tsx` 中的 `data`、`loading`、`error`、`expandedDirs`、`selectedNodeId` 状态不受路由重构影响，回归测试应覆盖文件上传、拖拽上传、重置等功能在路由切换后仍正常工作。
4. **语言和主题切换：** 语言切换按钮（`data-testid="lang-en"`、`data-testid="lang-zh"`）和主题切换按钮（`data-testid="theme-toggle"`）在路由重构后功能不变。
