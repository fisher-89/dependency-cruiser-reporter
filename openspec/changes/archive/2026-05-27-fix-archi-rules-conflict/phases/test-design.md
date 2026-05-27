# 测试设计: fix-archi-rules-conflict

> **变更**: fix-archi-rules-conflict
> **日期**: 2026-05-26
> **状态**: 设计中

---

## 1. 测试级别

### 1.1 单元测试

| 属性 | 内容 |
|------|------|
| **范围** | `escapeRegex` 工具函数（14 个 ECMAScript 特殊字符转义）；`buildForbiddenRule` 新增 `childExclusionSuffixes` 参数后的正则生成逻辑（负向前瞻拼接、边界断言 `(?=/|\\.)`）；parent->children 路径映射构建（基于 FQN 层次结构）；ancestor 链遍历及依赖路径级联继承（方案 C）；祖先级联去重逻辑；直接子模块排除与孙模块不排除的判定 |
| **框架** | Node.js built-in `node:test` + `node:assert` |
| **运行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\fix-archi-rules-conflict\tests\unit\*.test.ts"`（使用 `tsx` 支持 TypeScript） |
| **文件位置** | `openspec/changes/fix-archi-rules-conflict/tests/unit/` |
| **目标覆盖率** | `escapeRegex` 全部 14 个特殊字符 100%；`buildForbiddenRule` 分支覆盖率 100%（有/无子模块、0-N 个子模块、空 dependencyPaths）；parent->children 映射构建代码覆盖率 100%；ancestor 级联继承逻辑覆盖率 100%（1 层/多层/无祖先） |

**说明：** 单元测试纯函数逻辑，不涉及文件系统或外部依赖。`buildForbiddenRule` 的签名变化是新增可选参数，原有 3 参数签名行为完全不变，通过参数不存在时回退到原逻辑实现向后兼容。

### 1.2 集成测试

| 属性 | 内容 |
|------|------|
| **范围** | `dep-report archi-to-rules` 命令在含有父子模块关系的 C4 模型下的完整执行链路：C4 文件解析、元素过滤、路径解析、父子路径映射构建、负向前瞻生成、祖先级联继承、规则文件写入、配置文件更新。覆盖 AC-1 至 AC-11 |
| **框架** | Node.js built-in `node:test` + `node:assert`，通过 `child_process.spawnSync` 调用 CLI 二进制 |
| **运行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\fix-archi-rules-conflict\tests\integration\archi-to-rules-conflict.test.ts"` |
| **文件位置** | `openspec/changes/fix-archi-rules-conflict/tests/integration/` |
| **目标覆盖率** | AC-1 至 AC-11 的全命令级别验证；包含多种嵌套深度的 C4 模型夹具 |

**说明：** 集成测试在临时工作目录中创建真实的 `.c4` 文件夹具和 `.dependency-cruiser.js`，通过 `spawnSync('node', [cliBinary, 'archi-to-rules', ...])` 执行命令并验证生成的规则文件内容和标准输出/错误码。测试完成后清理临时目录。夹具存放在 `openspec/changes/fix-archi-rules-conflict/tests/fixtures/`。

### 1.3 E2E 测试

| 属性 | 内容 |
|------|------|
| **范围** | 本变更为 CLI 内部逻辑调整，不涉及浏览器交互或新的命令接口。变更覆盖范围仅限 `archi-to-rules.ts` 单文件的纯函数改造。E2E 级别的验证由集成测试覆盖完整命令执行流 |
| **框架** | 不适用（由集成测试覆盖） |
| **运行命令** | 不适用 |
| **文件位置** | 不适用 |
| **目标覆盖率** | 不适用 |

**说明：** `dep-report archi-to-rules` 为纯 CLI 数据转换命令，无 Web 界面交互。集成测试通过 `spawnSync` 调用 CLI 二进制已覆盖从参数解析到文件输出的全链路。本变更仅修改规则生成逻辑，不改动 CLI 接口或输出格式，因此无需新增 E2E 层级。

---

## 2. 覆盖率映射

| AC | 测试级别 | 测试文件 | 测试用例 |
|----|---------|---------|---------|
| AC-1 | 集成 | `tests/integration/archi-to-rules-conflict.test.ts` | 创建含父模块 `commands` 和 2 个直接子模块 `open`、`analyze` 的 C4 文件夹具，执行 `dep-report archi-to-rules`，验证父规则 `from.path` 包含 `(?!/open(?=/|\\.))(?!/analyze(?=/|\\.))` |
| AC-1 | 单元 | `tests/unit/build-forbidden-rule.test.ts` | 调用 `buildForbiddenRule("ROOT.commands", "packages/cli/src/commands", [], ["open", "analyze"])`，验证返回的 `from.path` 为 `^packages/cli/src/commands(?!/open(?=/|\\.))(?!/analyze(?=/|\\.))` |
| AC-2 | 单元 | `tests/unit/build-forbidden-rule.test.ts` | 调用 `buildForbiddenRule("ROOT.commands.open", "packages/cli/src/commands/open", ["packages/cli/src/server"])`（无 `childExclusionSuffixes`），验证 `from.path` 为 `^packages/cli/src/commands/open`，不含 `(?!/` |
| AC-3 | 单元 | `tests/unit/build-forbidden-rule.test.ts` | 调用 `buildForbiddenRule("ROOT.utils", "src/utils", [])`（无 `childExclusionSuffixes`），验证 `from.path` 为 `^src/utils`，格式与旧版一致 |
| AC-4 | 集成 | `tests/integration/archi-to-rules-conflict.test.ts` | 创建 C4 模型：父模块 `commands` 无 dep，子模块 `commands.open` 声明 dep `ROOT.cli.server`。生成规则后，验证父规则的 `from.path` 不匹配 `packages/cli/src/commands/open.ts`（通过构造 `new RegExp(from.path).test("packages/cli/src/commands/open.ts")` 返回 false） |
| AC-5 | 单元 | `tests/unit/escape-regex.test.ts` | 输入含 `.` 的 submodule 名 `core+utils`，验证转义后为 `core\\+utils`；分别测试 14 个特殊字符 `.`, `+`, `*`, `?`, `\`, `(`, `)`, `[`, `]`, `{`, `}`, `^`, `$`, `|` 的转义输出 |
| AC-5 | 集成 | `tests/integration/archi-to-rules-conflict.test.ts` | 创建子模块名包含 `+` 的 C4 模型（如 `core+utils` = module），验证生成规则中对应负向前瞻为 `(?!/core\\+utils(?=/|\\.))` |
| AC-6 | 单元 | `tests/unit/build-forbidden-rule.test.ts` | 父路径为 `packages/cli/src/commands`，排除子路径 `open`，验证 `new RegExp(from.path).test("packages/cli/src/commands/openers.ts")` 返回 true（父规则仍管 openers），`new RegExp(from.path).test("packages/cli/src/commands/open.ts")` 返回 false |
| AC-7 | 单元 | `tests/unit/build-forbidden-rule.test.ts` | 三层嵌套：父 `commands` 排除直接子模块 `open`，验证 `from.path` 不含 `(?!/open/helper`；验证孙模块 `open/helper` 仍被父规则排除 |
| AC-8 | 集成 | `tests/integration/archi-to-rules-conflict.test.ts` | 运行现有 `cli.test.ts` 中 `archi-to-rules` 相关的基础路径测试（无子模块场景），验证路径解析、文件输出、配置更新行为完全不变 |
| AC-9 | 集成 | `tests/integration/archi-to-rules-conflict.test.ts` | 生成规则后验证 JSON 结构为 `{ "forbidden": [...] }`，每条规则包含 `name`、`severity`、`from`、`to` 字段，格式与旧版一致 |
| AC-10 | 集成 | `tests/integration/archi-to-rules-conflict.test.ts` | 创建三层嵌套模型：祖先 `ROOT.cli` 声明 dep `shared_lib`，子模块 `commands` 声明 dep `server`，孙模块 `commands.open` 声明 dep `db`。验证孙规则 `to.pathNot` 同时包含 `db`、`server`、`shared_lib` |
| AC-10 | 单元 | `tests/unit/ancestor-path-inheritance.test.ts` | 构造祖孙三代元素的模拟数据，调用 ancestor 依赖继承函数，验证返回的合并路径集合包含全部三代声明的 dep 路径，且路径去重 |
| AC-11 | 集成 | `tests/integration/archi-to-rules-conflict.test.ts` | 同级模块 A（继承祖先 dep X）和同级模块 B（声明 dep Y），验证模块 A 的规则 `to.pathNot` 不包含 Y，模块 B 的规则不包含 A 特有的路径 |
| AC-11 | 单元 | `tests/unit/ancestor-path-inheritance.test.ts` | 构造两个同级模块各有不同 dep 的模拟数据，验证级联继承后各自的 `to.pathNot` 互不污染 |

---

## 3. 测试策略

### 3.1 整体方法

采用 **单元测试为主 + 集成测试验证全链路** 的策略。本变更的所有逻辑均可抽象为纯函数，脱离文件系统和外部依赖独立验证。

| 层级 | 占比 | 理由 |
|------|------|------|
| 单元测试 | 70% | 负向前瞻生成、regex 转义、parent->children 映射构建、ancestor 级联继承均为纯函数操作，不依赖 C4 解析器或文件系统，运行快速（微秒级），易于覆盖各种边界场景 |
| 集成测试 | 30% | 需要真实的 CLI 进程和 C4 模型进行端到端验证，确保 AC-1/AC-4/AC-8/AC-9 等涉及完整命令链路的条件 |

> **关于 E2E：** 本变更为纯 CLI 内部逻辑调整，不涉及 Web 界面交互。集成测试通过 `spawnSync` 调用 CLI 二进制已覆盖完整的命令执行链路。

### 3.2 测试分类

#### 正向功能测试

**负向前瞻生成（方案 B）：**
- 父模块有 1 个直接子模块时生成单个 `(?!/<child>(?=/|\\.))` 片段
- 父模块有 N 个直接子模块时生成 N 个有序的负向前瞻片段
- 负向前瞻拼接在 `^<path>` 之后，格式为 `^<path>(?!/child1(?=/|\\.))(?!/child2(?=/|\\.))`
- 空 `childExclusionSuffixes` 数组时不追加任何负向前瞻
- 子路径字符串中的 regex 特殊字符被正确转义

**祖先级联继承（方案 C）：**
- 直接父级的 `to.pathNot` 继承给子级
- 祖父级的 `to.pathNot` 继续继承给孙级
- 多层祖先的依赖路径合并到最深子级
- 继承的路径与子级自身声明的路径去重

**精确边界匹配：**
- 负向前瞻使用 `(?=/|\\.)` 边界断言确保 `open` 不排除 `openers`
- 负向前瞻使用 `(?=/|\\.)` 边界断言确保 `analyze` 不排除 `analyzer`

#### 向后兼容测试

- 无子模块的叶子元素规则 `from.path` 格式完全不变（不加负向前瞻）
- 规则文件整体 JSON 结构不变
- 路径解析逻辑（`resolveElementPath`）行为不变
- 配置更新逻辑（`updateDependencyCruiserConfig`）行为不变
- 无父子关系的扁平模型生成规则不变

#### 错误路径测试

- 传入 `childExclusionSuffixes` 中包含空字符串，函数正确处理不生成无效负向前瞻
- 传入的 child suffix 已经经过转义后与路径拼接时不产生语法错误

#### 幂等性测试

- 同一 C4 模型多次运行 `archi-to-rules`，生成的 `from.path` 正则表达式完全一致
- 连续运行不产生重复的 `extends` 条目（此行为来自原有逻辑，本变更不修改）

### 3.3 Mock 策略

| Mock 目标 | 层级 | 策略 |
|-----------|------|------|
| 文件系统操作（`existsSync`、`readFileSync`、`writeFileSync`、`mkdirSync`） | 单元 | 不 mock——单元测试仅测试纯函数，不涉及文件系统 |
| `@likec4/language-services` 的 `fromSources` 和 `syncComputedModel` | 单元 | 不依赖——单元测试直接调用 `buildForbiddenRule` 等纯函数，不经过 C4 解析 |
| CLI 子进程 | 集成 | 不 mock——通过 `spawnSync` 在真实 Node.js 进程中执行 |
| 文件系统 | 集成 | 不 mock——在临时目录中操作，测试完成后清理 |

**说明：** 本变更所有新增逻辑均为纯函数（输入 -> 输出），单元测试无需任何 mock。集成测试通过真实文件系统操作和 CLI 子进程验证完整链路。这比 mock 更可靠，因为 no-mock 策略确保测试结果反映真实的运行时行为。

### 3.4 测试数据

#### 单元测试夹具

**`buildForbiddenRule` 测试用例：**

| 用例 | elementFqn | resolvedPath | dependencyPaths | childExclusionSuffixes | 预期 from.path |
|------|-----------|-------------|----------------|----------------------|---------------|
| 有子模块 | `ROOT.commands` | `packages/cli/src/commands` | `[]` | `["open", "analyze"]` | `^packages/cli/src/commands(?!/open(?=/|\\.))(?!/analyze(?=/|\\.))` |
| 单个子模块 | `ROOT.commands` | `packages/cli/src/commands` | `[]` | `["open"]` | `^packages/cli/src/commands(?!/open(?=/|\\.))` |
| 无子模块 | `ROOT.utils` | `src/utils` | `[]` | 不传 | `^src/utils` |
| 空子模块数组 | `ROOT.commands` | `packages/cli/src/commands` | `[]` | `[]` | `^packages/cli/src/commands` |
| 特殊字符子模块 | `ROOT.core` | `packages/core` | `[]` | `["core+utils"]` | `^packages/core(?!/core\\+utils(?=/|\\.))` |

**`escapeRegex` 测试用例：**

| 输入 | 预期输出 |
|------|---------|
| `open` | `open` |
| `core+utils` | `core\\+utils` |
| `my.module` | `my\\.module` |
| `file(test)` | `file\\(test\\)` |
| `price$100` | `price\\$100` |
| `(path)` | `\\(path\\)` |
| `a|b` | `a\\|b` |

**parent->children 映射构建测试用例：**

| 输入元素列表 | 预期映射 |
|-------------|---------|
| `[ROOT.commands, ROOT.commands.open, ROOT.commands.analyze, ROOT.utils]` | `ROOT.commands` -> `[open, analyze]` |
| `[ROOT.commands, ROOT.commands.open, ROOT.commands.open.helper]` | `ROOT.commands` -> `[open]`（仅直接子模块） |
| `[ROOT.a, ROOT.b]`（同级，无父子关系） | 空映射 |

#### C4 文件夹具

集成测试使用的 C4 文件，存放在 `openspec/changes/fix-archi-rules-conflict/tests/fixtures/`：

| 夹具文件 | 用途 |
|---------|------|
| `parent-two-children.c4` | 含 1 个父 module + 2 个直接子 module（`open`、`analyze`）的模型，用于 AC-1 / AC-2 / AC-4 / AC-6 |
| `flatten-no-children.c4` | 含多个无父子关系的平铺 package/module，用于 AC-3 / AC-8 / AC-9 向后兼容验证 |
| `three-level-nested.c4` | 三层嵌套模型（commands > open > helper），用于 AC-7 / AC-10 祖先级联继承验证 |
| `special-chars-child.c4` | 子模块名含 `+` 的模型，用于 AC-5 |
| `sibling-modules.c4` | 同级模块各有独有 dep 的模型，用于 AC-11 |

---

## 4. 边界用例

| 编号 | 输入/条件 | 期望行为 | 目标测试文件 |
|------|-----------|---------|-------------|
| B-1 | 父模块有 0 个子模块（`childExclusionSuffixes` 为空数组） | `from.path` 不追加任何负向前瞻，行为等同旧版无子模块 | `tests/unit/build-forbidden-rule.test.ts` |
| B-2 | 父模块只有 1 个子模块 | `from.path` 追加单个 `(?!/<child>(?=/|\\.))`，无多余分组 | `tests/unit/build-forbidden-rule.test.ts` |
| B-3 | 子模块名与其他路径前缀恰好相同（如 `open` vs `openers`） | 负向前瞻边界断言 `(?=/|\\.)` 确保 `openers` 不被排除 | `tests/unit/build-forbidden-rule.test.ts` |
| B-4 | 子模块名与父路径中的目录名相同但为不同元素（重名子模块） | 生成的负向前瞻 suffix 基于 FQN 相对路径，重名不影响 | `tests/unit/build-forbidden-rule.test.ts` |
| B-5 | child exclusion suffix 包含路径分隔符（如 `open/helper`） | 负向前瞻正确地排除多层子路径 `(?!/open/helper(?=/|\\.))` | `tests/unit/build-forbidden-rule.test.ts` |
| B-6 | ancestor 链中存在某个祖先未声明任何依赖 | 级联继承跳过无 dep 的祖先，继续向上搜索直到 ROOT | `tests/unit/ancestor-path-inheritance.test.ts` |
| B-7 | ancestor 链中存在依赖路径与子级声明的依赖路径重复 | 级联合并后路径去重，`pathNot` 中每条路径唯一 | `tests/unit/ancestor-path-inheritance.test.ts` |
| B-8 | 子模块 FQN 不继承任何祖先（根元素无父级） | `ancestorFqns` 返回空数组，`to.pathNot` 仅含自身声明 | `tests/unit/ancestor-path-inheritance.test.ts` |
| B-9 | 父模块不存在于 C4 元素集合中（异常情况：ancestor 查找不到） | 级联继承逻辑安全处理，跳过无法查到的 ancestor FQN | `tests/unit/ancestor-path-inheritance.test.ts` |
| B-10 | 路径中的特殊字符连续出现（如 `a++.b`） | 转义函数正确处理连续特殊字符：`a\\+\\+\\.b` | `tests/unit/escape-regex.test.ts` |
| B-11 | 路径中的特殊字符为 Unicode 或 non-ASCII（如 `cafe`） | 非特殊字符原样保留，仅转义 14 个 ECMAScript 特殊字符 | `tests/unit/escape-regex.test.ts` |
| B-12 | C4 模型中存在多层嵌套（> 3 层）且中间层无子模块 | 仅直接子模块被排除，隔代子模块不受父模块负向前瞻影响；ancestor 级联正确收集所有祖先 dep | `tests/integration/archi-to-rules-conflict.test.ts` |
| B-13 | 在同一 C4 模型中，既有有子模块的父模块又有无子模块的叶子模块 | 父模块规则含负向前瞻，叶子模块规则格式不变，混合生成正确 | `tests/integration/archi-to-rules-conflict.test.ts` |
| B-14 | 子模块依赖路径中包含祖先未声明的路径，且祖先已有自身 pathNot 排除 | 子模块 `to.pathNot` 合并祖先的 pathNot 项后，子模块声明的路径不会因合并而被误排除 | `tests/unit/ancestor-path-inheritance.test.ts` |
| B-15 | `childExclusionSuffixes` 中含有空字符串 | 函数忽略空字符串 suffix，不生成无效的 `(?!/)` 负向前瞻 | `tests/unit/build-forbidden-rule.test.ts` |

---

## 5. 测试环境与依赖

| 项目 | 说明 |
|------|------|
| **新增依赖** | 无。`node:test` + `node:assert` 为 Node.js 内置模块，本变更不引入新的测试框架或 mock 库 |
| **测试执行命令** | `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\fix-archi-rules-conflict\tests\unit\*.test.ts"` + `node --test "D:\Projects\dependency-cruiser-reporter\openspec\changes\fix-archi-rules-conflict\tests\integration\archi-to-rules-conflict.test.ts"`，或通过脚本 `"test:archi-fix": "node --test openspec/changes/fix-archi-rules-conflict/tests/**/*.test.ts"` |
| **CI 集成** | 在 CI 配置中新增 `archi-to-rules` 冲突修复测试步骤，确保在 `pnpm build` 之后（需要 `dist/bin/cli.js` 存在）运行，与已有的 `archi-to-rules` 测试并行 |
| **测试夹具** | `.c4` 文件夹具存放在 `openspec/changes/fix-archi-rules-conflict/tests/fixtures/`；单元测试夹具内联在测试文件中 |
| **临时目录** | 集成测试使用 `fs.mkdtempSync` 创建临时工作目录，测试完成后通过 `after` hook 清理 |

---

## 6. 回归测试注意事项

1. **原有 `archi-to-rules` 功能不受影响：** 无子模块的叶子模块（AC-3）规则生成格式不变。集成测试中 `flatten-no-children.c4` 夹具专门验证此场景。`-o`、`--cwd` 等 CLI 选项行为不变（已验证 AC-8）。
2. **`buildForbiddenRule` 函数签名向后兼容：** `childExclusionSuffixes` 为可选参数（默认 `undefined`），不传此参数时函数行为与旧版完全一致。单元测试覆盖无参数调用场景。
3. **规则文件解析兼容性：** dependency-cruiser 使用 Node.js `RegExp` 解析 `from.path`。负向前瞻是 ECMAScript 标准语法，Node.js 18+ 支持。集成测试中通过 `new RegExp(from.path)` 验证生成的正则语法有效。
4. **其他 CLI 命令不受影响：** `analyze` 和 `open` 命令的代码路径未变更。回归测试通过运行 `--help` 确保命令列表完整。
5. **`escapeRegex` 不应误转义路径分隔符：** `escapeRegex` 仅转义 14 个 ECMAScript 特殊字符，不转义 `/`（路径分隔符），以确保 `from.path` 和负向前瞻中的路径分隔符方向正确。
6. **ancestor 级联继承不应导致父级 pathNot 膨胀：** 方案 C 的级联继承仅向下传递（父 -> 子），父级自身的 `to.pathNot` 不因子级而增长。该行为通过 `ancestor-path-inheritance.test.ts` 验证。
