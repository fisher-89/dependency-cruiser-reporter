# 测试设计：代码结构对齐架构模型

> **变更**: align-code-to-architecture
> **日期**: 2026-06-03
> **状态**: 设计中

---

## 1. 测试级别

### 1.1 结构验证测试

| 属性 | 内容 |
|------|------|
| **范围** | 验证重构后的 CLI 目录结构：`actions/` 作为顶层目录存在；`server/actions/` 已被删除；`server/dep/` 和 `server/dashboard/` 存在；`commands/*.ts` 平面文件删除、`commands/*/index.ts` 目录存在；`server/server.ts` 不包含内联路由逻辑 |
| **框架** | Node.js built-in `node:test` + `node:assert`，文件系统 API |
| **运行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\align-code-to-architecture\tests\structural\*.test.ts"`（使用 `tsx` 支持 TypeScript） |
| **文件位置** | `openspec/changes/align-code-to-architecture/tests/structural/` |
| **目标覆盖率** | AC1-AC5 的 5 个目录/文件存在性断言 100%；server.ts 无内联路由的关键字检查覆盖率 100% |

**说明：** 结构验证测试通过 `node:fs` 的 `existsSync` 和 `statSync` 检查目录和文件的存在性/不存在性。这些测试无 mock，运行在真实文件系统上，验证重构后的目录结构与架构模型一致。

### 1.2 单元测试

#### CLI 模块单元测试

| 属性 | 内容 |
|------|------|
| **范围** | 验证 `actions/` 导出的函数签名与 `commands/*/index.ts` 中导入的函数签名一致；验证 `server/dep/analyze.ts` 和 `server/dep/graph.ts` 的路由设置函数签名及模块导出；验证 `server/dashboard/index.ts` 导出函数签名；验证 `server/server.ts` 的 `setupRoutes()` 正确调用子模块的路由设置函数；验证 `server/architecture/architecture.ts` 的 import 路径已更新指向 `actions/archi-to-rules` |
| **框架** | Node.js built-in `node:test` + `node:assert` |
| **运行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\align-code-to-architecture\tests\unit\cli\*.test.ts"` |
| **文件位置** | `openspec/changes/align-code-to-architecture/tests/unit/cli/` |
| **目标覆盖率** | 所有新创建/修改模块的导出函数签名校验覆盖率 100%；server.ts 子模块编排函数调用链路覆盖率 100% |

**说明：** CLI 模块单元测试通过动态 `import()` 加载重构后的模块，验证导出的函数是否为 `function` 类型、函数名是否正确、参数个数是否符合预期。不执行实际的业务逻辑，仅验证模块接口一致性。

#### C4 模型内容单元测试

| 属性 | 内容 |
|------|------|
| **范围** | 验证 `frontend.c4` 文件中包含 `types` 模块定义及相关依赖边；验证 `rust.c4` 文件中包含 `types` 和 `lib` 模块定义及相关依赖边；验证生成的 `archi-rules.json` 中包含符合预期的 `archi-frontend-types`、`archi-rust-types`、`archi-rust-lib` 规则 |
| **框架** | Node.js built-in `node:test` + `node:assert` |
| **运行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\align-code-to-architecture\tests\unit\archi\*.test.ts"` |
| **文件位置** | `openspec/changes/align-code-to-architecture/tests/unit/archi/` |
| **目标覆盖率** | `frontend.c4` 中 `types` 模块文本匹配覆盖 100%；`rust.c4` 中 `types` 和 `lib` 模块文本匹配覆盖 100%；`archi-rules.json` 中关键规则条目存在性和路径有效性断言覆盖率 100% |

**说明：** C4 模型内容测试直接读取 `.c4` 文件和生成的 `archi-rules.json`，通过字符串匹配或正则表达式验证文件内容符合预期。不启动 LikeC4 解析器，纯文件内容扫描。

### 1.3 集成测试

#### CLI 命令集成测试

| 属性 | 内容 |
|------|------|
| **范围** | 验证重构后 `dep-report analyze`、`dep-report archi-to-rules`、`dep-report dashboard --help` 三个 CLI 命令的完整执行链路：参数解析、核心函数调用、exit code。确保重构未改变 CLI 命令行为。测试 AC6/AC7/AC8 的 CI 级别验证以外的独立验证 |
| **框架** | Node.js built-in `node:test` + `node:assert`，通过 `child_process.spawnSync` 调用 CLI 二进制 |
| **运行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\align-code-to-architecture\tests\integration\cli-commands.test.ts"` |
| **文件位置** | `openspec/changes/align-code-to-architecture/tests/integration/` |
| **目标覆盖率** | `--help` 输出正确性 100%；analyze 的基本参数解析 100%；archi-to-rules 的执行和规则输出 100% |

**说明：** 集成测试通过 `spawnSync('node', [cliBinary, ...])` 执行 CLI 命令，验证 stdout/stderr 输出和 exit code。使用 `packages/e2e/cli.test.ts` 中的已有模式。测试在项目根目录或临时工作目录中执行。

#### archi-rules 路径验证集成测试

| 属性 | 内容 |
|------|------|
| **范围** | 执行 `dep-report archi-to-rules` 后，读取生成的 `archi-rules.json`，验证每条规则中 `from.path` 对应的目录或文件存在于磁盘上。覆盖 AC9——确保所有架构规则路径有效 |
| **框架** | Node.js built-in `node:test` + `node:assert`，通过 `child_process.spawnSync` 调用 CLI 二进制 |
| **运行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\align-code-to-architecture\tests\integration\archi-rules-validation.test.ts"` |
| **文件位置** | `openspec/changes/align-code-to-architecture/tests/integration/` |
| **目标覆盖率** | `archi-rules.json` 中所有 `from.path` 对应的磁盘路径存在性验证 100% |

**说明：** 此测试专门针对 AC9 设计。先执行 `dep-report archi-to-rules` 确保规则文件生成，然后解析 JSON 文件，对每条规则的 `from.path` 构造路径并调用 `existsSync` 验证。若任何路径不存在，测试应列出所有失败路径。

### 1.4 回归验证测试

| 属性 | 内容 |
|------|------|
| **范围** | 通过子进程调用 `pnpm build` 和 `pnpm test`，验证重构后项目构建（AC6）、已有测试套件（AC7）、import 路径解析（AC12）均无回归 |
| **框架** | Node.js built-in `node:test` + `node:assert`，通过 `child_process.spawnSync` 调用 pnpm |
| **运行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\align-code-to-architecture\tests\regression\*.test.ts"` |
| **文件位置** | `openspec/changes/align-code-to-architecture/tests/regression/` |
| **目标覆盖率** | AC6/AC7/AC12 验证 100%；`pnpm build`、`pnpm build:ts`、`pnpm test` 的 exit code 均为 0 |

**说明：** 回归验证测试通过 `spawnSync` 在真实 shell 环境中执行 `pnpm build`、`pnpm build:ts` 和 `pnpm test` 命令，验证 exit code 为 0。AC6（构建通过）和 AC12（import 路径正确解析）合并到 `build-verification.test.ts` 中；AC7（测试通过）在 `test-verification.test.ts` 中独立验证。

### 1.5 回归验证（由 CI/现有测试覆盖）

| 属性 | 内容 |
|------|------|
| **范围** | `pnpm build` 无错误通过（AC6）；`pnpm test` 无错误通过（AC7）；import 路径在新结构下正确解析（AC12——由 `pnpm build` 自动验证） |
| **框架** | 项目已有构建和测试脚本 |
| **运行命令** | `pnpm build && pnpm test` |
| **目标覆盖率** | AC6/AC7/AC12 验证 100%——这些验收条件由项目的 CI 和构建流程覆盖，不属于临时测试脚本 |

**说明：** AC6（pnpm build 通过）、AC7（pnpm test 通过）和 AC12（import 路径解析正确）由项目的现有构建和测试流程自动验证。重构后的代码必须通过 TypeScript 编译器的类型检查和模块解析，这确保了所有 import 路径的正确性。`pnpm test` 包括了 `packages/e2e/cli.test.ts` 中的已有集成测试，确认 CLI 命令行为不变。这些不在本变更的临时测试脚本中重复，而是在日常开发流程中通过 `pnpm build` 和 `pnpm test` 验证。

---

## 2. 覆盖率映射

| AC | 测试级别 | 测试文件 | 测试用例 |
|----|---------|---------|---------|
| AC-1 | 结构验证 | `tests/structural/directory-structure.test.ts` | 断言 `packages/cli/src/actions/` 目录存在（`existsSync` + `statSync` 验证为目录） |
| AC-2 | 结构验证 | `tests/structural/directory-structure.test.ts` | 断言 `packages/cli/src/server/actions/` 目录不存在（`existsSync` 返回 `false`） |
| AC-3 | 结构验证 | `tests/structural/directory-structure.test.ts` | 断言 `packages/cli/src/server/dep/` 和 `packages/cli/src/server/dashboard/` 目录存在 |
| AC-4 | 结构验证 | `tests/structural/directory-structure.test.ts` | 断言 `packages/cli/src/commands/analyze.ts`、`archi-to-rules.ts`、`dashboard.ts` 三个旧平面文件不存在；断言 `packages/cli/src/commands/analyze/index.ts`、`archi-to-rules/index.ts`、`dashboard/index.ts` 三个新目录模块存在 |
| AC-5 | 单元 | `tests/unit/cli/server-module.test.ts` | 动态导入 `server/server.ts`，验证 `setupRoutes` 函数存在且为 `function` 类型；读取 `server/server.ts` 源文件，验证字符串不包含 `'api/graph'`、`'api/analyze'`、`express.static`、`app.get('*')` 关键字 |
| AC-6 | 回归验证 | `tests/regression/build-verification.test.ts` | 通过 `spawnSync` 执行 `pnpm build`，验证 exit code 为 0 |
| AC-7 | 回归验证 | `tests/regression/test-verification.test.ts` | 通过 `spawnSync` 执行 `pnpm test`，验证 exit code 为 0 |
| AC-8 | 集成 | `tests/integration/cli-commands.test.ts` | 在项目根目录执行 `dep-report archi-to-rules`，验证 exit code 为 0 |
| AC-9 | 集成 | `tests/integration/archi-rules-validation.test.ts` | 执行 `dep-report archi-to-rules` 后读取生成的 `.dc-reporter/archi-rules.json`，遍历每条规则的 `from.path`，使用 `existsSync` 验证所有指向的路径有效 |
| AC-10 | 单元 | `tests/unit/archi/c4-model-content.test.ts` | 读取 `.dc-reporter/architecture/frontend.c4`，验证 `types = module` 出现在 `extend ROOT.frontend` 段落中；验证 `main`、`App`、`components`、`hooks`、`theme` 模块包含指向 `ROOT.frontend.types` 的 dependency 边 |
| AC-11 | 单元 | `tests/unit/archi/c4-model-content.test.ts` | 读取 `.dc-reporter/architecture/rust.c4`，验证 `types = module` 和 `lib = module` 出现在 `extend ROOT.rust` 段落中；验证 `aggregate`、`layout`、`violations` 包含指向 `ROOT.rust.types` 的依赖边；验证 `lib` 包含指向 `aggregate`、`layout`、`types`、`violations` 的依赖边 |
| AC-12 | 回归验证 | `tests/regression/build-verification.test.ts` | `pnpm build:ts` 通过即自动验证所有 import 路径在新结构下正确解析 |

---

## 3. 测试策略

### 3.1 整体方法

本变更为纯结构重构，不涉及任何功能变更。测试策略侧重于 **结构正确性验证** 和 **行为回归验证**。

| 层级 | 占比 | 理由 |
|------|------|------|
| 结构验证测试 | 20% | 目录/文件的存在性和不存在性是本变更的核心验收条件，必须独立验证 |
| CLI 模块单元测试 | 20% | 验证模块接口一致性、server.ts 子模块编排正确性、import 路径正确性 |
| C4 模型内容单元测试 | 20% | 验证 `.c4` 文件包含新增模块定义和正确依赖边；验证 `archi-rules.json` 路径有效 |
| CLI 命令集成测试 | 15% | 验证重构不改变 CLI 命令行为（exit code、输出格式） |
| archi-rules 路径验证集成测试 | 15% | 专门验证 AC9——所有架构规则指向的路径真实存在 |
| 回归验证测试 | 10% | 通过 pnpm build / pnpm test 子进程验证构建和已有测试无回归 |

### 3.2 测试分类

#### 结构正确性测试

- `actions/` 作为 `commands/`、`server/` 同级目录存在
- `server/actions/` 目录被完整删除，不残留任何文件
- `server/dep/` 和 `server/dashboard/` 目录存在且包含预期的 `.ts` 文件
- `commands/analyze.ts`、`commands/archi-to-rules.ts`、`commands/dashboard.ts` 三个旧平面文件不存在
- `commands/analyze/index.ts`、`commands/archi-to-rules/index.ts`、`commands/dashboard/index.ts` 三个新目录模块存在
- `server/server.ts` 不含内联路由逻辑

#### 模块接口一致性测试

- `actions/analyze.ts` 导出 `analyze` 函数，函数签名为 `(options: AnalyzeOptions) => Promise<string>`
- `actions/archi-to-rules.ts` 导出 `archiToRules` 函数，函数签名为 `(options: ArchiToRulesOptions) => Promise<void>`
- `commands/analyze/index.ts` 导出函数，内部调用 `actions/analyze`
- `commands/archi-to-rules/index.ts` 导出函数，内部调用 `actions/archi-to-rules`
- `server/dep/analyze.ts` 导出 `setupDepAnalyzeRoute` 函数
- `server/dep/graph.ts` 导出 `setupDepGraphRoute` 函数
- `server/dashboard/index.ts` 导出 `setupDashboardRoutes` 函数
- `server/server.ts` 的 `setupRoutes` 方法调用上述子模块设置函数

#### C4 模型内容测试

- `frontend.c4` 的 `extend ROOT.frontend` 段落中包含 `types = module` 定义
- `frontend.c4` 中 `App`、`components`、`hooks`、`theme` 模块声明对 `ROOT.frontend.types` 的 dependency
- `rust.c4` 的 `extend ROOT.rust` 段落中包含 `types = module` 和 `lib = module` 定义
- `rust.c4` 中 `aggregate`、`layout`、`violations` 模块声明对 `ROOT.rust.types` 的 dependency
- `rust.c4` 中 `lib` 模块声明对 `ROOT.rust.aggregate`、`layout`、`types`、`violations` 的 dependency
- `types` 模块自身不声明任何对外 dependency

#### archi-rules 路径有效性测试

- 生成的 `archi-rules.json` 中包含所有预期的规则（至少包含 `archi-cli-actions-analyze`、`archi-cli-actions-archi-to-rules`、`archi-frontend-types`、`archi-rust-types`、`archi-rust-lib` 等新增或路径变化的规则）
- 每条规则的 `from.path` 对应的目录或文件存在于磁盘上
- 路径匹配规则指向正确的重构后路径（如 `packages/cli/src/actions/` 而非 `packages/cli/src/server/actions/`）

#### 回归测试

- `dep-report --help` 仍然显示 `analyze`、`archi-to-rules`、`dashboard` 三个命令
- `dep-report analyze --help` 仍然显示 `-p`、`-o`、`-c` 选项
- `dep-report archi-to-rules` exit code 为 0 且规则文件生成
- `pnpm build` 编译通过（验证所有 import 路径正确）
- `pnpm test` 全部通过（验证已有测试不受影响）

### 3.3 Mock 策略

| Mock 目标 | 层级 | 策略 |
|-----------|------|------|
| 文件系统 | 结构验证 | 不 mock——使用真实 `existsSync` / `statSync` 验证目录和文件存在性 |
| Express app 对象（`app.post`、`app.get`） | 单元 | 不 mock——结构验证测试不检查 Express 注册；模块接口测试只动态导入验证导出函数存在性，不执行实际路由逻辑 |
| CLI 子进程 | 集成 | 不 mock——通过 `spawnSync` 在真实 Node.js 进程中执行 CLI 命令 |
| `.c4` 文件和 `archi-rules.json` 内容 | 单元 | 不 mock——使用真实文件系统读取 `.c4` 文件和规则 JSON 文件 |

**说明：** 本变更为纯结构重构，不涉及业务逻辑变更。所有测试均不需要 mock。结构验证使用真实文件系统 API，模块接口使用动态 `import()` 加载真实模块，集成测试在真实子进程和文件系统上运行。无 mock 策略确保测试结果 100% 反映真实的运行时状态。

### 3.4 测试数据

#### 结构验证测试路径集合

所有路径均基于项目根目录 `D:\Projects\dependency-cruiser-reporter`：

| 验证类型 | 路径 | 期望 |
|---------|------|------|
| 目录存在 | `packages/cli/src/actions/` | `existsSync` 返回 `true` |
| 目录不存在 | `packages/cli/src/server/actions/` | `existsSync` 返回 `false` |
| 目录存在 | `packages/cli/src/server/dep/` | `existsSync` 返回 `true` |
| 目录存在 | `packages/cli/src/server/dashboard/` | `existsSync` 返回 `true` |
| 文件不存在 | `packages/cli/src/commands/analyze.ts` | `existsSync` 返回 `false` |
| 文件存在 | `packages/cli/src/commands/analyze/index.ts` | `existsSync` 返回 `true` |
| 文件不存在 | `packages/cli/src/commands/archi-to-rules.ts` | `existsSync` 返回 `false` |
| 文件存在 | `packages/cli/src/commands/archi-to-rules/index.ts` | `existsSync` 返回 `true` |
| 文件不存在 | `packages/cli/src/commands/dashboard.ts` | `existsSync` 返回 `false` |
| 文件存在 | `packages/cli/src/commands/dashboard/index.ts` | `existsSync` 返回 `true` |

#### C4 模型文件断言数据

**frontend.c4** 预期包含的关键文本片段：

```
extend ROOT.frontend {
    types = module  // 或等价定义语法
    ...
    main -> ROOT.frontend.types  // main 模块依赖 types
    App -> ROOT.frontend.types   // App 模块依赖 types
    components -> ROOT.frontend.types  // components 模块依赖 types
    hooks -> ROOT.frontend.types  // hooks 模块依赖 types
    theme -> ROOT.frontend.types  // theme 模块依赖 types
}
```

**rust.c4** 预期包含的关键文本片段：

```
extend ROOT.rust {
    types = module
    lib = module
    ...
    aggregate -> ROOT.rust.types
    layout -> ROOT.rust.types
    violations -> ROOT.rust.types
    lib -> ROOT.rust.aggregate
    lib -> ROOT.rust.layout
    lib -> ROOT.rust.types
    lib -> ROOT.rust.violations
}
```

#### CLI 集成测试夹具

集成测试不需要外部夹具文件夹。所有测试在项目根目录或由 CI 统一管理的路径下执行：

| 测试场景 | 工作目录 | 执行命令 | 验证点 |
|---------|---------|---------|--------|
| --help 显示所有命令 | 项目根 | `node <cliBinary> --help` | stdout 包含 `analyze`、`archi-to-rules`、`dashboard` |
| archi-to-rules 正常执行 | 项目根 | `node <cliBinary> archi-to-rules` | exit code 为 0，`.dc-reporter/archi-rules.json` 文件生成 |
| archi-rules.json 路径有效 | 项目根 | `node <cliBinary> archi-to-rules` 后读取规则文件 | JSON 中每条 `from.path` 对应的磁盘路径存在 |

---

## 4. 边界用例

| 编号 | 输入/条件 | 期望行为 | 目标测试文件 |
|------|-----------|---------|-------------|
| B-1 | `actions/` 目录存在但缺少 `analyze.ts` 或 `archi-to-rules.ts` 文件 | 结构验证测试应分别检查 `actions/` 目录存在性和 `actions/analyze.ts`、`actions/archi-to-rules.ts` 文件存在性，报告具体缺失文件而非仅报告目录存在 | `tests/structural/directory-structure.test.ts` |
| B-2 | `server/actions/` 目录已被删除，但 `server/actions/` 目录内可能残留 `.gitkeep` 或其他非代码文件 | 无论目录内含何种文件，`server/actions/` 目录本身应被完整删除。结构验证使用 `existsSync` 检查目录不存在而非 `.ts` 文件不存在 | `tests/structural/directory-structure.test.ts` |
| B-3 | `commands/*.ts` 平面文件与 `commands/*/index.ts` 目录模块的过渡期内（重构部分完成时）两者可能并存 | 结构验证应同时断言旧文件不存在和新文件存在，确保重构彻底完成而非部分完成 | `tests/structural/directory-structure.test.ts` |
| B-4 | `server/server.ts` 中将路由逻辑委托给子模块后，可能仍残留注释引用了旧路由路径（如 `// POST /api/graph was here`） | 仅检查可执行代码或 import 语句中的内联路由，不检查注释。使用正则匹配非注释行的 `app.post`、`app.get`、`express.static` 调用 | `tests/unit/cli/server-module.test.ts` |
| B-5 | `frontend.c4` 中 `types` 模块被错误地定义为 `package` 而非 `module` 类型 | C4 内容测试应使用精确模式匹配 `types = module`，不接受 `types = package` 或 `component` 等其他类型 | `tests/unit/archi/c4-model-content.test.ts` |
| B-6 | `rust.c4` 中 `types` 和 `lib` 模块定义存在，但缺少某个子模块的依赖边（如 `violations` 缺少对 `types` 的依赖） | C4 内容测试应逐个断言五个依赖边：`aggregate -> types`、`layout -> types`、`violations -> types`、`lib -> aggregate`、`lib -> layout`、`lib -> types`、`lib -> violations` | `tests/unit/archi/c4-model-content.test.ts` |
| B-7 | `actions/` 中的导出函数签名与 `commands/*/index.ts` 中调用的函数签名不匹配（参数个数/类型不一致） | 模块单元测试通过动态 import 验证函数名和参数个数（`.length` 属性），参数个数差异会导致测试失败 | `tests/unit/cli/imports-validation.test.ts` |
| B-8 | `server/architecture/architecture.ts` 的 import 路径未更新，仍指向 `../../commands/archi-to-rules` | 模块单元测试读取 `server/architecture/architecture.ts` 源文件，验证 import 字符串包含 `../../actions/archi-to-rules` 而非 `../../commands/archi-to-rules` | `tests/unit/cli/imports-validation.test.ts` |
| B-9 | 生成的 `archi-rules.json` 中包含旧路径（如 `server/actions/` 或 `commands/analyze.ts`）的规则 | 路径验证集成测试应解析每条 `from.path`，检查其是否包含 `server/actions/` 等不应再出现的旧路径模式，若发现则标记失败 | `tests/integration/archi-rules-validation.test.ts` |
| B-10 | 生成的 `archi-rules.json` 中某条规则的 `from.path` 匹配新模式（如 `packages/cli/src/actions/`），但该路径引用了不存在的子目录 | 路径验证集成测试使用 `existsSync` + `statSync` 联合检查，确保路径既存在且是目标类型（文件或目录） | `tests/integration/archi-rules-validation.test.ts` |
| B-11 | `server.ts` 内联路由被正确提取到子模块，但子模块文件（`server/dep/*.ts`、`server/dashboard/index.ts`）的导出函数未在 `server.ts` 中被导入和调用 | 模块单元测试动态导入 `server/server.ts`，通过读取源文件或检查 `setupRoutes` 函数体的 AST/关键字，验证其对子模块函数的调用存在 | `tests/unit/cli/server-module.test.ts` |
| B-12 | 重构后 `commands/*/index.ts` 导出的命令名与 `cli.ts` 中 `program.command()` 注册的命令名不一致 | 集成测试 `dep-report --help` 验证 stdout 中三个命令名称均正确显示，且 `dep-report <command> --help` 验证子命令选项有效 | `tests/integration/cli-commands.test.ts` |
| B-13 | `actions/analyze.ts` 的导出函数与 `server/dep/analyze.ts` 的导出函数同名（均为 `analyze`），但位于不同模块，在 `server.ts` 中可能发生命名冲突 | 验证 `server/server.ts` 源文件使用重命名导入（如 `import { analyze as depAnalyze } from ...`）或通过模块命名空间访问，不存在纯函数名冲突 | `tests/unit/cli/server-module.test.ts` |

---

## 5. 测试环境与依赖

| 项目 | 说明 |
|------|------|
| **Runtime** | 结构验证测试和单元测试使用 Node.js 22+（`node:test` + `node:assert`）。TypeScript 文件通过 `tsx` 或 `ts-node` 加载 |
| **结构验证测试执行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\align-code-to-architecture\tests\structural\*.test.ts"` |
| **单元测试执行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\align-code-to-architecture\tests\unit\cli\*.test.ts" "D:\Projects\dependency-cruiser-reporter\openspec\changes\align-code-to-architecture\tests\unit\archi\*.test.ts"` |
| **集成测试执行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\align-code-to-architecture\tests\integration\*.test.ts"` |
| **回归验证测试执行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\align-code-to-architecture\tests\regression\*.test.ts"` |
| **全部测试执行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\align-code-to-architecture\tests\**\*.test.ts"` |
| **CI 集成** | 集成测试需要在 `pnpm build` 之后执行（因为需要 `dist/bin/cli.js` 存在用于子进程调用）。建议在 CI 的 `pnpm build` 步骤之后新增步骤运行 `node --test openspec/changes/align-code-to-architecture/tests/**/*.test.ts` |
| **新增依赖** | 无。`node:test` + `node:assert` + `node:fs` + `node:path` 均为 Node.js 内置模块。结构化验证无需额外测试框架 |
| **临时目录** | 本变更的测试不需要临时目录。结构验证和 C4 内容测试直接读取项目文件系统；CLI 集成测试在项目根目录或已有路径下工作 |

---

## 6. 回归测试注意事项

1. **已有 CLI 命令行为不变：** 重构后 `analyze()` 和 `archiToRules()` 的函数签名（参数类型、返回类型）不变。已有 `packages/e2e/cli.test.ts` 中的 `analyze` 和 `dashboard` 相关测试应继续通过。

2. **已有 `server/actions/` 被删除：** 任何引用 `packages/cli/src/server/actions/` 路径的外部文件（如 IDE 配置、测试夹具中的硬编码路径）需要在重构前搜索并更新。搜索关键词包括 `server/actions/`、`actions/actions`、`setupActionRoutes`。

3. **`archi-rules.json` 路径变化：** 重构后 `archi-rules.json` 中的 `from.path` 值将从 `packages/cli/src/server/actions/` 变为 `packages/cli/src/actions/`，从 `packages/cli/src/commands/analyze.ts`（文件路径）变为 `packages/cli/src/commands/analyze/`（目录路径）。如果 CI 或其他工具依赖这些路径的具体值，需要同步更新。

4. **`commands/index.ts` 导出路径变化：** 导出源从平面文件（`./analyze.js`）改为目录模块（`./analyze/index.js`）。TypeScript 的模块解析通常能正确处理这两种格式，但如果外部消费者使用 `import { analyze } from '@dcr-reporter/cli/commands/analyze'` 的精确路径，需确保新路径同样可解析。

5. **`server/architecture/architecture.ts` import 路径更新：** 该文件从 `../../commands/archi-to-rules` 改为 `../../actions/archi-to-rules`。需验证没有其他文件仍从 `commands/` 导入 `archiToRules`。

6. **`pnpm build` 和 `pnpm test` 作为关口：** 这些命令应在每次重构阶段性完成后立即执行。`pnpm build` 确保 TypeScript 编译和 import 解析无错误；`pnpm test` 确保已有测试不受结构变化影响。在合并 PR 前，必须执行一次完整的 `pnpm build && pnpm test` 并通过。
