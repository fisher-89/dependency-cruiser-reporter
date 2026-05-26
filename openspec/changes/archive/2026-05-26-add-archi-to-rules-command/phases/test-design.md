# 测试设计: add-archi-to-rules-command

> **变更**: add-archi-to-rules-command
> **日期**: 2026-05-22
> **状态**: 设计中

---

## 1. 测试级别

### 1.1 单元测试

| 属性 | 内容 |
|------|------|
| **范围** | C4 元素/关系过滤逻辑（package/module/dependency 过滤）、文件系统路径解析（link 优先/祖先链下钻/默认约定）、规则生成（name/from/to/pathNot/dependencyTypes 格式）、配置文件更新逻辑（extends 字段的添加/转换/数组追加/幂等跳过）、路径存在性验证逻辑 |
| **框架** | Node.js built-in `node:test` + `node:assert`，配合 `vi.mock`（通过 `node:test` 的 `mock` 模块或 `test.mock` API）或 `sinon` 进行 mock |
| **运行命令** | `node --test openspec/changes/add-archi-to-rules-command/tests/unit/*.test.ts`（使用 tsx 或 ts-node 支持 TypeScript）；或 `npx tsx --test` |
| **文件位置** | `openspec/changes/add-archi-to-rules-command/tests/unit/` |
| **目标覆盖率** | 路径解析分支覆盖率 100%（4 种 link 场景 + 4 种默认约定场景 + 边界情况）；规则生成字段覆盖率 100%（name/severity/from/to/pathNot/dependencyTypes）；配置更新逻辑 100%（4 种 extends 场景）；元素过滤条件覆盖率 100%（4 种 kind + 2 种 relation kind） |

**说明：** 单元测试 mock `@likec4/language-services` 的 `fromSources` 和 `syncComputedModel`，以及 `node:fs` 的 `existsSync` 和 `readFileSync`，使测试运行在纯内存环境中，不依赖磁盘文件系统。`archi-to-rules.ts` 核心业务逻辑应拆分为可单独测试的纯函数（如 `resolveElementPath`, `buildForbiddenRule`, `updateExtendsConfig`）。

### 1.2 集成测试

| 属性 | 内容 |
|------|------|
| **范围** | `dep-report archi-to-rules` 命令的完整执行链路：参数解析、C4 文件读取与解析、元素/关系过滤、路径解析、路径存在性验证、规则文件写入、配置文件更新。覆盖 AC-1, AC-7, AC-8, AC-11, AC-12, AC-13 |
| **框架** | Node.js built-in `node:test` + `node:assert`，通过 `child_process.spawn` 或 `spawnSync` 调用 CLI 二进制 |
| **运行命令** | `node --test openspec/changes/add-archi-to-rules-command/tests/integration/archi-to-rules.test.ts` |
| **文件位置** | `openspec/changes/add-archi-to-rules-command/tests/integration/` |
| **目标覆盖率** | AC-1, AC-7, AC-8, AC-11, AC-12, AC-13 的完整命令级别验证；包含架构目录缺失、语法错误、路径不存在等错误路径 |

**说明：** 集成测试在临时工作目录中创建真实的 `.c4` 文件和 `.dependency-cruiser.js`，通过 `spawn('node', [cliBinary, 'archi-to-rules', ...])` 执行命令并验证标准输出/错误码/生成文件内容。测试完成后清理临时目录。

### 1.3 E2E 测试

| 属性 | 内容 |
|------|------|
| **范围** | 本变更的 CLI 命令不涉及浏览器交互，因此传统的 E2E（Playwright）不适用。E2E 级别的验证通过集成测试覆盖完整命令执行流。不单独设立 E2E 测试层级 |
| **框架** | 不适用（由集成测试覆盖） |
| **运行命令** | 不适用 |
| **文件位置** | 不适用 |
| **目标覆盖率** | 不适用 |

**说明：** `archi-to-rules` 是一个纯 CLI 数据转换命令，无 Web 界面交互，不存在浏览器级的 E2E 场景。集成测试中通过 `spawn` 调用的方式已经涵盖了从参数解析到文件输出的全链路验证。

---

## 2. 覆盖率映射

| AC | 测试级别 | 测试文件 | 测试用例 |
|----|---------|---------|---------|
| AC-1 | 集成 | `tests/integration/archi-to-rules.test.ts` | 创建含 package/module 的 `.c4` 文件，执行 `dep-report archi-to-rules`，验证 exit code 为 0 |
| AC-2 | 单元 | `tests/unit/rule-generation.test.ts` | 输入 3 个 package/module 元素的 mock 数据，验证生成 3 条规则且 name 前缀为 `archi-`；输入 5 个元素验证规则数量 |
| AC-3 | 单元 | `tests/unit/rule-generation.test.ts` | 输入含 3 个 dependency 的元素，验证 `pathNot` 包含自身 + 3 个目标路径共 4 个，格式为 `^(...|...|...|...)$` |
| AC-4 | 单元 | `tests/unit/rule-generation.test.ts` | 输入零依赖的元素，验证 `pathNot` 仅含自身目录 |
| AC-5 | 单元 | `tests/unit/path-resolution.test.ts` | 模拟元素 A 的 `links[0].url = "src/utils/"`，验证直接使用该路径；模拟元素 B 无 link、package 祖先有 link，验证从祖先 link 下钻 |
| AC-6 | 单元 | `tests/unit/path-resolution.test.ts` | 4 个测试用例：自身 link 直接使用；package 祖先 link 下钻拼接 `src/`；module 祖先 link 下钻不拼接；无 link 使用默认约定 |
| AC-7 | 集成 | `tests/integration/archi-to-rules.test.ts` | 创建 `link="nonexistent/path/"` 的 `.c4` 元素，执行命令，验证 stderr 含警告信息且 exit code 为 1 |
| AC-8 | 集成 | `tests/integration/archi-to-rules.test.ts` | 不传 `--output` 时验证文件写入 `.dc-reporter/archi-rules.json`；传 `-o ./custom.json` 时验证写入 `./custom.json` |
| AC-9 | 集成 | `tests/integration/archi-to-rules.test.ts` | 执行命令后验证 `.dependency-cruiser.js` 的 `extends` 字段包含 `.dc-reporter/archi-rules.json` |
| AC-10 | 集成 | `tests/integration/archi-to-rules.test.ts` | 连续执行两次命令，验证 `.dependency-cruiser.js` 中 `.dc-reporter/archi-rules.json` 只出现一次 |
| AC-11 | 集成 | `tests/integration/archi-to-rules.test.ts` | 执行 `dep-report archi-to-rules --cwd ./my-project`，验证从 `./my-project/.dc-reporter/architecture/` 读取 `.c4`，输出在 `./my-project/.dc-reporter/archi-rules.json` |
| AC-12 | 集成 | `tests/integration/archi-to-rules.test.ts` | 删除架构目录后执行命令，验证输出含 "architecture directory not found" 之类信息，exit code 为 1 |
| AC-13 | 集成 | `tests/integration/archi-to-rules.test.ts` | 提供语法错误的 `.c4` 文件，执行命令，验证输出含解析错误详情，exit code 为 1 |
| AC-14 | 单元 | `tests/unit/config-update.test.ts` | mock 配置文件的 `extends` 为字符串 `".dependency-cruiser.json"`，运行配置更新逻辑后验证 `extends` 变为数组 |
| AC-15 | 单元 | `tests/unit/rule-generation.test.ts` | 验证生成的每条规则的 `to.dependencyTypes` 精确等于 `["local"]` |

---

## 3. 测试策略

### 3.1 整体方法

采用 **测试金字塔** 策略，以单元测试为主（核心逻辑可脱离文件系统独立验证），集成测试为辅（验证命令完整链路和错误处理）。

| 层级 | 占比 | 理由 |
|------|------|------|
| 单元测试 | 60% | 路径解析、规则生成、配置更新均为纯函数逻辑，脱离文件系统和外部依赖后运行快速（毫秒级），易于覆盖边界场景 |
| 集成测试 | 40% | CLI 命令的核心行为（文件读取、参数传递、错误码）需在真实进程中验证，但不需要浏览器环境 |

> **关于 E2E：** 本变更不涉及 Web 界面交互，不存在浏览器级别的 E2E 场景。集成测试通过 `spawn` 子进程调用 CLI 二进制已覆盖完整的端到端链路。

### 3.2 测试分类

#### 正向功能测试
- C4 文件解析：单个 `.c4` 文件、多个 `.c4` 文件合并解析
- 元素过滤：仅保留 `kind ∈ {package, module}`，忽略 `project` 和 `outer`
- 关系过滤：仅保留 `kind = "dependency"`，忽略 generic 关系
- 规则生成：每个 package/module 元素生成一条规则，正确设置 `name`、`from.path`、`to.pathNot`、`to.dependencyTypes`
- 文件输出：默认路径和自定义 `--output` 路径均正确写入
- 配置更新：`extends` 字段在不存在/为字符串/为数组/已包含时的正确处理
- 路径存在性验证：所有路径存在时通过

#### 错误路径测试
- 架构目录不存在：输出明确错误信息，exit code 为 1，不写入任何文件
- `.c4` 语法错误：输出解析错误详情，exit code 为 1
- 路径不存在：输出警告列出所有失败的路径，exit code 为 1
- `.dependency-cruiser.js` 不存在：命令仍应正常生成规则文件，但输出配置未更新的提示

#### 幂等性测试
- 连续多次运行不产生重复的 `extends` 条目
- 重复运行不会修改已正确生成的规则文件内容（除非输出文件内容变化）

#### 参数解析测试
- `--cwd` 改变所有相对路径的基目录
- `--output, -o` 覆盖默认输出路径
- 无参数时使用所有默认值
- `--help` 显示命令描述和选项

### 3.3 Mock 策略

| Mock 目标 | 层级 | 策略 |
|-----------|------|------|
| `@likec4/language-services` 的 `fromSources` 和 `syncComputedModel` | 单元 | 使用 `test.mock`（Node.js 22+）或 `sinon` 创建 stub，返回预先构建的 mock 数据（含 elements/relations 的 `LikeC4Model.Computed` 结构）。不加载真实的 C4 解析器 |
| `node:fs` 的 `existsSync` | 单元 | mock 返回预定义结果：对测试中存在的路径返回 `true`，不存在的返回 `false` |
| `node:fs` 的 `readFileSync` | 单元 | mock 返回预定义的 `.c4` 文件内容 |
| `node:fs` 的 `writeFileSync` | 单元 | 使用 spy 验证写入内容和写入次数，不实际写入磁盘 |
| `node:fs` 的 `mkdirSync` | 单元 | 使用 spy 验证目录创建逻辑被正确调用 |
| 文件系统操作 | 集成 | 不 mock——在真实临时目录中操作，测试完成后清理 |
| CLI 二进制 `cliBinary` | 集成 | 不 mock——通过 `child_process.spawn` 在真实 Node.js 进程中执行 |
| `process.exit` | 单元 | 使用 spy 拦截，避免测试过程意外退出进程 |
| `console.warn` / `console.error` | 单元 | 使用 spy 验证警告和错误信息的输出内容 |

### 3.4 测试数据

#### Mock C4 模型数据结构

单元测试使用以下 mock 数据结构模拟 `LikeC4Model.Computed` 的输出：

```
computed.$data.elements = [
  { id: "1", kind: "package",  name: "ROOT.core",      links: [{url: "packages/core/"}] },
  { id: "2", kind: "module",   name: "ROOT.core.utils", links: [{url: "packages/core/src/utils/"}] },
  { id: "3", kind: "module",   name: "ROOT.app",        links: [] },
  { id: "4", kind: "project",  name: "ROOT",            links: [] },  // 应被过滤
  { id: "5", kind: "outer",    name: "external.lib",    links: [] },  // 应被过滤
]
computed.$data.relations = [
  { kind: "dependency", source: { model: "1" }, target: { model: "2" } },
  { kind: "dependency", source: { model: "2" }, target: { model: "3" } },
  { kind: undefined,    source: { model: "1" }, target: { model: "4" } },  // generic 关系，应被过滤
]
```

#### C4 DSL 文件夹具

集成测试使用以下 C4 文件作为夹具，存放在 `openspec/changes/add-archi-to-rules-command/tests/fixtures/`：

| 夹具文件 | 用途 |
|---------|------|
| `simple-archi.c4` | 含 2 个 package、1 个 module、1 条 dependency 的基础文件，用于正向测试 |
| `multi-file/main.c4` | 多文件解析测试的主文件 |
| `multi-file/shared.c4` | 多文件解析测试的辅助文件 |
| `broken-syntax.c4` | 语法错误文件，用于 AC-13 测试 |
| `no-deps.c4` | 含 1 个 package 元素但无 dependency 声明，用于 AC-4 测试 |

---

## 4. 边界用例

| 编号 | 输入/条件 | 期望行为 | 目标测试文件 |
|------|-----------|---------|-------------|
| B-1 | 元素 `links[0].url` 包含文件扩展名 `.ts`（如 `src/utils/index.ts`） | 系统 strip 文件名和扩展名，使用 `src/utils/` | `tests/unit/path-resolution.test.ts` |
| B-2 | 元素 `links[0].url` 为相对路径 `../` upper 引用（如 `../../packages/cli/`） | 系统保持相对路径原样使用（不在内部 resolve 为绝对路径；最终在 `from.path` / `pathNot` 中使用路径字面量） | `tests/unit/path-resolution.test.ts` |
| B-3 | 元素 FQN 中某段名包含连字符（如 `ROOT.my-module.sub`） | 规则 `name` 替换为 `archi-root-my-module-sub`（连字符保持不变，点号替换为连字符） | `tests/unit/rule-generation.test.ts` |
| B-4 | 多个 dependency 目标指向同一个路径（去重） | 生成的 `pathNot` 中去掉重复路径，URL 列表保持唯一 | `tests/unit/rule-generation.test.ts` |
| B-5 | 元素自身路径与其 dependency 目标路径一致（自引用 dependency） | `pathNot` 中不产生重复的自身目录，规则退化为仅有自身目录 | `tests/unit/rule-generation.test.ts` |
| B-6 | 元素自身 link 和祖先 link 同时存在，且祖先 link 为文件路径（如 `packages/cli/index.ts`） | 自身 link 优先（AC-5），不查找祖先；但若 strip 后祖先 link 的目录用于下钻，需正确处理 | `tests/unit/path-resolution.test.ts` |
| B-7 |`.dc-reporter/architecture/` 目录存在但为空目录（无 `.c4` 文件） | 视为"无 .c4 文件"，输出错误信息，exit code 为 1（与 AC-12 行为一致） | `tests/integration/archi-to-rules.test.ts` |
| B-8 |`.dependency-cruiser.js` 使用 ESM 格式（`export default` 而非 `module.exports`） | 系统同样支持 ESM 格式的配置文件解析和更新（若实现不支持，测试应标记为已知限制） | `tests/unit/config-update.test.ts` |
| B-9 | 元素的 `dependency` 关系指向了已过滤掉的元素（如指向 `project` 或 `outer` 类型） | 该关系不纳入规则生成（因为目标不在已过滤的元素集合中），不影响其他有效 dependency | `tests/unit/rule-generation.test.ts` |
| B-10 | 祖先链中存在循环或异常结构（`computed.ancestors(el)` 返回空数组） | 系统回退到无 link 状态，使用默认约定推导路径 | `tests/unit/path-resolution.test.ts` |
| B-11 | 默认约定推导中，第一段 package 的 FQN 深度只有 1 段（如 `ROOT.core`） | 推导路径为 `packages/core/`（不拼接 `src/`，因为没有子段） | `tests/unit/path-resolution.test.ts` |
| B-12 | 默认约定推导中，第一段非 package 的 FQN 深度只有 1 段（如 `ROOT.utils`） | 推导路径为 `src/utils/` | `tests/unit/path-resolution.test.ts` |
| B-13 | 连续多次运行 `archi-to-rules` 且 `extends` 数组中有其他项目录（如 `["./base.json", "./other.json"]`） | 每次运行 `.dc-reporter/archi-rules.json` 条目只出现一次，其他条目不受影响 | `tests/integration/archi-to-rules.test.ts`（含 AC-10） |
| B-14 | `--output` 路径的父目录不存在（如 `-o ./deep/nested/rules.json`） | 系统自动创建父目录（`mkdirSync` with `recursive: true`） | `tests/integration/archi-to-rules.test.ts` |
| B-15 | 多个元素路径解析后路径都不存在，命令一次性报告所有失败路径 | stderr 列出所有元素的名称和对应路径，而不是只报告第一个即退出 | `tests/integration/archi-to-rules.test.ts` |
| B-16 | `.c4` 文件中全部元素均为 `project` 或 `outer` 类型（无 package/module） | 过滤后元素集合为空，系统输出提示信息（无规则可生成）但视为成功（exit code 0），规则文件内容为 `{ "forbidden": [] }` | `tests/integration/archi-to-rules.test.ts` |

---

## 5. 测试环境与依赖

| 项目 | 说明 |
|------|------|
| **新增依赖** | 单元测试需在 `packages/cli/` 添加 `sinon`（可选，用于 mock/spy 辅助）；若使用 `node:test` 的 `mock` 模块（Node.js 22+）则无需新增依赖。`tsx` 用于直接运行 TypeScript 测试文件 |
| **测试执行命令** | `node --test --loader tsx openspec/changes/add-archi-to-rules-command/tests/**/*.test.ts`，或通过 `packages/cli/package.json` 添加 `"test:archi": "node --test openspec/changes/add-archi-to-rules-command/tests/**/*.test.ts"` 脚本 |
| **CI 集成** | 在 CI 配置中新增 `archi-to-rules` 测试步骤，确保在 `pnpm build` 之后运行（需要 `dist/bin/cli.js` 存在） |
| **测试夹具** | `.c4` 文件夹具存放在 `openspec/changes/add-archi-to-rules-command/tests/fixtures/` 目录；mock 数据内联在单元测试文件中 |
| **临时目录** | 集成测试使用 `fs.mkdtempSync` 或 `os.tmpdir()` 创建临时工作目录，测试完成后通过 `after` hook 清理 |

---

## 6. 回归测试注意事项

1. **现有 CLI 命令不受影响：** `analyze` 和 `open` 命令的注册入口（`cli.ts` 和 `commands/index.ts`）在新增 `archi-to-rules` 后应保持不变。回归测试通过检查 `--help` 输出确保三个命令均可见。
2. **`@likec4/language-services` 版本兼容性：** 单元测试 mock 了 `fromSources`/`syncComputedModel`，不依赖实际包行为。集成测试通过真实调用验证与 `@likec4/language-services@1.56.0` 的兼容性。更新该依赖版本时需重新运行全部集成测试。
3. **`.dependency-cruiser.js` 原有配置不变性：** 配置更新逻辑必须在追加 `extends` 的同时保持 `forbidden`、`allowed`、`options` 等原有配置字段不变。回归测试应验证首次运行与后续运行对配置文件的影响。
4. **路径约定与项目目录结构同步：** 如果项目的真实目录结构发生变化（如从 `packages/` 改为 `libs/`），默认约定推导会失效。此情况由 AC-7 的路径存在性验证捕获并报错，测试应确保错误报告清晰可读。
5. **`computed.parent(el)` 和 `computed.ancestors(el)` 的返回值格式：** 如果 `@likec4/language-services` 升级后这些方法的返回结构变化，集成测试将捕获此类回归。单元测试的 mock 数据无需随版本更新，因为 mock 了整层 API。
