# CLI 规范（变更增量）

## MODIFIED Requirements

### Requirement: 命令接口

系统 SHALL 提供三个命令：`analyze`、`dashboard` 和 `archi-to-rules`，均支持全局 `--cwd` 和 `--storage-dir` 选项。

**全局选项**

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `--cwd <path>` | `"."` | 工作区根目录 |
| `--storage-dir <path>` | `".dc-reporter"` | 存储根目录（相对路径基于 `--cwd` 解析，绝对路径直接使用） |

#### analyze 命令

```bash
dep-report analyze [options]
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `-p, --path <dir>` | `"."` | 分析的项目目录 |
| `-o, --output <path>` | `<storageDir>/scans/<dirname>-graph.json` | 输出 JSON 文件 |
| `-c, --config <path>` | 自动检测 | dependency-cruiser 配置文件 |
| `--cwd <path>` | `"."` | 工作区根目录 |
| `--storage-dir <path>` | `".dc-reporter"` | 存储根目录 |

##### Scenario: analyze 执行（默认存储目录）

- **WHEN** 用户执行 `dep-report analyze`
- **THEN** 系统分析当前工作目录（`"."`）
- **AND** 输出文件保存到 `<cwd>/.dc-reporter/scans/`

##### Scenario: analyze 执行（自定义相对存储目录）

- **WHEN** 用户执行 `dep-report analyze --path ./src --storage-dir .my-dir`
- **THEN** 输出文件默认保存到 `<cwd>/.my-dir/scans/src-graph.json`
- **AND** 若 `<cwd>/.my-dir/scans/` 不存在则自动创建

##### Scenario: analyze 执行（自定义绝对存储目录）

- **WHEN** 用户执行 `dep-report analyze --path ./src --storage-dir /abs/data`
- **THEN** 输出文件默认保存到 `/abs/data/scans/src-graph.json`
- **AND** 若 `/abs/data/scans/` 不存在则自动创建

##### Scenario: analyze 执行（storage-dir 结合 --cwd）

- **WHEN** 用户执行 `dep-report analyze --path ./src --cwd ./my-project --storage-dir .data`
- **THEN** 输出文件默认保存到 `./my-project/.data/scans/src-graph.json`
- **AND** 若 `./my-project/.data/scans/` 不存在则自动创建

#### dashboard 命令

```bash
dep-report dashboard [options]
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `-f, --file <path>` | `<storageDir>/scans/<cwd-basename>-graph.json` | 图 JSON 文件（原始 dc 或 ProcessedGraph） |
| `-p, --port <port>` | `3000` | 服务器端口 |
| `--host <host>` | `localhost` | 服务器主机 |
| `--cwd <path>` | `"."` | 工作区根目录 |
| `--storage-dir <path>` | `".dc-reporter"` | 存储根目录 |

##### Scenario: dashboard 执行（自定义存储目录自动发现）

- **WHEN** 用户执行 `dep-report dashboard --storage-dir .data`
- **AND** `<cwd>/.data/scans/<cwd-basename>-graph.json` 存在
- **THEN** 系统加载该文件，打印 "Using graph file: <path>"

##### Scenario: dashboard 执行（自定义存储目录，文件不存在）

- **WHEN** 用户执行 `dep-report dashboard --storage-dir /tmp/dcr`
- **AND** `/tmp/dcr/scans/<cwd-basename>-graph.json` 不存在
- **THEN** 服务器正常启动，不预加载图文件

##### Scenario: dashboard 执行（storage-dir 结合 --cwd）

- **WHEN** 用户执行 `dep-report dashboard --cwd ./my-project --storage-dir .data`
- **THEN** 系统启动 Express 服务器
- **AND** 服务器从 `./my-project/.data/` 读取 C4 文件和图文件

#### archi-to-rules 命令

```bash
dep-report archi-to-rules [options]
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `--cwd <path>` | `"."` | 工作区根目录，`.c4` 文件从此目录的 `<storageDir>/architecture/` 读取 |
| `--storage-dir <path>` | `".dc-reporter"` | 存储根目录 |
| `-o, --output <path>` | `<storageDir>/archi-rules.json` | 输出规则 JSON 文件路径 |

##### Scenario: archi-to-rules 执行（自定义存储目录）

- **WHEN** 用户执行 `dep-report archi-to-rules --storage-dir .arch`
- **THEN** 系统从 `<cwd>/.arch/architecture/` 读取所有 `.c4` 文件
- **AND** 输出规则写入 `<cwd>/.arch/archi-rules.json`
- **AND** `.dependency-cruiser.js` 被更新为 `extends` 指向 `<cwd>/.arch/archi-rules.json`

##### Scenario: archi-to-rules 执行（storage-dir 结合 --cwd）

- **WHEN** 用户执行 `dep-report archi-to-rules --cwd ./my-project --storage-dir .data`
- **THEN** 系统从 `./my-project/.data/architecture/` 读取 `.c4` 文件
- **AND** 输出规则写入 `./my-project/.data/archi-rules.json`
- **AND** `.dependency-cruiser.js` 在 `./my-project/` 目录下被更新

##### Scenario: archi-to-rules 执行（自定义 --output 覆盖 storage-dir）

- **WHEN** 用户执行 `dep-report archi-to-rules --storage-dir .data -o ./custom-rules.json`
- **THEN** 系统输出规则写入 `./custom-rules.json`（`--output` 优先级高于 `--storage-dir`）
- **AND** `.dependency-cruiser.js` 的 `extends` 指向 `./custom-rules.json`

##### Scenario: archi-to-rules 执行（架构目录不存在于自定义存储目录）

- **WHEN** 用户执行 `dep-report archi-to-rules --storage-dir .empty`
- **AND** `<cwd>/.empty/architecture/` 目录不存在或为空
- **THEN** 命令输出错误信息，exit code 为 1
- **AND** 没有规则文件被写入

### Requirement: HTTP API 端点

系统 SHALL 在 HTTP 端点中支持自定义 `storageDir`，确保 API 行为与 CLI 一致。

#### Scenario: /api/architecture/model 端点（自定义存储目录）

- **WHEN** 前端调用 `GET /api/architecture/model`
- **AND** server 使用自定义 `storageDir`
- **THEN** 服务器从 `<storageDir>/architecture/` 读取 `.c4` 文件
- **AND** 行为与默认 `.dc-reporter/architecture/` 场景一致

#### Scenario: /api/architecture/generate 端点（自定义存储目录）

- **WHEN** 前端调用 `POST /api/architecture/generate`
- **AND** server 使用自定义 `storageDir`
- **THEN** 服务器在 `<storageDir>/architecture/` 目录下创建 `main.c4` 模板文件

#### Scenario: /api/analyze 端点（自定义存储目录）

- **WHEN** 前端调用 `POST /api/analyze`
- **AND** server 使用自定义 `storageDir`
- **THEN** 服务器调用 `analyze({ path: '.', cwd, storageDir })`
- **AND** 扫描结果写入 `<storageDir>/scans/` 目录

### Requirement: 编程式 API

系统 SHALL 在 `createServer` 中支持 `storageDir` 选项：

```typescript
import { createServer } from '@dcr-reporter/cli';

const server = createServer({
  port: 3000,
  host: 'localhost',
  graphFile: 'graph.json',
  storageDir: '.data'  // 可选，默认 ".dc-reporter"
});
await server.start();
server.stop();
```

#### Scenario: createServer 编程式 API 使用 storageDir

- **WHEN** 用户以编程方式创建 server 并传入 `storageDir: '.my-storage'`
- **THEN** 服务器所有文件操作基于解析后的 `<cwd>/.my-storage/` 目录
- **AND** 不指定 `storageDir` 时默认使用 `.dc-reporter`

#### Scenario: createServer 不指定 storageDir

- **WHEN** 用户以编程方式创建 server 且不传入 `storageDir`
- **THEN** 服务器使用默认值 `".dc-reporter"`
- **AND** 行为与引入 `storageDir` 之前的版本完全相同

## ADDED Requirements

### Requirement: actions 接口变更

系统 SHALL 更新 `analyze` 和 `archiToRules` 的业务逻辑接口，增加可选的 `storageDir` 参数。

#### Scenario: AnalyzeOptions 新增 storageDir

- **WHEN** 调用 `analyze({ path, cwd, storageDir })`
- **THEN** 默认输出路径计算使用 `resolve(absCwd, storageDir, 'scans', ...)` 替换 `resolve(absCwd, '.dc-reporter', 'scans', ...)`
- **AND** `storageDir` 为可选参数，默认 `".dc-reporter"`

#### Scenario: ArchiToRulesOptions 新增 storageDir

- **WHEN** 调用 `archiToRules({ cwd, storageDir })`
- **THEN** 架构目录路径使用 `resolve(absCwd, storageDir, 'architecture')` 替换 `resolve(absCwd, '.dc-reporter', 'architecture')`
- **AND** 默认输出路径使用 `resolve(absCwd, storageDir, 'archi-rules.json')` 替换 `resolve(absCwd, '.dc-reporter', 'archi-rules.json')`
- **AND** `storageDir` 为可选参数，默认 `".dc-reporter"`

#### Scenario: ServerOptions 新增 storageDir

- **WHEN** 创建 `DcrServer` 实例时传入 `ServerOptions`
- **THEN** `ServerOptions` 接口包含可选字段 `storageDir?: string`
- **AND** `DcrServer` 构造函数将 `storageDir` 传递给 `setupArchitectureRoutes` 和 `setupAnalyzeDepRoute`
- **AND** 不指定时默认使用 `".dc-reporter"`

## Module Contract

### CLI Entry (`packages/cli/src/bin/cli.ts`)

| 函数/API | 变更 |
|----------|------|
| `program.option('--storage-dir <path>', ...)` | 新增全局选项，默认值 `".dc-reporter"` |
| `program.command('analyze').action()` | 读取 `program.opts().storageDir` 传递给 `analyze()` |
| `program.command('dashboard').action()` | 读取 `program.opts().storageDir` 传递给 `dashboard()` |
| `program.command('archi-to-rules').action()` | 读取 `program.opts().storageDir` 传递给 `archiToRules()` |

### Command layer (`packages/cli/src/commands/`)

| 文件 | 函数 | 变更 |
|------|------|------|
| `analyze/index.ts` | `analyze(options)` | `options` 新增 `storageDir?: string` |
| `dashboard/index.ts` | `dashboard(options)` | `options` 新增 `storageDir?: string`；默认文件发现路径从 `.dc-reporter` 替换为 `storageDir`；传递给 `analyze()` 和 `createServer()` |
| `archi-to-rules/index.ts` | `archiToRules(options)` | `options` 新增 `storageDir?: string` |

### Actions layer (`packages/cli/src/actions/`)

| 文件 | 类型/函数 | 变更 |
|------|-----------|------|
| `analyze.ts` | `AnalyzeOptions` | 新增 `storageDir?: string` |
| `analyze.ts` | `analyze()` | 默认输出路径从 `resolve(absCwd, '.dc-reporter', ...)` 改为 `resolve(absCwd, storageDir, ...)` |
| `archi-to-rules.ts` | `ArchiToRulesOptions` | 新增 `storageDir?: string` |
| `archi-to-rules.ts` | `loadC4Model()` | `archDir` 从 `join(resolve(cwd), '.dc-reporter', 'architecture')` 改为 `join(resolve(cwd), storageDir, 'architecture')` |
| `archi-to-rules.ts` | `archiToRules()` | 默认输出路径从 `resolve(absCwd, '.dc-reporter', 'archi-rules.json')` 改为 `resolve(absCwd, storageDir, 'archi-rules.json')` |

### Server layer (`packages/cli/src/server/`)

| 文件 | 类型/函数 | 变更 |
|------|-----------|------|
| `server.ts` | `ServerOptions` | 新增 `storageDir?: string` |
| `server.ts` | `DcrServer` | 构造函数将 `options.storageDir` 传递给 `setupArchitectureRoutes()` 和 `setupAnalyzeDepRoute()` |
| `architecture/architecture.ts` | `setupArchitectureRoutes(app, cwd, storageDir?)` | 新增 `storageDir` 参数；`archDir` 从 `.dc-reporter/architecture` 改为 `<storageDir>/architecture`（2 处） |
| `dep/analyze.ts` | `setupAnalyzeDepRoute(app, { cwd, storageDir? })` | 新增 `storageDir` 参数；传递给 `analyze()` |
