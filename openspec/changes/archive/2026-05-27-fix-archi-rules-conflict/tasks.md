# 实施任务: fix-archi-rules-conflict

> **变更**: fix-archi-rules-conflict
> **状态**: 待实施

---

## 阶段 1: 基础工具函数

- [x] **1.1 实现 `escapeRegex` 函数**: 在 `packages/cli/src/commands/archi-to-rules.ts` 中新增 `escapeRegex(str: string): string` 函数。转义 ECMAScript 正则表达式全部 14 个特殊字符：`.`, `+`, `*`, `?`, `\`, `(`, `)`, `[`, `]`, `{`, `}`, `^`, `$`, `|`。只转义这些字符，路径分隔符 `/` 保持原样。函数为纯函数，无外部依赖。

- [x] **1.2 实现 `buildParentChildMap` 函数**: 在 `archi-to-rules.ts` 中新增 `buildParentChildMap(elements: ReadonlyArray<{ id: string }>): Map<string, string[]>` 函数。遍历所有元素 FQN，利用已有的 `ancestorFqns` 和 `relativeFqn` 函数构建 parent→directChildSuffix 映射。仅包括直接子模块（`relativeFqn` 结果不包含 `.`）。返回的 Map 中每个 key 对应的后缀数组唯一（去重）。

- [x] **1.3 实现 `collectAncestorDeps` 函数**: 在 `archi-to-rules.ts` 中新增 `collectAncestorDeps(elementFqn, dependencyMap, allElements): string[]` 函数。使用已有的 `ancestorFqns` 遍历所有祖先，从 `dependencyMap` 中读取每个祖先声明的依赖路径，合并去重后返回。跳过不在 `dependencyMap` 中的祖先（被过滤的元素）。

## 阶段 2: 核心逻辑修改

- [x] **2.1 扩展 `buildForbiddenRule` 签名**: 新增第 4 个可选参数 `childExclusionSuffixes?: string[]`。当该参数存在且非空时，在 `from.path` 的末尾追加负向前瞻片段。每个 suffix 转义后生成 `(?!/<escapedSuffix>(?=/|\\.))` 格式。边界断言 `(?=/|\\.)` 确保子模块名精确匹配（例如 `open` 不匹配 `openers`）。过滤掉空字符串 suffix。不传参数或传空数组时行为与旧版完全一致。

- [x] **2.2 扩展 `buildRulesFile` 传递子模块信息**: 修改 `elements` 条目类型，新增可选字段 `childExclusionSuffixes?: string[]`。当该字段存在时传递到 `buildForbiddenRule`。

- [x] **2.3 修改 `archiToRules` 主函数工作流**: 在第 5 步（路径解析）之后插入以下步骤：
  - 步骤 6: 调用 `buildParentChildMap(filteredElements)` 构建 parent→children 映射
  - 步骤 7: 遍历每个元素，调用 `collectAncestorDeps` 收集祖先继承的依赖路径
  - 步骤 8: 从 parent→children 映射推导每个父元素的 `childExclusionSuffixes`
  - 步骤 9: 生成规则时，合并自身声明的依赖 + 祖先继承的依赖（去重），并传递 `childExclusionSuffixes`
  - `buildRulesFile` 调用时传入扩展后的 entries（包含 `childExclusionSuffixes`）

## 阶段 3: 单元测试

- [x] **3.1 添加 `escapeRegex` 单元测试**: 文件 `openspec/changes/fix-archi-rules-conflict/tests/unit/escape-regex.test.ts`。测试覆盖：
  - 14 个特殊字符每个单独转义
  - 连续特殊字符（如 `a++.b`）
  - 无特殊字符的普通字符串（原样输出）
  - 空字符串（输出空字符串）
  - Unicode/non-ASCII 字符串（非特殊字符保留）
  - 路径分隔符 `/` 不被转义

- [x] **3.2 添加 `buildForbiddenRule` 负向前瞻单元测试**: 文件 `openspec/changes/fix-archi-rules-conflict/tests/unit/build-forbidden-rule.test.ts`。测试覆盖：
  - 父模块有 1 个直接子模块 → 单个负向前瞻
  - 父模块有 N 个直接子模块 → 多个负向前瞻有序拼接
  - 不传 `childExclusionSuffixes` 参数 → 格式不变
  - 传空数组 `[]` → 格式不变
  - `childExclusionSuffixes` 包含空字符串 → 忽略
  - 子模块名含特殊字符（如 `core+utils`）→ 转义后嵌入负向前瞻
  - 边界断言验证：`new RegExp(from.path).test("path/open.ts")` → false，`new RegExp(from.path).test("path/openers.ts")` → true
  - 三层嵌套：父排除直接子模块，不排除孙模块 suffix
  - 所有测试 `pathNot` 字段包含正确的 `self + deps` 结构

- [x] **3.3 添加 `buildParentChildMap` 单元测试**: 在 `build-forbidden-rule.test.ts` 或独立文件中。测试覆盖：
  - 有父子关系的元素列表 → 正确的 parent→suffix 映射
  - 仅直接子模块（孙模块不列入父元素的 direct children）
  - 同级无父子关系的元素 → 空映射
  - 空元素列表 → 空映射
  - 元素 FQN 包含 ROOT 前缀

- [x] **3.4 添加 `collectAncestorDeps` 单元测试**: 文件 `openspec/changes/fix-archi-rules-conflict/tests/unit/ancestor-path-inheritance.test.ts`。测试覆盖：
  - 单层继承（父→子）：子级 pathNot 包含父级的 dep
  - 多层继承（祖→父→孙）：孙级 pathNot 包含所有人的 dep
  - 无祖先（根元素）：仅自身声明
  - 祖先链中有空 dep 的祖先：跳过并继续向上搜索
  - 依赖路径重复（祖先与自身声明相同 dep）：去重
  - 并联同级不交叉：同级模块 A 不包含同级模块 B 的独有 dep
  - 祖先不在 elementMap 中：安全跳过

## 阶段 4: 集成测试

- [x] **4.1 创建 C4 测试文件夹具**: 在 `openspec/changes/fix-archi-rules-conflict/tests/fixtures/` 目录下创建：
  - `parent-two-children.c4`：1 个父 module + 2 个直接子 module（`open`、`analyze`）
  - `flatten-no-children.c4`：多个无父子关系的平铺 package/module
  - `three-level-nested.c4`：三层嵌套模型（`commands > open > helper`）
  - `special-chars-child.c4`：子模块名含 `+` 的模型
  - `sibling-modules.c4`：同级模块各有独有 dep 的模型

- [x] **4.2 编写集成测试**: 文件 `openspec/changes/fix-archi-rules-conflict/tests/integration/archi-to-rules-conflict.test.ts`。使用 `spawnSync` 调用 `dep-report archi-to-rules`，在临时工作目录中操作。验证：
  - AC-1: 父规则 from.path 包含负向前瞻排除所有直接子路径
  - AC-2: 子规则 from.path 不含负向前瞻语法
  - AC-3: 叶子模块规则格式不变
  - AC-4: 父规则排除子路径后，子文件不被父规则匹配（通过 `new RegExp(from.path).test(path)` 验证）
  - AC-5: 特殊字符子模块名被正确转义
  - AC-6: 精确边界匹配（`open` 不排除 `openers`）
  - AC-7: 仅排除直接子模块，不排除孙模块
  - AC-8: 现有功能（路径解析、文件输出、配置更新）不受影响
  - AC-9: 规则文件格式不变（JSON 结构一致）
  - AC-10: 子规则 pathNot 包含祖先继承的依赖（级联继承）
  - AC-11: 同级模块依赖不交叉污染
  - 幂等性：同一模型多次运行生成相同规则

## 阶段 5: 回归验证

- [x] **5.1 运行现有测试套件**: 执行 `pnpm test`，确保现有测试全部通过（AC-8）。
- [x] **5.2 运行 lint**: 执行 `pnpm lint`，确保代码风格一致。
- [x] **5.3 运行新增测试**: 执行新的单元测试和集成测试命令，确认所有测试通过：
  ```
  node --test openspec/changes/fix-archi-rules-conflict/tests/unit/*.test.ts
  node --test openspec/changes/fix-archi-rules-conflict/tests/integration/archi-to-rules-conflict.test.ts
  ```

## 任务依赖关系

```
1.1 (escapeRegex) ──→ 2.1 (buildForbiddenRule) ──→ 2.2 (buildRulesFile) ──→ 2.3 (archiToRules)
                       │                                                     ↑
                       └── 需要 1.2 (parentChildMap) ─────────────── 需要 ───┘
                       └── 需要 1.3 (collectAncestorDeps) ──────────── 需要 ──┘

3.1 (escapeRegex 测试)   ── 基于 1.1
3.2 (buildForbiddenRule 测试) ── 基于 2.1 + 1.1
3.3 (buildParentChildMap 测试) ── 基于 1.2
3.4 (collectAncestorDeps 测试) ── 基于 1.3

4.1 (夹具) → 4.2 (集成测试)

5.1 → 5.2 → 5.3 (回归验证)
```

**实施顺序**: 1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 → 3.1+3.2+3.3+3.4 (可并行) → 4.1 → 4.2 → 5.1 → 5.2 → 5.3
