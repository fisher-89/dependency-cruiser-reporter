# 设计文档：代码结构对齐架构模型

## 概述

本变更旨在将实际代码目录结构调整为与 C4 架构模型（`.dc-reporter/architecture/*.c4`）一致。采取"严格重构代码以匹配架构模型"策略（Direction A），不改变任何功能行为。通过此对齐，使 `archi-rules.json` 中的路径全部指向有效位置，恢复架构模型作为"可执行文档"的可信度。

## 架构组件

### 1. CLI 模块（packages/cli/src/）

#### 1.1 actions 模块（新增）

| 属性 | 值 |
|------|-----|
| **职责** | 存放核心业务逻辑，被 commands 和 server 模块共同调用 |
| **文件** | `actions/analyze.ts` — 从 `commands/analyze.ts` 提取的业务逻辑 |
| | `actions/archi-to-rules.ts` — 从 `commands/archi-to-rules.ts` 提取的业务逻辑 |
| **依赖** | 无项目内依赖（仅导入外部库） |
| **被依赖** | `commands/*/index.ts`、`server/dep/*.ts`、`server/architecture/architecture.ts` |
| **技术** | TypeScript |

现状：业务逻辑内联在 `commands/*.ts` 平面文件中。`server/actions/actions.ts` 直接 import `commands/analyze` 和 `commands/archi-to-rules`，违反了架构模型中 `actions` 与 `server`、`commands` 同级的定义。

目标：将 `analyze` 和 `archi-to-rules` 的核心函数提取到 `actions/`，使 `commands/` 和 `server/dep/` 都从 `actions/` 导入。

#### 1.2 commands 模块（重构）

| 属性 | 值 |
|------|-----|
| **职责** | CLI 参数解析和编排，转发至 actions/ 或 server/ |
| **文件** | `commands/index.ts` — 统一导出 |
| | `commands/analyze/index.ts` — 解析 CLI 参数并调用 `actions/analyze` |
| | `commands/archi-to-rules/index.ts` — 解析 CLI 参数并调用 `actions/archi-to-rules` |
| | `commands/dashboard/index.ts` — 解析 CLI 参数并调用 `server/dashboard` |
| **依赖** | `actions/analyze`、`actions/archi-to-rules`、`server/dashboard` |
| **技术** | TypeScript, Commander.js |

现状：`commands/analyze.ts`、`commands/archi-to-rules.ts`、`commands/dashboard.ts` 为平面文件。架构模型定义为子模块（目录）。

目标：每个命令转换为 `commands/<name>/index.ts` 目录格式。`commands/*/index.ts` 仅处理参数解析并转发至 `actions/` 或 `server/`，不包含业务逻辑。

#### 1.3 server/dep 模块（新增）

| 属性 | 值 |
|------|-----|
| **职责** | 处理依赖图相关的 HTTP 路由 |
| **文件** | `server/dep/analyze.ts` — `POST /api/analyze` 路由处理 |
| | `server/dep/graph.ts` — `POST /api/graph` 路由处理 |
| **依赖** | `actions/analyze`、`utils/convert` |
| **技术** | TypeScript, Express |

现状：`server/actions/actions.ts` 处理 `/api/analyze` 和 `/api/archi-to-rules` 路由，但这些路由应属于 `server/dep/`。`POST /api/graph` 路由内联在 `server.ts` 的 `setupRoutes()` 方法中。

目标：创建 `server/dep/analyze.ts`（接管 `actions.ts` 中的 `/api/analyze`）和 `server/dep/graph.ts`（从 `server.ts` 提取 `/api/graph`）。

#### 1.4 server/dashboard 模块（新增）

| 属性 | 值 |
|------|-----|
| **职责** | 托管前端静态文件和 SPA fallback |
| **文件** | `server/dashboard/index.ts` — 静态文件服务 + SPA fallback |
| **依赖** | 无项目内依赖（仅 Express 静态文件服务） |
| **技术** | TypeScript, Express |

现状：静态文件托管和 SPA fallback 内联在 `server.ts` 的 `setupRoutes()` 方法中。

目标：提取 `express.static` 配置和 `app.get('*')` SPA fallback 到 `server/dashboard/index.ts`。

#### 1.5 server/architecture 模块（保持不变）

| 属性 | 值 |
|------|-----|
| **职责** | 处理 C4 架构模型相关的 HTTP 路由 |
| **文件** | `server/architecture/architecture.ts` |
| **依赖** | `actions/archi-to-rules` |
| **技术** | TypeScript, Express |

现状：已在正确位置，无需重构。但 `server/actions/` 目录将被删除，其 `setupActionRoutes` 功能拆分到 `server/dep/analyze.ts` 和 `server/dep/graph.ts`。

#### 1.6 server 模块（简化）

| 属性 | 值 |
|------|-----|
| **职责** | Express 服务器入口，编排各子模块 |
| **文件** | `server/server.ts` — `DcrServer` 类和 `createServer` 工厂函数 |
| **依赖** | `server/dep/analyze`、`server/dep/graph`、`server/dashboard`、`server/architecture` |
| **技术** | TypeScript, Express |

现状：`server.ts` 内联了三个不同关注点（前端静态托管、依赖图接口、架构接口）。

目标：`server.ts` 简化为模块编排入口，在 `setupRoutes()` 中调用子模块的路由设置函数。

#### 1.7 utils/convert 模块（保持不变）

| 属性 | 值 |
|------|-----|
| **职责** | WASM 模块封装和 Node.js 回退转换 |
| **文件** | `utils/convert.ts` |
| **依赖** | `@dcr-reporter/wasm` |
| **技术** | TypeScript |

### 2. 前端模块（packages/frontend/src/）

#### 2.1 types 模块（C4 模型新增）

| 属性 | 值 |
|------|-----|
| **职责** | 共享类型定义（`ProcessedGraph`、`GraphNode`、`GraphEdge` 等） |
| **文件** | `types.ts` |
| **依赖关系（在 .c4 模型中）** | `App → types`、`components/* → types`、`hooks/useGraphData → types` |
| **技术** | TypeScript |

现状：`types.ts` 存在于 `src/` 根目录并被多个模块引用，但 `frontend.c4` 未建模此模块。

目标：在 `frontend.c4` 中新增 `types` 模块定义及正确的依赖边。不对文件做物理移动。

### 3. Rust 后端模块（packages/rust/src/）

#### 3.1 types 模块（C4 模型新增）

| 属性 | 值 |
|------|-----|
| **职责** | 共享数据结构定义（`ProcessedGraph`、`GraphNode`、`GraphEdge` 等） |
| **文件** | `types.rs` |
| **依赖关系（在 .c4 模型中）** | `aggregate → types`、`layout → types`、`violations → types`、`lib → types` |
| **技术** | Rust, serde, tsify |

现状：`types.rs` 存在于 `src/` 根目录被多个模块引用，但 `rust.c4` 未建模此模块。

目标：在 `rust.c4` 中新增 `types` 和 `lib` 模块定义及正确的依赖边。不对文件做物理移动。

#### 3.2 lib 模块（C4 模型新增）

| 属性 | 值 |
|------|-----|
| **职责** | crate 根入口，协调所有子模块的 WASM 导出点 |
| **文件** | `lib.rs` |
| **依赖关系（在 .c4 模型中）** | `lib → aggregate`、`lib → layout`、`lib → types`、`lib → violations` |
| **技术** | Rust, wasm-bindgen |

## 数据流

### CLI 数据流（重构前后对比）

重构前：
```
cli.ts → commands/analyze.ts (业务逻辑 + CLI 参数)
      → commands/archi-to-rules.ts (业务逻辑 + CLI 参数)
      → commands/dashboard.ts (调用 server.ts)

server.ts (内联: /api/graph, 静态文件, SPA fallback)
  → server/actions/actions.ts (调用 commands/analyze.ts、commands/archi-to-rules.ts)
  → server/architecture/architecture.ts
```

重构后：
```
cli.ts → commands/analyze/index.ts → actions/analyze.ts
      → commands/archi-to-rules/index.ts → actions/archi-to-rules.ts
      → commands/dashboard/index.ts → server/dashboard/index.ts

server.ts → server/dep/analyze.ts → actions/analyze.ts
          → server/dep/graph.ts → utils/convert.ts
          → server/dashboard/index.ts (静态文件 + SPA fallback)
          → server/architecture/architecture.ts → actions/archi-to-rules.ts
```

### 数据模型

本变更不修改任何数据模型的字段或结构。涉及的现有数据模型包括：

- **CLI 侧**：
  - `ServerOptions`（`server/server.ts`）- 服务器配置选项
  - `AnalyzeOptions`（当前在 `commands/analyze.ts`，将移至 `actions/analyze.ts`）
  - `ArchiToRulesOptions`（当前在 `commands/archi-to-rules.ts`，将移至 `actions/archi-to-rules.ts`）
  - `DashboardOptions`（当前在 `commands/dashboard.ts`，将移至 `commands/dashboard/index.ts`）

- **前端侧**：`ProcessedGraph`、`GraphNode`、`GraphEdge`、`ViolationInfo`、`ViewMode`（`types.ts`，不变）

- **Rust 侧**：`ProcessedGraph`、`GraphNode`、`GraphEdge`、`GraphCombo`、`GraphMeta`、`ViolationInfo`、`NodeType`、`EdgeType`（`types.rs`，不变）

### 文件移动明细

#### CLI 文件映射

| 原文件 | 目标文件 | 说明 |
|--------|---------|------|
| `commands/analyze.ts` | `actions/analyze.ts` | 核心业务逻辑（`analyze` 函数） |
| `commands/analyze.ts` | `commands/analyze/index.ts` | CLI 参数解析，转发到 `actions/analyze` |
| `commands/archi-to-rules.ts` | `actions/archi-to-rules.ts` | 核心业务逻辑（`archiToRules` 函数及辅助函数） |
| `commands/archi-to-rules.ts` | `commands/archi-to-rules/index.ts` | CLI 参数解析，转发到 `actions/archi-to-rules` |
| `commands/dashboard.ts` | `commands/dashboard/index.ts` | CLI 参数解析，转发到 `server/dashboard` |
| `server/actions/actions.ts` | `server/dep/analyze.ts` | `/api/analyze` 路由 |
| `server.ts` (内联) | `server/dep/graph.ts` | `/api/graph` 路由 |
| `server.ts` (内联) | `server/dashboard/index.ts` | 静态文件 + SPA fallback |
| `server.ts` | `server/server.ts` | 简化编排 |
| `bin/cli.ts` | `bin/cli.ts` | import 路径更新 |
| `commands/index.ts` | `commands/index.ts` | 导出路径更新 |
| `server/architecture/architecture.ts` | `server/architecture/architecture.ts` | import 路径更新（指向 `actions/archi-to-rules` 而非 `commands/archi-to-rules`） |

#### 删除的目录

| 目录 | 原因 |
|------|------|
| `server/actions/` | 功能拆分到 `server/dep/analyze.ts` |

## Route / API 设计

本变更不修改 API 端点、方法、路径、输入输出或认证方式。仅修改路由处理代码的组织位置。

### CLI 命令（不变）

| 命令 | 方法 | 路径 | 输入 | 输出 |
|------|------|------|------|------|
| analyze | `actions/analyze.ts` | `analyze(options)` | `AnalyzeOptions` | `Promise<string>` |
| archi-to-rules | `actions/archi-to-rules.ts` | `archiToRules(options)` | `ArchiToRulesOptions` | `Promise<void>` |
| dashboard | `commands/dashboard/index.ts` → `createServer()` | `dashboard(options)` | `DashboardOptions` | `Promise<void>` |

### HTTP 端点（不变）

| 方法 | 路径 | 处理模块（重构后） | 描述 |
|------|------|-------------------|------|
| POST | `/api/analyze` | `server/dep/analyze.ts` | 扫描当前工作目录 |
| POST | `/api/graph` | `server/dep/graph.ts` | 返回图 JSON |
| POST | `/api/archi-to-rules` | `server/architecture/architecture.ts` | 从 C4 模型生成规则 |
| GET | `/api/architecture/model` | `server/architecture/architecture.ts` | 读取 C4 模型 |
| GET | `*` | `server/dashboard/index.ts` | 静态文件 + SPA fallback |

## 决策

### 决策 1：提取 actions/ 而非保留 server/actions/

**决策**：创建顶层 `actions/` 目录，将 `analyze` 和 `archi-to-rules` 核心函数移至此处。删除 `server/actions/`。

**理由**：`cli.c4` 架构模型定义 `actions` 与 `server`、`commands` 平级。当前 `server/actions/` 导致架构规则路径失效（模型期望 `actions/` 但实际为 `server/actions/`）。将业务逻辑放在顶层 `actions/` 也使得 `commands/` 和 `server/` 都能以非对称方式调用它，符合"命令模式"的分离关注原则。

**评估的替代方案**：

| 方案 | 描述 | 被拒原因 |
|------|------|---------|
| A（选中） | 创建顶层 `actions/`，提取核心函数 | 符合架构模型，路径正确 |
| B | 调整架构模型，将 `actions` 保留在 `server/` 下 | 架构模型语义不同于代码实现；`actions` 并非 server 的专属子模块 |
| C | 不创建 `actions/`，仅将路由拆分为 `server/dep/` 子模块 | 无法解决 `commands/analyze.ts` 包含业务逻辑而非纯 CLI 参数解析的问题 |

### 决策 2：commands 由平面文件转为目录格式

**决策**：将 `commands/analyze.ts`、`commands/archi-to-rules.ts`、`commands/dashboard.ts` 转换为 `commands/<name>/index.ts`。

**理由**：架构模型定义 `commands.<name>` 为子模块（`module` 类型）。当前平面文件 `.ts` 在架构路径解析中映射到文件而非目录模块。目录格式更符合模块语义，并为未来可能需要添加辅助文件（如子命令的额外支持文件）做好准备。

**评估的替代方案**：

| 方案 | 描述 | 被拒原因 |
|------|------|---------|
| A（选中） | 转换为 `commands/<name>/index.ts` | 符合架构模型，路径正确 |
| B | 保留平面文件，修改架构模型路径解析 | 违反"严格重构代码以匹配架构模型"策略 |
| C | 保留平面文件，添加手动路径映射 | 增加维护成本，架构模型与实际代码仍不一致 |

### 决策 3：从 server.ts 提取 /api/graph 到 server/dep/graph.ts

**决策**：从 `server.ts` 的 `setupRoutes()` 方法中提取 `POST /api/graph` 处理逻辑到专用文件 `server/dep/graph.ts`。

**理由**：架构模型定义 `server.dep.graph` 模块负责 `/api/graph` 路由。当前内联实现导致 `server.ts` 承担了三个不同关注点（前端托管、依赖图接口、架构接口），违反单一职责原则。提取后 `server.ts` 仅做模块编排。

**评估的替代方案**：

| 方案 | 描述 | 被拒原因 |
|------|------|---------|
| A（选中） | 提取到 `server/dep/graph.ts` | 符合架构模型，分离关注 |
| B | 保留在 `server.ts` | 违反架构模型定义，`server.ts` 职责过多 |
| C | 合并到 `server/dep/analyze.ts` | 两个路由虽都涉及"依赖"，但 `/api/graph` 更接近数据转换而非业务动作 |

### 决策 4：更新 .c4 文件而非修改路径解析算法

**决策**：更新 `frontend.c4` 和 `rust.c4` 以添加缺失的 `types` 和 `lib` 模块。

**理由**：`types.ts`（前端）和 `types.rs`（Rust）已被多个模块引用，但在架构模型中未建模。`lib.rs` 是 Rust crate 根入口，协调所有子模块的 WASM 导出点，同样未在模型中体现。这些是建模遗漏，应修复模型而非修改代码。

**评估的替代方案**：

| 方案 | 描述 | 被拒原因 |
|------|------|---------|
| A（选中） | 更新 `.c4` 文件，添加缺失模块 | 修复模型使其反映实际代码 |
| B | 不修改 `.c4` 文件 | 模型不完整，`archi-rules.json` 遗漏这些模块的规则 |
| C | 移除未建模的模块引用 | 破坏代码功能 |

### 决策 5：命名空间隔离

**决策**：`commands/analyze/index.ts` 仅处理 CLI 参数解析，核心逻辑委托给 `actions/analyze`。

**理由**：避免导出接口命名冲突。`commands/analyze` 和 `actions/analyze` 是不同的关注点——前者是 CLI 层，后者是业务逻辑层。通过明确的职责分离，保持 `commands/` 轻量且可替换（例如未来替换为其他 CLI 框架时只需重写 `commands/`）。

**评估的替代方案**：

| 方案 | 描述 | 被拒原因 |
|------|------|---------|
| A（选中） | `commands/` 仅做参数解析，`actions/` 承载业务逻辑 | 职责分离清晰，模块可替换 |
| B | `commands/` 同时包含参数解析和业务逻辑 | 违反分离关注原则，commands 与业务逻辑耦合过紧 |
| C | `actions/` 直接暴露为 CLI 入口，取消 commands 层 | 使得 CLI 框架特定的参数解析代码混入业务逻辑，不便替换框架 |

## 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| import 路径更新遗漏 | 中 | 高 | 使用 TypeScript 编译器验证（`pnpm build:ts`），逐步修改、逐步构建 |
| E2E 测试中硬编码路径 | 中 | 中 | 搜索测试文件中所有路径引用并更新 |
| 导出接口命名冲突 | 低 | 高 | `commands/` 模块只导出 CLI 处理函数，`actions/` 导出业务逻辑函数，名称明确 |
