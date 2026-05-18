## MODIFIED Requirements

### Requirement: 命令接口

系统 SHALL 提供两个命令：`analyze` 和 `open`，均支持全局 `--cwd` 选项。

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

- **WHEN** 用户执行 `dep-report analyze --path ./src --cwd ./my-project`
- **THEN** 输出文件默认保存到 `./my-project/.dc-reporter/scans/`
- **AND** 若 `.dc-reporter/scans/` 不存在则自动创建

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

- **WHEN** 用户执行 `dep-report open --cwd ./my-project`
- **THEN** 系统启动 Express 服务器
- **AND** 服务器从 `./my-project/.dc-reporter/` 读取 C4 文件和图文件
- **AND** `/api/config` 返回该工作区的配置
