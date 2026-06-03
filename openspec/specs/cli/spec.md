# CLI 规范

## Purpose

定义 `dep-report` 命令行工具的命令接口、HTTP API 端点和 Node.js 回退机制。

## Requirements

### Requirement: 命令接口

系统 SHALL 提供三个命令：`analyze`、`dashboard` 和 `archi-to-rules`，均支持全局 `--cwd` 选项。

#### analyze 命令

```bash
dep-report analyze [options]
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `-p, --path <dir>` | `"."` | 分析的项目目录 |
| `-o, --output <path>` | `<cwd>/.dc-reporter/scans/<dirname>-graph.json` | 输出 JSON 文件 |
| `-c, --config <path>` | 自动检测 | dependency-cruiser 配置文件 |
| `--cwd <path>` | `"."` | 工作区根目录 |

##### Scenario: analyze 执行（不传 --path）

- **WHEN** 用户执行 `dep-report analyze`
- **THEN** 系统分析当前工作目录（`"."`）
- **AND** 输出文件保存到 `<cwd>/.dc-reporter/scans/`

##### Scenario: analyze 执行（带 --path）

- **WHEN** 用户执行 `dep-report analyze --path ./src`
- **THEN** 系统分析 `./src` 目录
- **AND** 输出文件保存到 `<cwd>/.dc-reporter/scans/src-graph.json`

##### Scenario: analyze 执行（带 --cwd）

- WHEN 用户执行 `dep-report analyze --path ./src --cwd ./my-project`
- THEN 输出文件默认保存到 `./my-project/.dc-reporter/scans/`
- AND 若 `.dc-reporter/scans/` 不存在则自动创建

#### dashboard 命令

```bash
dep-report dashboard [options]
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `-f, --file <path>` | `<cwd>/.dc-reporter/scans/<cwd-basename>-graph.json` | 图 JSON 文件（原始 dc 或 ProcessedGraph） |
| `-p, --port <port>` | `3000` | 服务器端口 |
| `--host <host>` | `localhost` | 服务器主机 |
| `--cwd <path>` | `"."` | 工作区根目录 |

##### Scenario: dashboard 执行（不传 --file，默认文件存在）

- **WHEN** 用户执行 `dep-report dashboard`
- **AND** `<cwd>/.dc-reporter/scans/<cwd-basename>-graph.json` 存在
- **THEN** 系统加载该文件，打印 "Using graph file: <path>"

##### Scenario: dashboard 执行（不传 --file，默认文件不存在）

- **WHEN** 用户执行 `dep-report dashboard`
- **AND** `<cwd>/.dc-reporter/scans/<cwd-basename>-graph.json` 不存在
- **THEN** 服务器正常启动，不预加载图文件

##### Scenario: dashboard 执行（带 --cwd）

- WHEN 用户执行 `dep-report dashboard --cwd ./my-project`
- THEN 系统启动 Express 服务器
- AND 服务器从 `./my-project/.dc-reporter/` 读取 C4 文件和图文件

#### archi-to-rules 命令

```bash
dep-report archi-to-rules [options]
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `--cwd <path>` | `"."` | 工作区根目录，`.c4` 文件从此目录的 `.dc-reporter/architecture/` 读取 |
| `-o, --output <path>` | `<cwd>/.dc-reporter/archi-rules.json` | 输出规则 JSON 文件路径 |

##### Scenario: archi-to-rules 执行（默认路径）

- **WHEN** 用户执行 `dep-report archi-to-rules`
- **THEN** 系统从 `<cwd>/.dc-reporter/architecture/` 读取所有 `.c4` 文件
- **AND** 输出规则写入 `<cwd>/.dc-reporter/archi-rules.json`
- **AND** `.dependency-cruiser.js` 被更新为 `extends: [".dc-reporter/archi-rules.json"]`

##### Scenario: archi-to-rules 执行（带 --cwd）

- **WHEN** 用户执行 `dep-report archi-to-rules --cwd ./my-project`
- **THEN** 系统从 `./my-project/.dc-reporter/architecture/` 读取 `.c4` 文件
- **AND** 输出规则写入 `./my-project/.dc-reporter/archi-rules.json`
- **AND** `.dependency-cruiser.js` 在 `./my-project/` 目录下被更新

##### Scenario: archi-to-rules 执行（带 --output）

- **WHEN** 用户执行 `dep-report archi-to-rules -o ./custom-rules.json`
- **THEN** 系统输出规则写入 `./custom-rules.json`
- **AND** `.dependency-cruiser.js` 的 `extends` 指向 `./custom-rules.json`

##### Scenario: archi-to-rules 执行（架构目录不存在）

- **WHEN** 用户执行 `dep-report archi-to-rules`
- **AND** `<cwd>/.dc-reporter/architecture/` 目录不存在或为空
- **THEN** 命令输出错误信息，exit code 为 1
- **AND** 没有规则文件被写入

##### Scenario: analyze 核心函数重构

- **WHEN** `analyze()` 执行中发生错误
- **THEN** 函数 SHALL 抛出异常（而非调用 `process.exit(1)`）
- **AND** CLI 命令层捕获异常后调用 `process.exit(1)`
- **AND** HTTP 端点捕获异常后返回 HTTP 500

##### Scenario: archiToRules 核心函数重构

- **WHEN** `archiToRules()` 执行中发生错误
- **THEN** 函数 SHALL 抛出异常（而非调用 `process.exit(1)`）
- **AND** CLI 命令层捕获异常后调用 `process.exit(1)`
- **AND** HTTP 端点捕获异常后返回 HTTP 500

### Requirement: HTTP API 端点

系统 SHALL 提供以下 HTTP 端点：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/` | GET | 服务前端 index.html (SPA) |
| `/api/graph` | POST | 返回图 JSON |
| `/api/analyze` | POST | 扫描当前工作目录（新增） |
| `/api/architecture/model` | GET | 读取并解析 `.dc-reporter/architecture/` 下所有 `.c4` 文件，返回合并后的 `$ModelData` JSON |
| `/api/archi-to-rules` | POST | 从 C4 模型生成规则（新增） |
| `/assets/*` | GET | 静态资源 (JS, CSS) |

#### Scenario: /api/architecture/model 端点

- WHEN 前端调用 `GET /api/architecture/model`
- THEN 服务器读取 `.dc-reporter/architecture/` 目录下所有 `.c4` 文件
- AND 调用 `fromSources(files)` 解析并合并为 `LikeC4` 实例
- AND 调用 `syncComputedModel()` 获取 `LikeC4Model.Computed`
- AND 返回 `model.$data` (纯 JSON 对象，包含 elements, relations, views, specification, globals)
- IF 目录不存在 THEN 返回 404
- IF 目录存在但无 `.c4` 文件 THEN 返回 404
- IF 解析失败 THEN 返回 422 并附带错误详情

#### Scenario: /api/graph 端点

- WHEN 前端调用 `POST /api/graph`
- AND body 可选包含 `{ expandedDirs: [...] }`
- THEN 服务器读取文件并检测格式
- IF 原始 dc 格式 THEN 调用 `convertWithFallback`
- IF ProcessedGraph 格式 THEN 直接使用
- AND 返回 `ProcessedGraph` JSON

### Requirement: Dashboard 操作 API 端点

系统 SHALL 新增以下 HTTP 端点以支持 Dashboard 操作按钮：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/analyze` | POST | 扫描当前工作目录，生成 dependency-cruiser 图文件 |
| `/api/archi-to-rules` | POST | 从 C4 模型生成 dependency-cruiser 规则文件 |

#### Scenario: /api/analyze 端点

- **WHEN** 前端调用 `POST /api/analyze`
- **THEN** 服务器调用 `analyze({ path: '.', cwd })`
- **AND** 扫描结果写入 `<cwd>/.dc-reporter/scans/` 目录
- **AND** 返回 `{ success: true, outputPath: string }` 及 HTTP 200
- **IF** 扫描失败 THEN 返回 `{ error: string }` 及 HTTP 500

#### Scenario: /api/archi-to-rules 端点

- **WHEN** 前端调用 `POST /api/archi-to-rules`
- **THEN** 服务器调用 `archiToRules({ cwd })`
- **AND** 规则文件写入 `<cwd>/.dc-reporter/archi-rules.json`
- **AND** 返回 `{ success: true, outputPath: string }` 及 HTTP 200
- **IF** 生成失败 THEN 返回 `{ error: string }` 及 HTTP 500

### Requirement: Node.js 转换器

系统 SHALL 提供 Node.js 回退转换器 `convertDcOutput`：

```typescript
export function convertDcOutput(dcJson: string): ProcessedGraph
```

#### Scenario: WASM 回退

- WHEN WASM 模块不可用或失败
- THEN 调用 `convertDcOutput`
- AND 解析 dependency-cruiser JSON
- AND 分类边类型
- AND 提取违规
- AND 返回 `ProcessedGraph`

#### Scenario: 边分类逻辑

| 条件 | 边类型 |
|------|--------|
| `dep.coreModule === true` | `core` |
| `dep.couldNotResolve === true` | `dynamic` |
| `dep.dependencyTypes` 包含 npm 类型 | `npm` |
| 否则 | `local` |

### Requirement: 编程式 API

系统 SHALL 导出编程式 Express 服务器：

```typescript
import { createServer } from '@dcr-reporter/cli';

const server = createServer({
  port: 3000,
  host: 'localhost',
  graphFile: 'graph.json'
});
await server.start();
server.stop();
```

### Requirement: 类型安全集成

系统 SHALL 从 WASM 模块导入类型：

```typescript
import type { ProcessedGraph, aggregate } from '@dcr-reporter/wasm';
```

类型由 Rust tsify 自动生成，确保 Rust 和 TypeScript 类型一致。

### Requirement: 混合聚合控制

系统 SHALL 通过 `expandedDirs` 控制混合聚合：

#### Scenario: 前端请求特定展开目录

- WHEN 前端 `POST /api/graph` body 包含 `{ expandedDirs: ["src/components", "src/utils"] }`
- THEN 服务器调用 WASM `aggregate` 传入展开目录
- AND 指定目录显示文件级节点
- AND 其他目录折叠

#### Scenario: 自动展开

- WHEN `expandedDirs` 未提供
- THEN WASM 调用 `compute_auto_expanded_dirs` 预算算法
- AND 目标 ~200 节点

### Requirement: 项目结构

CLI SHALL 按以下结构组织，对齐 C4 架构模型定义：

```
packages/cli/
├── scripts/
│   └── postbuild.js     # 构建后脚本
├── src/
│   ├── bin/
│   │   └── cli.ts       # CLI 入口（commander，含 --cwd 全局选项）
│   ├── commands/
│   │   ├── index.ts     # 命令导出
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
│   │   ├── server.ts    # Express HTTP 服务器（简化编排入口）
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
│   └── index.ts         # 主导出
└── package.json
```

#### Scenario: actions/ 为顶层目录且不包含在 server/ 下

- **WHEN** 查看 `packages/cli/src/` 目录结构
- **THEN** `actions/` 目录存在作为 `commands/` 和 `server/` 的同级目录
- **AND** `server/actions/` 目录不存在

#### Scenario: commands 为目录化模块

- **WHEN** 查看 `packages/cli/src/commands/` 目录
- **THEN** `analyze.ts`、`archi-to-rules.ts`、`dashboard.ts` 三个平面文件不存在
- **AND** 替换为 `analyze/index.ts`、`archi-to-rules/index.ts`、`dashboard/index.ts` 目录模块

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

#### Scenario: server/dep/graph.ts 处理 POST /api/graph

- **WHEN** 前端调用 `POST /api/graph`
- **THEN** 路由由 `server/dep/graph.ts` 处理
- **AND** 处理函数从 `utils/convert` 导入 `convert` 执行数据转换

#### Scenario: server/dashboard/index.ts 处理前端静态托管

- **WHEN** Express 服务器启动
- **THEN** `server/dashboard/index.ts` 处理 `express.static(frontendDist)` 和 SPA fallback
- **AND** 自动检测开发模式前端路径和生产构建路径

#### Scenario: server.ts 编排路由模块

- **WHEN** `setupRoutes()` 被调用
- **THEN** 服务器调用各子模块的 setup 函数
- **AND** `server.ts` 不包含 HTTP 处理函数逻辑

### Requirement: 业务逻辑抽取

系统 SHALL 将 `analyze` 和 `archi-to-rules` 业务逻辑从命令层抽取至 `actions/` 模块，使 `commands/` 和 `server/` 均可导入。

#### Scenario: commands 转发至 actions

- **WHEN** 用户通过 CLI 执行 `dep-report analyze`
- **THEN** `commands/analyze/index.ts` 解析 CLI 参数
- **AND** 调用 `actions/analyze.ts` 导出函数执行业务逻辑

#### Scenario: server 转发至 actions

- **WHEN** 用户通过 Web UI 触发分析
- **THEN** `server/dep/analyze.ts` 接收 HTTP 请求
- **AND** 调用 `actions/analyze.ts` 导出函数（与 CLI 命令共用同一函数）

### Requirement: 典型工作流

#### Scenario: 标准工作流

```bash
# 1. 分析项目（运行 dependency-cruiser，保存原始输出）
dep-report analyze --path ./my-project

# 2. 打开结果（按需聚合）
dep-report dashboard -f my-project-graph.json
```

#### Scenario: 外部 dependency-cruiser 输出

```bash
# 1. 用户自己运行 dependency-cruiser
npx dependency-cruiser --output-type json src/ > cruise.json

# 2. 查看结果（服务器自动检测格式）
dep-report dashboard -f cruise.json
```

## References

- CLI 源码：`packages/cli/src/`
- 服务器实现：`packages/cli/src/utils/server.ts`
- 转换器：`packages/cli/src/utils/convert.ts`
