# CLI 规范

## Purpose

定义 `dep-report` 命令行工具的命令接口、HTTP API 端点和 Node.js 回退机制。

## Requirements

### Requirement: 命令接口

系统 SHALL 提供两个命令：`analyze` 和 `open`。

#### analyze 命令

```bash
dep-report analyze --path <dir> [options]
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `-p, --path <dir>` | (必需) | 分析的项目目录 |
| `-o. --output <path>` | `<dirname>-graph.json` | 输出 JSON 文件 |
| `-c. --config <path>` | 自动检测 | dependency-cruiser 配置文件 |

##### Scenario: analyze 执行

- WHEN 用户执行 `dep-report analyze --path ./project`
- THEN 系统查找 `.dependency-cruiser.json` 或 `.dependency-cruiser.js`
- AND 检测 `tsconfig.json` 支持 TypeScript
- AND 调用 dependency-cruiser API `cruise()`
- AND 保存原始 JSON 输出（不执行聚合）

#### open 命令

```bash
dep-report open [options]
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `-f. --file <path>` | - | 图 JSON 文件（原始 dc 或 ProcessedGraph） |
| `-p. --port <port>` | `3000` | 服务器端口 |
| `--host <host>` | `localhost` | 服务器主机 |

##### Scenario: open 执行

- WHEN 用户执行 `dep-report open -f graph.json`
- THEN 系统启动 Express 服务器
- AND 检测文件格式（原始 dc 或 ProcessedGraph）
- AND 原始格式：按需调用 `convertWithFallback`
- AND ProcessedGraph 格式：直接使用

### Requirement: HTTP API 端点

系统 SHALL 提供以下 HTTP 端点：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/` | GET | 服务前端 index.html (SPA) |
| `/api/config` | GET | 返回 `{ hasGraphFile: boolean }` |
| `/api/graph` | POST | 返回图 JSON |
| `/assets/*` | GET | 静态资源 (JS, CSS) |

#### Scenario: /api/config 端点

- WHEN 前端调用 `GET /api/config`
- THEN 返回 `{ hasGraphFile: boolean }`
- AND `hasGraphFile` 指示是否预加载了图文件

#### Scenario: /api/graph 端点

- WHEN 前端调用 `POST /api/graph`
- AND body 可选包含 `{ expandedDirs: [...] }`
- THEN 服务器读取文件并检测格式
- IF 原始 dc 格式 THEN 调用 `convertWithFallback`
- IF ProcessedGraph 格式 THEN 直接使用
- AND 返回 `ProcessedGraph` JSON

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

CLI SHALL 按以下结构组织：

```
packages/cli/
├── scripts/
│   └── postbuild.js     # 构建后脚本
├── src/
│   ├── bin/
│   │   └── cli.ts       # CLI 入口（commander）
│   ├── commands/
│   │   ├── index.ts     # 命令导出
│   │   ├── analyze.ts   # analyze 命令
│   │   └── open.ts      # open 命令
│   ├── utils/
│   │   ├── convert.ts   # Node.js JSON 转换器
│   │   └── server.ts    # Express HTTP 服务器
│   └── index.ts         # 主导出
└── package.json
```

### Requirement: 典型工作流

#### Scenario: 标准工作流

```bash
# 1. 分析项目（运行 dependency-cruiser，保存原始输出）
dep-report analyze --path ./my-project

# 2. 打开结果（按需聚合）
dep-report open -f my-project-graph.json
```

#### Scenario: 外部 dependency-cruiser 输出

```bash
# 1. 用户自己运行 dependency-cruiser
npx dependency-cruiser --output-type json src/ > cruise.json

# 2. 查看结果（服务器自动检测格式）
dep-report open -f cruise.json
```

## References

- CLI 源码：`packages/cli/src/`
- 服务器实现：`packages/cli/src/utils/server.ts`
- 转换器：`packages/cli/src/utils/convert.ts`
