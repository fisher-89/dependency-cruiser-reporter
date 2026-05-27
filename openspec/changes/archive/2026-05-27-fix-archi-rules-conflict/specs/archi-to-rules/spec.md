## ADDED Requirements

### Requirement: 子路径排除

系统 SHALL 在生成父元素的 forbidden 规则时，通过负向前瞻（negative lookahead）在 `from.path` 中排除所有直接子模块的路径后缀，避免父规则匹配子模块文件而产生约束冲突。

父规则的 `from.path` 格式：

```
^<resolved-path>(?!/<child1-suffix>(?=/|\.))(?!/<child2-suffix>(?=/|\.))...
```

其中：
- `<resolved-path>` 为父元素解析后的文件系统路径（不变）
- `<childN-suffix>` 为直接子模块名称，是从父路径之后到子路径之间的相对路径段
- `(?=/|\.)` 为边界断言：确保子名称后紧跟路径分隔符 `/` 或文件扩展名前缀 `.`，避免误排除名称以子名称开头的文件
- 无子模块的元素不添加任何负向前瞻，`from.path` 格式与原来一致

系统 SHALL 在处理规则生成时执行以下步骤：
1. 解析所有元素的文件系统路径（使用现有的 `resolveElementPath`）
2. 基于 FQN 层次结构构建 parent->children 映射：元素 A 是元素 B 的父元素当且仅当 B 的 FQN 以 "A." 开头且不含中间层级
3. 为每个父元素收集其直接子元素的已解析路径后缀（从父路径末尾到子路径末尾之间的相对路径段）
4. 将子路径后缀传入 `buildForbiddenRule()` 用于生成负向前瞻

系统 SHALL 对路径后缀中的正则特殊字符进行转义。需转义的字符集为：`.`, `+`, `*`, `?`, `\`, `^`, `$`, `(`, `)`, `[`, `]`, `{`, `}`, `|`。每个字符前添加反斜线 `\` 前缀。

#### Scenario: 父元素排除单个直接子模块

- **WHEN** 父元素 `ROOT.cli.commands` 路径为 `packages/cli/src/commands`
- **AND** 直接子元素 `ROOT.cli.commands.open` 路径为 `packages/cli/src/commands/open`
- **THEN** 父规则的 `from.path` 为 `^packages/cli/src/commands(?!/open(?=/|\.))`
- **AND** 子规则的 `from.path` 为 `^packages/cli/src/commands/open`（不含负向前瞻）

#### Scenario: 父元素排除多个直接子模块

- **WHEN** 父元素 `ROOT.cli.commands` 路径为 `packages/cli/src/commands`
- **AND** 直接子元素有 `open`（路径 `packages/cli/src/commands/open`）和 `analyze`（路径 `packages/cli/src/commands/analyze`）
- **THEN** 父规则的 `from.path` 包含 `(?!/open(?=/|\.))(?!/analyze(?=/|\.))` 两个负向前瞻片段
- **AND** 两个片段之间无分隔符，连续拼接

#### Scenario: 无子模块的叶子元素不添加负向前瞻

- **WHEN** 元素 `ROOT.cli.commands.open` 路径为 `packages/cli/src/commands/open`
- **AND** 该元素无直接子元素
- **THEN** 元素规则的 `from.path` 为 `^packages/cli/src/commands/open`（不含负向前瞻）
- **AND** 与修改前的格式完全一致

#### Scenario: 子路径边界精确匹配

- **WHEN** 父元素路径为 `packages/cli/src/commands`
- **AND** 直接子元素名称为 `open`
- **THEN** 负向前瞻为 `(?!/open(?=/|\.))`
- **AND** 文件 `commands/open.ts` 的路径 `/open.ts` 匹配负向前瞻（`/open` 后跟 `.`），不触发父规则
- **AND** 文件 `commands/openers.ts` 的路径 `/openers.ts` 不匹配负向前瞻（`/open` 后跟 `e`，不是 `/` 或 `.`），仍触发父规则
- **AND** 文件 `commands/open/sub/helper.ts` 的路径 `/open/sub/helper.ts` 匹配负向前瞻（`/open` 后跟 `/`），不触发父规则

#### Scenario: 路径后缀中的正则特殊字符被转义

- **WHEN** 直接子元素路径后缀包含特殊字符，如 `core+utils`
- **THEN** 生成的负向前瞻为 `(?!/core\+utils(?=/|\.))`
- **AND** `.` 字符转义为 `\.`
- **AND** `+` 字符转义为 `\+`
- **AND** `*` 字符转义为 `\*`

#### Scenario: 多级嵌套仅排除直接子模块

- **WHEN** 元素层级为 `commands > open > helper`（三层）
- **AND** `commands` 路径为 `packages/cli/src/commands`
- **AND** `open` 路径为 `packages/cli/src/commands/open`
- **AND** `helper` 路径为 `packages/cli/src/commands/open/helper`
- **THEN** `commands` 规则的 `from.path` 仅排除 `/open`（直接子模块）
- **AND** `commands` 规则的 `from.path` 不包含 `/open/helper` 的排除
- **AND** `open` 规则的 `from.path` 排除 `/helper`（它的直接子模块）

#### Scenario: 子模块路径非标准（包含多段相对路径）

- **WHEN** 父元素路径为 `packages/core`
- **AND** 直接子元素 FQN 为 `ROOT.core.utils.parser`，路径为 `packages/core/src/parser`
- **THEN** 子路径后缀为 `src/parser`
- **AND** 父规则负向前瞻为 `(?!/src/parser(?=/|\.))`

### Requirement: 祖先依赖级联继承

系统 SHALL 在生成子元素规则时，将子元素自身的 `to.pathNot` 与所有祖先元素（父、祖父...）的 `to.pathNot` 中的依赖路径合并，使子规则自动继承上级允许的所有依赖路径，防止子规则意外收紧。

继承规则：
- 子元素的最终 `to.pathNot` = 自身依赖路径 ∪ 所有祖先元素的允许路径（去重）
- 继承是单向的——父规则不从子规则继承
- 继承路径通过遍历 FQN 祖先链完成（使用已有的 `ancestorFqns` 函数）
- 继承发生在规则生成阶段，不影响 dependency 关系收集（`dependencyMap` 保持不变）

#### Scenario: 子规则继承父规则的依赖路径

- **WHEN** 父元素 `ROOT.cli` 声明了 dependency `ROOT.shared`（路径 `packages/shared`）
- **AND** 子元素 `ROOT.cli.commands.open` 声明了 dependency `ROOT.cli.server`（路径 `packages/cli/src/server`）
- **THEN** 子规则的 `to.pathNot` 包含 `packages/cli/src/commands/open`（自身路径）
- **AND** 子规则的 `to.pathNot` 包含 `packages/cli/src/server`（自身依赖）
- **AND** 子规则的 `to.pathNot` 包含 `packages/shared`（从父规则继承）

#### Scenario: 子规则继承多级祖先的依赖路径

- **WHEN** 三层嵌套模型：`ROOT.cli` 声明依赖 `lib_a`，`ROOT.cli.commands` 声明依赖 `lib_b`，`ROOT.cli.commands.open` 声明依赖 `server`
- **THEN** `open` 子规则的 `to.pathNot` 包含 `lib_a`（从祖父继承）
- **AND** `open` 子规则的 `to.pathNot` 包含 `lib_b`（从父继承）
- **AND** `open` 子规则的 `to.pathNot` 包含 `server`（自身依赖）
- **AND** `open` 子规则的 `to.pathNot` 包含自身路径 `open`

#### Scenario: 同级模块继承不交叉污染

- **WHEN** `ROOT.cli.commands.open` 和 `ROOT.cli.commands.analyze` 是同级子模块
- **AND** `open` 依赖 `server`，`analyze` 无依赖
- **AND** 父 `commands` 和祖先 `cli` 均未声明额外依赖（各自 pathNot 仅含自身路径）
- **THEN** `open` 的 `to.pathNot` 不含 `analyze` 的路径
- **AND** `analyze` 的 `to.pathNot` 不含 `server`

#### Scenario: 无祖先依赖时行为不变

- **WHEN** 元素无祖先声明任何 dependency
- **AND** 元素自身声明了 dependency `X`
- **THEN** 该元素规则的 `to.pathNot` 仅包含自身路径和 `X`
- **AND** 与修改前的行为完全一致

## MODIFIED Requirements

### Requirement: 规则生成

系统 SHALL 为每个 package/module 元素生成一条 dependency-cruiser forbidden 规则。每条规则的 allowlist 包含元素自身目录、所有声明的 dependency 目标路径，以及所有祖先元素的依赖路径（级联继承）。

对于有直接子模块的父元素，系统 SHALL 在 `from.path` 中使用负向前瞻（negative lookahead）排除所有直接子模块路径，防止父规则与子规则之间的约束冲突。

对于有祖先元素的子元素，系统 SHALL 将其所有祖先规则的 dependency 路径合并到自身的 `to.pathNot` 中，使子规则自动继承上级声明的合法依赖。

规则格式（路径不带末尾斜线，以同时匹配文件和子目录）：

```json
{
  "name": "archi-<normalized-name>",
  "severity": "error",
  "comment": "<resolvedPath> can only depends on <paths> (Auto-generated from C4 architecture model)",
  "from": {
    "path": "^<resolved-path>(?!/<child1-suffix>(?=/|\.))(?!/<child2-suffix>(?=/|\.))"
  },
  "to": {
    "pathNot": ["<resolved-path>", "<target1>", "<target2>", "..."],
    "dependencyTypes": ["local"]
  }
}
```

注：无子模块的元素，`from.path` 为 `^<resolved-path>`，不含负向前瞻。

规则名称：移除 `ROOT.` 前缀后，将 `.` 替换为 `-`。例：`ROOT.core.utils` -> `archi-core-utils`。

#### Scenario: 叶子元素有多个 dependency 目标

- **WHEN** 元素 `ROOT.core` 路径为 `packages/core`
- **AND** 元素声明了 2 个 dependency：`ROOT.shared`（路径 `packages/shared`）和 `ROOT.utils`（路径 `src/utils`）
- **AND** 该元素无直接子模块
- **THEN** 生成的规则 `from.path` 为 `^packages/core`（不含负向前瞻）
- **AND** `to.pathNot` 为 `["packages/core", "packages/shared", "src/utils"]`
- **AND** `to.dependencyTypes` 为 `["local"]`
- **AND** `severity` 为 `"error"`

#### Scenario: 父元素有子模块时 from.path 包含负向前瞻，子规则级联继承祖先依赖

- **WHEN** 父元素 `ROOT.cli.commands` 路径为 `packages/cli/src/commands`
- **AND** 直接子元素 `ROOT.cli.commands.open` 路径为 `packages/cli/src/commands/open`
- **AND** 祖父元素 `ROOT.cli` 声明了 dependency `ROOT.shared`（路径 `packages/shared`）
- **AND** 父元素声明了 dependency `ROOT.cli.shared`（路径 `packages/cli/src/shared`）
- **AND** 子元素声明了 dependency `ROOT.cli.server`（路径 `packages/cli/src/server`）
- **THEN** 父规则 `from.path` 为 `^packages/cli/src/commands(?!/open(?=/|\.))`
- **AND** 父规则 `to.pathNot` 为 `["packages/cli/src/commands", "packages/cli/src/shared", "packages/shared"]`（自身依赖 + 祖先继承）
- **AND** 子规则 `from.path` 为 `^packages/cli/src/commands/open`（不含负向前瞻，因为 `open` 无子模块）
- **AND** 子规则 `to.pathNot` 包含 `["packages/cli/src/commands/open", "packages/cli/src/server", "packages/cli/src/shared", "packages/shared"]`（自身 + 父继承 + 祖父继承）
- **AND** 文件 `commands/open.ts` 的依赖检查仅由子规则判定，不触发父规则

#### Scenario: 元素无 dependency 声明

- **WHEN** 元素 `ROOT.app` 路径为 `packages/app`
- **AND** 该元素未声明任何 dependency 关系
- **THEN** 生成的规则 `to.pathNot` 仅包含自身路径 `["packages/app"]`
- **AND** 该元素中的文件仅允许引用自身目录下的模块

#### Scenario: 规则名称格式

- **WHEN** 元素 FQN 为 `ROOT.shared.utils.parser`
- **THEN** 移除 `ROOT.` 前缀后将 `.` 替换为 `-`
- **AND** 规则 `name` 为 `archi-shared-utils-parser`

#### Scenario: 所有元素均生成规则

- **WHEN** 系统中包含 5 个 package/module 元素
- **THEN** 生成的规则文件包含 5 条 forbidden 规则
- **AND** 每条规则的 `name` 以 `archi-` 开头
