# 可配置存储目录 (configurable-storage-dir) — 设计文档

## 架构组件

### 组件总览

```
[CLI 参数 --storage-dir]          [createServer options.storageDir]
         │                                       │
         ▼                                       ▼
┌─────────────────────────────────────────────────────────┐
│             parseStorageDir(storageDir, absCwd)          │
│                                                         │
│  相对路径 → resolve(absCwd, storageDir)                  │
│  绝对路径 → storageDir 直接使用                           │
│  默认值   → '.dc-reporter'                                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │    absStorageDir     │
            └──────┬──────┬───────┘
                   │      │
         ┌─────────▼──┐ ┌─▼──────────────┐
         │ actions/   │ │ actions/        │
         │ analyze.ts │ │ archi-to-rules  │
         │ 构建 scans/ │ │ .ts 构建        │
         │ 路径       │ │ architecture/   │
         │            │ │ 和规则文件路径   │
         └────────────┘ └────────────────┘
                   │
         ┌─────────▼─────────┐
         │  server/ 相关模块  │
         │  dashboard/index  │
         │  architecture/    │
         │  dep/analyze      │
         └───────────────────┘
```

### 组件详细说明

| 组件 | 文件路径 | 职责 | 依赖 | 技术 |
|------|----------|------|------|------|
| **路径解析工具** | `packages/cli/src/utils/storage.ts` (新增) | 导出 `parseStorageDir(storageDir, absCwd)` 函数，集中处理相对/绝对路径解析以及默认值回退 | `node:path` | Node.js path |
| **CLI 选项层** | `packages/cli/src/bin/cli.ts` | 定义全局 `--storage-dir <path>` Commander 选项（默认值 `.dc-reporter`），解析后注入每个命令 action | Commander | Commander.js |
| **Analyze 命令转发** | `packages/cli/src/commands/analyze/index.ts` | `analyze()` 接口新增 `storageDir` 参数，透传至 action | — | TypeScript |
| **Dashboard 命令转发** | `packages/cli/src/commands/dashboard/index.ts` | `DashboardOptions` 新增 `storageDir`；默认文件发现路径从 `.dc-reporter` 替换为 `storageDir`；透传至 `createServer` | `parseStorageDir` | TypeScript |
| **Archi-to-rules 命令转发** | `packages/cli/src/commands/archi-to-rules/index.ts` | `archiToRules()` 接口新增 `storageDir` 参数，透传至 action | — | TypeScript |
| **Analyze action** | `packages/cli/src/actions/analyze.ts` | `AnalyzeOptions` 新增 `storageDir`；默认输出路径从 `resolve(absCwd, '.dc-reporter', ...)` 替换为 `resolve(absCwd, storageDir, 'scans', ...)` | `parseStorageDir`, `node:fs`, dependency-cruiser | TypeScript |
| **Archi-to-rules action** | `packages/cli/src/actions/archi-to-rules.ts` | `ArchiToRulesOptions` 新增 `storageDir`；`loadC4Model` 新增 `storageDir` 参数；架构目录和规则输出路径替换 | `parseStorageDir`, `@likec4/core`, `@likec4/language-services` | TypeScript |
| **Express Server** | `packages/cli/src/server/server.ts` | `ServerOptions` 新增 `storageDir` 字段；透传至 `setupArchitectureRoutes` 和 `setupAnalyzeDepRoute` | — | Express |
| **架构路由** | `packages/cli/src/server/architecture/architecture.ts` | `setupArchitectureRoutes` 新增 `storageDir` 参数；`archDir` 构建替换两处硬编码路径 | `parseStorageDir` | Express |
| **分析路由** | `packages/cli/src/server/dep/analyze.ts` | `setupAnalyzeDepRoute` 新增 `storageDir` 参数；透传给 `analyze()` action | `analyze` action | Express |

### 不变模块（不修改）

| 文件 | 原因 |
|------|------|
| `packages/rust/` (Rust 后端) | 存储路径在 CLI/Server 层构造，Rust 仅接收已解析的路径 |
| `packages/cli/src/server/dep/graph.ts` | 不构造存储路径，仅读取已传入的 `graphFile` 路径 |
| `packages/frontend/` (前端) | i18n 中的 `.dc-reporter` 引用是用户可见提示文字，留待后续独立更新 |
| `packages/e2e/` | E2E 测试框架配置无需修改 |

---

## 数据流

### parseStorageDir 函数设计

```typescript
// packages/cli/src/utils/storage.ts
import { isAbsolute, resolve } from 'node:path';

/**
 * 解析存储目录路径。
 * - 绝对路径：直接使用，不拼接 --cwd
 * - 相对路径：基于 absCwd 解析
 */
export function parseStorageDir(storageDir: string, absCwd: string): string {
  if (isAbsolute(storageDir)) {
    return storageDir;
  }
  return resolve(absCwd, storageDir);
}
```

### CLI 命令数据流

```
用户输入
  dep-report analyze --storage-dir .my-dir --cwd /project --path src
                        │
                        ▼
  cli.ts:
    const storageDir = program.opts().storageDir || '.dc-reporter';
    analyze({ storageDir: '.my-dir', cwd: '/project', path: 'src' })
                        │
                        ▼
  commands/analyze/index.ts:
    analyze({ storageDir: '.my-dir', cwd: '/project', path: 'src', ... })
                        │
                        ▼
  actions/analyze.ts:
    absCwd = resolve('/project')                           → '/project'
    absStorageDir = parseStorageDir('.my-dir', '/project') → '/project/.my-dir'
    outputPath = resolve('/project/.my-dir', 'scans', 'src-graph.json')
```

### 绝对路径数据流

```
用户输入
  dep-report analyze --storage-dir /tmp/dcr-data  --cwd /project
                        │
                        ▼
  actions/analyze.ts:
    absStorageDir = parseStorageDir('/tmp/dcr-data', '/project') → '/tmp/dcr-data'
    outputPath = resolve('/tmp/dcr-data', 'scans', 'src-graph.json')
```

### 默认值数据流（向后兼容）

```
用户输入
  dep-report analyze  (不带 --storage-dir)
                        │
                        ▼
  cli.ts:
    program.option('--storage-dir <path>', '...', '.dc-reporter')
    // Commander 默认值 '.dc-reporter'
    analyze({ storageDir: '.dc-reporter', cwd: '.', ... })
                        │
                        ▼
  actions/analyze.ts:
    storageDir = options.storageDir || '.dc-reporter'   → '.dc-reporter'
    absStorageDir = parseStorageDir('.dc-reporter', absCwd) → '<cwd>/.dc-reporter'
    outputPath = resolve('<cwd>/.dc-reporter', 'scans', 'src-graph.json')
```

### Dashboard 默认文件发现数据流

```
dep-report dashboard (不带 --file 和 --storage-dir)
                        │
                        ▼
  commands/dashboard/index.ts:
    absCwd = resolve('.')
    storageDir = options.storageDir || '.dc-reporter'       → '.dc-reporter'
    absStorageDir = parseStorageDir('.dc-reporter', absCwd) → '<cwd>/.dc-reporter'
    defaultFile = resolve(absStorageDir, 'scans', '<basename>-graph.json')

dep-report dashboard --storage-dir /tmp/data
                        │
                        ▼
    absStorageDir = parseStorageDir('/tmp/data', absCwd)    → '/tmp/data'
    defaultFile = resolve('/tmp/data', 'scans', '<basename>-graph.json')
```

### HTTP API 数据流

```
客户端 POST /api/analyze
                        │
                        ▼
  server/dep/analyze.ts:
    analyze({ path: '.', cwd: this.cwd, storageDir: this.storageDir })
                        │
                        ▼
  actions/analyze.ts:  (同上，使用 storageDir 构建输出路径)
```

### 存储目录布局（不变）

```
<absStorageDir>/
├── scans/                      # dependency-cruiser 扫描输出（analyze 写入）
│   └── <dirname>-graph.json
├── architecture/               # C4 架构模型 .c4 文件（用户创建或 API 生成）
│   ├── main.c4
│   └── ...
└── archi-rules.json            # 从 C4 模型生成的 dependency-cruiser 规则
```

---

## 接口设计

### CLI 全局选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `--storage-dir <path>` | string | `.dc-reporter` | 存储根目录路径；相对路径基于 `--cwd` 解析，绝对路径直接使用 |

所有三个命令自动继承该全局选项：

```
dep-report analyze --storage-dir .my-dir --cwd packages/core
dep-report dashboard --storage-dir /tmp/dcr-data
dep-report archi-to-rules --storage-dir .data
```

### TypeScript 接口变更

#### AnalyzeOptions（actions/analyze.ts）

| 字段 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `path` | `string` | — | 待分析的项目目录 |
| `output?` | `string` | — | 输出文件路径（覆盖 storageDir 构建的默认路径） |
| `config?` | `string` | — | dependency-cruiser 配置文件 |
| `cwd?` | `string` | `'.'` | 工作区根目录 |
| `storageDir?` | `string` | `'.dc-reporter'` | 存储根目录 |

#### ArchiToRulesOptions（actions/archi-to-rules.ts）

| 字段 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `cwd?` | `string` | `'.'` | 工作区根目录 |
| `output?` | `string` | — | 输出规则文件路径 |
| `storageDir?` | `string` | `'.dc-reporter'` | 存储根目录 |

#### DashboardOptions（commands/dashboard/index.ts）

| 字段 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `file?` | `string` | — | 预处理的 graph JSON 文件 |
| `port?` | `number` | `3000` | 服务器端口 |
| `host?` | `string` | `'localhost'` | 服务器主机 |
| `maxNodes?` | `number` | `500` | 自动聚合前最大节点数 |
| `cwd?` | `string` | `'.'` | 工作区根目录 |
| `storageDir?` | `string` | `'.dc-reporter'` | 存储根目录 |

#### ServerOptions（server/server.ts）

| 字段 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `port` | `number` | — | 服务器端口 |
| `host` | `string` | — | 服务器主机 |
| `graphFile?` | `string` | — | graph JSON 文件路径 |
| `maxNodes?` | `number` | `200` | 自动聚合前最大节点数 |
| `cwd?` | `string` | `'.'` | 工作区根目录 |
| `storageDir?` | `string` | `'.dc-reporter'` | 存储根目录 |

### HTTP API 端点（签名不变）

`storageDir` 通过 `DcrServer` 构造函数注入路由，所有 HTTP API 端点签名不变：

| 方法 | 路径 | 说明 | 内部路径变化 |
|------|------|------|-------------|
| `GET` | `/api/architecture/model` | 获取 C4 架构模型 | `archDir` 基于 `storageDir` 构建 |
| `POST` | `/api/architecture/generate` | 生成初始 C4 模型文件 | `archDir` 基于 `storageDir` 构建 |
| `POST` | `/api/archi-to-rules` | 从 C4 模型生成规则 | 调用 `archiToRules({ cwd, storageDir })` |
| `POST` | `/api/analyze` | 运行依赖分析 | 调用 `analyze({ path: '.', cwd, storageDir })` |
| `POST` | `/api/graph` | 获取 graph 数据 | 不变（不涉及存储目录路径构造） |

### 编程式 API

```typescript
// 方式一：通过 createServer 传入
import { createServer } from '@dcr-reporter/cli';

const server = createServer({
  port: 3000,
  host: 'localhost',
  storageDir: '.data',      // 自定义存储目录
  cwd: '/projects/my-app',
});
await server.start();

// 方式二：直接调用 action
import { analyze } from '@dcr-reporter/cli/actions/analyze';
await analyze({
  path: '.',
  storageDir: '.custom-dir',
  cwd: '/projects/my-app',
});
```

---

## 关键决策

### 决策一：仅 CLI 参数，不引入配置文件或环境变量

**决策**：通过 `--storage-dir <path>` CLI 全局选项和 `createServer` 编程式 API 的 `storageDir` 参数暴露配置。不创建独立配置文件，不读取环境变量。

**备选方案 A：独立配置文件**

在 `.dc-reporter/config.json` 或 `dep-report.config.js` 中配置 `storageDir`。

**被拒原因**：引入配置文件需要额外的文件发现逻辑（搜索常见路径、处理不存在的情况），且和 `--cwd` 全局选项产生复杂的优先级和合并规则。配置文件更适合"一次性设置"的场景，而 `--storage-dir` 是频繁变更的执行参数（不同项目、不同 CI 阶段使用不同目录），CLI 参数更直接。

**备选方案 B：环境变量**

通过 `DC_REPORTER_STORAGE_DIR` 环境变量配置。

**被拒原因**：环境变量是隐式行为——用户难以感知当前生效值，在多人协作和 CI 场景下可能导致难以调试的"为什么用了这个路径"问题。CLI 参数是显式声明，`--help` 即可查看当前支持的选项，符合 "explicit over implicit" 原则。

### 决策二：相对路径基于 `--cwd` 解析

**决策**：相对路径基于 `--cwd` 选项（工作区根目录）解析，而非进程的 `process.cwd()`。

**备选方案：基于 `process.cwd()` 解析**

用户传入相对路径时，基于 Node.js 进程当前工作目录解析。

**被拒原因**：与 `--cwd` 的语义不一致。`--cwd` 明确表达"工作区根目录"，所有其他路径（`--path`、`--output`）均基于它解析。若 `--storage-dir` 的解析基座不同，则当用户在 monorepo 根目录执行 `dep-report analyze --cwd packages/core --storage-dir .data` 时，`--path` 基于 `packages/core` 而 `--storage-dir` 基于 `process.cwd()`，路径解析基准不一致导致混乱。将所有路径的解析基准统一为 `--cwd` 是最小意外原则的体现。

### 决策三：默认值 `.dc-reporter` 保持向后兼容

**决策**：`--storage-dir` 的默认值为 `.dc-reporter`。

**备选方案 A：无默认值，必须显式传参**

用户必须每次执行命令时显式传入 `--storage-dir`。

**被拒原因**：对现有用户构成破坏性变更——所有现有脚本、CI 流水线、文档中的命令都需要添加 `--storage-dir .dc-reporter`。当前项目已有大量用户使用默认路径，强制显式传参会造成迁移成本。

**备选方案 B：默认值改为 `.data` 或 `dep-report`**

使用更通用的目录名如 `.data` 或 `dep-report` 作为默认值。

**被拒原因**：已有用户在 `.dc-reporter/` 目录下存放数据和架构文件，修改默认值会导致已有工作流失效。`.dc-reporter` 作为默认值的命名也保持了语义清晰性——看到目录名即知道是 `dep-report` 工具的数据。

### 决策四：绝对路径直接使用

**决策**：绝对路径直接使用，不进行 `--cwd` 相关的路径拼接。

**备选方案：始终 `resolve(absCwd, storageDir)`**

无论 `storageDir` 是相对路径还是绝对路径，始终用 `resolve(absCwd, storageDir)` 解析。

**被拒原因**：不符合 Node.js `path.resolve` 的行为预期——`resolve('/a', '/b')` 返回 `/b`，而用户期待传入绝对路径时路径不会被修改。更重要的是，用户在使用绝对路径时显式表达"I know where I want"，强行拼接 `--cwd` 会破坏用户意图。例如 `dep-report analyze --cwd /project --storage-dir /tmp/data` 若返回 `/project/tmp/data` 则明显是错误的。

### 决策五：提取 `parseStorageDir` 为独立工具函数

**决策**：将存储目录解析逻辑提取为 `packages/cli/src/utils/storage.ts` 中的独立导出函数。

**备选方案：在每个 action 中内联 `isAbsolute`/`resolve` 判断**

在每个使用存储路径的文件中重复实现相对/绝对路径判断逻辑。

**被拒原因**：路径解析逻辑在 `actions/analyze.ts`、`actions/archi-to-rules.ts`、`commands/dashboard/index.ts`、`server/architecture/architecture.ts` 等模块中都需要使用。集中在一处可以保证解析行为的一致性，且后续如果引入环境变量回退（future consideration）只需修改一个函数。内联实现会导致行为漂移风险（如一个模块遗漏了绝对路径判断，或其中一处使用 `path.join` 而非 `path.resolve`）。

### 决策六：Commander 级别的默认值 + 业务层默认值双重保障

**决策**：默认值在 Commander 选项定义和所有业务接口中同时设置。

- Commander 层：`program.option('--storage-dir <path>', '...', '.dc-reporter')` 确保 CLI 用户不传参数时拿到默认值
- 业务层：各 Options 接口和 action 函数内部 `options.storageDir || '.dc-reporter'` 确保编程式 API 调用方不传参数时也能正常工作

**备选方案：仅在 Commander 层设置默认值**

只在 `bin/cli.ts` 中设置默认值，业务层 `storageDir` 为 `undefined` 可选字段，由调用方保证传入。

**被拒原因**：编程式 API 调用方（如 `createServer({ port: 3000, host: 'localhost' })`）不走 Commander，若业务层没有默认值则 `storageDir` 为 `undefined`，导致路径构建失败或产生意外结果。业务层默认值保证了 CLI 和编程式 API 的行为一致性。
