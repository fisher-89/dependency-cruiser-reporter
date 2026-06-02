# 设计文档: add-dashboard-action-buttons

> **变更**: add-dashboard-action-buttons
> **日期**: 2026-05-29
> **状态**: 设计

---

## 架构组件

### 1. CLI 命令层 (packages/cli/src/commands/)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `analyze.ts` | 导出 `analyze()` 函数：通过 dependency-cruiser API 扫描项目目录，生成原始图谱 JSON 文件 | `dependency-cruiser`, `node:fs`, `node:path` | TypeScript, ES module |
| `archi-to-rules.ts` | 导出 `archiToRules()` 函数：从 `.dc-reporter/architecture/*.c4` 加载 C4 模型，生成 forbidden rules JSON 文件并更新 `.dependency-cruiser.js` extends | `@likec4/language-services/node`, `@likec4/core`, `node:fs`, `node:path` | TypeScript, ES module |

**变更**：移除 `analyze()` 和 `archiToRules()` 内部的 `process.exit()` 调用，改为通过抛出异常传递错误。CLI 命令入口（`cli.ts`）负责捕获这些异常并调用 `process.exit(1)`，确保 CLI 命令行行为不变。

### 2. 服务端层 (packages/cli/src/server/)

当前 `server.ts` 的 `setupRoutes()` 采用混合模式：部分路由内联注册，部分已提取为独立模块。本次新增的路由遵循已建立的提取模式，不再内联到 `setupRoutes()` 中。

**目录结构变更**：

```
packages/cli/src/server/
├── server.ts                    # DcrServer: 组装所有路由模块（不包含路由处理逻辑）
├── architecture/
│   └── architecture.ts          # setupArchitectureRoutes(app, cwd)
└── actions/
    └── actions.ts               # setupActionRoutes(app, { cwd })  ← 新增
```

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `server.ts` | `DcrServer` 类管理 Express 实例、生命周期。`setupRoutes()` 变为纯组装函数：依次调用各个 `setup*Routes()` 注册路由 + 静态文件 + SPA fallback | `express`, `node:fs`, `node:path` | TypeScript, Express |
| `architecture/architecture.ts` | `setupArchitectureRoutes(app, cwd)` 注册架构相关路由（`GET /api/architecture/model`、`POST /api/architecture/generate`）。无变更 | `express`, `@likec4/language-services/node` | TypeScript, Express |
| `actions/actions.ts` | **新增** `setupActionRoutes(app, { cwd })` 注册操作类路由（`POST /api/analyze`、`POST /api/archi-to-rules`）。签名遵循 `(app, context) => void` 模式 | `express` | TypeScript, Express |

**路由注册模式**：

每个功能模块导出统一的 `setup*Routes(app, context)` 函数，在 Express app 上直接注册路由。`server.ts` 的 `setupRoutes()` 退化为纯组装：

```typescript
private setupRoutes(): void {
  setupArchitectureRoutes(this.app, this.cwd);
  setupActionRoutes(this.app, { cwd: this.cwd });
  // static + SPA fallback
}
```

**新增端点**：
- `POST /api/analyze`：调用 `analyze({ path: '.', cwd })`，返回输出文件路径
- `POST /api/archi-to-rules`：调用 `archiToRules({ cwd })`，返回成功状态

两个端点均使用服务器启动时配置的 `cwd` 作为工作目录。

### 3. 前端视图层 (packages/frontend/src/components/)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `GraphViewLayout.tsx` | 为 Graph/Report/Metrics 视图提供 action bar。**新增 Scan 按钮**，位于 Refresh 按钮左侧 | React, `useT()` i18n hook | React 19, TypeScript |
| `ArchitectureView.tsx` | 渲染架构图或空/错误状态。**新增 Generate Rules 按钮**，位于 action bar 的 Refresh 按钮旁（仅 ready 状态显示） | React, `@likec4/diagram`, `@likec4/core/model`, `@likec4/layouts`, `useT()` | React 19, TypeScript |

**变更**：
- `GraphViewLayout` 接收新的 `scanning`/`onScan` props，或内部管理扫描状态
- `ArchitectureView` 在 action bar 添加 Generate Rules 按钮（ready 状态），管理独立的 `generating`/`generateError` 状态
- **不修改** `App.tsx` 的路由结构或布局

### 4. 国际化层 (packages/frontend/src/i18n/)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `en.ts` | 英文翻译字典。新增 `action` 命名空间下的 `scan`、`scanning`、`scanError`、`generateRules`、`generatingRules`、`generateRulesError` | 无外部依赖 | TypeScript const object |
| `zh-CN.ts` | 简体中文翻译字典。对应新增上述 key 的中文翻译 | 无外部依赖 | TypeScript const object |

### 5. 图标层 (packages/frontend/src/components/icons.tsx)

| 组件 | 职责 | 依赖 | 技术 | 文件路径 |
|------|------|------|------|----------|
| `ScanIcon` | SVG 图标（扫描/雷达样式），用于 Scan 按钮 | 无外部依赖 | SVG inline, React component | `packages/frontend/src/components/icons.tsx` |
| `GenerateRulesIcon` | SVG 图标（规则/列表样式），用于 Generate Rules 按钮 | 无外部依赖 | SVG inline, React component | `packages/frontend/src/components/icons.tsx` |

---

## 数据流

### Scan 数据流

```
User clicks "Scan" button
        |
        v
GraphViewLayout: set scanning=true, set scanError=null
        |
        v
fetch POST /api/analyze  (body: {})
        |
        v
DcrServer: this.app.post('/api/analyze')
        |
        v
call analyze({ path: '.', cwd: this.cwd })
        |
        v
  +-----> 成功: return { output: "path/to/graph.json" }
  |             响应 200 { output: string }
  |
  +-----> 失败: throw Error("...")
               catch → 响应 500 { error: string, details?: string }
        |
        v
GraphViewLayout: set scanning=false
  +-----> 成功: 不自动刷新，用户可点击 Refresh 查看新结果
  +-----> 失败: set scanError=error.message，显示错误提示
```

### Generate Rules 数据流

```
User clicks "Generate Rules" button
        |
        v
ArchitectureView: set generating=true, set generateError=null
        |
        v
fetch POST /api/archi-to-rules  (body: {})
        |
        v
DcrServer: this.app.post('/api/archi-to-rules')
        |
        v
call archiToRules({ cwd: this.cwd })
        |
        v
  +-----> 成功: 写入 .dc-reporter/archi-rules.json
  |             更新 .dependency-cruiser.js extends
  |             响应 200 { success: true }
  |
  +-----> 失败: throw Error("...")
               catch → 响应 500 { error: string, details?: string }
        |
        v
ArchitectureView: set generating=false
  +-----> 成功: 不自动刷新，用户可点击 Refresh 重新加载架构图
  +-----> 失败: set generateError=error.message，显示错误提示
```

### process.exit 重构后的错误流

```
analyze() / archiToRules()
        |
        v
遇到错误条件 → throw new Error("描述信息")
        |
        v
+----> CLI 命令入口 (cli.ts action handler):
|         catch error
|         console.error(error.message)
|         process.exit(1)
|         行为与重构前一致
|
+----> Express 路由 (server.ts route handler):
          catch error
          res.status(500).json({ error: error.message })
          不退出进程
```

---

## API 设计

### POST /api/analyze

| 字段 | 值 |
|------|-----|
| 方法 | `POST` |
| 路径 | `/api/analyze` |
| 请求体 | `{}` (可选：`{ path?: string }`，默认 `"."`) |
| 成功响应 | `200 { output: string }` — `output` 是生成的图谱 JSON 文件路径 |
| 错误响应 | `500 { error: string, details?: string }` |
| 认证 | 无（本地服务器） |
| 副作用 | 运行 dependency-cruiser 扫描，写入原始图谱 JSON 文件 |

### POST /api/archi-to-rules

| 字段 | 值 |
|------|-----|
| 方法 | `POST` |
| 路径 | `/api/archi-to-rules` |
| 请求体 | `{}` |
| 成功响应 | `200 { success: true }` |
| 错误响应 | `500 { error: string, details?: string }` |
| 认证 | 无（本地服务器） |
| 副作用 | 写入 `.dc-reporter/archi-rules.json`，更新 `.dependency-cruiser.js` extends 字段 |

---

## i18n 新增 Key

### en.ts

```typescript
export default {
  // ... existing keys
  action: {
    scan: 'Scan',
    scanning: 'Scanning...',
    scanError: 'Scan failed',
    generateRules: 'Generate Rules',
    generatingRules: 'Generating...',
    generateRulesError: 'Failed to generate rules',
  },
} as const;
```

### zh-CN.ts

```typescript
export default {
  // ... existing keys
  action: {
    scan: '扫描',
    scanning: '扫描中...',
    scanError: '扫描失败',
    generateRules: '生成规则',
    generatingRules: '生成中...',
    generateRulesError: '生成规则失败',
  },
} as const;
```

**注意**：`action` 命名空间为新增，与现有的 `nav`、`architecture`、`upload` 等平级。这样命名清晰且不会与现有 key 冲突。

---

## 组件 Props 变更

### GraphViewLayout

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `loading` | `boolean` | 必填 | 现有 prop，控制 Refresh 按钮状态 |
| `onRefresh` | `() => void` | 必填 | 现有 prop，Refresh 点击回调 |
| `children` | `ReactNode` | 必填 | 现有 prop，视图内容 |
| `scanning` | `boolean` | `false` | **新增**，控制 Scan 按钮的 loading/disabled 状态 |
| `scanError` | `string \| null` | `null` | **新增**，Scan 失败时的错误信息 |
| `onScan` | `() => void` | 必填 | **新增**，Scan 点击回调 |

### ArchitectureView

在组件内部管理 `generating` 状态和 `generateError` 状态（与现有 `state` 管理方式一致），ready 状态的 action bar 增加 Generate Rules 按钮。不新增外部 props。

---

## 关键决策

### 决策 1：用异常替代 process.exit()

- **选择**：将 `analyze()` 和 `archiToRules()` 内部的 `process.exit(1)` 替换为 `throw new Error(...)`
- **原因**：Express 路由处理函数不能调用 `process.exit()`，否则整个服务器进程会终止。核心函数必须可同时被 CLI 命令和 HTTP 路由安全调用。
- **每个修改点**：
  - `analyze.ts` 第 92 行：`process.exit(1)` → `throw new Error('dependency-cruiser did not produce output')`
  - `archi-to-rules.ts` 第 489 行：`process.exit(1)` → `throw new Error(...)`
  - `archi-to-rules.ts` 第 496 行：`process.exit(1)` → `throw new Error(...)`
  - `archi-to-rules.ts` 第 514 行：`process.exit(1)` → `throw new Error(...)`
  - `archi-to-rules.ts` 第 687 行：`process.exit(1)` → `throw new Error(...)`
- **替代方案**：在 Express 路由中用 child_process 调用 CLI 命令。被拒绝的原因是：开销大、错误处理复杂、无法利用已有的 in-process 导入状态。

### 决策 2：按钮操作后不自动刷新

- **选择**：Scan 和 Generate Rules 按钮完成后不自动触发数据刷新或页面跳转，用户需手动点击 Refresh
- **原因**：与提案一致。Scan 可能产生大量新数据，自动刷新会导致用户体验中断。用户希望在自己准备好的时候再查看新结果。
- **替代方案**：Scan 成功后自动 POST /api/graph 刷新。被拒绝的原因是：提案明确要求无自动联动，且扫描大项目时刷新时机不可控。

### 决策 3：Scan 按钮放在 Graph/Report/Metrics 视图共享的 GraphViewLayout

- **选择**：Scan 按钮添加到 `GraphViewLayout`，三个视图共享
- **原因**：Graph/Report/Metrics 使用同一个 action bar 组件，Scan 操作对三个视图都有意义（重新扫描后切换视图查看不同维度的结果）。保持 DRY 原则。
- **替代方案**：只在 Graph 视图添加 Scan 按钮。被拒绝的原因是：用户可能在 Report 或 Metrics 视图时也需要触发扫描，需要切换回 Graph 视图不方便。

### 决策 4：Generate Rules 按钮放在 ArchitectureView 的 action bar（ready 状态）

- **选择**：仅当 ArchitectureView 处于 `ready` 状态时，在 action bar 显示 Generate Rules 按钮
- **原因**：`empty` 状态已经有"Generate Architecture Model"按钮（生成初始 .c4 模板），这是不同操作；`error` 状态需要先解决加载错误。ready 状态的用户已在查看架构图，此时生成规则是自然的工作流延续。
- **替代方案**：在所有非 loading 状态都显示。被拒绝的原因是：empty 状态已有功能不同但名称相似的按钮，会导致混淆。

### 决策 5：使用独立 `action` i18n 命名空间

- **选择**：新增 `action` 命名空间，不放入现有 `nav` 或其他命名空间
- **原因**：这些按钮不是导航项，也不是架构专有术语。独立命名空间让翻译职责清晰，未来可扩展其他操作按钮。
- **替代方案**：放入 `architecture` 和 `nav` 命名空间。被拒绝的原因是：Scan 不属于 Architecture 视图专有，放在 `nav` 会混淆"导航"语义。

### 决策 6：新增 API 路由遵循 `setup*Routes` 提取模式，不内联

- **选择**：新增的 `POST /api/analyze` 和 `POST /api/archi-to-rules` 端点提取到独立模块 `server/actions/actions.ts`，导出 `setupActionRoutes(app, { cwd })`。
- **原因**：当前 `server.ts` 处于"半拆分"状态——architecture 路由已按 `setupArchitectureRoutes(app, cwd)` 模式提取，但 `/api/graph` 和 SPA fallback 仍内联在 `setupRoutes()` 中。若不在此次变更中遵循提取模式，新增路由会加剧内联膨胀，后续重构成本更高。提取后的 `setupRoutes()` 退化为纯组装函数，每个路由模块职责清晰、可独立测试。
- **替代方案**：继续内联在 `setupRoutes()` 中。被拒绝的原因是：与已有提取模式不一致，`setupRoutes()` 会持续膨胀；内联处理器无法独立进行单元测试，而提取后的 `setup*Routes` 函数可以传入 mock app 进行隔离测试。
- **当前不提取的部分**：`/api/graph`（已有路由，依赖 `this.graphFile`/`this.maxNodes`）和 SPA fallback 暂不提取，避免本次变更范围膨胀。这些路由的重构可在后续 change 中完成。

### 路由注册模式定义

```
签名: setup<Feature>Routes(app: Express, context: object) => void

规则:
1. 函数不依赖 this，所有上下文通过参数显式传入
2. 在传入的 app 上直接调用 app.get/post/use 注册路由
3. 错误处理由路由处理器内部 catch，不传播到外层
4. 不返回任何值（void）
```

当前 `setupRoutes()` 组装全景：

```
DcrServer.setupRoutes()
├── setupArchitectureRoutes(app, cwd)                 ← 已有（已提取）
│   ├── GET  /api/architecture/model
│   └── POST /api/architecture/generate
├── setupActionRoutes(app, { cwd })                  ← 本次新增
│   ├── POST /api/analyze
│   └── POST /api/archi-to-rules
├── POST /api/graph                                  ← 暂不提取（已有路由）
├── express.static(frontendDist)
└── GET * (SPA fallback)
```

---

## 架构模型调整方案

> 基于 `.dc-reporter/architecture/` 下的 C4 模型（main.c4、cli.c4、frontend.c4），
> 以下调整反映本次变更对系统架构的影响。

### cli.c4 调整

**当前模型**：
```
server = module {
  dashboard = module { -> ROOT.frontend }
  architecture = module 'architecture' { -[dependency]-> ROOT.cli.actions.archi-to-rules }
  dep = module 'dep' {
    analyze = module { -[dependency]-> ROOT.cli.actions.analyze }
    graph = module { -[dependency]-> ROOT.cli.utils.convert }
  }
}
```

**调整要点**：

| # | 位置 | 变更 | 原因 |
|---|------|------|------|
| 1 | `server` | 新增子模块 `actions`，依赖 `ROOT.cli.actions.analyze` 和 `ROOT.cli.actions.archi-to-rules` | 对应新增的提取式路由模块 `server/actions/actions.ts`，注册 `POST /api/analyze` 和 `POST /api/archi-to-rules` |
| 2 | `actions.analyze` | 补充描述：`'使用dependency-cruiser扫描工程生成json报告；通过throw替代process.exit传递错误'` | 重构后 `analyze()` 不再调用 `process.exit()`，改为抛出异常 |
| 3 | `actions.archi-to-rules` | 补充描述：`'从C4模型生成规则JSON；通过throw替代process.exit传递错误'` | 同上，4 处 `process.exit(1)` 替换为 `throw new Error(...)` |

**调整后的 `server` 子树**：
```
server = module {
  dashboard = module { -> ROOT.frontend }
  architecture = module 'architecture' 'C4模型相关接口(GET /api/architecture/model, POST /api/architecture/generate)' {
    -[dependency]-> ROOT.cli.actions.archi-to-rules
  }
  dep = module 'dep' '依赖分析相关接口' {
    analyze = module { -[dependency]-> ROOT.cli.actions.analyze }
    graph = module { -[dependency]-> ROOT.cli.utils.convert }
  }
  actions = module 'actions' '操作触发接口(POST /api/analyze, POST /api/archi-to-rules)' {       // NEW: 提取的独立路由模块
    -[dependency]-> ROOT.cli.actions.analyze
    -[dependency]-> ROOT.cli.actions.archi-to-rules
  }
}
```

**说明**：
- `actions` 是本次新增的独立路由模块，对应 `server/actions/actions.ts` -> `setupActionRoutes(app, { cwd })`。两个新增端点 (`POST /api/analyze`, `POST /api/archi-to-rules`) 均在此注册，遵循已建立的提取模式。
`actions` 与 `architecture` 平级，因为两者都是独立的路由注册模块，各自通过 `setup*Routes(app, context)` 签名在 Express app 上注册路由。前者负责操作触发，后者负责架构数据访问。

### frontend.c4 调整

| # | 位置 | 变更 | 原因 |
|---|------|------|------|
| 1 | `components` | 新增子模块 `icons`，无外部依赖 | 新增 `ScanIcon`、`GenerateRulesIcon` 两个 SVG 图标组件 |
| 2 | `i18n` | 补充描述：`'中英文翻译字典(nav/architecture/upload/action)'`  | 新增 `action` 命名空间及 6 个翻译 key |

**调整后的 `components` 子树**：
```
components = module {
  -[dependency]-> ROOT.frontend.i18n
  -[dependency]-> ROOT.frontend.styles
  icons = module  // NEW: ScanIcon, GenerateRulesIcon
}
```

**说明**：
- frontend.c4 当前为高层级模型，`GraphViewLayout`、`ArchitectureView` 等具体组件未展开为独立子模块。本次调整仅在 `components` 下新增 `icons` 子模块，与按钮相关的 API 调用不在 frontend 模型中表达（前端不直接建模对后端路由的依赖）。
- `i18n` 模块的描述更新反映新增的 `action` 命名空间。

### main.c4 调整

无需调整。顶层项目结构（cli / frontend / rust）不变。

---

## 受影响文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `packages/cli/src/commands/analyze.ts` | 修改 | 第 92 行 `process.exit(1)` → `throw new Error()` |
| `packages/cli/src/commands/archi-to-rules.ts` | 修改 | 4 处 `process.exit(1)` → `throw new Error()` |
| `packages/cli/src/bin/cli.ts` | 修改 | `analyze` 和 `archi-to-rules` action handler 添加 try-catch 和 `process.exit(1)` |
| `packages/cli/src/server/server.ts` | 修改 | `setupRoutes()` 退化为纯组装：调用 `setupActionRoutes` 替代内联注册；导入路径更新 |
| `packages/cli/src/server/actions/actions.ts` | **新增** | `setupActionRoutes(app, { cwd })` 注册 `POST /api/analyze` 和 `POST /api/archi-to-rules` |
| `packages/frontend/src/components/GraphViewLayout.tsx` | 修改 | 新增 Scan 按钮、scanning/scanError/onScan props |
| `packages/frontend/src/components/ArchitectureView.tsx` | 修改 | ready 状态 action bar 新增 Generate Rules 按钮 |
| `packages/frontend/src/components/icons.tsx` | 修改 | 新增 ScanIcon 和 GenerateRulesIcon |
| `packages/frontend/src/i18n/en.ts` | 修改 | 新增 `action` 命名空间及相关 key |
| `packages/frontend/src/i18n/zh-CN.ts` | 修改 | 新增 `action` 命名空间及相关 key |
