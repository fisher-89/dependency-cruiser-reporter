## ADDED Requirements

### Requirement: C4 文件解析

系统 SHALL 使用 `@likec4/language-services` 的 `fromSources()` 和 `syncComputedModel()` API 解析 `.dc-reporter/architecture/` 目录下的所有 `.c4` 文件，获取 `LikeC4Model.Computed` 实例。从 `$data.elements` 提取元素基础信息（`id`、`kind`、`links`），从 `$data.relations` 提取关系信息（`kind`、`source.model`、`target.model`）。通过 `computed.parent(el)` 和 `computed.ancestors(el)` 方法获取元素层级关系。

#### Scenario: 解析单个 .c4 文件

- **WHEN** 用户执行 `dep-report archi-to-rules`
- **AND** `.dc-reporter/architecture/` 目录下存在 `main.c4` 文件
- **THEN** 系统调用 `fromSources({ "main.c4": "<file-content>" })` 创建 LikeC4 实例
- **AND** 调用 `syncComputedModel()` 获取 `LikeC4Model.Computed` 实例
- **AND** 从 `computed.$data.elements` 提取元素，从 `computed.$data.relations` 提取关系

#### Scenario: 解析多个 .c4 文件

- **WHEN** 用户执行 `dep-report archi-to-rules`
- **AND** `.dc-reporter/architecture/` 目录下存在 `main.c4` 和 `shared.c4` 文件
- **THEN** 系统调用 `fromSources()` 时传入包含两个文件内容的 Record
- **AND** `syncComputedModel()` 返回合并后的模型数据，包含所有文件的元素和关系

#### Scenario: 解析失败（语法错误）

- **WHEN** 用户执行 `dep-report archi-to-rules`
- **AND** `.c4` 文件包含语法错误
- **THEN** `likec4.hasErrors()` 返回 true
- **AND** 系统输出解析错误详情到 stderr
- **AND** 命令退出，exit code 为 1

### Requirement: 元素过滤

系统 SHALL 仅处理 `kind ∈ {package, module}` 的元素，忽略 `project`、`outer` 和其他类型的元素。

#### Scenario: 过滤 package 和 module

- **WHEN** 系统从 `computed.$data.elements` 中获取所有元素
- **AND** 元素列表中包含 `package`、`module`、`project`、`outer` 四种 kind
- **THEN** 系统仅保留 kind 为 `package` 和 `module` 的元素
- **AND** `project` 和 `outer` 类型的元素不参与规则生成

### Requirement: 关系过滤

系统 SHALL 仅处理 `kind = "dependency"` 的关系，通过 `source.model` 和 `target.model` 获取源和目标元素 ID，且双方 must 为已过滤后的 package 或 module 元素。

#### Scenario: 过滤 dependency 关系

- **WHEN** 系统从 `$data.relations` 中获取所有关系
- **AND** 关系中包含 `kind = "dependency"` 和 `kind = undefined`（generic 关系）
- **THEN** 系统仅保留 `kind = "dependency"` 的关系
- **AND** `source.model` 和 `target.model` 对应的元素均在已过滤的元素集合中

#### Scenario: 忽略 generic 关系

- **WHEN** C4 文件中存在 `A -> B 'label'` 格式的 generic 关系
- **THEN** 该关系在 `$data` 中 `kind` 为 `undefined`
- **AND** 系统不将其纳入规则生成

### Requirement: 文件系统路径解析

系统 SHALL 为每个 package/module 元素解析文件系统路径（不带末尾斜线），采用以下优先级策略：

1. 元素自身有 `links[0].relative` → `virtualPathToModule` 处理：strip `virtual:` 前缀 → 去末尾斜线 → strip 文件名+扩展名+前导斜线
2. 无自身 link → 沿祖先链（基于 FQN hierarchy，由近到远）查找：
   a. 找到非 `project` 类型且有 link 的 ancestor → 以该 ancestor 的 link 目录为 base，拼接 FQN 中超出 ancestor 的部分：
      - ancestor 为 `package` 类型：`base/src/<剩余segments>`
      - ancestor 为 `module` 类型：`base/<剩余segments>`
   b. 找到 `project` 类型且有 link → 以 project 的 link 目录为 prefix，拼接默认约定推导路径：`<prefix>/<convention_path>`
   c. 未找到任何有 link 的 ancestor（含 project 无 link）→ 使用默认约定推导（见下表）
   d. 默认约定中 FQN 跳过 ROOT 前缀后，以完整 FQN (如 `ROOT.<name>`) 在 allElements 中查找第一段的 kind

默认约定推导规则：

| 第一段 kind | FQN 模式 | 推导路径 |
|------------|---------|---------|
| `package` | `ROOT.<pkg>` | `packages/<pkg>` |
| `package` | `ROOT.<pkg>.<m1>.<m2>...` | `packages/<pkg>/src/<m1>/<m2>/...` |
| 非 package | `ROOT.<m1>` | `src/<m1>` |
| 非 package | `ROOT.<m1>.<m2>...` | `src/<m1>/<m2>/...` |

#### Scenario: 自身 link 优先

- **WHEN** 元素 `ROOT.myapp.utils` 自身设置了 `links: [{ relative: "virtual:lib/utils/" }]`
- **THEN** virtualPathToModule 处理后返回 `lib/utils`，不查找祖先

#### Scenario: link 包含文件扩展名时 strip

- **WHEN** 元素设置了 `links: [{ relative: "virtual:lib/utils/index.ts" }]`
- **THEN** strip 文件名+扩展名+前导斜线，返回 `lib/utils`

#### Scenario: 从 package 祖先的 link 下钻

- **WHEN** 元素 `ROOT.cli.utils.server`（无自身 link）
- **AND** 祖先 `ROOT.cli`（package）有 `links: [{ relative: "virtual:packages/cli" }]`
- **THEN** base 为 `packages/cli`
- **AND** FQN 超出部分为 `["utils", "server"]`
- **AND** ancestor 为 package，拼接 `/src/utils/server`
- **AND** 最终路径为 `packages/cli/src/utils/server`

#### Scenario: 从 module 祖先的 link 下钻

- **WHEN** 元素 `ROOT.cli.commands.index`（无自身 link）
- **AND** 祖先 `ROOT.cli.commands`（module）有 `links: [{ relative: "virtual:packages/cli/src/commands" }]`
- **AND** 祖先 `ROOT.cli`（package）也有 link，但 `ROOT.cli.commands` 是第一个匹配的
- **THEN** base 为 `packages/cli/src/commands`
- **AND** FQN 超出部分为 `["index"]`
- **AND** 最终路径为 `packages/cli/src/commands/index`

#### Scenario: 无任何 link，第一段为 package

- **WHEN** 元素 `ROOT.frontend.App`（无自身 link）
- **AND** 所有祖先均无 link
- **AND** 第一段 `ROOT.frontend` 的 kind 为 `package`
- **THEN** 默认推导路径为 `packages/frontend/src/App`

#### Scenario: 无任何 link，第一段非 package

- **WHEN** 元素 `ROOT.app`（无自身 link）
- **AND** 所有祖先均无 link
- **AND** 第一段 `ROOT.app` 的 kind 不为 `package`
- **THEN** 默认推导路径为 `src/app`

#### Scenario: ROOT project 有 link，作为 prefix 拼接

- **WHEN** 元素 `ROOT.cli.utils.server`（无自身 link）
- **AND** `ROOT.cli.utils`、`ROOT.cli` 均无 link
- **AND** 祖先 `ROOT`（project）有 `links: [{ relative: "virtual:../../" }]`
- **THEN** 默认约定推导路径为 `packages/cli/src/utils/server`
- **AND** project link prefix 为 `../..`
- **AND** 最终路径为 `../../packages/cli/src/utils/server`

#### Scenario: ROOT project 有 link + 第一段非 package

- **WHEN** 元素 `ROOT.app`（无自身 link）
- **AND** 所有祖先均无 link（除 ROOT 外）
- **AND** `ROOT`（project）有 `links: [{ relative: "virtual:my-monorepo" }]`
- **AND** 第一段 `ROOT.app` 的 kind 不为 `package`
- **THEN** 默认约定推导路径为 `src/app`
- **AND** 最终路径为 `my-monorepo/src/app`

#### Scenario: package 祖先和 ROOT 都有 link，package 优先

- **WHEN** 元素 `ROOT.cli.utils.server`（无自身 link）
- **AND** 祖先 `ROOT.cli`（package）有 `links: [{ relative: "virtual:packages/cli" }]`
- **AND** 祖先 `ROOT`（project）也有 `links: [{ relative: "virtual:../.." }]`
- **THEN** 按由近到远顺序，先命中 `ROOT.cli`（package）
- **AND** 路径为 `packages/cli/src/utils/server`（package 祖先的 link 下钻）
- **AND** ROOT 的 link 不被使用

### Requirement: 路径存在性验证

系统 SHALL 验证每个解析后的路径在磁盘上是否有效，采用双重检查机制：
1. 路径作为目录存在 (`existsSync(absPath)`)
2. 或父目录中存在以 `basename.` 开头的文件 (如 `analyze` 匹配 `analyze.ts`)

对于无效的路径，系统输出全部警告后退出。

#### Scenario: 路径无效导致退出

- **WHEN** 系统中包含 3 个元素，其中 1 个元素的解析路径在磁盘上既不是目录也无匹配文件
- **THEN** 系统输出警告信息列出所有无效元素及其路径
- **AND** 系统退出，exit code 为 1
- **AND** 规则文件仍然生成（允许在有部分路径问题的情况下检查规则内容）

#### Scenario: 所有路径有效

- **WHEN** 所有元素的解析路径在磁盘上均有效（目录存在或有匹配文件）
- **THEN** 系统正常退出，exit code 为 0
- **AND** 不输出路径相关警告

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

### Requirement: 规则文件输出

系统 SHALL 将生成的规则数组写入 JSON 文件。输出路径由 `--output` 选项指定，默认为 `<cwd>/.dc-reporter/archi-rules.json`。

输出文件格式：

```json
{
  "forbidden": [ /* 规则数组 */ ]
}
```

#### Scenario: 默认输出路径

- **WHEN** 用户执行 `dep-report archi-to-rules`
- **THEN** 规则写入 `<cwd>/.dc-reporter/archi-rules.json`
- **AND** `.dc-reporter/` 目录不存在时自动创建

#### Scenario: 自定义输出路径

- **WHEN** 用户执行 `dep-report archi-to-rules -o ./configs/archi-rules.json`
- **THEN** 规则写入 `./configs/archi-rules.json`
- **AND** `configs/` 目录不存在时自动创建

#### Scenario: 输出文件格式验证

- **WHEN** 规则写入完成
- **THEN** 输出文件是合法的 JSON 文件
- **AND** 顶级结构为 `{ "forbidden": [...] }`
- **AND** 每条规则包含 `name`、`severity`、`from`、`to` 四个字段

### Requirement: dependency-cruiser 配置更新

系统 SHALL 在生成规则文件后，更新项目根目录下的 `.dependency-cruiser.js`（或 `.dependency-cruiser.json`）配置文件，添加 `extends` 字段指向生成的规则文件。

更新逻辑：
1. 如果 `extends` 字段不存在：添加 `extends: [".dc-reporter/archi-rules.json"]`
2. 如果 `extends` 已存在且为字符串：转换为数组 `[原有值, ".dc-reporter/archi-rules.json"]`
3. 如果 `extends` 已存在且为数组：若数组中已包含该路径则跳过，否则追加

#### Scenario: extends 不存在时添加

- **WHEN** `.dependency-cruiser.js` 无 `extends` 字段
- **THEN** 系统在 `module.exports` 对象中添加 `extends: [".dc-reporter/archi-rules.json"]`
- **AND** 原有 `forbidden` 和其他字段保持不变

#### Scenario: extends 为字符串时转换

- **WHEN** `.dependency-cruiser.js` 的 `extends` 为 `".dependency-cruiser.base.json"`
- **THEN** 系统将 `extends` 更新为 `[".dependency-cruiser.base.json", ".dc-reporter/archi-rules.json"]`

#### Scenario: extends 为数组且不含目标路径时追加

- **WHEN** `.dependency-cruiser.js` 的 `extends` 为 `["./base.json"]`
- **THEN** 系统将 `extends` 更新为 `["./base.json", ".dc-reporter/archi-rules.json"]`

#### Scenario: extends 已包含目标路径时跳过（幂等性）

- **WHEN** `.dependency-cruiser.js` 的 `extends` 已包含 `.dc-reporter/archi-rules.json`
- **THEN** 系统跳过更新，不修改 `extends` 数组
- **AND** 配置文件保持不变

### Requirement: 命令行注册

系统 SHALL 在 CLI 入口注册 `archi-to-rules` 命令，使其可通过 `dep-report archi-to-rules` 调用。

命令处理流程：
1. `packages/cli/src/commands/archi-to-rules.ts` 导出 `archiToRules` 异步函数
2. `packages/cli/src/commands/index.ts` 导出 `archiToRules`
3. `packages/cli/src/bin/cli.ts` 注册 `.command('archi-to-rules')` 并绑定 `action`

#### Scenario: 命令函数签名

- **WHEN** 用户调用 `dep-report archi-to-rules`
- **THEN** `cli.ts` 解析参数后调用 `archiToRules({ cwd, output })` 函数
- **AND** 函数返回 `Promise<void>`
- **AND** 函数在错误时抛出异常，由 CLI 入口统一处理

#### Scenario: 命令帮助信息

- **WHEN** 用户执行 `dep-report archi-to-rules --help`
- **THEN** 输出显示命令描述 "Convert C4 architecture model to dependency-cruiser forbidden rules"
- **AND** 列出 `--cwd` 和 `--output, -o` 选项及其默认值
