# 提案: fix-archi-rules-conflict

> **变更**: fix-archi-rules-conflict
> **日期**: 2026-05-26
> **状态**: 提案中

---

## 问题

### 背景

`dep-report archi-to-rules` 命令从 LikeC4 架构模型（.c4 文件）中读取 package/module 元素及其声明的 dependency 关系，自动生成 dependency-cruiser forbidden 规则。生成的规则用于在 CI/CD 或 pre-commit 阶段验证实际代码依赖是否符合架构定义。

当前实现中，每个 package/module 元素独立生成一条规则：父模块有一条规则，子模块有另一条规则。当父模块和子模块同时存在时，两条规则之间存在预期之外的矛盾。

### 问题描述

`buildForbiddenRule()` 为每个元素生成如下结构的规则：

```json
{
  "from": { "path": "^<resolved-path>" },
  "to": {
    "pathNot": ["<resolved-path>", "<dep1>", "<dep2>"]
  }
}
```

父模块规则（如 `commands`）的 `from.path` 为 `^packages/cli/src/commands`，该正则同时匹配子模块文件，例如 `^packages/cli/src/commands` 匹配 `packages/cli/src/commands/open.ts`（属于 `open` 子模块）。由于父规则的 `to.pathNot` 仅包含父模块自身的允许列表，不包含子模块声明的额外依赖，因此当子模块声明了父模块未声明的依赖时，**父规则会错误地阻止子模块的合法依赖**。

### 具体示例

LikeC4 模型：

```
commands = module {
    open = module {
        -[dependency]-> ROOT.cli.server
    }
}
```

生成的规则：

| 规则名 | from.path | to.pathNot |
|--------|----------|------------|
| `archi-cli-commands` | `^packages/cli/src/commands` | `["packages/cli/src/commands"]` |
| `archi-cli-commands-open` | `^packages/cli/src/commands/open` | `["packages/cli/src/commands/open", "packages/cli/src/server"]` |

对于文件 `packages/cli/src/commands/open.ts`：
- 子规则 `archi-cli-commands-open` 的 `from.path` 匹配，`pathNot` 包含 `server`，所以 `open.ts` 依赖 `server.ts` 是允许的
- 父规则 `archi-cli-commands` 的 `from.path` 也匹配（因为 `^packages/cli/src/commands` 匹配 `packages/cli/src/commands/open.ts`），但 `pathNot` 不包含 `server`

dependency-cruiser 的规则判定逻辑是：**任意一条 forbidden 规则匹配即视为违规**。因此父规则会覆盖子规则，导致本应合法的依赖被标记为违规。

### 目标

修复父子模块规则冲突问题，使得：
1. 父规则不适用于已由子规则专门管辖的文件
2. 子规则独立管辖其子目录下的文件
3. 不存在子模块的叶子模块规则行为保持不变
4. 不改变规则文件格式、输出路径、配置更新等其他行为

---

## 方案

### 方案 A：维持现状

不修复此问题，要求用户手动在父模块的 dependency 声明中列出所有子模块声明的依赖。

| 维度 | 评价 |
|------|------|
| 优点 | 无需任何开发成本 |
| 缺点 | 当子模块数量较多或依赖频繁变化时，父模块的 allowlist 极易过期；用户必须重复声明子模块的依赖，违反 DRY 原则；架构模型越复杂，维护负担越重 |
| 结论 | 不可接受，架构模型规模增长后维护成本指数上升 |

### 方案 B：在父规则的 from.path 中使用负向前瞻排除子路径（推荐）

修改父级元素的 `from.path`，在正则末尾追加负向前瞻（negative lookahead）排除所有直接子模块的路径：

```
# 修改前
^packages/cli/src/commands

# 修改后
^packages/cli/src/commands(?!/open(?=/|\.))(?!/analyze(?=/|\.))
```

| 维度 | 评价 |
|------|------|
| 优点 | 精确排除子路径，不影响父规则对自身目录的约束力；负向前瞻语法在 dependency-cruiser 中完全受支持；无需改变规则数据结构；仅需修改 `buildForbiddenRule` 函数和构建管道，影响范围极小（单个文件，约 60 行变更） |
| 缺点 | 负向前瞻正则可读性稍低；需处理路径中的 regex 特殊字符转义；父模块子模块数量较多时 from.path 会变长（但仍在合理范围） |
| 推荐理由 | 影响范围最小，与现有架构完全兼容，不改变外部接口或文件格式 |

### 方案 C：子规则级联继承祖先规则的允许路径

子模块的 `to.pathNot` 除了包含自身声明的依赖路径外，还级联继承所有祖先规则（父、祖父等）的 `to.pathNot` 中的依赖路径。这确保子模块不会因为祖先允许某依赖而被自己的规则阻止。

**仅方案 B 的遗留问题：**

```
ROOT.cli = package { -[dependency]-> shared_lib }
  └── commands = module
        └── open = module { -[dependency]-> server }
```

仅用 B（from.path 排除）时：`open` 的 pathNot = `[open, server]`，而 `shared_lib` 不在其中。虽然 `ROOT.cli` 声明了 `shared_lib` 是合法依赖，但 `open.ts` 依赖 `shared_lib` 会被 `archi-cli-commands-open` 规则阻止 —— 子规则无意中比祖先更严格。

| 维度 | 评价 |
|------|------|
| 优点 | 架构层次关系得到正确表达：上级允许的依赖，下级自动继承；避免子模块规则意外收紧 |
| 缺点 | 需要遍历祖先链收集依赖路径；pathNot 会因继承而增长（通常可接受） |
| 结论 | 配合方案 B 使用后，能从两个方向（from.path 精确排除 + to.pathNot 级联继承）完整解决规则冲突 |

### 方案 D：跳过父规则生成（仅在子规则足够覆盖时）

检测到某元素的所有路径都被其子元素完整覆盖时，跳过该元素的规则生成。

| 维度 | 评价 |
|------|------|
| 优点 | 减少规则数量 |
| 缺点 | 父目录中但不属于任何子模块的文件将失去约束；覆盖性判定复杂（需要精确路径集合运算）；丢失了 "父目录不得有意外依赖" 的约束力 |
| 结论 | 过度削弱父规则约束力，放弃 |

### 推荐方案：方案 B + C

选择方案 B + C 的理由：
1. **B 精确切分 from.path**：负向前瞻从正则层面排除子路径，父规则不对子模块文件生效
2. **C 级联继承 to.pathNot**：子规则继承祖先允许路径，架构层次语义正确（上级允许 → 下级自动允许）
3. **双向互补**：B 向下缩小匹配范围，C 向下传递允许列表，两层保护互不重叠
4. **最小变更**：仅修改 `buildForbiddenRule()` 和主函数预处理步骤（单个文件约 80 行变更）
5. **向后兼容**：无子模块的元素规则完全不变；规则文件格式不变；CLI 接口不变

实现要点：
1. 构建 parent->children 路径映射（基于 FQN 层次结构）
2. 双阶段处理：先解析所有路径，再构建排除映射和级联依赖，最后生成规则
3. `buildForbiddenRule` 新增 `childExclusionSuffixes` 参数（可选字符串数组，方案 B）
4. 子元素生成规则时，沿祖先链收集所有祖先的 dependencyPaths 合并到自身的 to.pathNot（方案 C）
5. 每个 suffix 生成 `(?!/<suffix>(?=/|\.))` 格式的负向前瞻片段
6. 路径中的 regex 特殊字符（`.`, `+`, `*`, `?`, `\`, `(`, `)`, `[`, `]`, `{`, `}`, `^`, `$`, `|`）进行转义处理

---

## 范围

### 范围内

- 父规则 `from.path` 正则追加负向前瞻排除直接子模块路径（方案 B）
- 子规则 `to.pathNot` 级联继承所有祖先规则的依赖路径（方案 C）
- parent->children 路径映射构建（基于 FQN 层次和已解析路径）
- 祖先链遍历及依赖路径收集
- regex 特殊字符转义处理
- `buildForbiddenRule` 函数签名扩展（新增可选 `childExclusionSuffixes` 参数）
- 主函数 `archiToRules` 双阶段处理改造
- 无子模块的叶子模块规则保持不变
- 子模块路径精确匹配（使用 `(?=/|\.)` 边界断言防止误排除）

### 不在范围内

- C4 解析、元素过滤、关系过滤逻辑变更
- 文件系统路径解析逻辑变更（`resolveElementPath` 不变）
- 路径存在性验证逻辑变更
- 规则文件输出格式变更
- `.dependency-cruiser.js` 配置更新逻辑变更
- CLI 命令接口变更（无新选项）
- 规则合并或去重优化
- 多层嵌套的子路径递归排除（仅排除直接子模块，不排除孙模块）
- 运行 dependency-cruiser 测试生成规则的正确性（用户自行验证）

---

## 能力

### 新增能力

（无）

### 修改的能力

| 能力名称 | 描述 |
|---------|------|
| `archi-to-rules` | 原为每个 package/module 元素独立生成 forbidden 规则。现修改为：父元素规则在 `from.path` 中加入负向前瞻排除直接子模块路径，防止父规则和子规则之间产生约束冲突。叶子模块（无子模块）行为不变。 |

---

## 验收标准

| ID | 验收条件 | 验证方法 | 优先级 |
|----|---------|----------|--------|
| AC-1 | 有子模块的父元素生成的规则中，`from.path` 包含负向前瞻排除所有直接子路径 | 准备一个父模块含 2 个直接子模块（`open` 和 `analyze`）的 C4 模型，执行 `dep-report archi-to-rules`，检查父规则 `from.path` 包含 `(?!/open(?=/|\.))(?!/analyze(?=/|\.))` | P0 |
| AC-2 | 子元素的 `from.path` 不含负向前瞻（子元素不排除自己的子元素） | 同一 C4 模型中，检查子规则 `from.path` 不包含 `(?!/` 负向前瞻语法 | P0 |
| AC-3 | 无子模块的叶子元素规则 `from.path` 格式保持不变 | 准备一个无子模块的 module 元素，检查生成的规则 `from.path` 为 `^<path>`，不包含负向前瞻 | P0 |
| AC-4 | 父规则排除子路径后，子文件的合法依赖不再被父规则阻止 | 准备父子模块模型：子模块声明依赖 `ROOT.cli.server`，父模块未声明此依赖。生成规则后，对子文件 `commands/open.ts` 运行 dependency-cruiser，验证其依赖 `server.ts` 不被报告为违规 | P0 |
| AC-5 | 子路径名称中的 regex 特殊字符被正确转义 | 准备子模块名包含 `.` 或 `+` 的 C4 模型（如 `core+utils`），验证 `from.path` 中对应负向前瞻已将特殊字符转义（如 `core\+utils`） | P1 |
| AC-6 | 不以子模块名称开头的文件不被错误排除（精确边界匹配） | 父目录中存在 `commands/open.ts` 和 `commands/openers.ts`，验证 `commands/openers.ts` 仍受父规则约束（负向前瞻不匹配 `openers`） | P0 |
| AC-7 | 多级嵌套时仅排除直接子模块，不排除孙模块 | 模型 `commands > open > helper`（三层），验证 commands 的 `from.path` 仅排除 `/open`，不排除 `/open/helper` | P1 |
| AC-8 | 所有现有功能（路径解析、文件输出、配置更新）不受影响 | 运行现有验收测试套件，确认所有测试通过 | P0 |
| AC-9 | 规则文件格式不变（仍是 `{ forbidden: [...] }` 结构） | 生成规则后验证 JSON 结构与原格式一致 | P0 |
| AC-10 | 子规则 `to.pathNot` 包含祖先声明的依赖路径（级联继承） | 准备三层嵌套模型：祖先声明依赖 `shared_lib`，子模块声明依赖 `server`。验证子规则 `to.pathNot` 同时包含 `server` 和 `shared_lib` | P0 |
| AC-11 | 非祖先关系的同级模块依赖不交叉污染 | 同级模块 A 继承祖先依赖 X，验证其 pathNot 不包含同级模块 B 独有的依赖路径 | P0 |

---

## 风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 负向前瞻正则与 dependency-cruiser 的 path 解析引擎不兼容（如 Regexp 方言差异） | 高：父规则完全不匹配任何文件，失去约束力 | 低 | dependency-cruiser 使用 JavaScript 的 `RegExp` 对象（`new RegExp(pattern)`），负向前瞻是 ECMAScript 标准语法，在 Node.js 18+ 中完全支持。在 CI 中添加一个集成测试，使用 `new RegExp(from.path)` 验证正则语法正确且匹配预期文件集合 |
| 路径中的特殊字符转义有遗漏，导致生成无效正则 | 高：父规则无法编译，dependency-cruiser 报错 | 中 | 实现独立的 `escapeRegex` 工具函数，覆盖所有 ECMAScript 特殊字符（14 个），添加单元测试验证每种字符的转义结果。代码审查时重点检查转义函数 |
| 父模块的直接子模块数量很多（如 20+），导致 `from.path` 正则超长 | 低：长正则影响可读性，但不影响功能 | 低 | 仅排除直接子模块而非递归排除所有后代，数量通常有限（monorepo 中一个目录下一般不超过 20 个子目录）。生成规则时以正常方式写入文件，无长度上限；若后续需要优化可改为多行格式 |
| 后续添加子模块时忘记重新运行 `archi-to-rules`，旧的父规则仍然不排除新子路径 | 中：新增子模块的合法依赖被父规则阻止 | 中 | 此问题属于工作流层面而非工具缺陷。更新 `.dependency-cruiser.js` 配置是 `archi-to-rules` 的标准工作流环节，建议用户将 `archi-to-rules` 放在 pre-commit hook 中。可在文档中强调 "修改 C4 模型后需重新运行 `archi-to-rules`" |
