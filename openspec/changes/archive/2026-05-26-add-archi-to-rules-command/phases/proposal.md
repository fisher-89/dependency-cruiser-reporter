# 提案: add-archi-to-rules-command

> **变更**: add-archi-to-rules-command
> **日期**: 2026-05-22
> **状态**: 提案中

---

## 问题

### 背景

dependency-cruiser-reporter 已支持通过 `@likec4/language-services` 解析 `.dc-reporter/architecture/` 目录下的 C4 架构模型文件，并在 Web 查看器的 Architecture 视图中渲染架构图。然而，C4 模型中定义的架构约束（如 "模块 A 只能依赖模块 B"）仅仅停留在可视化层面，无法被强制执行。

### 现状

当前工作流存在以下断层：

1. **人为维护规则**：开发者需要在 `.dependency-cruiser.js` 中手动编写 forbidden 规则来匹配 C4 架构。每当 C4 模型变更（新增模块、调整依赖关系），规则必须同步更新。
2. **架构漂移**：C4 模型与 dependency-cruiser 规则不同步时，实际代码依赖可能悄悄违反架构约束而不被察觉。
3. **重复劳动**：每个 monorepo package 或模块需要手工编写 path 正则和 allowlist，工作量随模块数量线性增长。
4. **入门门槛高**：编写正确的 dependency-cruiser 规则需要理解其 path 匹配语法（`from.path`, `to.pathNot`, `dependencyTypes` 等），对不熟悉该工具的团队成员不友好。

### 目标

提供一个 CLI 命令 `dep-report archi-to-rules`，自动从 C4 架构模型中读取元素和依赖声明，生成对应的 dependency-cruiser forbidden 规则，并集成到项目的 dependency-cruiser 配置中。

---

## 方案

### 方案 A：维持现状（手动维护规则）

继续由开发者手动在 `.dependency-cruiser.js` 中维护与 C4 架构匹配的 forbidden 规则。

| 维度 | 评价 |
|------|------|
| 优点 | 无需开发成本；规则可以自由定制复杂的 path 匹配逻辑 |
| 缺点 | C4 模型与规则之间无自动同步机制，架构漂移风险高；随模块数量增加维护成本线性增长；团队协作时容易遗漏更新 |

### 方案 B：新增 `archi-to-rules` CLI 命令（推荐）

新增 CLI 命令，读取 `.c4` 文件，自动推导路径，生成规则文件，更新配置。

| 维度 | 评价 |
|------|------|
| 优点 | 一次性开发，持续自动化；消除架构漂移；规则与模型同源；降低团队使用门槛 |
| 缺点 | 开发成本（约 300-400 行 TS）；路径推导约定需要团队适配；link 属性和约定推导之间的优先级需要明确文档 |
| 推荐理由 | 与项目现有 C4 基础设施无缝集成；`@likec4/language-services` 已为依赖；direct 映射关系清晰，实现风险可控 |

### 方案 C：运行时规则生成（服务器按需生成）

在 Express 服务器的 `/api/architecture/rules` 端点中按需生成规则，返回给前端或 CLI 消费。

| 维度 | 评价 |
|------|------|
| 优点 | 规则始终与最新 C4 模型同步 |
| 缺点 | 依赖服务器运行时；规则生成逻辑与服务端耦合，无法离线使用；用户需运行 `dep-report open` 才能获得规则 |
| 结论 | 不适合 CI/CD 场景，放弃 |

### 推荐方案：方案 B

选择方案 B（CLI 命令）的理由：
1. **CI/CD 友好**：命令可在 pre-commit hook 或 CI 管道中独立执行，无需启动 Web 服务器
2. **与现有模式一致**：`analyze` 和 `open` 已是独立命令，`archi-to-rules` 遵循相同架构
3. **明确的生命周期**：`analyze` → `archi-to-rules` → `open` 形成完整的工作流
4. **实现简单**：纯数据转换，无状态、无副作用（除写文件外）

---

## 范围

### 范围内

- C4 文件解析（使用现有的 `@likec4/language-services` API：`fromSources()` → `syncComputedModel()`）
- 元素过滤：仅包含 `kind ∈ {package, module}` 的元素
- 关系过滤：仅包含 `kind = "dependency"` 的关系
- 文件系统路径解析（`link` 属性优先，无 `link` 时使用层级约定推导）
- 路径存在性验证（路径不存在时输出警告并退出）
- 为每个 package/module 元素生成一条 dependency-cruiser forbidden 规则
- 规则 allowlist：元素自身目录 + 所有声明的 dependency 目标路径
- 无依赖声明的元素生成仅允许自引用的规则
- 输出写入 `.dc-reporter/archi-rules.json`
- 更新 `.dependency-cruiser.js` 添加/追加 `extends: [".dc-reporter/archi-rules.json"]`
- `extends` 的幂等性处理（跳过重复条目）
- 命令注册：`packages/cli/src/commands/archi-to-rules.ts` + 更新 `index.ts` 和 `cli.ts`

### 不在范围内

- C4 模型编辑或修改（.c4 文件是只读输入）
- 运行 dependency-cruiser 进行规则验证（仅生成规则文件，不执行巡航）
- 在 Web UI 中展示生成的规则（仅写文件）
- 双向同步（反向从规则更新 C4 模型）
- 自定义规则模板或覆盖（生成的规则结构固定）
- `project` 和 `outer` 类型的元素映射为规则（设计上仅 package/module 产生规则）
- 增量更新（每次运行全量生成并覆盖已有规则文件）

---

## 能力

### 新增能力

| 能力名称 | 描述 |
|---------|------|
| `archi-to-rules` | 将 C4 架构模型（.c4 文件）中的 package/module 元素及其声明的 dependency 关系自动转换为 dependency-cruiser forbidden 规则集，写入规则文件并更新项目配置 |

### 修改的能力

| 能力名称 | 描述 |
|---------|------|
| `cli` | CLI 命令接口新增第三个命令 `archi-to-rules`，项目结构增加 `archi-to-rules.ts` 源文件，命令注册入口更新 |

---

## 验收标准

| ID | 验收条件 | 验证方法 | 优先级 |
|----|---------|----------|--------|
| AC-1 | `dep-report archi-to-rules` 可从 `.dc-reporter/architecture/` 目录读取所有 `.c4` 文件并成功解析 | 准备一个包含有效 package 和 module 元素的 .c4 文件，执行命令，确认无错误退出（exit code 0） | P0 |
| AC-2 | 生成的 `archi-rules.json` 文件中，每个 package 和 module 元素对应一条 forbidden 规则，且规则 name 格式为 `archi-<element.path.with.hyphens>` | 执行命令后检查输出文件，验证规则数量等于 package + module 元素数，验证每条规则的 name 前缀为 `archi-` | P0 |
| AC-3 | 规则中 `from.path` 为元素自身目录的正则表达式，`to.pathNot` allowlist 包含自身目录和所有 dependency 目标的目录 | 针对一个元素有 3 个声明的 dependency 关系，验证生成的 `pathNot` 正则包含正确的 4 个路径（自身 + 3 个目标），且以 `^(…/|…/|…/|…/)$` 格式组织 | P0 |
| AC-4 | 无依赖声明的元素生成仅自引用的规则（`pathNot` 只包含自身目录） | 准备一个无依赖声明的 package 元素，验证生成的 `pathNot` 只包含该元素自身目录 | P0 |
| AC-5 | 自身 `link` 优先；无 link 时沿祖先链查找第一个有 link 的祖先并下钻推导路径 | 为元素 A 设置 `link="src/utils/"`，元素 B 无 link 但其 package 祖先有 link；验证 A 直接使用自身 link，B 从祖先 link 下钻 | P0 |
| AC-6 | 祖先链下钻推导正确：package 祖先下钻时拼接 `src/`，module 祖先下钻时不拼接；无任何 link 时使用默认约定 | 准备 4 个场景验证：自身 link、package 祖先 link 下钻、module 祖先 link 下钻、无 link 默认推导 | P0 |
| AC-7 | 解析后的路径在磁盘上不存在时，命令输出警告信息并退出（exit code 1） | 准备一个元素的路径在磁盘上不存在，执行命令，验证 stderr 包含 "WARNING" 或 "not found"，exit code 为 1 | P0 |
| AC-8 | 输出文件写入到 `--output` 指定的路径，默认写入 `<cwd>/.dc-reporter/archi-rules.json` | 不传 `--output` 时验证文件写入 `.dc-reporter/archi-rules.json`；传 `--output ./custom.json` 时验证写入 `./custom.json` | P0 |
| AC-9 | `.dependency-cruiser.js` 被更新为包含 `extends: [".dc-reporter/archi-rules.json"]` | 执行命令后检查 `.dependency-cruiser.js` 的 `extends` 字段包含 `.dc-reporter/archi-rules.json` | P0 |
| AC-10 | `extends` 更新是幂等的：连续多次运行不会产生重复条目 | 连续执行两次命令，检查 `.dependency-cruiser.js` 中 `.dc-reporter/archi-rules.json` 只出现一次 | P0 |
| AC-11 | `--cwd` 选项改变工作区根目录，`.c4` 文件和输出规则文件的路径均基于 `--cwd` 解析 | 执行 `dep-report archi-to-rules --cwd ./my-project`，验证从 `./my-project/.dc-reporter/architecture/` 读取 .c4 文件，输出写入 `./my-project/.dc-reporter/archi-rules.json` | P1 |
| AC-12 | `.dc-reporter/architecture/` 目录不存在或无 `.c4` 文件时，命令输出明确的错误信息并退出 | 删除架构目录后执行命令，验证输出包含 "architecture directory not found" 或类似信息，exit code 为 1 | P1 |
| AC-13 | `.c4` 文件解析失败（语法错误）时，命令输出解析错误信息并退出 | 准备一个包含语法错误的 `.c4` 文件，执行命令，验证输出包含解析错误详情，exit code 为 1 | P1 |
| AC-14 | `.dependency-cruiser.js` 的 `extends` 字段已存在但为字符串时，转换为包含原值和新增值的数组 | 将现有配置的 `extends` 设为 `".dependency-cruiser.json"`，执行命令，验证 `extends` 变为 `[".dependency-cruiser.json", ".dc-reporter/archi-rules.json"]` | P1 |
| AC-15 | 规则仅过滤 `dependencyTypes: ["local"]`，不对 npm/core/dynamic 依赖生效 | 验证生成的规则文件中每个规则的 `to.dependencyTypes` 为 `["local"]` | P1 |

---

## 风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 层级约定推导的路径与项目实际目录结构不匹配，导致生成的规则无法匹配任何文件 | 中：规则失效，用户误以为架构合规 | 中 | 在 README 或命令文档中明确列出路径推导约定表；实现路径存在性检查（AC-7），路径不存在时退出并列出失败元素；支持用户通过 `link` 属性完全覆盖路径 |
| `@likec4/language-services`（1.56.0）的 `$data.elements` 中 `parent` 字段始终为 `undefined`，需改用 `computed.parent(el)` 和 `computed.ancestors(el)` 方法获取层级关系 | 中：API 调用方式与初始预期不同 | 高（已确认） | 已实测确认：`computed.parent(el)` 和 `computed.ancestors(el)` 可用，元素层级关系和 link 属性均可通过此 API 获取。路径解析改为祖先链下钻策略，优先使用祖先的 link，仅在无任何 link 时使用默认约定 |
| `.dependency-cruiser.js` 使用 CommonJS（`module.exports`）而非 ESM，可能导致 `extends` 修改逻辑复杂 | 中：配置文件更新需额外处理 | 中 | 实现基于 AST 或正则的配置文件修改逻辑，而非简单字符串替换；支持 `module.exports = { extends: ... }` 和 `export default { extends: ... }` 两种格式；开发阶段用项目自身的 `.dependency-cruiser.js` 测试 |
| `@likec4/core` 的 `ModelData` 类型在后续版本变更，导致生成的规则逻辑错误 | 中：类型不匹配 | 低 | 在 `archi-to-rules.ts` 中使用明确的接口定义（而非依赖自动推断），只读取 `elements` 和 `relations` 中的基础字段（`id`, `kind`, `path`, `link`, `targets`），这些字段在 C4 DSL 规范中稳定 |
| 生成的规则文件过大（大量元素时），影响 dependency-cruiser 性能 | 低：巡航速度变慢 | 低 | 规则只是 path 正则匹配，dependency-cruiser 对其性能影响很小；如有必要可在后续版本增加规则合并优化（相同 allowlist 的元素共享规则） |
