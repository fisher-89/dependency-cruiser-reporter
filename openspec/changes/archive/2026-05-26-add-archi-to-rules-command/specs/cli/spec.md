## MODIFIED Requirements

### Requirement: 命令接口

系统 SHALL 提供三个命令：`analyze`、`open` 和 `archi-to-rules`，均支持全局 `--cwd` 选项。

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

#### open 命令

```bash
dep-report open [options]
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `-f, --file <path>` | `<cwd>/.dc-reporter/scans/<cwd-basename>-graph.json` | 图 JSON 文件（原始 dc 或 ProcessedGraph） |
| `-p, --port <port>` | `3000` | 服务器端口 |
| `--host <host>` | `localhost` | 服务器主机 |
| `--cwd <path>` | `"."` | 工作区根目录 |

##### Scenario: open 执行（不传 --file，默认文件存在）

- **WHEN** 用户执行 `dep-report open`
- **AND** `<cwd>/.dc-reporter/scans/<cwd-basename>-graph.json` 存在
- **THEN** 系统加载该文件，打印 "Using graph file: <path>"

##### Scenario: open 执行（不传 --file，默认文件不存在）

- **WHEN** 用户执行 `dep-report open`
- **AND** `<cwd>/.dc-reporter/scans/<cwd-basename>-graph.json` 不存在
- **THEN** 服务器正常启动，不预加载图文件

##### Scenario: open 执行（带 --cwd）

- WHEN 用户执行 `dep-report open --cwd ./my-project`
- THEN 系统启动 Express 服务器
- AND 服务器从 `./my-project/.dc-reporter/` 读取 C4 文件和图文件
- AND `/api/config` 返回该工作区的配置

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
│   │   ├── archi-to-rules.ts  # archi-to-rules 命令
│   │   └── open.ts      # open 命令
│   ├── server/
│   │   ├── server.ts    # Express HTTP 服务器
│   │   └── architecture/
│   │       └── architecture.ts  # C4 模型路由
│   └── index.ts         # 主导出
└── package.json
```
