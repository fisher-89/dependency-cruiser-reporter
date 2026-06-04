# 测试设计: graph-scan-loading-overlay

> **变更**: graph-scan-loading-overlay
> **日期**: 2026-06-03
> **状态**: 设计中

---

## 1. 测试级别

### 1.1 单元测试

#### ScanOverlay 组件单元测试

| 属性 | 内容 |
|------|------|
| **范围** | `ScanOverlay` 组件在四种状态下的渲染：`visible=false`（不渲染）、`visible=true, status='scanning'`（旋转图标 + 状态文字 + 不确定进度条）、`visible=true, status='error'`（错误图标 + 错误详情 + 关闭按钮）；`onDismiss` 回调在点击关闭按钮时触发；键盘事件被遮罩层捕获；CSS class 名称正确应用 |
| **框架** | vitest + @testing-library/react（与 `packages/frontend/src/__tests__/` 现有模式一致） |
| **运行命令** | `vp test --include "openspec/changes/graph-scan-loading-overlay/tests/unit/frontend/ScanOverlay.test.tsx"`（在 `packages/frontend/` 下执行） |
| **文件位置** | `openspec/changes/graph-scan-loading-overlay/tests/unit/frontend/ScanOverlay.test.tsx` |
| **目标覆盖率** | 4 种渲染状态分支覆盖率 100%；`visible=true` 时遮罩层 DOM 元素 `position`/`z-index` 样式断言 100%；`onDismiss` 回调触发 100%；`status='scanning'` 时确认关闭按钮不存在 100%；`status='error'` 时确认进度条不存在 100%；`errorMessage` 不同值的渲染正确性 100% |

**说明：** ScanOverlay 是本次变更中的新增独立组件，使用 `position: fixed; inset: 0; z-index: 9999` 实现全屏遮罩。测试通过 `render()` 渲染组件并使用 `screen` API 断言 DOM 结构。在 jsdom 环境中验证 CSS class 名称和 data-testid 的存在性。icon 组件通过 `vi.mock` 替换为轻量 stub（与 `GraphViewLayout.test.tsx` 现有模式一致）。

#### App 组件 handleScan 逻辑单元测试

| 属性 | 内容 |
|------|------|
| **范围** | App 中 `handleScan` 的行为变更：成功时先 `setScanning(false)` 再调用 `refresh()`；失败时保持 `scanning=true` 并设置 `scanError`；网络异常时正确捕获并设置 `scanError`；`handleDismissScan` 同时设置 `scanning=false` 和 `scanError=null`；最小显示时间 500ms 逻辑；`scanOverlayStatus` 从 `scanning` 和 `scanError` 推导的正确性 |
| **框架** | vitest + @testing-library/react，`vi.spyOn(globalThis, 'fetch')` mock API 响应，`vi.useFakeTimers()` 控制时间 |
| **运行命令** | `vp test --include "openspec/changes/graph-scan-loading-overlay/tests/unit/frontend/App.test.tsx"`（在 `packages/frontend/` 下执行） |
| **文件位置** | `openspec/changes/graph-scan-loading-overlay/tests/unit/frontend/App.test.tsx` |
| **目标覆盖率** | `handleScan` 的 3 条执行路径（成功/HTTP 失败/网络异常）覆盖率 100%；`handleDismissScan` 调用 100%；最小显示时间逻辑分支（elapsed < 500ms 和 elapsed >= 500ms）覆盖率 100%；`scanOverlayStatus` 推导逻辑（3 种组合）覆盖率 100% |

**说明：** 通过渲染 `App` 组件并点击 Scan 按钮触发 `handleScan`。使用 `vi.spyOn(globalThis, 'fetch')` 控制 API 响应（200 / 500 / 网络异常）。`vi.useFakeTimers()` 控制扫描时间：将 promise resolve 时间设为 `Date.now() + 100`（< 500ms 分支）或 `Date.now() + 600`（>= 500ms 分支）验证最小显示时间逻辑。组件中的子组件（`DependencyGraph`、`DetailPanel`、`ArchitectureView`）通过 `vi.mock` 替换为轻量 stub。

#### GraphViewLayout 组件单元测试（更新）

| 属性 | 内容 |
|------|------|
| **范围** | 验证 `GraphViewLayout` 中 `scanError` 内联错误文本已被移除（`scanError` prop 仍然接收但不再渲染错误文本）；Scan 按钮行为不变（`scanning` prop 驱动 disabled 状态、旋转动画、文案变化）；`onScan` 为 `undefined` 时不渲染 Scan 按钮 |
| **框架** | vitest + @testing-library/react（与 `packages/frontend/src/__tests__/unit/GraphViewLayout.test.tsx` 现有模式一致） |
| **运行命令** | `vp test --include "openspec/changes/graph-scan-loading-overlay/tests/unit/frontend/GraphViewLayout.test.tsx"`（在 `packages/frontend/` 下执行） |
| **文件位置** | `openspec/changes/graph-scan-loading-overlay/tests/unit/frontend/GraphViewLayout.test.tsx` |
| **目标覆盖率** | `scanError` 为非 null 时错误文本不渲染 100%；Scan 按钮 disabled/文案/class 行为回归 100%；`onScan` 为 undefined 时向后兼容性 100% |

**说明：** 本测试文件覆盖 GraphViewLayout 中由本次变更移除的 scanError 错误文本渲染逻辑。Scan 按钮的基本行为已有 `packages/frontend/src/__tests__/unit/GraphViewLayout.test.tsx` 覆盖，此处仅覆盖变更引入的差异点，并验证未发生回归。

#### 国际化单元测试

| 属性 | 内容 |
|------|------|
| **范围** | 验证 `en.ts` 和 `zh-CN.ts` 中存在 `action.scanOverlayClose` 翻译键，且值为非空字符串 |
| **框架** | vitest + Node.js assert（纯数据验证，无需 DOM） |
| **运行命令** | `vp test --include "openspec/changes/graph-scan-loading-overlay/tests/unit/frontend/i18n.test.ts"`（在 `packages/frontend/` 下执行） |
| **文件位置** | `openspec/changes/graph-scan-loading-overlay/tests/unit/frontend/i18n.test.ts` |
| **目标覆盖率** | 新增的 `action.scanOverlayClose` key 在两个语言文件中存在性断言 100% |

**说明：** 直接 import 翻译字典常量，验证对象路径 `action.scanOverlayClose` 的值为非空字符串。无需 mock，纯数据层验证。

### 1.2 集成测试

#### 扫描全流程集成测试

| 属性 | 内容 |
|------|------|
| **范围** | 从渲染 App 开始，点击 Scan 按钮，验证 ScanOverlay 出现（覆盖导航、内容区域），mock 成功响应后验证 ScanOverlay 关闭且 `fetchGraph`（`POST /api/graph`）被调用；mock 失败响应后验证 ScanOverlay 显示错误信息和关闭按钮，点击关闭后遮罩层消失且交互恢复；mock 网络异常后验证错误渲染和手动关闭 |
| **框架** | vitest + @testing-library/react，`vi.spyOn(globalThis, 'fetch')` mock API |
| **运行命令** | `vp test --include "openspec/changes/graph-scan-loading-overlay/tests/integration/scan-flow.test.tsx"`（在 `packages/frontend/` 下执行） |
| **文件位置** | `openspec/changes/graph-scan-loading-overlay/tests/integration/scan-flow.test.tsx` |
| **目标覆盖率** | AC-1 至 AC-7、AC-10 的端到端流程验证 100% |

**说明：** 集成测试在 `BrowserRouter` 中渲染完整 `App`，mock `fetch` 以控制所有 API 响应（`POST /api/analyze` 和 `POST /api/graph`）。先 mock 首次 `fetchGraph` 成功加载数据，再通过 Scan 按钮触发扫描流程。验证 `ScanOverlay` 的 DOM 存在性、状态变换、以及最终恢复正常交互。使用 `waitFor` 等待异步状态更新。

---

## 2. 覆盖率映射

| AC | 测试级别 | 测试文件 | 测试用例 |
|----|---------|---------|---------|
| AC-1 | 单元 | `tests/unit/frontend/ScanOverlay.test.tsx` | 渲染 ScanOverlay 且 `visible=true, status='scanning'`，验证组件 DOM 使用 `position: fixed; inset: 0; z-index: 9999`（通过 `data-testid` 获取元素并断言 `style.position` 为 `'fixed'`、`style.zIndex` 为 `'9999'`） |
| AC-1 | 集成 | `tests/integration/scan-flow.test.tsx` | 点击 Scan 按钮后验证全屏遮罩层覆盖了 `<header>` 导航区域和 `<main>` 内容区域（遮罩层元素在 DOM 中为 top-level 子元素） |
| AC-2 | 单元 | `tests/unit/frontend/ScanOverlay.test.tsx` | 遮罩层显示时，遮罩层自身 `style.pointerEvents` 为 `'auto'` 或未设置（默认 auto），底层元素指针事件被遮罩层物理拦截（通过遮罩层 `inset: 0` 覆盖实现，不依赖 `pointer-events: none`） |
| AC-2 | 单元 | `tests/unit/frontend/ScanOverlay.test.tsx` | 遮罩层包含 `tabIndex={0}` 属性，可捕获键盘事件焦点 |
| AC-3 | 单元 | `tests/unit/frontend/ScanOverlay.test.tsx` | `status='scanning'` 时，遮罩层居中卡片包含不确定进度条元素（`data-testid="scan-progress-bar"`）和状态文字（`action.scanning`） |
| AC-3 | 集成 | `tests/integration/scan-flow.test.tsx` | 扫描中遮罩层显示英文 "Scanning..." 或 i18n key `action.scanning` 对应的翻译文本 |
| AC-4 | 单元 | `tests/unit/frontend/App.test.tsx` | Mock `POST /api/analyze` 返回 200，验证 `setScanning(false)` 被调用且随后 `refresh()`（即 `POST /api/graph`）被调用 |
| AC-4 | 集成 | `tests/integration/scan-flow.test.tsx` | 扫描成功完成后：遮罩层从 DOM 中移除（`visible=false`），`fetchGraph`（`POST /api/graph`）被调用，图数据重新加载 |
| AC-5 | 集成 | `tests/integration/scan-flow.test.tsx` | 扫描完成后，点击导航标签能够正常切换视图（验证交互恢复） |
| AC-6 | 单元 | `tests/unit/frontend/ScanOverlay.test.tsx` | `status='error'` 时遮罩层显示错误详情文本和关闭按钮（`data-testid="scan-overlay-close"`），点击关闭按钮触发 `onDismiss` 回调 |
| AC-6 | 集成 | `tests/integration/scan-flow.test.tsx` | Mock `POST /api/analyze` 返回 500 + `{ error: "Scan failed" }`，验证遮罩层显示错误信息和关闭按钮 |
| AC-7 | 单元 | `tests/unit/frontend/App.test.tsx` | `handleDismissScan` 被调用后 `scanning` 为 `false`、`scanError` 为 `null` |
| AC-7 | 集成 | `tests/integration/scan-flow.test.tsx` | 失败遮罩层中点击关闭按钮，遮罩层消失，导航标签和内容区恢复正常交互 |
| AC-8 | 单元 | `tests/unit/frontend/ScanOverlay.test.tsx` | 遮罩层和卡片背景使用 CSS 变量（`var(--color-bg)`、`var(--color-surface)`），验证 class 或 inline style 未硬编码具体颜色值 |
| AC-8 | 集成 | `tests/integration/scan-flow.test.tsx` | 在 light 和 dark 主题下分别触发扫描，验证遮罩层样式应用不同 CSS 变量（通过 `document.documentElement` 设置 `data-theme` 属性切换主题，对比遮罩层背景色 style 的计算值） |
| AC-9 | 单元 | `tests/unit/frontend/ScanOverlay.test.tsx` | 进度条使用 CSS `@keyframes` 动画（验证元素 class 包含 `scan-progress-bar`），动画不依赖 JavaScript timer |
| AC-10 | 单元 | `tests/unit/frontend/App.test.tsx` | Mock `fetch` 抛出 `TypeError: Failed to fetch`，验证 `scanError` 包含网络错误相关信息 |
| AC-10 | 集成 | `tests/integration/scan-flow.test.tsx` | Mock fetch 对 `/api/analyze` 抛出 `TypeError`，验证遮罩层显示网络错误信息和关闭按钮 |

---

## 3. 测试策略

### 3.1 整体方法

采用 **测试金字塔** 策略，以组件单元测试为主（覆盖 ScanOverlay 四种渲染状态），应用逻辑测试为辅（验证 handleScan 行为变更），集成测试覆盖端到端扫描流程。

| 层级 | 占比 | 理由 |
|------|------|------|
| ScanOverlay 组件单元测试 | 35% | 新增组件有 4 种渲染状态，适合脱离 App 独立验证 |
| App handleScan 逻辑单元测试 | 25% | handleScan 行为变更涉及 3 条执行路径 + 最小显示时间逻辑，需要精细的 mock 和时间控制 |
| GraphViewLayout 单元测试（更新） | 10% | 验证 scanError 错误文本移除的正确性和回归 |
| 国际化单元测试 | 5% | 1 个新增 i18n key 在两个文件中存在性验证 |
| 扫描全流程集成测试 | 25% | AC-1 至 AC-7、AC-10 的端到端场景验证（ScanOverlay + App + GraphViewLayout 的交互） |

### 3.2 测试分类

#### 正向功能测试

- ScanOverlay `visible=false` 时不渲染任何内容（返回 `null`）
- ScanOverlay `visible=true, status='scanning'` 时渲染全屏遮罩层、居中卡片、旋转图标、状态文字、不确定进度条
- ScanOverlay `visible=true, status='error'` 时渲染全屏遮罩层、错误图标、错误详情、关闭按钮
- 点击 Scan 按钮触发 `handleScan`，发送 `POST /api/analyze` 请求
- 扫描成功：`setScanning(false)` → `refresh()` → `fetchGraph()`
- 扫描失败：遮罩层切换为 error 状态，显示错误详情
- 用户点击关闭：遮罩层关闭，恢复正常交互
- 最小显示时间：快速扫描时遮罩层至少显示 500ms
- i18n 新 key 在 en.ts 和 zh-CN.ts 中均存在

#### 错误路径测试

- `POST /api/analyze` 返回 500 → 遮罩层显示 `body.details` / `body.error` / `res.statusText` 中的错误信息
- `POST /api/analyze` 返回非 2xx 状态码（如 503）→ 同 500 路径处理
- `fetch` 抛出 `TypeError: Failed to fetch`（网络断开）→ `scanError` 设置为错误消息
- `fetch` 抛出其他异常（如 `AbortError`）→ `scanError` 设置为异常消息
- 响应 body 解析失败（`res.json()` 抛异常）→ 使用 `res.statusText` 作为错误信息

#### 状态管理测试

- `scanning=false` → ScanOverlay 不渲染
- `scanning=true, scanError=null` → `status='scanning'` 渲染进度状态
- `scanning=true, scanError="..."` → `status='error'` 渲染错误状态
- `handleDismissScan` → `scanning=false, scanError=null`
- 快速重复点击 Scan → 第一次扫描完成前第二次点击被遮罩层阻挡（不可交互）
- 扫描成功 → 遮罩层关闭 → 可再次触发扫描
- 扫描失败 → 手动关闭 → `scanning=false` → 可再次触发扫描

#### 主题适配测试

- 浅色主题下遮罩层背景使用 `rgba(0, 0, 0, 0.5)` 或对应的 CSS 变量
- 深色主题下遮罩层背景使用 `rgba(0, 0, 0, 0.7)` 或对应的 CSS 变量
- 进度条颜色使用 `var(--color-accent)`
- 错误文字颜色使用 `var(--color-error)`
- 卡片背景使用 `var(--color-surface)`

#### 回归测试

- GraphViewLayout Scan 按钮的 `disabled` 状态、`spinning` class、文案变化不受移除错误文本影响
- GraphViewLayout `onScan` 为 `undefined` 时不渲染 Scan 按钮
- Refresh 按钮的 `loading` 状态与 Scanning 状态独立
- 已有的 `packages/frontend/src/__tests__/unit/GraphViewLayout.test.tsx` 中关于 Scan 按钮行为的测试在移除 `scanError` 渲染后需要更新（见第 6 节）

### 3.3 Mock 策略

| Mock 目标 | 层级 | 策略 |
|-----------|------|------|
| `@/i18n` 的 `useT` | 单元（ScanOverlay/GraphViewLayout） | `vi.mock('@/i18n', ...)` 替换为返回固定翻译字符串的 stub（与现有测试模式一致）。测试中验证特定的翻译 key 被调用。 |
| `@/components/icons` | 单元（ScanOverlay） | `vi.mock('@/components/icons', ...)` 替换为 `<span data-testid="..." />` stub（与 `GraphViewLayout.test.tsx` 现有模式一致） |
| `globalThis.fetch` | 单元（App） / 集成 | `vi.spyOn(globalThis, 'fetch')` mock API 响应。集成测试中使用两次调用：首次返回 graph 数据，第二次（扫描）根据测试场景返回成功/失败 |
| `IntersectionObserver` | 单元 / 集成 | `vi.stubGlobal('IntersectionObserver', vi.fn(...))` 提供空实现（与现有测试模式一致） |
| `@/components/DependencyGraph` | 单元（App） / 集成 | `vi.mock` 替换为轻量 stub（与现有测试模式一致） |
| `@/components/DetailPanel` | 单元（App） / 集成 | `vi.mock` 替换为轻量 stub（与现有测试模式一致） |
| `@/components/ArchitectureView` | 单元（App） / 集成 | `vi.mock` 替换为轻量 stub（与现有测试模式一致） |
| `@/theme` 的 `useTheme` | 集成（主题测试） | `vi.mock('@/theme', ...)` 返回可控的 `theme` 值（`'light'` / `'dark'`），测试中通过修改返回值和触发 rerender 验证遮罩层样式变化 |

**Mock 生命周期管理：**

| 钩子 | 操作 | 说明 |
|------|------|------|
| `beforeEach` | `vi.clearAllMocks()` + 重置 state 变量 | 清理所有 spy/mock 的调用计数和状态 |
| 测试执行中 | 通过 `vi.spyOn` 返回值或 `mockResolvedValue` / `mockRejectedValue` 控制 fetch 行为 | 每个测试独立配置 mock 行为 |
| `afterEach` | `vi.restoreAllMocks()` + `vi.unstubAllGlobals()` | 恢复所有 spy 和全局 stub，避免跨测试影响 |

**重要说明：** 所有前端测试运行在 vitest 环境中（不是 Node.js `node:test`），不受 Node.js 24 ESM mock 约束影响。`vi.mock()`、`vi.spyOn()` 在 vitest 中正常工作。

### 3.4 测试数据

#### ScanOverlay 组件测试数据

**渲染状态矩阵：**

| `visible` | `status` | `errorMessage` | 预期渲染内容 |
|-----------|----------|----------------|-------------|
| `false` | `'scanning'` | `null` | 返回 `null`，无 DOM 输出 |
| `true` | `'scanning'` | `null` | 全屏遮罩层 + 旋转 ScanIcon + "Scanning..." + 不确定进度条 |
| `true` | `'error'` | `"Scan failed: timeout"` | 全屏遮罩层 + 错误图标 + "Scan failed: timeout" + 关闭按钮 |
| `true` | `'error'` | `null` | 全屏遮罩层 + 错误图标 + 兜底文本 + 关闭按钮 |
| `true` | `'error'` | `""` | 全屏遮罩层 + 错误图标 + 关闭按钮（空字符串显示） |

#### App handleScan 测试数据

**API 响应 mock 矩阵：**

| 场景 | fetch mock | 期望行为 |
|------|-----------|---------|
| 成功快速扫描 | `mockResolvedValue({ ok: true })`，`Date.now()` 前后差 100ms | 延迟 400ms 后 `setScanning(false)` + `refresh()` |
| 成功慢扫描 | `mockResolvedValue({ ok: true })`，`Date.now()` 前后差 600ms | 不延迟，直接 `setScanning(false)` + `refresh()` |
| HTTP 失败 | `mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "Scan failed" }) })` | `scanning` 保持 `true`，`scanError` 设为 `"Scan failed"` |
| HTTP 失败（body 含 details） | `mockResolvedValue({ ok: false, status: 422, json: async () => ({ details: "Invalid config" }) })` | `scanError` 设为 `"Invalid config"`（优先于 `error`） |
| HTTP 失败（JSON 解析失败） | `mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable", json: async () => { throw new Error() } })` | `scanError` 设为 `"Service Unavailable"`（兜底 `statusText`） |
| 网络异常 | `mockRejectedValue(new TypeError("Failed to fetch"))` | `scanning` 保持 `true`，`scanError` 设为 `"Failed to fetch"` |

#### 集成测试数据

复用 `packages/frontend/src/__tests__/unit/SyncUrlRouting.test.tsx` 中的 `sampleGraphData` 结构，用于首次加载图数据。`POST /api/analyze` 的响应 body 为简单的 `{ output: "path/to/output.json" }`。

---

## 4. 边界用例

| 编号 | 输入/条件 | 期望行为 | 目标测试文件 |
|------|-----------|---------|-------------|
| B-1 | 扫描极快完成（< 100ms），遮罩层显示时间不足 500ms | `handleScan` 在成功响应后等待至满 500ms 才关闭遮罩层，`setScanning(false)` 与 `Date.now()` 初始时间的差值 >= 500ms | `tests/unit/frontend/App.test.tsx` |
| B-2 | 扫描耗时较长（> 500ms），遮罩层已显示足够时间 | `handleScan` 在成功响应后立即关闭遮罩层，不额外延迟 | `tests/unit/frontend/App.test.tsx` |
| B-3 | `POST /api/analyze` 返回非 JSON body（如纯文本 "Internal Server Error"） | `res.json()` 抛异常被 `.catch()` 捕获，使用 `res.statusText` 作为错误信息，遮罩层正确显示 | `tests/unit/frontend/App.test.tsx` |
| B-4 | `POST /api/analyze` 响应 body 同时包含 `details` 和 `error` 字段 | `details` 优先于 `error`，`scanError` 使用 `details` 的值 | `tests/unit/frontend/App.test.tsx` |
| B-5 | 扫描失败关闭遮罩层后立即再次点击 Scan | `handleScan` 重新执行：`scanning` 从 `false` → `true`，`scanError` 从非 null 重置为 `null`，遮罩层重新显示 scanning 状态 | `tests/integration/scan-flow.test.tsx` |
| B-6 | ScanOverlay `visible=true, status='error'` 但 `errorMessage` 为 `null` | 遮罩层显示兜底错误文本或空白错误区域，关闭按钮仍然可见 | `tests/unit/frontend/ScanOverlay.test.tsx` |
| B-7 | 扫描期间用户通过浏览器前进/后退按钮切换路由 | 遮罩层覆盖全屏（包括导航），路由切换被物理阻止（无法点击导航链接）。但由于 SPA 路由切换可通过 JS 触发（`history.pushState`），此场景只需验证遮罩层覆盖导航区域——用户无法点击到导航链接，但直接 URL 输入仍可路由。测试验证遮罩层 z-index 高于导航栏 | `tests/unit/frontend/ScanOverlay.test.tsx` |
| B-8 | 扫描成功完成，`refresh()` 调用时网络异常（第二次 fetch 失败） | `refresh()` 调用 `fetchGraph()`，后者失败后设置 `error` 状态。遮罩层已关闭（`setScanning(false)` 已执行），error 状态显示在 upload area 或视图中。此行为由 `useGraphData` hook 管控，不受本变更影响 | `tests/integration/scan-flow.test.tsx` |
| B-9 | 页面已处于 loading（Refresh 按钮旋转）状态下点击 Scan | `scanning` 和 `loading` 是独立的两个状态。Scan 按钮和 Refresh 按钮的 disabled 状态互不影响。点击 Scan 后 `scanning=true`，Scan 按钮 disabled；Refresh 按钮仍按其 `loading` 状态显示 | `tests/unit/frontend/GraphViewLayout.test.tsx` |
| B-10 | `handleScan` 中 `setScanning(false)` 在 `refresh()` 之前执行，`refresh()` 抛异常 | `setScanning(false)` 已执行，遮罩层关闭。`refresh()` 异常被 `handleScan` 的调用方 `handleScan` 自身没有外层 try-catch，但 `refresh()`（来自 `useGraphData`）内部应自行处理异常。遮罩层不会因 `refresh()` 异常而重新打开 | `tests/unit/frontend/App.test.tsx` |
| B-11 | 主题在扫描过程中切换（light → dark） | 遮罩层使用 CSS 变量，主题切换后颜色自动更新。进度条和文字颜色跟随 `var(--color-accent)` / `var(--color-text-primary)` 变化 | `tests/integration/scan-flow.test.tsx` |
| B-12 | `POST /api/analyze` 返回 204 No Content（无 body） | `res.ok` 为 `true`（204 属于 2xx），`res.json()` 可能抛异常。需要 `handleScan` 正确处理——204 时不应尝试解析 JSON。检查实际实现：若存在 `try { await res.json() }` 在非 ok 分支中则不会执行；若在 ok 分支中则需特殊处理 | `tests/unit/frontend/App.test.tsx` |

---

## 5. 测试环境与依赖

| 项目 | 说明 |
|------|------|
| **Runtime** | 所有前端测试运行在 vitest + jsdom 环境。TypeScript 由 vitest 自动转译。无需真实浏览器 |
| **前端测试执行命令** | 在 `packages/frontend/` 目录下运行：`vp test --include "openspec/changes/graph-scan-loading-overlay/tests/**/*.test.tsx"`。当前 `vitest.config.ts` 的 `test.include` 为 `['src/**/*.test.{ts,tsx}']`，需通过 `--include` 参数或扩展配置文件以包含变更目录中的测试文件 |
| **vitest 配置修改建议** | 在 `packages/frontend/vitest.config.ts` 的 `test` 配置中新增 `include` 值：`'openspec/changes/graph-scan-loading-overlay/tests/**/*.test.{ts,tsx}'`，或创建 `.vitest/` 本地覆盖配置 |
| **新增依赖** | 无。`@testing-library/react`、`@testing-library/jest-dom`、`vitest` 均为项目已有依赖 |
| **测试夹具** | 集成测试的图数据夹具复用 `packages/frontend/src/__tests__/unit/SyncUrlRouting.test.tsx` 中的 `sampleGraphData` 结构；扫描响应夹具内联在测试文件中 |
| **jsdom 限制** | jsdom 不支持 CSS 动画计算的精确断言，因此 CSS `@keyframes` 动画验证通过确认元素 class 名称存在性（如 `scan-progress-bar`）来间接验证。真实的动画渲染效果在 E2E 测试中验证（非本变更范围） |

---

## 6. 回归测试注意事项

1. **已有 `GraphViewLayout.test.tsx` 需要更新：** `packages/frontend/src/__tests__/unit/GraphViewLayout.test.tsx` 中的 `AC-6: scanError displays error message` 和 `B-3: Scan button displays error state via scanError prop` 两个测试用例验证 `scanError` 在 GraphViewLayout 中的错误文本渲染。本次变更移除了 GraphViewLayout 中的 `{scanError && <div style={styles.errorText}>...}</div>` JSX 代码块，导致这两个测试失败。实现变更时需将这两个测试用例的断言从"验证错误文本存在于 GraphViewLayout 中"改为"验证错误文本不存在于 GraphViewLayout 中"。

2. **ScanOverlay 组件渲染位置：** `ScanOverlay` 在 `App.tsx` 的 `<div style={styles.container}>` 顶层渲染（在所有导航和视图内容之前）。确保 `position: fixed` 遮罩层的父容器未设置 `transform`、`filter` 或 `perspective` CSS 属性，否则 `position: fixed` 会失效（相对该容器定位而非视口）。此问题在 jsdom 中不易检测，需人工 code review。

3. **`handleScan` 的 `finally` 块移除：** 当前 `handleScan` 在 `finally { setScanning(false) }` 中关闭遮罩层。变更后需移除此 `finally` 块，改为在成功路径中主动 `setScanning(false)` + `refresh()`，在失败路径中保持 `scanning=true`。如果忘记移除 `finally` 块，所有路径（包括失败）都会关闭遮罩层，导致 AC-6/AC-7 失败。

4. **最小显示时间与 `useCallback` 依赖：** `handleScan` 中使用了 `startTime = Date.now()` 和最小显示时间逻辑。`refresh()` 是 `useCallback` 的依赖项。确保 `handleScan` 的依赖数组正确包含 `refresh`，否则 `handleScan` 可能持有旧的 `refresh` 引用。

5. **Refresh 按钮和 Scan 按钮独立状态：** Graph/Report/Metrics 三个视图中的 `loading`（Refresh 按钮）和 `scanning`（Scan 按钮）是独立的。扫锚期间 Refresh 按钮仍可点击（但遮罩层会阻止点击事件），遮罩层关闭后交互恢复。此行为与变更前一致。

6. **i18n 命名空间隔离：** 新增的 `action.scanOverlayClose` key 与已有的 `action.scan`、`action.scanning`、`action.scanError` 在同一命名空间下，不存在命名冲突。

7. **`GraphViewLayout` 向后兼容：** `scanError` prop 在接口类型中保留（向后兼容，调用方仍传入该 prop），但不再渲染。如果将来有其他组件直接使用 `GraphViewLayout` 并依赖 `scanError` 的渲染行为，会受到影响。当前只有 `App.tsx` 传入 `scanError` prop。
