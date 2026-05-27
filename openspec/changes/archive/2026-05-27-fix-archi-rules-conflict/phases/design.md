# 设计文档: fix-archi-rules-conflict

> **变更**: fix-archi-rules-conflict
> **日期**: 2026-05-26
> **状态**: 设计中

---

## 1. 架构组件

### 1.1 组件总览

本变更的修改范围限定在 `packages/cli/src/commands/archi-to-rules.ts` 一个文件内。与现有架构的关系如下（灰色标记新增/修改的组件）：

```
┌──────────────────────────────────────────────────────────────────────────┐
│  archi-to-rules.ts (命令入口)                                            │
│                                                                          │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐         │
│  │ C4 Model Loader     │   │ Path Resolver                    │         │
│  │ ・fromSources()     │   │ ・Self link 优先                 │         │
│  │ ・syncComputedModel │   │ ・Ancestor link 下钻             │         │
│  │ ・Filter elements   │──→│ ・Default convention 兜底         │──→      │
│  │ ・Filter relations  │   │ ・磁盘存在性验证                   │         │
│  └──────────┬──────────┘   └──────────────────────────────────┘         │
│             │                                                           │
│             ▼                                                           │
│  ┌───────────────────────────────┐                                      │
│  │ 新增: Hierarchy Analyzer     │                                      │
│  │ ・parent→children FQN 映射    │                                      │
│  │ ・直接子模块判定              │                                      │
│  │ ・ancestor 链依赖路径收集     │                                      │
│  └───────────────┬───────────────┘                                      │
│                  │                                                       │
│                  ▼                                                       │
│  ┌──────────────────────────────────┐   ┌────────────────────────────┐  │
│  │ Rule Builder (修改)              │   │ Config Updater             │  │
│  │ ・forbidden rule 生成            │   │ ・extends 字段添加/追加    │  │
│  │ ・负向前瞻 from.path 构建 (B)    │──→│ ・字符串→数组转换          │  │
│  │ ・祖先级联 pathNot 继承 (C)      │   │ ・幂等性跳过               │  │
│  │ ・写入 archi-rules.json          │   │ ・更新 .dependency-cruiser │  │
│  └──────────────────────────────────┘   └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 组件明细

| 组件 | 文件 | 职责 | 技术 | 变更类型 |
|------|------|------|------|---------|
| `archiToRules` (命令入口) | `archi-to-rules.ts` | CLI 命令主入口：解析选项、编排完整工作流、处理错误和退出码。新增双阶段处理：先解析全部路径，再构建排除映射和级联依赖，最后生成规则。 | TypeScript, Commander.js | **修改** (工作流改造) |
| `HierarchyAnalyzer` | `archi-to-rules.ts` (新增纯函数) | 基于 FQN 层次结构构建 parent→children 路径映射。`getParentFqn` 和 `ancestorFqns` 已有，新增 `buildParentChildMap` 函数（遍历所有元素 FQN，找出直接子模块）。同时负责沿 ancestor 链收集依赖路径用于级联继承（方案 C）。 | TypeScript | **新增** |
| Rule Builder (修改) | `archi-to-rules.ts` (修改函数 `buildForbiddenRule` 和 `buildRulesFile`) | `buildForbiddenRule` 新增可选参数 `childExclusionSuffixes`：传入时在 `from.path` 末尾追加负向前瞻。新增 `escapeRegex` 工具函数用于转义子路径中的 ECMAScript 特殊字符。`buildRulesFile` 扩展为传递子模块信息。 | TypeScript / ECMAScript 正则 | **修改** |
| Path Resolver / Validator / Config Updater | `archi-to-rules.ts` | 路径推导、磁盘存在性验证、配置更新。**本变更不修改这些组件。** | TypeScript | **不变** |
| C4 Model Loader | `archi-to-rules.ts` | C4 文件解析与元素过滤。**本变更不修改**（但新增的 `HierarchyAnalyzer` 消费它的输出）。 | `@likec4/language-services` | **不变** |

### 1.3 修改的函数签名

```
-- 修改前 --
buildForbiddenRule(elementFqn, resolvedPath, dependencyPaths)
  → ForbiddenRule

buildRulesFile(elements: [{ elementFqn, resolvedPath, dependencyPaths }])
  → { forbidden: ForbiddenRule[] }

archiToRules(options)
  → Promise<void>

-- 修改后 --
buildForbiddenRule(elementFqn, resolvedPath, dependencyPaths, childExclusionSuffixes?)
  → ForbiddenRule

buildRulesFile(elements: [{ elementFqn, resolvedPath, dependencyPaths, childExclusionSuffixes? }])
  → { forbidden: ForbiddenRule[] }

archiToRules(options)
  → Promise<void>

-- 新增 --
escapeRegex(str: string)
  → string

buildParentChildMap(elements: { id: string }[])
  → Map<string, string[]>
```

### 1.4 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `packages/cli/src/commands/archi-to-rules.ts` | **修改** | 新增 ~80 行：`escapeRegex`、`buildParentChildMap`、修改 `buildForbiddenRule` 和 `buildRulesFile` 和 `archiToRules`。 |
| `openspec/changes/fix-archi-rules-conflict/tests/unit/escape-regex.test.ts` | 新增 | 14 个 ECMAScript 特殊字符转义单元测试 |
| `openspec/changes/fix-archi-rules-conflict/tests/unit/build-forbidden-rule.test.ts` | 新增 | 负向前瞻生成规则单元测试 |
| `openspec/changes/fix-archi-rules-conflict/tests/unit/ancestor-path-inheritance.test.ts` | 新增 | 祖先级联继承单元测试 |
| `openspec/changes/fix-archi-rules-conflict/tests/integration/archi-to-rules-conflict.test.ts` | 新增 | 全链路集成测试 |
| `openspec/changes/fix-archi-rules-conflict/tests/fixtures/*.c4` | 新增 | 测试文件夹具 |

### 1.5 模块依赖关系

```
packages/cli/src/commands/archi-to-rules.ts  (修改, 单文件)
  dependencies (不变):
    node:fs
    node:path
    @likec4/language-services
  新增内部函数 (不增加外部依赖):
    escapeRegex()
    buildParentChildMap()
```

**本变更不引入任何新的外部依赖。**

---

## 2. 数据流

### 2.1 主流程（修改后）

```
archiToRules(options):
  1. 加载 C4 模型 (loadC4Model, 不变)
  2. 过滤元素: kind ∈ {package, module} (不变)
  3. 过滤关系: kind = "dependency" (不变)
  4. 构建依赖目标路径映射 (不变)
  5. 解析所有元素路径 → pathMap (不变)
  6. [新增] 构建 parent→children 路径映射
     buildParentChildMap(filteredElements)
       → 遍历所有 FQN, 对每个元素提取 ancestors, 反向建立父→子映射
       → 仅记录直接子模块 (非递归)
  7. [新增] 构建 child exclusion suffixes 映射
     childExclusionMap = Map<parentFqn, string[]>
       从 parent→children 映射和 pathMap 推导每个父元素需要排除的子路径 suffix
  8. [新增] 构建 ancestor dependency 继承映射
     ancestorDepMap = Map<elementFqn, string[]>
       沿 ancestorFqns 链收集每个祖先的 dependencyPaths 合并去重
  9. 生成规则 (buildRulesFile)
     传递 childExclusionMap 和 ancestorDepMap
     每个元素: buildForbiddenRule(fqn, path, deps, children_exclusions)
       → childExclusionSuffixes 非空时追加负向前瞻
       → dependencyPaths 已包含自身路径 + 自身声明的依赖 + 祖先继承的依赖 (去重)
  10. 验证路径存在性 (不变)
  11. 写入规则文件 (不变)
  12. 更新 .dependency-cruiser.js (不变)
```

### 2.2 parent→children 路径映射算法

```
buildParentChildMap(elements: { id: string }[]):
  输入: 所有有效元素的 FQN 列表
  输出: Map<parentFqn, directChildSuffix[]>
    例: { "ROOT.commands" → ["open", "analyze"] }

  算法:
    1. 初始化 result = new Map()
    2. 初始化 allFqns = new Set(element fqns)
    3. 遍历每个 element:
       a. 提取 ancestorFqns(fqn)
       b. 对每个 ancestor，取相对 FQN: relativeFqn(fqn, ancestor)
          如果 relativeFqn 不包含 "." (即直接子模块)
          且 ancestor 在 allFqns 中
            → result.get(ancestor).push(relativeFqn)
    4. 返回 result (去重后的 suffix 数组)

  例:
    元素: [ROOT.commands, ROOT.commands.open, ROOT.commands.analyze, ROOT.utils]
    ROOT.commands.open:
      ancestors = ["ROOT.commands"]
      relativeFqn("ROOT.commands.open", "ROOT.commands") = "open"
      "open" 不包含 "." → 直接子模块
      result["ROOT.commands"].push("open")
    ROOT.commands.analyze:
      ancestors = ["ROOT.commands"]
      relativeFqn("ROOT.commands.analyze", "ROOT.commands") = "analyze"
      "analyze" 不包含 "." → 直接子模块
      result["ROOT.commands"].push("analyze")
    ROOT.utils: ancestors = [] → 跳过
    输出: Map { "ROOT.commands" → ["open", "analyze"] }
```

### 2.3 祖先依赖级联继承算法（方案 C）

```
collectAncestorDeps(elementFqn, dependencyMap, elementMap):
  输入:
    - elementFqn: string (当前元素的 FQN)
    - dependencyMap: Map<fqn, Set<string>> (每个元素声明的依赖路径)
    - allElements: Map<string, C4Element> (所有元素映射)
  输出: string[] (合并去重后的依赖路径)

  算法:
    1. 初始化 inherited = new Set<string>()
    2. 获取 ancestors = ancestorFqns(elementFqn)  // ["ROOT.commands", "ROOT"]
    3. 遍历每个 ancestor:
       a. 检查 ancestor 是否在 dependencyMap 中 (有效元素)
       b. 获取 ancestor 的 dependencyPaths
       c. 将每个路径加入 inherited
    4. 返回 Array.from(inherited)

  例:
    元素: ROOT.cli.commands.open
    祖先: ["ROOT.cli.commands", "ROOT.cli", "ROOT"]
    依赖路径映射:
      ROOT.cli → ["packages/shared_lib"]
      ROOT.cli.commands → ["packages/server"]
      ROOT.cli.commands.open → ["packages/db"]
    级联继承结果: ["packages/db", "packages/server", "packages/shared_lib"]
    (自身依赖 + 所有祖先依赖, 已去重)
```

### 2.4 负向前瞻生成算法（方案 B）

```
buildChildExclusionSuffixes(suffixes: string[]):
  输入: 子模块名称 suffix 数组 (如 ["open", "analyze"])
  输出: 按序拼接的负向前瞻字符串 (如 "(?!/open(?=/|\|\.))(?!/analyze(?=/|\|\.))")

  算法:
    1. 过滤空字符串 suffix
    2. 对每个 suffix:
       a. escapedSuffix = escapeRegex(suffix)  // 转义 ECMAScript 特殊字符
       b. 生成 `(?!/${escapedSuffix}(?=/|\\.))` 片段
    3. 所有片段按原序拼接

  边界断言 (?=/|\\.) 的含义:
    - (?=/)  下一个字符是路径分隔符 / (子模块作为目录)
    - (?=\\.) 下一个字符是 . (子模块作为文件名, 如 open.ts 匹配 open)
    - 两者之一匹配即视为边界命中
    - 例: "open" 匹配 "open.ts"(.) 和 "open/index.ts"(/)
    - 例: "open" 不匹配 "openers.ts" (e 不是 / 也 不是 .)

  from.path 最终格式:
    ^<resolvedPath>(?!/<child1>(?=/|\.))(?!/<child2>(?=/|\.))
    例: ^packages/cli/src/commands(?!/open(?=/|\.))(?!/analyze(?=/|\.))
```

### 2.5 规则构建数据流

```
输入阶段:
  filteredElements: C4Element[]          (过滤后的 package/module)
  dependencyMap: Map<FQN, Set<path>>      (每个元素的依赖目标路径)

处理阶段 A (新增):
  parentChildMap = buildParentChildMap(filteredElements)
    Map<parentFqn, directChildSuffixes[]>

  ancestorDepMap = new Map<FQN, string[]>()   (级联继承的依赖)
  for each el in filteredElements:
    inherited = collectAncestorDeps(el.id, dependencyMap, elementMap)
    ancestorDepMap.set(el.id, inherited)

处理阶段 B:
  childExclusionMap = new Map<FQN, string[]>()  (负向前瞻 suffix)
  for each [parentFqn, children] in parentChildMap:
    childExclusionMap.set(parentFqn, children)

规则生成:
  for each el in filteredElements:
    childSuffixes = childExclusionMap.get(el.id) ?? []
    allDeps = mergeDedupe(
      dependencyMap.get(el.id),        // 自身声明的依赖
      ancestorDepMap.get(el.id) ?? []  // 祖先继承的依赖
    )
    rule = buildForbiddenRule(
      el.id,
      pathMap.get(el.id),
      allDeps,
      childSuffixes   // 新参数
    )
```

### 2.6 数据模型

```
// 新增内部类型 (不暴露到规则文件)
interface HierarchyMapping {
  // parent FQN → 直接子模块的路径 suffix 列表
  parentChildMap: Map<string, string[]>;
  // element FQN → 从所有祖先继承的依赖路径 (级联合并去重)
  ancestorDepMap: Map<string, string[]>;
}

// 以下为已有类型，本变更不修改:
// (仅 show 实际的 JSON 规则文件格式)
interface ArchiRulesFile {
  forbidden: ForbiddenRule[];
}

interface ForbiddenRule {
  name: string;
  severity: "error";
  comment: string;
  from: {
    path: string;        // "packages/cli/src/commands(?!/open(?=/|\.))..."
  };
  to: {
    pathNot: string[];   // 包含自身路径 + 自身声明依赖 + 祖先继承依赖 (去重)
    dependencyTypes: ["local"];
  };
}
```

---

## 3. 路由 / API 设计

### 3.1 CLI 命令接口

**本变更不修改 CLI 接口。** `dep-report archi-to-rules` 命令的选项、行为、输出保持完全不变：

| 选项 | 类型 | 默认值 | 变更 |
|------|------|--------|------|
| `--cwd <path>` | string | `.` | 不变 |
| `--output, -o <path>` | string | `<cwd>/.dc-reporter/archi-rules.json` | 不变 |

无新选项。生成规则的内含行为优化，对外接口透明。

### 3.2 纯函数接口 (可测试)

```
-- 新增 --
function escapeRegex(str: string): string;
  // 输入任意字符串，输出 ECMAScript 13 个特殊字符被反斜线转义后的字符串

function buildParentChildMap(
  elements: ReadonlyArray<{ id: string }>
): Map<string, string[]>;
  // 输入所有有效元素的 FQN 列表
  // 输出 Map<parentFQN, directChildSuffix[]>
  // 例: { "ROOT.commands" → ["open", "analyze"] }

function collectAncestorDeps(
  elementFqn: string,
  dependencyMap: Map<string, Set<string>>,
  allElements: Map<string, C4Element>
): string[];
  // 沿 ancestor 链收集所有祖先的 dependencyPaths
  // 返回去重后的完整数组

-- 修改 (签名扩展) --
function buildForbiddenRule(
  elementFqn: string,
  resolvedPath: string,
  dependencyPaths: string[],
  childExclusionSuffixes?: string[]   // 新增可选参数
): ForbiddenRule;

function buildRulesFile(
  elements: Array<{
    elementFqn: string;
    resolvedPath: string;
    dependencyPaths: string[];
    childExclusionSuffixes?: string[];  // 新增可选字段
  }>
): { forbidden: ForbiddenRule[] };

-- 未变更 --
function resolveElementPath(...): string;    // 不变
function validatePaths(...): Array<[...]>;    // 不变
function updateDependencyCruiserConfig(...): boolean;  // 不变
```

### 3.3 函数签名向后兼容说明

`buildForbiddenRule` 的第 4 个参数 `childExclusionSuffixes` 是可选的。不传此参数时（或传入 `undefined`/空数组时），函数行为与旧版完全一致，不在 `from.path` 追加任何负向前瞻。这确保了：
- 单元测试中旧版调用方式无需更改
- `buildRulesFile` 在不传 `childExclusionSuffixes` 字段时回退到旧版行为
- 叶子模块（无子模块）生成规则格式不变

---

## 4. 设计决策

### 决策 1: 双阶段处理 (resolve-first, then exclude + cascade)

**选择方案**: 在 `archiToRules` 主流程中，先遍历所有元素完成路径解析（阶段 1），再遍历一次构建 parent→children 映射和级联依赖（阶段 2），最后一次性生成所有规则（阶段 3）。

**备选方案**: 单次遍历时边解析边生成，遇到子模块时反查父级修改已生成的规则。

| 对比维度 | 双阶段处理 (选中) | 单次遍历+后补修改 (备选) |
|---------|------------------|------------------------|
| 实现复杂度 | 两遍遍历逻辑清晰，每个阶段职责单一 | 需维护"待修补"列表，有顺序依赖（先生成父再生成子） |
| 可读性 | 线性流程，容易理解 | 逻辑交织，数据流不清晰 |
| 调试友好性 | 可在阶段间打印中间数据 | 中间状态分散在各处 |
| 性能 | 多一次遍历，O(2n) vs O(n) | 单次遍历，无额外开销 |
| 正确性保障 | 所有信息就绪再生成，无需反查 | 需保证父规则已生成，否则修补失败 |

**决策理由**: 元素数量通常 < 100，O(2n) vs O(n) 差异可忽略。双阶段处理让每个阶段的职责清晰分离：阶段 1 解决"是什么路径"，阶段 2 解决"谁排除谁、谁继承谁"。逻辑正确性优先于微小的性能差异。单次遍历方案中，如果父子元素遍历顺序不确定，后补修改逻辑会变得脆弱。

### 决策 2: 仅排除直接子模块，不递归排除

**选择方案**: 父模块仅排除其直接子模块路径，不排除孙模块。例如 `commands` 排除 `/open`，不排除 `/open/helper`。

**备选方案**: 递归排除所有后代路径（包括孙模块）。

| 对比维度 | 仅直接子模块 (选中) | 递归排除所有后代 (备选) |
|---------|--------------------|------------------------|
| 排除范围 | 直接子模块的文件不受父规则约束 | 所有后代文件都不受父规则约束 |
| 捕获能力 | 能捕获"孙模块文件意外匹配父规则但子模块规则已放行"的场景（做了冗余保护） | 父规则对后代的完全不适用 |
| 规则数量增长 | 仅当添加新的直接子模块时增长 | 任何后代添加都导致父规则增长 |
| 实现复杂度 | 仅在 parent→children 映射中检查 `relativeFqn` 是否包含 `.` | 需要递归遍历所有 descendant，在 parent→children 映射中插入所有后代 paths |

**决策理由**: 仅排除直接子模块已经足够——子模块自己的规则已经管辖其内部文件，孙模块的规则也由子模块管理。父规则主要用于处理"父目录中但不属于任何直接子模块的文件"。递归排除会提供冗余保证（父规则对孙模块已无约束力），但增长父规则的复杂度和出错概率。遵循最小变更原则（AC-7 要求仅排除直接子模块）。

### 决策 3: 负向前瞻使用 `(?=/|\\.)` 边界断言

**选择方案**: 负向前瞻后跟 `(?=/|\\.)` 边界断言，确保 `open` 不排除 `openers`。

**备选方案 A**: 负向前瞻后跟 `(?:/|$)` 仅匹配目录边界

| 对比维度 | `(?=/|\\.)` (选中) | `(?:/|$)` (备选) |
|---------|-------------------|-----------------|
| 边界定义 | 匹配路径分隔符 `/` 或文件名扩展名分隔符 `.`（如 `.ts`） | 仅匹配路径分隔符 `/` 或字符串末尾 |
| 子模块文件名匹配 | `open.ts` 匹配 `open`（因为 `open` 后是 `.`） | `open.ts` 不匹配 `open`（因为 `open` 后是 `.ts`，不是 `/` 或 `$`） |
| 子模块目录匹配 | `open/index.ts` 匹配 `open/` | `open/index.ts` 匹配 `open/` |
| 防止误排除 | `openers` 不被排除（`e` 不是 `/` 也不是 `.`） | `openers` 不被排除（`ers` 不是 `/`） |
| 一致性 | 文件路径在 `from.path` 正则中总是匹配文件和目录，边界断言也应匹配两种 | 漏掉了文件形式的子模块（当子模块对应单文件时） |

**决策理由**: 在 dependency-cruiser 的上下文中，`from.path` 正则需要同时匹配文件和目录。例如 `^packages/cli/src/commands` 匹配目录 `commands/index.ts` 也匹配文件 `commands.ts`。边界断言 `(?=/|\\.)` 保留相同的语义：子模块名为 `open` 时，排除 `open.ts`（`.` 分隔）、`open/index.ts`（`/` 分隔），但不排除 `openers.ts`（`e` 不是边界）。备选 A 漏掉了单文件场景（如子模块对应单文件而非目录），备选 B 会过度排除。

**备选方案 B**: 负向前瞻后跟 `(?:/|\.|$)` 包含字符串末尾

`(?!/\b)` 可能漏掉文件名边界，`(?:/|\.|$)` 会错误地匹配 `open.other.ts` 中的第一个 `.`。`(?=/|\\.)` 在正确性（排除子模块）和精确性（不误排除前缀相同但无关的文件）之间取得最佳平衡。

### 决策 4: `escapeRegex` 独立工具函数

**选择方案**: 实现独立的 `escapeRegex` 函数，转义 ECMAScript 正则表达式中的全部 14 个特殊字符。

**备选方案**: 使用 Lodash 的 `_.escapeRegExp` 或 RegExp 构造函数自动转义

| 对比维度 | 独立 escapeRegex (选中) | Lodash (备选) | RegExp 构造 (备选) |
|---------|------------------------|--------------|------------------|
| 依赖 | 无增加 | 新增 `lodash` 依赖 (~24KB min+gzip) | 无增加，但 RegExp 不提供转义能力 |
| 可控性 | 完全控制转义规则，测试 14 个字符全覆盖 | 依赖第三方实现 | 无现成转义，需手动构建转义逻辑 |
| 代码量 | ~8 行 | 1 行 import + 1 行调用 | - |
| 已有依赖 | 无 | 不在项目依赖中 | - |
| 可靠性 | 等价于标准 `RegExp.escape` 提案行为 | 等价于标准行为 | RegExp 构造函数 `new RegExp(str)` 不需要手动转义 |

**澄清**: `new RegExp(str)` 不需要手动转义——将任意字符串传给 RegExp 构造函数时，字符串中的特殊字符是字面量还是语法取决于上下文。但在负向前瞻拼接场景中，我们需要将子模块名安全地嵌入 `(?!/${suffix}(?=/|\\.))` 模板字符串中。如果 suffix 包含 `.` 或 `+` 等字符，它们会被 RegExp 解析为正则语法而不是字面量。因此必须手动转义。

**决策理由**: `escapeRegex` 是仅 ~8 行的纯函数，测试和验证都非常简单。引入新依赖（Lodash）不符合项目中"最小依赖"的原则。此函数是本变更的核心基础函数（AC-5 要求），独立的实现让测试和审查都更清晰。

### 决策 5: 祖先级联继承仅在生成时合并，不修改原始 dependencyMap

**选择方案**: 在规则生成阶段实时合并祖先依赖路径，不污染 `dependencyMap`。`dependencyMap` 保持为"每个元素自身声明的依赖"映射。

**备选方案**: 在 phase 2 中变异 `dependencyMap`，将祖先的依赖路径直接追加到子元素的 Set 中。

| 对比维度 | 生成时合并 (选中) | 变异 dependencyMap (备选) |
|---------|-----------------|------------------------|
| 副作用 | 无。`dependencyMap` 保持只读 | 修改全局状态，变更顺序影响结果 |
| 可调试性 | 任何时候查看 `dependencyMap` 都是"元素自身声明"的真相来源 | 需跟踪什么时候发生了什么合并操作 |
| 幂等性 | 多次调用 `collectAncestorDeps` 结果相同 | 再次追加导致重复 |
| 实现复杂度 | 需额外的 `ancestorDepMap` 存储合并结果 | 直接修改已有 Map 无需新存储 |
| 测试独立性 | 传入任意 dependencyMap 和 elementFQN，输出可预测 | 测试依赖执行顺序 |

**决策理由**: 保持 `dependencyMap` 的语义纯净（"元素声明了哪些依赖"）有助于理解代码和调试。生成时合并的额外存储开销（`ancestorDepMap` 与 `dependencyMap` 大小相同）可忽略。最重要的是，这避免了顺序依赖和副作用的陷阱——多次执行和单次执行结果一致。

### 决策 6: `buildRulesFile` 扩展传递 `childExclusionSuffixes`，而非新增独立入口

**选择方案**: 修改 `buildRulesFile` 的 `elements` 条目类型，新增可选 `childExclusionSuffixes` 字段。当该字段存在时传递到 `buildForbiddenRule`。

**备选方案**: 新增一个 `buildRulesFileWithExclusions` 函数保留旧 `buildRulesFile` 不变。

| 对比维度 | 扩展原函数 (选中) | 新增独立函数 (备选) |
|---------|-----------------|-------------------|
| 向后兼容 | 字段可选，不传时行为完全不变 | 旧函数不变，新函数增加 |
| 代码重复 | 无重复 - 路径唯一 | 两个函数共享~90% 代码，或新函数调用旧函数但需额外参数重组 |
| 可读性 | 一个入口搞定所有规则生成场景 | 需了解两个入口的差异 |
| 改动量 | ~5 行扩展 | ~20 行（新函数 + 重新编排参数） |

**决策理由**: 扩展旧函数的复杂度极低（仅添加一个可选字段和一个判断逻辑），不会对现有调用者和单元测试产生任何影响。新增独立函数会导致两个入口在实际使用中混淆——为什么有的场景用旧入口、有的用新入口？保持单一入口，通过可选的 `childExclusionSuffixes` 控制行为，更符合"简单优先"原则。

---

## 5. 边界情况处理

| 编号 | 条件 | 行为 |
|------|------|------|
| B-1 | 父模块有 0 个子模块 (childExclusionSuffixes 为空数组或不传) | `from.path` 不追加任何负向前瞻，行为与旧版完全相同 |
| B-2 | 父模块只有 1 个子模块 | `from.path` 追加单个 `(?!/<child>(?=/|\\.))` 片段 |
| B-3 | 子模块名与其他文件前缀重叠（如 `open` vs `openers`） | 边界断言 `(?=/|\\.)` 确保 `openers` 不被排除，`open.ts` 被排除 |
| B-4 | 父 module 自身路径即为文件而非目录（如 `resolvePath = "packages/core/src/utils"` 对应 `utils.ts`） | 负向前瞻追加在 `^path` 后，仅影响路径匹配结果，不影响路径本身。子路径仍从路径末尾判断 |
| B-5 | child exclusion suffix 包含路径分隔符（如 `open/helper`） | suffix 原样嵌入 `(?!/${escapedSuffix}(?=/|\\.))`，/ 不会被转义 |
| B-6 | ancestor 链中某个祖先未声明任何依赖 | `collectAncestorDeps` 跳过无 dep 的祖先（`Set` 为空），继续向上搜索 |
| B-7 | ancestor 链中存在依赖路径与子元素声明的依赖路径重复 | 级联合并后 Set 去重，`pathNot` 中每条路径唯一 |
| B-8 | 子元素 FQN 不继承任何祖先（根元素无父级） | `ancestorFqns` 返回空数组，`to.pathNot` 仅含自身声明 + 自身声明依赖 |
| B-9 | 某个祖先 FQN 不在 `allElements` 中（被过滤掉了） | `dependencyMap.get(ancestorFqn)` 返回 `undefined`，跳过该祖先继续遍历 |
| B-10 | 子模块名包含连续特殊字符（如 `a++.b`） | `escapeRegex` 正确处理连续特殊字符：`a\\+\\+\\.b` |
| B-11 | 子模块名包含 Unicode/non-ASCII 字符 | 非特殊字符原样保留，仅转义 14 个 ECMAScript 特殊字符 |
| B-12 | C4 模型中存在多层嵌套（> 3 层）且中间层无子模块 | 仅直接子模块被排除。ancestor 级联正确收集所有祖先 dep |
| B-13 | 同一 C4 模型中既有有子模块的父模块又有无子模块的叶子模块 | 父模块规则含负向前瞻，叶子模块规则格式不变 |
| B-14 | 子模块依赖路径中包含祖先未声明的路径，且祖先已有自身 pathNot 排除 | 子模块的 `pathNot` 使用联合并，保留祖先的 pathNot 项 + 自身声明的路径 |
| B-15 | `childExclusionSuffixes` 中含有空字符串 | 过滤掉空字符串 suffix，不生成无效的 `(?!/)` 负向前瞻 |

---

## 6. 依赖

### 6.1 新增运行时依赖

**无。** 所有新增逻辑均为纯函数，不引入任何新的外部依赖：

| 依赖 | 类型 | 用途 | 状态 |
|------|------|------|------|
| `node:fs` | 内置 | 文件读写 | 已有 |
| `node:path` | 内置 | 路径处理 | 已有 |
| `@likec4/language-services` | external | C4 解析 | 已有 |
| `commander` | external | CLI | 已有 |

### 6.2 新增开发依赖

**无。** 测试使用 Node.js 内置 `node:test` + `node:assert`，无需新增测试框架或 mock 库。

### 6.3 依赖影响分析

- 本变更为纯逻辑变更，不涉及构建配置、package.json、锁文件修改
- 所有新增函数仅在 `archi-to-rules.ts` 内部使用，不会暴露为公共 API
- 不存在传递依赖风险
- 不存在版本兼容性问题

---

## 7. 风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 负向前瞻正则在 dependency-cruiser 中的 `RegExp` 行为异常 | 高：父规则失效，子模块文件依赖不受约束 | 低 | dependency-cruiser 使用 Node.js `RegExp` 解析 `from.path`，负向前瞻是 ECMAScript 标准语法。集成测试通过 `new RegExp(from.path).test(path)` 验证生成的正则正确匹配预期文件集合 |
| 路径中的特殊字符转义遗漏 | 高：生成无效正则，dependency-cruiser 解析报错 | 中 | `escapeRegex` 独立测试覆盖全部 14 个 ECMAScript 特殊字符；代码审查重点检查转义函数 |
| 父模块直接子模块数量过多（如 20+）导致 from.path 超长 | 低：正则可读性降低但不影响功能 | 低 | 仅排除直接子模块而非递归所有后代，数量通常有限（monorepo 中一般不超过 20 个）。无长度上限 |
| 用户添加新子模块后忘记重新运行 `archi-to-rules` | 中：新子模块的合法依赖被旧父规则阻止 | 中 | 属于工作流问题。已在 README 和命令输出中提示修改 C4 模型后需重新运行 `archi-to-rules`。建议用户将命令放入 pre-commit hook |
| `buildForbiddenRule` 第 4 参数类型与已有调用不匹配 | 中：TypeScript 编译错误 | 低 | 第 4 参数为可选，不传时行为不变。TypeScript 编译器在编译时即发现类型不匹配 |
