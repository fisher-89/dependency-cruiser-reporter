# CLI 规范 — 代码结构对齐

## Purpose

定义 CLI 包在代码重构后的项目结构和模块职责，对齐至 C4 架构模型。

## MODIFIED Requirements

### Requirement: 项目结构

CLI SHALL 按以下结构组织，对齐 C4 架构模型定义：

```
packages/cli/
├── bin/
│   └── cli.ts              # CLI 入口（不变）
├── src/
│   ├── bin/
│   │   └── cli.ts           # CLI 入口（commander，含 --cwd 全局选项）
│   ├── commands/
│   │   ├── index.ts          # 命令导出
│   │   ├── analyze/
│   │   │   └── index.ts     # analyze 命令（CLI 参数解析，转发至 actions/analyze）
│   │   ├── archi-to-rules/
│   │   │   └── index.ts     # archi-to-rules 命令（CLI 参数解析，转发至 actions/archi-to-rules）
│   │   └── dashboard/
│   │       └── index.ts     # dashboard 命令（CLI 参数解析，启动服务器）
│   ├── actions/
│   │   ├── index.ts          # actions 导出
│   │   ├── analyze.ts       # analyze 业务逻辑（使用 dependency-cruiser API 扫描）
│   │   └── archi-to-rules.ts # archi-to-rules 业务逻辑（从 C4 生成规则）
│   ├── server/
│   │   ├── server.ts        # Express HTTP 服务器（简化编排入口）
│   │   ├── dashboard/
│   │   │   └── index.ts     # 前端静态托管 + SPA fallback
│   │   ├── dep/
│   │   │   ├── index.ts     # dep 模块导出
│   │   │   ├── analyze.ts   # POST /api/analyze 路由处理
│   │   │   └── graph.ts     # POST /api/graph 路由处理
│   │   └── architecture/
│   │       └── architecture.ts  # C4 模型路由（GET /api/architecture/model）
│   ├── utils/
│   │   └── convert.ts       # Node.js 回退转换器
│   └── index.ts             # 主导出
├── scripts/
│   └── postbuild.js
└── package.json
```

#### Scenario: actions/ 为顶层目录且不包含在 server/ 下

- **WHEN** 查看 `packages/cli/src/` 目录结构
- **THEN** `actions/` 目录存在作为 `commands/` 和 `server/` 的同级目录
- **AND** `server/actions/` 目录不存在
- **AND** `actions/` 包含 `analyze.ts` 和 `archi-to-rules.ts` 两个业务逻辑模块

#### Scenario: commands 为目录化模块

- **WHEN** 查看 `packages/cli/src/commands/` 目录
- **THEN** `analyze.ts`、`archi-to-rules.ts`、`dashboard.ts` 三个平面文件不存在
- **AND** 替换为 `analyze/index.ts`、`archi-to-rules/index.ts`、`dashboard/index.ts` 目录模块
- **AND** 每个目录中的 `index.ts` 导出对应命令函数，从 `actions/` 导入业务逻辑

#### Scenario: server.ts 不包含内联路由逻辑

- **WHEN** 查看 `packages/cli/src/server/server.ts`
- **THEN** 文件中不包含 `/api/graph` 路由的内联代码
- **AND** 文件中不包含 `/api/analyze` 路由的内联代码
- **AND** 文件中不包含前端静态托管和 SPA fallback 的内联代码
- **AND** 服务器通过导入 `dashboard/`、`dep/`、`architecture/` 模块编排路由

### Requirement: 服务器路由分解

系统 SHALL 将 Express 服务器路由逻辑从 `server.ts` 分解至专用模块。

#### Scenario: server/dep/analyze.ts 处理 POST /api/analyze

- **WHEN** 前端调用 `POST /api/analyze`
- **THEN** 路由由 `server/dep/analyze.ts` 处理
- **AND** 处理函数从 `actions/analyze` 导入 `analyze` 执行业务逻辑
- **AND** 返回 `{ output: string }`（成功）或 `{ error: string }`（失败）
- **AND** 行为与之前内联在 `actions/actions.ts` 中的实现一致

#### Scenario: server/dep/graph.ts 处理 POST /api/graph

- **WHEN** 前端调用 `POST /api/graph`
- **THEN** 路由由 `server/dep/graph.ts` 处理
- **AND** 处理函数从 `utils/convert` 导入 `convert` 执行数据转换
- **AND** 返回 `ProcessedGraph` JSON（成功）或 `{ error: string }`（失败）
- **AND** 行为与之前内联在 `server.ts` 中的实现一致

#### Scenario: server/dashboard/index.ts 处理前端静态托管

- **WHEN** Express 服务器启动
- **THEN** `server/dashboard/index.ts` 处理 `express.static(frontendDist)` 和 SPA fallback
- **AND** 自动检测开发模式前端路径和生产构建路径
- **AND** SPA fallback 返回 `index.html` 或 404 提示

#### Scenario: server.ts 编排路由模块

- **WHEN** `setupRoutes()` 被调用
- **THEN** 服务器调用 `setupDashboardRoutes(app, { frontendDist })`
- **AND** 调用 `setupDepRoutes(app, { cwd, graphFile, maxNodes })`
- **AND** 调用 `setupArchitectureRoutes(app, { cwd })`
- **AND** `server.ts` 不包含 HTTP 处理函数逻辑

### Requirement: 业务逻辑抽取

系统 SHALL 将 `analyze` 和 `archi-to-rules` 业务逻辑从命令层抽取至 `actions/` 模块，使 `commands/` 和 `server/` 均可导入。

#### Scenario: commands 转发至 actions

- **WHEN** 用户通过 CLI 执行 `dep-report analyze`
- **THEN** `commands/analyze/index.ts` 解析 CLI 参数
- **AND** 调用 `actions/analyze.ts` 导出函数执行业务逻辑
- **AND** `commands/analyze/index.ts` 不包含 dependency-cruiser API 调用逻辑

#### Scenario: server 转发至 actions

- **WHEN** 用户通过 Web UI 点击 "Scan" 按钮
- **THEN** `server/dep/analyze.ts` 接收 HTTP 请求
- **AND** 调用 `actions/analyze.ts` 导出函数（与 CLI 命令共用同一函数）
- **AND** 结果通过 HTTP 响应返回

#### Scenario: commands/archi-to-rules 转发至 actions

- **WHEN** 用户通过 CLI 执行 `dep-report archi-to-rules`
- **THEN** `commands/archi-to-rules/index.ts` 解析 CLI 参数
- **AND** 调用 `actions/archi-to-rules.ts` 导出函数执行业务逻辑
- **AND** 行为与重构前一致

## Module Contract

| Module | Function/Component | Change |
|--------|-------------------|--------|
| `packages/cli/src/commands/analyze/index.ts` | `analyze` | 新建目录模块，从平面文件迁移；导入 actions/analyze |
| `packages/cli/src/commands/archi-to-rules/index.ts` | `archiToRules` | 新建目录模块，从平面文件迁移；导入 actions/archi-to-rules |
| `packages/cli/src/commands/dashboard/index.ts` | `dashboard` | 新建目录模块，从平面文件迁移 |
| `packages/cli/src/actions/analyze.ts` | `analyze` | 新建文件，从 commands/analyze.ts 抽取业务逻辑 |
| `packages/cli/src/actions/archi-to-rules.ts` | `archiToRules` | 新建文件，从 commands/archi-to-rules.ts 抽取业务逻辑 |
| `packages/cli/src/actions/index.ts` | 导出 | 新建文件 |
| `packages/cli/src/server/dep/analyze.ts` | `setupDepAnalyzeRoute` | 新建文件，从 server/actions/actions.ts 迁移 (POST /api/analyze) |
| `packages/cli/src/server/dep/graph.ts` | `setupDepGraphRoute` | 新建文件，从 server.ts 迁移 (POST /api/graph) |
| `packages/cli/src/server/dep/index.ts` | 导出 | 新建文件 |
| `packages/cli/src/server/dashboard/index.ts` | `setupDashboardRoutes` | 新建文件，从 server.ts 迁移静态托管 + SPA fallback |
| `packages/cli/src/server/server.ts` | `DcrServer` | 修改：删除内联路由逻辑，改为调用子模块 setup 函数 |
| `packages/cli/src/server/actions/actions.ts` | — | 删除文件，逻辑迁移至 server/dep/analyze.ts |
| `packages/cli/src/commands/analyze.ts` | — | 删除平面文件 |
| `packages/cli/src/commands/archi-to-rules.ts` | — | 删除平面文件 |
| `packages/cli/src/commands/dashboard.ts` | — | 删除平面文件 |
| `packages/cli/src/commands/index.ts` | 导出 | 修改：导入路径更新 |
| `packages/cli/src/bin/cli.ts` | CLI 入口 | 修改：导入路径更新 |
