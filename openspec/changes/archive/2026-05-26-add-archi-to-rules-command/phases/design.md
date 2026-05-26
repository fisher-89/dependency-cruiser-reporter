# 设计文档: add-archi-to-rules-command

> **变更**: add-archi-to-rules-command
> **日期**: 2026-05-22
> **状态**: 设计中

---

## 1. 架构组件

### 1.1 组件总览

```
┌──────────────────────────────────────────────────────────────────┐
│  archi-to-rules.ts (命令入口)                                      │
│                                                                   │
│  ┌─────────────────────┐   ┌──────────────────────────────┐      │
│  │ C4 Model Loader     │   │ Path Resolver                │      │
│  │ ・fromSources()     │   │ ・Self link 优先             │      │
│  │ ・syncComputedModel │   │ ・Ancestor link 下钻         │      │
│  │ ・Filter elements   │──→│ ・Default convention 兜底     │──→   │
│  │ ・Filter relations  │   │ ・磁盘存在性验证               │      │
│  └─────────────────────┘   └──────────────────────────────┘      │
│                                                                   │
│  ┌──────────────────────────┐   ┌────────────────────────────┐   │
│  │ Rule Builder             │   │ Config Updater             │   │
│  │ ・forbidden rule 生成    │──→│ ・extends 字段添加/追加    │   │
│  │ ・pathNot 正则构建       │   │ ・字符串→数组转换          │   │
│  │ ・dependencyTypes 设置   │   │ ・幂等性跳过               │   │
│  │ ・写入 archi-rules.json  │   │ ・更新 .dependency-cruiser │   │
│  └──────────────────────────┘   └────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 组件明细

| 组件 | 文件 | 职责 | 技术 | 依赖 |
|------|------|------|------|------|
| `archiToRules` (命令入口) | `packages/cli/src/commands/archi-to-rules.ts` | CLI 命令主入口: 解析选项、编排完整工作流、处理错误和退出码 | TypeScript, Commander.js | `commander`, `node:fs`, `node:path` |
| C4 Model Loader | `archi-to-rules.ts` (内联函数 `loadC4Model`) | 从 `.dc-reporter/architecture/` 读取 `.c4` 文件, 调用 `fromSources()` 解析, 调用 `syncComputedModel()` 获取 computed model, 过滤元素 (`kind ∈ {package, module}`) 和关系 (`kind = "dependency"`) | `@likec4/language-services` | `node:fs`, `node:path` |
| Path Resolver | `archi-to-rules.ts` (纯函数 `resolveElementPath`) | 路径推导: 自身 link → 祖先链 link 下钻 (基于 FQN hierarchy, package/module/project 分别处理) → 默认约定 (跳过 ROOT 前缀, 重建完整 FQN 查找 kind)。路径末尾不带斜线以匹配文件和目录。 | TypeScript | `virtualPathToModule`, `defaultConventionPath` |
| Path Validator | `archi-to-rules.ts` (函数 `validatePaths`) | 收集所有解析后的路径, 先检查目录存在 (`existsSync`), 再检查父目录中是否有 `basename.*` 文件存在。任意不满足则标记失败, 汇总输出所有失败路径。 | `node:fs` | `node:fs.existsSync()`, `node:fs.readdirSync()` |
| Rule Builder | `archi-to-rules.ts` (纯函数 `buildForbiddenRule`) | 为单个元素生成 forbidden 规则对象, 包含 name/from/to/pathNot/dependencyTypes 字段 | TypeScript | 无 |
| Rule File Writer | `archi-to-rules.ts` (函数 `writeRulesFile`) | 将 forbidden 规则数组序列化为 JSON, 写入 `--output` 指定路径 (默认 `.dc-reporter/archi-rules.json`), 自动创建父目录 | `node:fs` | `node:fs.mkdirSync()` |
| Config Updater | `archi-to-rules.ts` (函数 `updateDependencyCruiserConfig`) | 读取 `.dependency-cruiser.js`, 通过正则/文本操作在 `module.exports` 中添加 `extends` 字段, 处理字符串→数组转换, 幂等性处理 | TypeScript, `node:fs` | `node:fs.readFileSync()`, `node:fs.writeFileSync()` |
| 命令注册入口 | `packages/cli/src/commands/index.ts` | re-export `archiToRules` | TypeScript | `archi-to-rules.ts` |
| CLI 入口 | `packages/cli/src/bin/cli.ts` | 新增 `archi-to-rules` 命令定义, 注册 `--cwd` 和 `--output` 选项 | Commander.js | `archiToRules` |

### 1.3 模块依赖关系

```
packages/cli/src/
  commands/index.ts
    + export { archiToRules } from './archi-to-rules.js'
  commands/archi-to-rules.ts          (新增)
    dependencies:
      node:fs
      node:path
      @likec4/language-services       (已有, 1.56.0)
        fromSources()  (Node.js entry)
        LikeC4Model.Computed
    no new package dependencies needed
  bin/cli.ts
    + import { archiToRules } from '../commands/index.js'
    + program.command('archi-to-rules')
```

### 1.4 项目文件影响

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `packages/cli/src/commands/archi-to-rules.ts` | 新增 | 约 300-400 行, 包含全部核心逻辑 |
| `packages/cli/src/commands/index.ts` | 修改 | 新增 `archiToRules` re-export |
| `packages/cli/src/bin/cli.ts` | 修改 | 新增 `archi-to-rules` 命令注册 |
| `.dc-reporter/archi-rules.json` | 新增 (生成物) | 生成的 forbidden 规则文件, 被 `.dependency-cruiser.js` 引用 |
| `.dependency-cruiser.js` | 修改 | 添加 `extends` 字段引用 `archi-rules.json` |
| `openspec/changes/add-archi-to-rules-command/tests/unit/*.test.ts` | 新增 | 单元测试 |
| `openspec/changes/add-archi-to-rules-command/tests/integration/archi-to-rules.test.ts` | 新增 | 集成测试 |
| `openspec/changes/add-archi-to-rules-command/tests/fixtures/*.c4` | 新增 | 测试夹具 |

---

## 2. 数据流

### 2.1 主流程

```
开始
  │
  ▼
解析 CLI 选项 (--cwd, --output)
  │
  ▼
读取 .dc-reporter/architecture/*.c4
  │  ├── 目录不存在 → 输出错误, exit code 1
  │  └── 无 .c4 文件 → 输出错误, exit code 1
  ▼
fromSources({filename: content})
  │  └── 解析失败 (语法错误) → 输出错误, exit code 1
  ▼
syncComputedModel()
  │
  ▼
过滤元素: kind ∈ {package, module}
  │  └── 无 package/module → 输出提示, 生成空规则集, exit code 0
  ▼
过滤关系: kind = "dependency"
  │  (仅保留 source 和 target 均在过滤后元素集合中的关系)
  ▼
遍历每个元素:
  │  1. resolveElementPath(el)     → 推导文件系统路径
  │  2. collectDependencyPaths(el) → 收集所有依赖目标的路径
  │  3. buildForbiddenRule(el, paths) → 生成规则对象
  │  4. validatePath(path)         → 路径存在性检查 (收集所有失败)
  │
  ├── 存在不存在的路径 → 输出警告列表, exit code 1
  └── 全部路径存在
      ▼
写入 .dc-reporter/archi-rules.json
  │
  ▼
更新 .dependency-cruiser.js extends 字段
  │
  ├── 不含 extends → 添加 extends: [".dc-reporter/archi-rules.json"]
  ├── extends 为字符串 → 转换为数组, 追加条目
  └── extends 为数组 → 无重复时追加, 已包含则跳过
  │
  ▼
完成 (exit code 0)
```

### 2.2 路径解析算法

`resolveElementPath(fqn, links, allElements)` 实现三层级联路径推导，路径末尾不带斜线，以同时匹配文件（如 `analyze.ts`）和目录（如 `analyze/index.ts`）:

```
resolveElementPath(fqn, links, allElements):
  1. 自身 link 检查
     links[0]?.relative 存在?
       ├── 是 → virtualPathToModule 处理:
       │        strip virtual: 前缀 → 去末尾斜线 → strip 文件名+扩展名+前导斜线
       │        例: "virtual:packages/core/src/utils/index.ts" → "packages/core/src/utils"
       │        例: "virtual:packages/core/" → "packages/core"
       └── 否 → 继续步骤 2

  2. 祖先链 link 检查 (基于 FQN hierarchy)
     遍历 ancestorFqns(fqn):  (最近祖先优先)
       parent 有 link 吗?
         ├── 是 → parent 是哪种类型?
         │      ├── package → "parent.link_dir/src/<element_relative_segments>"
         │      ├── module  → "parent.link_dir/<element_relative_segments>"
         │      └── project → "parent.link_dir/<convention_path>"
         │                    (project 的 link 作为 prefix, 拼接步骤 3 的约定推导)
         └── 否 → 继续检查下一个祖先
       全部祖先无 link → 继续步骤 3

  3. 默认约定 (无任何 link)
     解析 FQN: "ROOT.pkg.module" → ["ROOT", "pkg", "module"]
     跳过第一段 (ROOT), 取剩余 segments
     第一段完整 FQN (hasRoot ? "ROOT.<name>" : "<name>") 在 allElements 中查找 kind
        ├── kind = package: "packages/<pkg>/src/<remaining_segments>"
        │        例: ["core", "utils"] → "packages/core/src/utils"
        └── kind ≠ package: "src/<segments>"
                 例: ["app"] → "src/app"
```

**路径存在性验证**: `validatePaths(pathMap, cwd)` 对每个路径调用 `resolve(cwd, path)`，检查:
1. 路径作为目录存在 (`existsSync(absPath)`)
2. 或父目录中存在以 `basename.` 开头的文件 (如 `analyze.ts` 匹配 `analyze`)

如果以上均不满足，该路径标记为失败。所有失败的路径一次性输出后以 exit code 1 退出。

### 2.3 规则生成算法

`buildForbiddenRule(element, resolvedPath, dependencyPaths)`:

```
输入:
  - elementFqn: string (元素 FQN, 如 "ROOT.core.utils")
  - resolvedPath: string (路径前缀, 不带末尾斜线, 如 "packages/core/src/utils")
  - dependencyPaths: string[] (所有 dependency 目标路径前缀, 已去重)

输出:
  {
    name: "archi-<normalized-element-name>",
    severity: "error",
    comment: "<resolvedPath> can only depends on <uniquePaths> (Auto-generated from C4 architecture model)",
    from: {
      path: "^<resolved-path>",                 // ^ 锚定, 匹配文件和子目录
    },
    to: {
      pathNot: [
        "<resolved-path>",                      // 自身路径
        ...dependencyPaths,                      // 所有依赖目标路径
      ],
      dependencyTypes: ["local"],
    },
  }

规则文件结构 (.dc-reporter/archi-rules.json):
  { "forbidden": [ <rule1>, <rule2>, ... ] }
```

**name 格式化规则**:
- 元素 FQN: `ROOT.core.utils` (规范形式)
- 移除开头的 `ROOT.` 前缀
- 将 `.` 替换为 `-`
- 输出: `archi-core-utils`

### 2.4 配置更新算法

`updateDependencyCruiserConfig(configPath: string, extendsValue: string)`:

```
读取 .dependency-cruiser.js 内容为字符串
查找 module.exports = { ... } 中的 extends 字段:

场景 A: extends 不存在
  → 在 module.exports = { 之后插入 `  extends: ["<extendsValue>"],`
  → 输出: extends: [".dc-reporter/archi-rules.json"]

场景 B: extends 存在且为字符串
  → 将 extends: "oldValue" 替换为 extends: ["oldValue", "<extendsValue>"]
  → 输出: extends: [".dependency-cruiser.json", ".dc-reporter/archi-rules.json"]

场景 C: extends 存在且为数组
  → 检查数组中是否已包含 <extendsValue>
     ├── 已有 → 不修改 (幂等)
     └── 没有 → 追加到数组末尾
  → 输出: extends: [".dependency-cruiser.json", ".dc-reporter/archi-rules.json"]

写入更新后的内容到文件
```

**实现方式**: 使用正则表达式匹配 `extends` 字段。正则模式需要考虑:
- `extends:` (冒号前后可能有空格)
- `extends :` (冒号前有空格)
- 支持单引号/双引号字符串
- 支持数组语法 `[...]`

**降级策略**: 如果正则匹配失败 (如配置文件格式非预期), 输出警告信息但不中断命令执行。规则文件仍然生成, 仅配置更新步骤跳过。

### 2.5 数据模型

```
// 生成的规则文件: .dc-reporter/archi-rules.json
interface ArchiRulesFile {
  forbidden: ForbiddenRule[];
}

interface ForbiddenRule {
  name: string;             // "archi-<normalized-name>"
  severity: "error";
  comment: string;          // "Auto-generated from C4 architecture model"
  from: {
    path: string;           // 正则表达式: 元素自身目录
  };
  to: {
    pathNot: string[];      // 正则表达式数组: 自身目录 + 所有依赖目录
    dependencyTypes: ["local"];
  };
}

// 内部数据模型
interface ElementModel {
  id: string;
  name: string;             // 元素 FQN, 如 "ROOT.core.utils"
  kind: "package" | "module";
  resolvedPath: string;     // 推导后的目录路径 (相对 cwd)
}

interface RelationModel {
  source: string;           // 源元素 id
  target: string;           // 目标元素 id
}
```

---

## 3. 路由 / API 设计

### 3.1 CLI 命令设计

**命令名称**: `dep-report archi-to-rules`

**选项**:

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `--cwd <path>` | string | `.` | 工作区根目录, 所有相对路径基于此解析。对应 `program.opts().cwd` |
| `--output, -o <path>` | string | `<cwd>/.dc-reporter/archi-rules.json` | 规则文件输出路径。父目录不存在时自动创建 |

**全局选项** (由 Commander.js 的 `program` 实例提供):
- `--cwd <path>`: 已在 `cli.ts` 中注册, `archi-to-rules` 命令共享此选项

**行为**:
- `.c4` 文件输入目录: `<cwd>/.dc-reporter/architecture/` (固定, 不可配置)
- 规则文件输出: `--output` 或 `<cwd>/.dc-reporter/archi-rules.json`
- 配置文件更新目标: `<cwd>/.dependency-cruiser.js`
- 成功: exit code 0
- 失败: exit code 1 (路径不存在、解析错误、目录缺失)

### 3.2 函数签名

```typescript
// archi-to-rules.ts
export interface ArchiToRulesOptions {
  /** Workspace root directory (default ".") */
  cwd?: string;
  /** Output path for rules file (default: .dc-reporter/archi-rules.json) */
  output?: string;
}

export async function archiToRules(options: ArchiToRulesOptions): Promise<void>;

// CLI.ts 中的命令注册模式 (遵循 analyze/open 的现有模式):
// program.command('archi-to-rules')
//   .description('Generate dependency-cruiser rules from C4 architecture model')
//   .option('-o, --output <path>', 'Output rules JSON file')
//   .action(async (options) => { ... });
```

### 3.3 纯函数接口 (可测试)

```typescript
// 路径解析 (无副作用, 可独立测试)
// 基于 FQN hierarchy 推导祖先链, 跳过 ROOT 前缀
function resolveElementPath(
  fqn: string,
  links: ReadonlyArray<C4Link> | null | undefined,
  allElements: Map<string, C4Element>,
): string;  // 路径前缀, 不带末尾斜线

// 规则构建 (纯函数)
function buildForbiddenRule(
  elementFqn: string,
  resolvedPath: string,
  dependencyPaths: string[],
): ForbiddenRule;

// 配置更新 (有副作用: 读/写文件)
function updateDependencyCruiserConfig(
  configPath: string,
  extendsValue: string,
): boolean;  // true=已修改, false=无变化

// 路径存在性验证 (有副作用: 读文件系统)
// 双重检查: 1) 目录存在  2) 父目录中存在 basename.* 文件
function validatePaths(
  paths: Map<string, string>,  // elementFqn → resolvedPath
  cwd: string,
): Array<[string, string]>;  // 不存在的 [fqn, path] 列表
```

---

## 4. 设计决策

### 决策 1: 核心逻辑内聚在单文件中

**选择方案**: 将 `archi-to-rules.ts` 作为单一文件, 所有辅助函数 (路径解析、规则生成、配置更新) 均定义在同一个文件中, 通过命名导出提供纯函数给单元测试使用。

**备选方案**: 将核心逻辑拆分为多个文件 (`path-resolver.ts`, `rule-builder.ts`, `config-updater.ts`)

| 对比维度 | 单文件内聚 (选中) | 多文件拆分 (备选) |
|---------|------------------|-----------------|
| 代码量 | ~300-400 行, 文件适度 | 每个文件 ~50-150 行 |
| 搜索导航 | 工作流上下游关系在同一文件中, 阅读流畅 | 需跨文件跳转理解完整流程 |
| 依赖管理 | 单文件内的函数直接调用, 无需跨文件 import | 每个文件需显式 import/export |
| 测试导入 | 单元测试从单文件导入多个命名函数 | 单元测试需从不同文件导入 |
| 扩展性 | 后续拆分文件是向后兼容的 (re-export) | 已拆分但后续调整需修改多个文件 |
| 测试文件数量 | 1-2 个测试文件覆盖全部逻辑 | 每个组件对应独立测试文件 |

**决策理由**: 遵循"简单优先"原则, ~300-400 行代码在一个文件中完全可以管理。当前没有其他消费者需要独立使用路径解析或规则构建能力。项目中 `analyze.ts` (~100 行) 和 `open.ts` (~60 行) 也遵循单文件模式。未来如果路径解析逻辑变得复杂 (如支持更多 link 格式), 可以自然提取为独立模块, 且通过 re-export 保持向后兼容。

**注意**: 单文件中的每个核心函数导出为命名函数, 单元测试可直接导入测试, 不依赖文件边界。

### 决策 2: 正则文本操作更新 `.dependency-cruiser.js`

**选择方案**: 使用正则表达式匹配和文本替换来更新 `.dependency-cruiser.js` 的 `extends` 字段。

**备选方案 A**: 使用 `bundle-require` 加载 JS 配置文件, 在内存中修改对象, 然后序列化回文件

| 对比维度 | 正则文本操作 (选中) | bundle-require (备选) |
|---------|---------------------|-----------------------|
| 实现复杂度 | 约 30 行代码, 3-4 条正则 | 约 15 行代码加载 + 需解决序列化问题 |
| 格式化保留 | 保留原文件的注释/空行/缩进 | 重序列化丢失所有格式和注释 |
| 错误处理 | 正则匹配失败时降级 (跳过) | 加载失败时无法降级 (`require` 抛异常) |
| 依赖 | 无 (仅使用 `node:fs` 读/写文本) | 需 `bundle-require` (已安装) |
| 可靠性 | 对高度自定义的 JS 格式边界情况可能误匹配 | 加载 JS 后原对象修改可靠, 但写回不可靠 |

**决策理由**: 正则方案在保留注释和格式方面有根本优势。`bundle-require` 方案虽然加载 JS 可靠, 但将对象序列化回 JS 文件会丢失所有注释、模板字符串、自定义格式化——这是 `.dependency-cruiser.js` (一个手写文档) 不可接受的。正则方案的降级策略 (匹配失败时跳过更新) 确保规则文件始终生成, 配置更新为附加价值。

**备选方案 B**: 使用 AST 解析 (如 `@babel/parser` + `@babel/generator`)

| 对比维度 | 正则 (选中) | AST 解析 (备选) |
|---------|------------|----------------|
| 依赖 | 无 | 需新增 `@babel/parser` + `@babel/generator` (~1MB+) |
| 可靠性 | 边界情况可能误匹配, 有降级策略 | 精确 AST, 100% 可靠 |
| 实现复杂度 | 约 30 行 | 约 60-80 行 (遍历 AST, 查找 AssignmentExpression) |
| 维护成本 | 低 | 需理解 AST 结构, Babel API 可能随版本变化 |

**决策理由**: 为 ~30 行的配置修改逻辑引入 ~1MB 的 Babel 依赖不合理。正则方案对 `extends` 字段的匹配场景足够可靠, 且降级策略保证核心功能不受影响。

### 决策 3: `@likec4/language-services` 使用 Node.js entry (动态 import)

**选择方案**: 在 `archi-to-rules.ts` 中使用 `const { fromSources } = await import('@likec4/language-services/node')` 动态导入。

**决策理由**: 
- 遵循 `architecture.ts` 中已有的模式和路径 (`'@likec4/language-services/node'`)
- 动态 import 确保 CLI 启动时不加载 LikeC4 解析器, 仅在执行 `archi-to-rules` 命令时加载
- 与其他命令 (`analyze`, `open`) 的执行路径隔离

**备选方案**: 使用静态导入 `import { fromSources } from '@likec4/language-services/node'`

| 对比维度 | 动态 import (选中) | 静态 import (备选) |
|---------|-------------------|-------------------|
| 启动性能 | 仅 `archi-to-rules` 命令加载 | 所有命令都加载 LikeC4 依赖 |
| 错误处理 | try/catch 包裹, 优雅降级 | 模块加载失败导致 CLI 无法启动 |
| 一致性 | 与 `architecture.ts` 使用相同模式 | 引入新的加载模式 |

### 决策 4: 路径存在性验证为警告+退出, 而非直接阻断

**选择方案**: 收集所有不存在的路径, 一次性列出全部, 然后退出 (exit code 1)。

**备选方案**: 第一个不存在的路径立即退出

| 对比维度 | 汇总报告 (选中) | 立即退出 (备选) |
|---------|----------------|----------------|
| 用户体验 | 一次运行看到所有失败, 无需反复修复 | 每次只看到第一个失败, 需多次运行 |
| 实现复杂度 | 需收集全部路径后再统一检查 | 逐个检查, 发现不存在立即返回 |
| 错误友好性 | 用户可一次了解所有路径问题 | 用户需要多次修复多次运行 |

**决策理由**: 用户一次运行即可看到所有路径问题, 修复效率更高。此行为与 B-15 边界用例一致。

### 决策 5: 关系过滤时交叉验证 source/target

**选择方案**: 仅保留 `source` 和 `target` 都在过滤后元素集合中的 `kind = "dependency"` 关系。

**备选方案**: 仅按 `kind = "dependency"` 过滤, 不验证元素是否存在

| 对比维度 | 交叉验证 (选中) | 仅按 kind 过滤 (备选) |
|---------|----------------|---------------------|
| 规则完整性 | 不会为 project/outer 元素生成无效依赖路径 | 可能为已过滤元素生成无效规则 |
| 错误概率 | 依赖目标一定在元素集合中, `resolveElementPath` 不会失败 | 指向 project/outer 的依赖无法解析路径, 导致规则不完整或失败 |
| 实现复杂度 | 需对 relations 做一次 O(n) 过滤, 建立 Set 索引 | 无过滤成本 |

**决策理由**: B-9 边界用例要求: 指向 project/outer (已过滤) 的依赖不应纳入规则生成。交叉验证确保规则只包含有效的、可解析路径的依赖。建立 `validElementIds` 的 Set 索引后, 过滤操作为 O(1) 查找, 性能无影响。

---

## 5. 边界情况处理

| 编号 | 条件 | 行为 |
|------|------|------|
| B-1 | `links[0].relative` 包含文件扩展名 (如 `virtual:src/utils/index.ts`) | strip `virtual:` 前缀 → strip 文件名+扩展名+前导斜线 → `src/utils` |
| B-2 | `links[0].relative` 为 `../` 相对路径 upper 引用 | 保持路径字面量原样使用, 不做内部 resolve 为绝对路径 |
| B-3 | 元素 FQN 包含连字符 (如 `ROOT.my-module.sub`) | 规则 name 移除 `ROOT.` 前缀后用 `-` 替换 `.`, 连字符保持原样 → `archi-my-module-sub` |
| B-4 | 多个 dependency 目标指向同一路径 (去重) | `pathNot` 中去掉重复路径 |
| B-5 | 元素自身路径与 dependency 目标路径相同 (自引用) | `pathNot` 去重后仅有自身路径 |
| B-6 | 自身 link 和祖先 link 同时存在 | 自身 link 优先 (AC-5), 不查找祖先 |
| B-7 | `.dc-reporter/architecture/` 目录存在但为空 (无 `.c4` 文件) | 视为"无 .c4 文件", 输出错误信息, exit code 1 |
| B-8 | `.dependency-cruiser.js` 使用 ESM `export default` 格式 | 正则同样匹配 `export default { extends: ... }`, 若格式不支持则输出警告, 跳过配置更新 |
| B-9 | `dependency` 指向已过滤的元素 (project/outer) | 该关系不纳入规则生成, 不影响其他有效 dependency |
| B-10 | 祖先链无 link (FQN hierarchy 全部无 link) | 回退到默认约定推导, 跳过 ROOT 前缀, 重建完整 FQN 在 allElements 中查找 kind |
| B-10a | ROOT (project) 有 link, 其他祖先无 link | project link 作为 prefix 拼接默认约定路径: `<prefix>/<convention_path>` |
| B-10b | ROOT 和 package 祖先都有 link | package 祖先更近, 优先命中 package 祖先的 link 下钻, ROOT link 被忽略 |
| B-11 | 默认约定: 第一段 package 的 FQN 深度只有 1 段 (如 `ROOT.core`) | 路径为 `packages/core` (不拼接 `src/`) |
| B-12 | 默认约定: 第一段非 package 的 FQN 深度只有 1 段 (如 `ROOT.app`) | 路径为 `src/app` |
| B-13 | 连续多次运行 + extends 数组有其他条目 | 每次运行只追加一次, 不重复, 其他条目不受影响 |
| B-14 | `--output` 父目录不存在 | 自动创建父目录 (`mkdirSync` with `recursive: true`) |
| B-15 | 多个元素路径解析后都不存在 | 一次性列出所有失败元素名称和路径, 不立即退出 |
| B-16 | 全部元素为 project 或 outer (无 package/module) | 过滤后元素集为空, 输出提示, 规则文件 `{"forbidden": []}`, exit code 0 |

---

## 6. 依赖

### 6.1 新增运行时依赖

**无。** 所有所需依赖已在 `packages/cli/package.json` 中存在:

| 包名 | 版本 | 用途 | 已有? |
|------|------|------|-------|
| `@likec4/language-services` | 1.56.0 | C4 文件解析 (`fromSources`, `syncComputedModel`) | 是 (已用于 `architecture.ts`) |
| `commander` | ^12.0.0 | CLI 命令注册和参数解析 | 是 |
| `typescript` (dev) | ^5.5.0 | 类型定义 | 是 |

### 6.2 新增开发依赖 (测试)

建议但非必须的测试依赖:
| 包名 | 用途 | 位置 |
|------|------|------|
| `sinon` (可选) | mock/spy 辅助 | `packages/cli/devDependencies` |
| `tsx` | 直接运行 TypeScript 测试文件 | 项目根或 `packages/cli/devDependencies` |

优先使用 Node.js 内置 `node:test` 的 `mock` 模块 (Node.js 22+), 无需外部 mock 库。

### 6.3 依赖影响分析

- `@likec4/language-services` 已为项目依赖, 无新增安装
- `archi-to-rules` 在 CLI 中加载 `@likec4/language-services/node`, 与 `architecture.ts` 共享同一包
- 无传递依赖新增, 无版本冲突风险
- 纯 CLI 操作, 不涉及 Browser/Webpack 构建

---

## 7. 风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 层级约定推导的路径与项目实际目录结构不匹配, 规则无效 | 中: 规则不生效, 用户误以为合规 | 中 | 路径存在性验证 (AC-7); link 属性覆盖机制; README 中明确文档化推导约定 |
| `@likec4/language-services` API 变动 (如 `$data.elements` 结构变化) | 中: 解析逻辑失效 | 低 | 集成测试捕获; 使用 `computed.parent()` / `computed.ancestors()` 而非直接访问 `$data` |
| `.dependency-cruiser.js` 配置更新正则匹配失败 | 低: 配置未更新, 规则文件仍生成 | 中 | 降级策略: 正则失败时输出警告, 退出码 0 (不影响规则文件生成) |
| 大型项目中元素数量过多 (>100), 规则文件庞大 | 低: 规则文件过大 | 低 | dependency-cruiser 对 path 正则性能影响小; 可后续引入规则合并优化 |
| 用户手动编辑 `archi-rules.json` 后被覆盖 | 低: 用户修改丢失 | 低 | 文件注释标注 "Auto-generated"; 文档说明此为生成文件不应手动编辑 |
