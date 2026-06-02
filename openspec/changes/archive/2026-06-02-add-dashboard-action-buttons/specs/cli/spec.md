## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: 命令接口

> **变更说明**: `analyze()` 和 `archiToRules()` 函数移除内部 `process.exit()` 调用，改为抛出异常。CLI 命令层（`packages/cli/src/bin/cli.ts`）负责捕获异常并调用 `process.exit(1)`。核心函数可被 CLI 和 HTTP 服务器复用。

#### Scenario: analyze 核心函数重构

- **WHEN** `analyze()` 执行中发生错误
- **THEN** 函数 SHALL 抛出异常（而非调用 `process.exit(1)`）
- **AND** CLI 命令层捕获异常后调用 `process.exit(1)`
- **AND** HTTP 端点捕获异常后返回 HTTP 500

#### Scenario: archiToRules 核心函数重构

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
| `/api/architecture/model` | GET | 返回 C4 模型 JSON |
| `/api/archi-to-rules` | POST | 从 C4 模型生成规则（新增） |
| `/assets/*` | GET | 静态资源 (JS, CSS) |
