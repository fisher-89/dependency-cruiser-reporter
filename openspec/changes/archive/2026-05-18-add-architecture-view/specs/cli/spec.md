## MODIFIED Requirements

### Requirement: 命令接口

系统 SHALL 提供两个命令：`analyze` 和 `open`，均支持全局 `--cwd` 选项。

#### analyze 命令

```bash
dep-report analyze --path <dir> [options]
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `-p, --path <dir>` | (必需) | 分析的项目目录 |
| `-o, --output <path>` | `<cwd>/.dc-reporter/scans/<dirname>-graph.json` | 输出 JSON 文件 |
| `-c, --config <path>` | 自动检测 | dependency-cruiser 配置文件 |
| `--cwd <path>` | `.` | 工作区根目录 |

##### Scenario: analyze 执行（带 --cwd）

- WHEN 用户执行 `dep-report analyze --path ./src --cwd ./my-project`
- THEN 输出文件默认保存到 `./my-project/.dc-reporter/scans/`
- AND 若 `.dc-reporter/scans/` 不存在则自动创建

#### open 命令

```bash
dep-report open [options]
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `-f, --file <path>` | - | 图 JSON 文件（原始 dc 或 ProcessedGraph） |
| `-p, --port <port>` | `3000` | 服务器端口 |
| `--host <host>` | `localhost` | 服务器主机 |
| `--cwd <path>` | `.` | 工作区根目录 |

##### Scenario: open 执行（带 --cwd）

- WHEN 用户执行 `dep-report open --cwd ./my-project`
- THEN 系统启动 Express 服务器
- AND 服务器从 `./my-project/.dc-reporter/` 读取 C4 文件和图文件
- AND `/api/config` 返回该工作区的配置

### Requirement: HTTP API 端点

系统 SHALL 提供以下 HTTP 端点：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/` | GET | 服务前端 index.html (SPA) |
| `/api/config` | GET | 返回 `{ cwd, hasArchitectureDir, hasGraphFile }` |
| `/api/graph` | POST | 返回图 JSON |
| `/api/architecture/model` | GET | 读取并解析 `.dc-reporter/architecture/` 下所有 `.c4` 文件，返回合并后的 `$ModelData` JSON |
| `/assets/*` | GET | 静态资源 (JS, CSS) |

#### Scenario: /api/config 端点（更新）

- WHEN 前端调用 `GET /api/config`
- THEN 返回 `{ cwd: string, hasArchitectureDir: boolean, hasGraphFile: boolean }`
- AND `cwd` 为服务器启动时指定的工作区路径
- AND `hasArchitectureDir` 为 true 当 `.dc-reporter/architecture/` 目录存在时
- AND `hasGraphFile` 指示是否预加载了图文件（已有行为）

#### Scenario: /api/architecture/model 端点

- WHEN 前端调用 `GET /api/architecture/model`
- THEN 服务器读取 `.dc-reporter/architecture/` 目录下所有 `.c4` 文件
- AND 调用 `fromSources(files)` 解析并合并为 `LikeC4` 实例
- AND 调用 `syncComputedModel()` 获取 `LikeC4Model.Computed`
- AND 返回 `model.$data` (纯 JSON 对象，包含 elements, relations, views, specification, globals)
- IF 目录不存在 THEN 返回 404
- IF 目录存在但无 `.c4` 文件 THEN 返回 404
- IF 解析失败 THEN 返回 422 并附带错误详情

### Requirement: 项目结构

CLI SHALL 按以下结构组织：

```
packages/cli/
├── scripts/
│   └── postbuild.js     # 构建后脚本
├── src/
│   ├── bin/
│   │   └── cli.ts       # CLI 入口（commander，含 --cwd 全局选项）
│   ├── commands/
│   │   ├── index.ts     # 命令导出
│   │   ├── analyze.ts   # analyze 命令
│   │   └── open.ts      # open 命令
│   ├── utils/
│   │   ├── convert.ts   # Node.js JSON 转换器
│   │   └── server.ts    # Express HTTP 服务器（含架构文件端点）
│   └── index.ts         # 主导出
└── package.json
```
