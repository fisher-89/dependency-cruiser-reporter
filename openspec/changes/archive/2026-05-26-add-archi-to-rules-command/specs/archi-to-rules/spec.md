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

### Requirement: 规则生成

系统 SHALL 为每个 package/module 元素生成一条 dependency-cruiser forbidden 规则。每条规则的 allowlist 包含元素自身目录和所有声明的 dependency 目标路径。

规则格式（路径不带末尾斜线，以同时匹配文件和子目录）：

```json
{
  "name": "archi-<normalized-name>",
  "severity": "error",
  "comment": "<resolvedPath> can only depends on <paths> (Auto-generated from C4 architecture model)",
  "from": { "path": "^<resolved-path>" },
  "to": {
    "pathNot": ["<resolved-path>", "<target1>", "<target2>", "..."],
    "dependencyTypes": ["local"]
  }
}
```

规则名称：移除 `ROOT.` 前缀后，将 `.` 替换为 `-`。例：`ROOT.core.utils` -> `archi-core-utils`。

#### Scenario: 元素有多个 dependency 目标

- **WHEN** 元素 `ROOT.core` 路径为 `packages/core`
- **AND** 元素声明了 2 个 dependency：`ROOT.shared`（路径 `packages/shared`）和 `ROOT.utils`（路径 `src/utils`）
- **THEN** 生成的规则 `from.path` 为 `^packages/core`
- **AND** `to.pathNot` 为 `["packages/core", "packages/shared", "src/utils"]`
- **AND** `to.dependencyTypes` 为 `["local"]`
- **AND** `severity` 为 `"error"`

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
