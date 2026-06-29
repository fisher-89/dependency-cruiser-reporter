## 问题

当前所有 CLI 命令（`analyze`、`dashboard`、`archi-to-rules`）以及 HTTP 服务端的文件读写路径均硬编码为 `<cwd>/.dc-reporter/`。这导致以下问题：

1. **无法使用自定义存储目录**：用户必须将所有架构文件、扫描结果放入 `.dc-reporter/` 目录，无法选择其他位置
2. **Monorepo 工作流受限**：在 monorepo 中，不同子项目可能需要不同的存储位置，硬编码的 `.dc-reporter/` 无法区分
3. **CI/CD 场景不便**：CI 流水线可能希望将中间产物写入临时目录（如 `.tmp/dcr/`），但当前不支持
4. **与其他工具集成困难**：当用户已有约定好的输出目录时，无法复用

硬编码 `.dc-reporter/` 分散在 4 个核心源文件的 5 个位置：

| 文件 | 硬编码行 |
|------|----------|
| `packages/cli/src/actions/analyze.ts` | `resolve(absCwd, '.dc-reporter', 'scans', ...)` |
| `packages/cli/src/actions/archi-to-rules.ts` | `join(resolve(cwd), '.dc-reporter', 'architecture')` |
| `packages/cli/src/actions/archi-to-rules.ts` | `resolve(absCwd, '.dc-reporter', 'archi-rules.json')` |
| `packages/cli/src/commands/dashboard/index.ts` | `resolve(absCwd, '.dc-reporter', 'scans', ...)` |
| `packages/cli/src/server/architecture/architecture.ts` | `join(resolve(cwd), '.dc-reporter', 'architecture')`（2 处） |

另有 4 个文件需要新增 `storageDir` 参数透传（不含硬编码路径）：`bin/cli.ts`、`commands/analyze/index.ts`、`commands/archi-to-rules/index.ts`、`server/dep/analyze.ts`。

## 提案

在所有 CLI 命令以及 `createServer` 编程式 API 中新增 `--storage-dir` 全局选项，允许自定义存储根目录。

### 数据流

```
[--storage-dir 参数]
     │
     ▼
[parseStorageDir(storageDir, absCwd)]
     │
     ├── 相对路径 → resolve(absCwd, storageDir)
     ├── 绝对路径 → storageDir 直接使用
     │
     ▼
[所有文件读写均基于 absStorageDir]
     │
     ├── scans/   → <absStorageDir>/scans/
     ├── architecture/ → <absStorageDir>/architecture/
     └── archi-rules.json → <absStorageDir>/archi-rules.json
```

### 存储目录布局

```
<absStorageDir>/
├── scans/                      # dependency-cruiser 扫描输出（analyze 写入）
│   └── <dirname>-graph.json
├── architecture/               # C4 架构模型 .c4 文件（用户创建或 API 生成）
│   ├── main.c4
│   └── ...
└── archi-rules.json            # 从 C4 模型生成的 dependency-cruiser 规则
```

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

## 能力

### 新增能力

- `storage-dir`：存储目录路径解析机制，包括 CLI 选项定义、相对/绝对路径解析规则、向后兼容默认值

### 修改能力

- `cli`：三个命令（`analyze`、`dashboard`、`archi-to-rules`）和 `createServer` 编程式 API 新增 `--storage-dir` 参数，默认值 `.dc-reporter`；选项表和所有场景更新

## 变更范围

### 实现文件

| 文件 | 变更内容 |
|------|----------|
| `packages/cli/src/bin/cli.ts` | 新增全局 `--storage-dir <path>` 选项，解析后传递给各命令 action |
| `packages/cli/src/commands/analyze/index.ts` | `analyze()` 接口新增 `storageDir` 参数，透传至 `actions/analyze.ts` |
| `packages/cli/src/commands/dashboard/index.ts` | `dashboard()` 接口新增 `storageDir` 参数，默认文件发现路径从 `.dc-reporter` 替换为 `storageDir`；透传至 `createServer` |
| `packages/cli/src/commands/archi-to-rules/index.ts` | `archiToRules()` 接口新增 `storageDir` 参数，透传至 `actions/archi-to-rules.ts` |
| `packages/cli/src/actions/analyze.ts` | `AnalyzeOptions` 新增 `storageDir`；默认输出路径从 `resolve(absCwd, '.dc-reporter', 'scans', ...)` 替换为 `resolve(absCwd, storageDir, 'scans', ...)` |
| `packages/cli/src/actions/archi-to-rules.ts` | `ArchiToRulesOptions` 新增 `storageDir`；架构目录路径从 `join(resolve(cwd), '.dc-reporter', 'architecture')` 替换为 `join(resolve(cwd), storageDir, 'architecture')`；默认输出路径从 `resolve(absCwd, '.dc-reporter', 'archi-rules.json')` 替换为 `resolve(absCwd, storageDir, 'archi-rules.json')` |
| `packages/cli/src/server/server.ts` | `ServerOptions` 新增 `storageDir`；传递给 `setupArchitectureRoutes` 和 `setupAnalyzeDepRoute` |
| `packages/cli/src/server/architecture/architecture.ts` | `setupArchitectureRoutes` 新增 `storageDir` 参数；`archDir` 构建从 `.dc-reporter/architecture` 替换为 `<storageDir>/architecture`（2 处） |
| `packages/cli/src/server/dep/analyze.ts` | `setupAnalyzeDepRoute` 新增 `storageDir` 参数；传递给 `analyze()` |

### 测试文件

| 文件 | 变更内容 |
|------|----------|
| `packages/cli/__tests__/graph-source-meta/graph-source-meta.test.ts` | 更新 `.dc-reporter` 路径断言为 `storageDir` 值 |

### 不要修改

- 不修改 Rust 后端（`packages/rust/`）—— 存储路径在 CLI/Server 层构造，Rust 仅接收已解析的路径
- 不修改 `packages/cli/src/server/dep/graph.ts` —— 不构造存储路径，仅读取已传入的 `graphFile` 路径
- 不修改前端（`packages/frontend/`）i18n 中的 `.dc-reporter` 引用（用户可见提示文字，留待后续独立更新）
- 不修改前端组件逻辑
- 不修改 E2E 测试框架配置

## 验收标准

| # | 标准 | 验证方法 |
|---|------|----------|
| 1 | `dep-report analyze` 默认仍写入 `<cwd>/.dc-reporter/scans/` | 执行 analyze 不带 `--storage-dir`，检查输出路径含 `.dc-reporter` |
| 2 | `dep-report analyze --storage-dir .my-dir` 写入 `<cwd>/.my-dir/scans/` | 执行 analyze 带 `--storage-dir .my-dir`，检查输出路径含 `.my-dir` |
| 3 | `dep-report analyze --storage-dir /abs/path` 直接使用绝对路径 | 执行 analyze 带 `--storage-dir /abs/path`，检查输出路径为 `/abs/path/scans/` |
| 4 | `dep-report dashboard` 默认从 `<cwd>/.dc-reporter/scans/` 自动发现 | 不带 `--storage-dir` 启动 dashboard，自动发现 `.dc-reporter/scans/` 下的文件 |
| 5 | `dep-report dashboard --storage-dir .my-dir` 从 `.my-dir/scans/` 自动发现 | 带 `--storage-dir .my-dir` 启动，检查自动发现路径含 `.my-dir` |
| 6 | `dep-report archi-to-rules` 默认从 `<cwd>/.dc-reporter/architecture/` 读取 | 不带 `--storage-dir` 执行 archi-to-rules，检查读取路径 |
| 7 | `dep-report archi-to-rules --storage-dir .arch` 从 `.arch/architecture/` 读取 | 带 `--storage-dir .arch` 执行，检查读取路径 |
| 8 | `--storage-dir` 与 `--cwd` 交互正确：相对路径基于 `--cwd` 解析 | 执行 `dep-report analyze --cwd /project --storage-dir .data`，检查存储根为 `/project/.data` |
| 9 | `createServer({ storageDir: '.data' })` 编程式 API 使用自定义存储目录 | 编程方式创建服务器，检查存储目录路径传递 |
| 10 | 不传 `--storage-dir` 时行为与现有版本完全一致 | 对比带/不带 `--storage-dir` 参数的输出路径，默认值 `.dc-reporter` 保持向后兼容 |

## 风险

| 风险 | 影响 | 可能性 | 缓解措施 |
|------|------|--------|----------|
| 现有用户配置依赖 `.dc-reporter/` 硬编码路径 | 升级后行为改变 | 低 | 默认值 `.dc-reporter`，完全向后兼容；现有用户无需修改任何命令 |
| `--storage-dir` 与 `--cwd` 交互复杂 | 路径解析错误 | 低 | 严格遵循 `resolve(absCwd, storageDir)` 规则；相对/绝对路径分支清晰 |
| HTTP API 端点返回的路径信息不匹配 | API 消费者困惑 | 低 | API 返回路径时使用解析后的绝对路径表达，不暴露 `storageDir` 原始值 |
| 用户传递非法路径（空字符串、含特殊字符） | 文件写入失败 | 极低 | Commander 默认处理空参数；Node.js `resolve` 自然处理特殊字符；下层的文件操作会抛出可理解的文件系统错误 |
