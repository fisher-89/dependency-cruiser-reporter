# 测试设计: add-dashboard-action-buttons

> **变更**: add-dashboard-action-buttons
> **日期**: 2026-06-02
> **状态**: 设计中

---

## 1. 测试级别

### 1.1 单元测试

#### CLI 单元测试

| 属性 | 内容 |
|------|------|
| **范围** | `analyze()` 在 dependency-cruiser 无输出时抛出 Error 而非调用 `process.exit`；`archiToRules()` 在架构目录缺失/无 `.c4` 文件/解析错误/路径不存在时抛出 Error 而非 `process.exit`；CLI action handler 捕获异常后调用 `process.exit(1)` |
| **框架** | Node.js built-in `node:test` + `node:assert` |
| **运行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\add-dashboard-action-buttons\tests\unit\cli\*.test.ts"`（使用 `tsx` 支持 TypeScript） |
| **文件位置** | `openspec/changes/add-dashboard-action-buttons/tests/unit/cli/` |
| **目标覆盖率** | `analyze.ts` 的 `process.exit(1)` 替换点（1 处）验证 100%；`archi-to-rules.ts` 的 4 处 `process.exit(1)` 替换点验证 100%；CLI action handler 的 try-catch 路径覆盖率 100% |

**说明：** 通过 mock `dependency-cruiser` 的 `cruise` API 和 `@likec4/language-services` 的 `fromSources`，使测试在纯内存环境中验证 throw 行为。无需真实的文件系统或子进程。

#### 服务端单元测试

| 属性 | 内容 |
|------|------|
| **范围** | `setupActionRoutes(app, { cwd })` 是否正确注册 `POST /api/analyze` 和 `POST /api/archi-to-rules` 路由；路由处理器在输入非法时的错误响应 |
| **框架** | Node.js built-in `node:test` + `node:assert` |
| **运行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\add-dashboard-action-buttons\tests\unit\server\*.test.ts"` |
| **文件位置** | `openspec/changes/add-dashboard-action-buttons/tests/unit/server/` |
| **目标覆盖率** | 两个新增 route setup 函数的注册断言覆盖率 100%（每个路由方法 + 路径 + handler 存在性）；错误响应分支覆盖率 100% |

**说明：** 使用 Express 实例作为 mock app，通过 spy 验证 `app.post()` 和 `app.get()` 调用参数（路由路径和 handler 函数类型）。不启动 HTTP 服务器，不触发实际的路由处理逻辑。

#### 前端单元测试

| 属性 | 内容 |
|------|------|
| **范围** | `GraphViewLayout` 新增 Scan 按钮渲染、`scanning`/`scanError`/`onScan` props 驱动行为；`ArchitectureView` 在 ready 状态 action bar 的 Generate Rules 按钮渲染、`generating`/`generateError` 状态驱动行为；`ScanIcon` 和 `GenerateRulesIcon` 渲染；i18n 新增 `action` 命名空间 key 的正确性 |
| **框架** | vitest + @testing-library/react（与 `packages/frontend/src/__tests__/` 现有模式一致） |
| **运行命令** | `vp test`（在 `packages/frontend/` 下执行，通过配置扩展 testDir 包含本变更的测试目录） |
| **文件位置** | `openspec/changes/add-dashboard-action-buttons/tests/unit/frontend/` |
| **目标覆盖率** | GraphViewLayout 新增 3 个 props 的驱动逻辑分支覆盖率 100%；ArchitectureView ready 状态下按钮可见性 100%；empty/error 状态下按钮不可见 100%；6 个 i18n key 的存在性断言 100% |

**说明：** 遵循现有测试模式，使用 `MemoryRouter`（若组件依赖路由）、`vi.mock` mock `useT` hook、mock 全局 `fetch` 拦截 API 调用。`ArchitectureView` 的 `@likec4/diagram` 等外部依赖通过 `vi.mock` 替换为轻量 stub。

### 1.2 集成测试

#### 服务端集成测试

| 属性 | 内容 |
|------|------|
| **范围** | `POST /api/analyze` 和 `POST /api/archi-to-rules` 在真实 Express 服务器上的完整请求-响应链路；错误路径（analyze 失败、archiToRules 失败）的 500 响应；服务器启动后 `setupRoutes()` 组装正确性 |
| **框架** | Node.js built-in `node:test` + `node:assert`，内嵌 Express 实例 + `node:http` 或 `fetch` |
| **运行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\add-dashboard-action-buttons\tests\integration\server-actions.test.ts"` |
| **文件位置** | `openspec/changes/add-dashboard-action-buttons/tests/integration/` |
| **目标覆盖率** | AC-2、AC-5、AC-6 的 HTTP 级别验证；成功和错误两条路径覆盖 |

**说明：** 创建临时工作目录，将 `analyze()` 和 `archiToRules()` 函数或其底层依赖替换为可控实现，启动 Express 服务器在随机端口，通过 `fetch()` 发送 HTTP 请求并验证响应状态码和 JSON 体。测试完成后关闭服务器并清理临时目录。

#### CLI 集成测试

| 属性 | 内容 |
|------|------|
| **范围** | `dep-report analyze` 和 `dep-report archi-to-rules` 命令的完整执行链路：参数解析、核心函数调用、`process.exit` 退出码。覆盖 AC-7 — 重构后 CLI 行为不变；以及 B-14/B-15 — CLI handler 错误处理 |
| **框架** | Node.js built-in `node:test` + `node:assert`，通过 `child_process.spawnSync` 调用 CLI 二进制 |
| **运行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\add-dashboard-action-buttons\tests\integration\cli-commands.test.ts"` |
| **文件位置** | `openspec/changes/add-dashboard-action-buttons/tests/integration/` |
| **目标覆盖率** | AC-7 的完整命令级别回归验证；B-14/B-15 的 CLI handler 错误处理覆盖率 100% |

**说明：** 集成测试通过 `spawnSync('node', [cliBinary, 'analyze', ...])` 执行 CLI 命令，验证 stdout/stderr 输出和 exit code。使用临时工作目录放置测试夹具，测试完成后清理。与 `packages/e2e/cli.test.ts` 的模式一致，但专注覆盖本次变更的回归场景。

---

## 2. 覆盖率映射

| AC | 测试级别 | 测试文件 | 测试用例 |
|----|---------|---------|---------|
| AC-1 | 单元 | `tests/unit/frontend/GraphViewLayout.test.tsx` | 渲染 GraphViewLayout，验证 action bar 中存在 Scan 按钮且文本为 action.scan |
| AC-1 | 单元 | `tests/unit/frontend/GraphViewLayout.test.tsx` | 分别在 Graph/Report/Metrics 视图容器内渲染，验证 Scan 按钮均存在 |
| AC-2 | 集成 | `tests/integration/server-actions.test.ts` | POST /api/analyze 返回 200，JSON 体含 `output` 字段 |
| AC-2 | 单元 | `tests/unit/frontend/GraphViewLayout.test.tsx` | 点击 Scan 按钮触发 onScan 回调 |
| AC-3 | 单元 | `tests/unit/frontend/GraphViewLayout.test.tsx` | scanning=true 时按钮 text 为 action.scanning，且 disabled 属性为 true |
| AC-3 | 单元 | `tests/unit/frontend/GraphViewLayout.test.tsx` | scanning 从 false 变为 true 时按钮样式变化（spinning class 出现） |
| AC-4 | 单元 | `tests/unit/frontend/ArchitectureView.test.tsx` | ArchitectureView 处于 ready 状态时 action bar 存在 Generate Rules 按钮 |
| AC-4 | 单元 | `tests/unit/frontend/ArchitectureView.test.tsx` | ArchitectureView 处于 empty 状态时 action bar 无 Generate Rules 按钮 |
| AC-4 | 单元 | `tests/unit/frontend/ArchitectureView.test.tsx` | ArchitectureView 处于 error 状态时 action bar 无 Generate Rules 按钮 |
| AC-5 | 集成 | `tests/integration/server-actions.test.ts` | POST /api/archi-to-rules 返回 200，JSON 体含 `success: true` |
| AC-5 | 单元 | `tests/unit/frontend/ArchitectureView.test.tsx` | 点击 Generate Rules 按钮触发 POST /api/archi-to-rules 请求 |
| AC-6 | 单元 | `tests/unit/frontend/GraphViewLayout.test.tsx` | scanError 为非 null 字符串时显示错误提示元素 |
| AC-6 | 单元 | `tests/unit/frontend/ArchitectureView.test.tsx` | 模拟 API 返回 500，验证 generateError 状态更新且错误信息渲染 |
| AC-6 | 集成 | `tests/integration/server-actions.test.ts` | mock analyze 抛出异常，POST /api/analyze 返回 500 { error: string } |
| AC-6 | 集成 | `tests/integration/server-actions.test.ts` | mock archiToRules 抛出异常，POST /api/archi-to-rules 返回 500 { error: string } |
| AC-7 | 集成 | `tests/integration/cli-commands.test.ts` | 执行 `dep-report analyze -p nonexistent-dir`（不存在的路径），验证 exit code 非 0 且 stderr 输出错误信息 |
| AC-7 | 集成 | `tests/integration/cli-commands.test.ts` | 创建含 .c4 文件的架构目录后执行 `dep-report archi-to-rules`，验证 exit code 为 0 且规则文件生成 |
| AC-7 | 集成 | `tests/integration/cli-commands.test.ts` | 执行 `dep-report analyze -p <fixture-dir> -o <output>`，验证输出文件生成且 exit code 为 0 |
| AC-8 | 单元 | `tests/unit/frontend/i18n.test.ts` | 验证 en.ts 的 action 命名空间有 scan、scanning、scanError、generateRules、generatingRules、generateRulesError |
| AC-8 | 单元 | `tests/unit/frontend/i18n.test.ts` | 验证 zh-CN.ts 的 action 命名空间有对应的 6 个中文翻译 key |

---

## 3. 测试策略

### 3.1 整体方法

采用 **测试金字塔** 策略，以单元测试为主（覆盖新增组件 props、i18n key、process.exit 替换），集成测试为辅（验证 HTTP 端点和 CLI 命令的完整链路）。

| 层级 | 占比 | 理由 |
|------|------|------|
| CLI 单元测试 | 20% | `process.exit` → `throw` 替换逻辑可独立验证，mock 外部依赖后运行快速 |
| 服务端单元测试 | 10% | route setup 函数注册行为的静态验证，轻量快速 |
| 前端单元测试 | 40% | 组件渲染行为、按钮状态切换、错误显示、i18n key 覆盖场景多且适合脱离浏览器运行 |
| 服务端集成测试 | 15% | HTTP API 的请求-响应链路需要在真实 Express 进程中验证 |
| CLI 集成测试 | 15% | CLI 命令行为不变（AC-7）以及 CLI handler 错误处理（B-14/B-15）需要真实的子进程执行验证 |

### 3.2 测试分类

#### 正向功能测试

- GraphViewLayout 渲染 Scan 按钮（所有三个视图）
- 点击 Scan 触发 onScan 回调
- ArchitectureView 在 ready 状态渲染 Generate Rules 按钮
- 点击 Generate Rules 发送 POST 请求
- `POST /api/analyze` 成功返回 200 + output 路径
- `POST /api/archi-to-rules` 成功返回 200 + success
- 按钮 loading 状态正确展示
- i18n key 存在且文本正确

#### 错误路径测试

- `analyze()` 抛出异常 → POST /api/analyze 返回 500
- `archiToRules()` 抛出异常 → POST /api/archi-to-rules 返回 500
- 前端收到 500 响应 → 显示错误信息，按钮恢复正常
- 前端 fetch 网络异常 → 显示错误信息
- ArchitectureView 在 empty/error 状态不显示 Generate Rules 按钮
- CLI `analyze` 异常时 exit code 为 1（通过非存在路径触发 cruise 失败路径）
- CLI `archi-to-rules` 异常时 exit code 为 1（空目录触发架构目录缺失）

#### 状态管理测试

- scanning=true：Scan 按钮 disabled + loading 文本
- scanning=false：Scan 按钮恢复正常
- generateError=null：无错误提示
- generateError="..."：错误提示渲染
- 快速重复点击：按钮 disabled 防止重复请求

#### 回归测试

- CLI `dep-report analyze` 命令行行为不变（输出格式、exit code）
- CLI `dep-report archi-to-rules` 命令行行为不变
- 重构后 `analyze()` 函数签名不变（仍返回 `Promise<string>`）
- 重构后 `archiToRules()` 函数签名不变（仍为 `Promise<void>`）

### 3.3 Mock 策略

> **重要：Node.js 24 ESM Mock 约束**
>
> 本变更的 CLI 单元测试使用 `node:test` + `mock.module()`。在 Node.js 24 中，以下模式**不可用**：
>
> - **`mock.method()` 在 ESM 模块命名空间对象上不可用** —— ESM 命名空间对象的属性不可配置（frozen），`mock.method()` 内部使用 `Object.defineProperty()` 修改属性值，会抛出 `TypeError: Cannot redefine property`。即使通过动态 `import()` 获取模块命名空间，其属性仍是 frozen 的。
> - **`mock.module()` 带 `namedExports` 用于 `dependency-cruiser` 不可用** —— `dependency-cruiser` 有子路径导入（如 `dependency-cruiser/config-utl/extract-depcruise-options`），`namedExports` 无法拦截子路径导入，真实模块副作用会泄露。
> - **对同一模块路径重复调用 `mock.module()` 不可用** —— Node.js 24 的 `MockTracker` 禁止对同一模块路径多次调用 `mock.module()`，抛出 `ERR_INVALID_STATE`。
>
> **正确的模式**：
>
> 1. **所有 `mock.module()` 调用在顶层作用域只注册一次**（不在 `beforeEach` 或 `before` 中），每个模块路径只调用一次。
> 2. **使用可变状态变量**（mutable state）通过闭包引用，实现不同测试间的行为变化。测试只需要修改状态变量，不需要重新注册 mock。
> 3. **`mock.module()` 的 `defaultExport` 选项**用于模拟有默认导出的模块（如 `dependency-cruiser` 的 `cruise` 也是默认导出）。
> 4. **`mock.module()` 的 `namedExports` 选项**仅用于简单的内置模块如 `node:fs`（无子路径导入问题，`namedExports` 安全可用）。
> 5. **`mock.restoreAll()` 在 `afterEach` 中调用**以清理 `mock.method()` （如 `process.exit` spy），但注意它**不影响** `mock.module()` 注册（二者互不干扰）。
>
> **正确的 `dependency-cruiser` mock 模式：**
>
> ```typescript
> // 顶层作用域 —— 只注册一次
> let currentCruiseOutput: string | null = null;
> mock.module('dependency-cruiser', {
>   exports: {
>     cruise: mock.fn(async () => ({ output: currentCruiseOutput })),
>   },
> });
>
> describe('analyze() process.exit replacement', () => {
>   beforeEach(() => {
>     currentCruiseOutput = null; // 每个测试前重置状态变量
>   });
>
>   afterEach(() => {
>     mock.restoreAll(); // 安全：恢复 mock.method()，不影响 mock.module() 注册
>   });
>
>   it('throws when output is null', async () => {
>     currentCruiseOutput = null;
>     const { analyze } = await import('../../path/to/analyze');
>     await assert.rejects(() => analyze({ path: '.' }));
>   });
> });
> ```
>
> **正确的 `node:fs` mock 模式：**
>
> ```typescript
> // 顶层作用域 —— 只注册一次
> const defaultFsMocks = {
>   existsSync: () => true,
>   readdirSync: () => ['main.c4'],
>   readFileSync: () => 'mock .c4 content',
>   writeFileSync: () => undefined,
>   mkdirSync: () => undefined,
> };
> let currentFsMocks = { ...defaultFsMocks };
>
> mock.module('node:fs', {
>   namedExports: {
>     existsSync: (path: string) => currentFsMocks.existsSync(path),
>     readdirSync: (path: string) => currentFsMocks.readdirSync(path),
>     readFileSync: (path: string, encoding?: string) =>
>       currentFsMocks.readFileSync(path, encoding),
>     writeFileSync: (path: string, data: string, encoding?: string) =>
>       currentFsMocks.writeFileSync(path, data, encoding),
>     mkdirSync: (path: string, options?: object) =>
>       currentFsMocks.mkdirSync(path, options),
>   },
> });
> ```
>
> **正确的 `@likec4/language-services/node` mock 模式：**
>
> ```typescript
> // 顶层作用域 —— 只注册一次
> const defaultLikeC4State = {
>   hasErrors: () => false,
>   getErrors: () => [],
>   syncComputedModel: () => ({ $data: { elements: {}, relations: {} } }),
> };
> let currentLikeC4State = { ...defaultLikeC4State };
>
> mock.module('@likec4/language-services/node', {
>   defaultExport: {
>     fromSources: mock.fn(async () => ({
>       hasErrors: () => currentLikeC4State.hasErrors(),
>       getErrors: () => currentLikeC4State.getErrors(),
>       syncComputedModel: () => currentLikeC4State.syncComputedModel(),
>     })),
>   },
> });
> ```

| Mock 目标 | 层级 | 策略 | Node.js 24 API |
|-----------|------|------|---------------|
| `dependency-cruiser` 的 `cruise` | CLI 单元 | 顶层 `mock.module()` 注册一次，使用 `exports` 暴露命名导出 `cruise`。闭包捕获 mutable state 变量 `currentCruiseOutput`。测试中通过修改 `currentCruiseOutput`（`null` / 有效 JSON / `undefined`）控制 mock 行为。同时 mock 子路径导入模块以避免真实模块副作用泄露。 | `mock.module('dependency-cruiser', { exports: { cruise: mock.fn(...) } })` |
| `@likec4/language-services/node` 的 `fromSources` | CLI 单元 | CLI 单元测试中不 mock 此模块 —— 通过 fs mock 控制 `.c4` 文件内容，由真实 LikeC4 解析器处理，验证解析错误路径（B-12）。 | N/A（使用真实解析器） |
| `node:fs` 的 `existsSync`、`readdirSync`、`readFileSync`、`writeFileSync`、`mkdirSync` | CLI 单元 | 顶层 `mock.module()` 注册一次，`namedExports` 映射所有被 mock 的 fs 函数。闭包捕获 mutable state 对象 `currentFsMocks`。`node:fs` 无子路径导入问题，`namedExports` 在此安全可用。 | `mock.module('node:fs', { exports: { ... } })` |
| `express` 的 `app.post` 和 `app.get` | 服务端单元 | 不使用 `mock.module()`。创建 mock Express app 对象（含 `routes: Array<{method, path, handler}>` spy 数组），传入 `setup*Routes` 函数验证路由注册参数。 | 纯对象 spy，不涉及 `mock.module()` |
| `globalThis.fetch` | 前端单元 | 使用 `vi.spyOn(globalThis, 'fetch')` mock API 响应，测试按钮点击后的请求发送和错误处理（vitest 环境，不受 Node.js 24 ESM 约束影响）。 | vitest `vi.spyOn` / `vi.fn` |
| `@likec4/diagram`、`@likec4/core/model`、`@likec4/layouts` | 前端单元 | 使用 `vi.mock()` 替换为轻量 stub，使 ArchitectureView 可在 jsdom 中同步渲染。 | vitest `vi.mock()` |
| `IntersectionObserver` | 前端单元 | 使用 `vi.stubGlobal` 提供空实现（与现有测试模式一致）。 | vitest `vi.stubGlobal` |
| 文件系统和 CLI 子进程 | 集成 | 不 mock —— 在真实临时目录和子进程中操作，使用 `fs.mkdtempSync` / `spawnSync`，测试完成后通过 `afterEach` 清理。 | N/A |
| Express HTTP 服务器 | 集成 | 不 mock —— 启动真实 `DcrServer` 实例监听随机端口（port: 0），通过 `fetch()` 发送 HTTP 请求，测试完成后调用 `server.stop()`。 | N/A |

**Mock 生命周期管理：**

| 钩子 | 操作 | 说明 |
|------|------|------|
| 顶层（初始化时） | `mock.module()` 注册所有 ESM 模块 mock | 每个模块路径只注册一次，闭包捕获 mutable state 变量 |
| `beforeEach` | 重置所有 mutable state 变量为默认值 | `currentCruiseOutput = null`、`currentFsMocks = {...defaultFsMocks}`、`currentLikeC4State = {...defaultLikeC4State}` |
| 测试执行中 | 通过修改 state 变量控制 mock 行为 | `currentCruiseOutput = JSON.stringify(...)`、`currentFsMocks.existsSync = (p) => ...` |
| `afterEach` | `mock.restoreAll()` 恢复 `mock.method()` 调用 | 不影响 `mock.module()` 注册，只会清理 `mock.method(process, 'exit')` 等 spy |

> **注意：** 以上 Node.js 24 mock 约束仅影响使用 `node:test` 的 CLI 单元测试（`analyze-process-exit.test.ts` 和 `archi-to-rules-process-exit.test.ts`）。前端单元测试使用 vitest（`vi.mock()` 不受影响），服务端单元测试使用 mock 对象（不涉及 ESM mock），集成测试使用真实子进程/HTTP 服务器（无需 mock）。

### 3.4 测试数据

#### CLI 单元测试夹具

**analyze mock 数据：**

```
mockCruiseResult = {
  output: null  // 模拟无输出
}
mockCruiseResultWithOutput = {
  output: JSON.stringify({ modules: [], summary: {} })
}
```

**archiToRules mock 数据：**

```
mockC4Model = {
  elements: [
    { id: "1", kind: "package", name: "ROOT.core", links: [] },
    { id: "2", kind: "module", name: "ROOT.core.utils", links: [] },
  ],
  relations: [
    { kind: "dependency", source: { model: "1" }, target: { model: "2" } },
  ]
}
```

#### 前端测试夹具

复用 `packages/frontend/src/__tests__/unit/SyncUrlRouting.test.tsx` 中的 `sampleGraphData` 结构，用于渲染 GraphViewLayout 时提供 data 上下文。ArchitectureView 的 ready 状态 mock 数据为简化的 `{ status: 'ready', ArchitectureDiagram: <div>mock</div> }`。

#### CLI 集成测试夹具

| 夹具 | 用途 |
|------|------|
| `tests/fixtures/sample-project/` | 含 `.dependency-cruiser.js` 配置的小型测试目录，用于 `analyze` 命令正向路径测试 |
| `tests/fixtures/sample-archi/` | 含 `.dc-reporter/architecture/main.c4` 的测试目录，用于 `archi-to-rules` 命令正向路径测试 |
| 临时空目录 | 用于 `archi-to-rules` 错误路径测试（无架构目录触发 throw）|
| **无（场景驱动）** | B-14 使用 `-p nonexistent-dir` 参数而非夹具目录，通过不存在的路径触发 `analyze()` 的错误路径 |

**关于 B-14 错误路径触发方式：**

CLI 集成测试中 B-14 的测试场景不使用预置夹具。相反，测试在临时空目录中执行 `dep-report analyze -p nonexistent-dir`。`analyze()` 内部调用 `cruise()` 时传入不存在的路径，触发以下两条路径之一：

1. `cruise()` 自身抛出异常（路径不存在导致文件系统错误）→ 异常传播到 CLI handler → `process.exit(1)`
2. `cruise()` 返回 `{ output: null }`（无法为不存在的路径生成输出）→ `analyze()` 在 `!cruiseResult.output` 检查处抛出 → CLI handler 捕获 → `process.exit(1)`

两种路径均能正确验证 CLI handler 的 catch-and-exit 行为。若 `cruise()` 对不存在的路径返回有效空 JSON（导致 `!cruiseResult.output` 为 false），则说明此具体触发方式在新的 dependency-cruiser 版本中失效，应改用其他方式（如创建含非法配置的 `.dependency-cruiser.js` 文件使 cruise 内部抛出异常）。

---

## 4. 边界用例

| 编号 | 输入/条件 | 期望行为 | 目标测试文件 |
|------|-----------|---------|-------------|
| B-1 | Scan 执行中（scanning=true）用户重复点击 Scan 按钮 | 按钮处于 disabled 状态，onScan 不被重复调用 | `tests/unit/frontend/GraphViewLayout.test.tsx` |
| B-2 | Scan 完成后（scanning=false）扫描结果已写入文件，图形不自动刷新 | 不触发 fetch API 调用刷新图形，需用户手动点击 Refresh | `tests/unit/frontend/GraphViewLayout.test.tsx` |
| B-3 | Scan 请求时网络异常（fetch 抛出 TypeError） | scanning 置为 false，scanError 设为错误信息，错误提示渲染 | `tests/unit/frontend/GraphViewLayout.test.tsx` |
| B-4 | Generate Rules 执行中（rulesGenerating=true）用户重复点击 | 按钮 disabled，不重复发送 POST /api/archi-to-rules 请求 | `tests/unit/frontend/ArchitectureView.test.tsx` |
| B-5 | Architecture 视图在 empty 状态时 action bar 无 Generate Rules 按钮 | 只有 "Generate Architecture Model" 按钮在 empty 状态，Generate Rules 按钮不出现 | `tests/unit/frontend/ArchitectureView.test.tsx` |
| B-6 | Architecture 视图在 error 状态时 action bar 无 Generate Rules 按钮 | error 状态显示错误信息和 Retry 按钮，不显示 Generate Rules 按钮 | `tests/unit/frontend/ArchitectureView.test.tsx` |
| B-7 | `POST /api/analyze` 处理中 `analyze()` 抛出异常（如 dependency-cruiser 无输出） | 路由处理器 catch 异常，返回 500 { error: "dependency-cruiser did not produce output" } | `tests/integration/server-actions.test.ts` |
| B-8 | `POST /api/archi-to-rules` 处理中 `archiToRules()` 抛出异常（如架构目录不存在） | 路由处理器 catch 异常，返回 500 { error: "Architecture directory not found" } | `tests/integration/server-actions.test.ts` |
| B-9 | `analyze()` 在 cruise 无输出时抛出 Error 而非调用 `process.exit(1)` | 函数抛出 Error 实例，message 包含 "dependency-cruiser did not produce output"，不触发 process.exit | `tests/unit/cli/analyze-process-exit.test.ts` |
| B-10 | `archiToRules()` 在架构目录不存在时抛出 Error 而非调用 `process.exit(1)` | 函数抛出 Error 实例，message 包含 "Architecture directory not found"，不触发 process.exit | `tests/unit/cli/archi-to-rules-process-exit.test.ts` |
| B-11 | `archiToRules()` 在无 `.c4` 文件时抛出 Error 而非调用 `process.exit(1)` | 函数抛出 Error 实例，message 包含 "No .c4 files found"，不触发 process.exit | `tests/unit/cli/archi-to-rules-process-exit.test.ts` |
| B-12 | `archiToRules()` 在 C4 解析错误时抛出 Error 而非调用 `process.exit(1)` | 函数抛出 Error 实例，message 包含 "C4 parse errors"，不触发 process.exit | `tests/unit/cli/archi-to-rules-process-exit.test.ts` |
| B-13 | `archiToRules()` 在路径不存在时抛出 Error 而非调用 `process.exit(1)` | 函数抛出 Error 实例，message 包含 "paths do not exist on disk"，不触发 process.exit | `tests/unit/cli/archi-to-rules-process-exit.test.ts` |
| B-14 | **修正前：** 在空临时目录执行 `dep-report analyze -p <tmpDir>`（cruise 对空目录返回有效空 JSON，不触发任何 throw）<br>**修正：** 在临时目录执行 `dep-report analyze -p nonexistent-dir`，`cruise()` 因路径不存在而返回 null 输出或直接抛出异常 | CLI action handler 的 catch 块捕获异常，调用 `console.error` 输出错误信息并调用 `process.exit(1)`，退出码非 0 | `tests/integration/cli-commands.test.ts` |
| B-15 | 在空临时目录执行 `dep-report archi-to-rules`（无 `.dc-reporter/architecture/` 目录），`loadC4Model()` 中 `existsSync(archDir)` 返回 false | `loadC4Model()` 抛出 Error("Architecture directory not found...")，CLI handler 捕获后调用 `console.error` 并 `process.exit(1)`，退出码非 0 | `tests/integration/cli-commands.test.ts` |
| B-16 | 语言从英文切换到中文后 Scan 按钮文本变化 | 切换前显示 "Scan"，切换后显示 "扫描" | `tests/unit/frontend/i18n.test.ts` |
| B-17 | 语言从中文切换到英文后 Generate Rules 按钮文本变化 | 切换前显示 "生成规则"，切换后显示 "Generate Rules" | `tests/unit/frontend/i18n.test.ts` |
| B-18 | `POST /api/analyze` 请求体包含自定义 path 字段 | 传入 `{ path: 'src' }` 时，analyze 的 path 参数为 `src`；传入 `{}` 时，默认为 `'.'` | `tests/integration/server-actions.test.ts` |
| B-19 | GraphViewLayout 同时处于 loading（Refresh）和 scanning（Scan）状态 | Refresh 按钮和 Scan 按钮互不影响，各自独立管理 disabled 状态 | `tests/unit/frontend/GraphViewLayout.test.tsx` |

---

## 5. 测试环境与依赖

| 项目 | 说明 |
|------|------|
| **Runtime** | CLI 单元测试要求 **Node.js 24+**（使用 `node:test` 的 `mock.module()` API）。`mock.module()` 需注意：只能每个模块路径注册一次（顶层作用域），使用 mutable state 变量控制测试间行为变化，不得使用 `mock.method()` 在 ESM 命名空间对象上（frozen 属性不可配置）。前端测试运行在 vitest 环境中，不受这些约束影响。 |
| **CLI 测试执行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\add-dashboard-action-buttons\tests\unit\cli\*.test.ts"` + `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\add-dashboard-action-buttons\tests\integration\*.test.ts"`，或通过 `packages/cli/package.json` 添加脚本统一运行 |
| **前端测试执行命令** | 扩展 `packages/frontend/vitest.config.ts` 的 `test.include` 或 `test.dir` 配置，包含 `openspec/changes/add-dashboard-action-buttons/tests/unit/frontend/` 目录，然后运行 `vp test` |
| **CI 集成** | 在 CI 配置中新增 `add-dashboard-action-buttons` 测试步骤，确保在 `pnpm build` 之后运行（需要 `dist/bin/cli.js` 存在用于集成测试） |
| **测试夹具** | CLI 集成测试的夹具存放在 `tests/fixtures/` 目录；单元测试夹具内联在测试文件中或通过 mock 数据提供 |
| **临时目录** | 集成测试使用 `fs.mkdtempSync` 或 `os.tmpdir()` 创建临时工作目录，测试完成后通过 `after` hook 清理 |

---

## 6. 回归测试注意事项

1. **原有 CLI 命令行为不变：** 重构后 `analyze()` 和 `archiToRules()` 的函数签名不变（返回类型相同），CLI action handler 新增 try-catch 确保错误仍通过 `process.exit(1)` 传递。已存在的 `packages/e2e/cli.test.ts` 中的 `analyze` 和 `dashboard` 相关测试应继续通过。

2. **`cli.ts` 的 action handler 修改：** 现有的 `analyze` 和 `archi-to-rules` action handler 未使用 try-catch。修改后需确保：
   - 成功路径的 stdout 输出格式不变（`console.log('Graph written to: ...')`）
   - 错误路径的 exit code 仍为 1
   - `dashboard` 命令的 handler 不受影响（未使用 `analyze()` 或 `archiToRules()`）

3. **前端组件向后兼容：** `GraphViewLayout` 新增 3 个 props（`scanning`、`scanError`、`onScan`），原有 3 个 props（`loading`、`onRefresh`、`children`）行为不变。现有调用 `GraphViewLayout` 的代码（Graph/Report/Metrics 视图）在未传入新增 props 时应正常工作（通过默认值 `false`/`null`/`undefined` 保证）。

4. **`ArchitectureView` 内部状态管理：** 新增的 Generate Rules 功能使用独立的 `rulesGenerating`/`rulesGenerateError` 状态变量或复用现有 `generating`/`generateError`（因 empty 和 ready 状态互斥），不应影响已有的 "Generate Architecture Model" 按钮行为。

5. **已有 E2E 测试不受影响：** `packages/frontend/e2e/` 目录下的 Playwright 测试和 `packages/e2e/cli.test.ts` 的集成测试在本次变更后行为不变。注意检查 `packages/e2e/cli.test.ts` 中与 analyze 相关的测试用例，确保 process.exit 替换后 exit code 行为一致。

6. **i18n 命名空间隔离：** 新增的 `action` 命名空间不应与已有的 `nav`、`architecture`、`upload` 等命名空间冲突。翻译字典中 `action` 作为顶层 key 应唯一。
