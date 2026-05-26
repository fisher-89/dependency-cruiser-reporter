# 任务列表: add-archi-to-rules-command

> **变更**: add-archi-to-rules-command
> **日期**: 2026-05-22
> **状态**: 待执行

---

## Phase 1: 核心命令文件 — `archi-to-rules.ts`

- [x] 1.1 创建 `packages/cli/src/commands/archi-to-rules.ts`, 实现以下纯函数:
  - `resolveElementPath(el, computed)`: 3 层级联路径推导 (自身 link → 祖先 link 下钻 → 默认约定)
  - `buildForbiddenRule(elementName, resolvedPath, dependencyPaths)`: 生成单条 forbidden 规则对象
  - `buildRulesFile(elements, dependencyMap)`: 生成完整的 `{ "forbidden": [...] }` 结构
  - `validatePaths(pathMap, cwd)`: 路径存在性验证, 返回不存在的路径列表
  - `updateDependencyCruiserConfig(configPath, extendsValue)`: 更新 `.dependency-cruiser.js` 的 `extends` 字段
- [x] 1.2 实现 `archiToRules(options)` 主入口函数, 编排完整工作流:
  - 解析 `--cwd` (来自 `program.opts().cwd`) 和 `--output` 选项
  - 调用 `loadC4Model(cwd)`: 读取 `.dc-reporter/architecture/*.c4`, `fromSources()`, `syncComputedModel()`
  - 元素过滤: `kind ∈ {package, module}`
  - 关系过滤: `kind = "dependency"` + source/target 交叉验证
  - 遍历元素: 路径解析 → 依赖收集 → 规则生成 → 路径验证
  - 写入规则文件 (自动创建父目录)
  - 更新 `.dependency-cruiser.js` 的 `extends`
  - 根据路径验证结果设置 exit code
- [x] 1.3 实现错误处理路径:
  - `.dc-reporter/architecture/` 不存在时, `console.error("...")` + `process.exit(1)`
  - 目录存在但无 `.c4` 文件时, `console.error("...")` + `process.exit(1)`
  - `.c4` 文件解析失败时, 捕获 `fromSources`/`syncComputedModel` 异常, `console.error(解析错误详情)` + `process.exit(1)`
  - 路径不存在时, 累计所有失败路径, `console.warn(...)` 列出每个失败的元素名和路径, `process.exit(1)`
  - 配置更新正则匹配失败时, `console.warn(...)` 提示配置未更新, **不退出** (降级)
  - 过滤后无 package/module 元素时, 输出提示信息, **正常退出** (exit code 0, 生成空规则文件)
- [x] 1.4 实现 `loadC4Model(cwd)` 辅助函数:
  - 扫描 `.dc-reporter/architecture/` 目录下的 `.c4` 文件
  - 动态 `import('@likec4/language-services/node')`
  - 调用 `fromSources(filename → content)` 解析
  - 检查 `computed.hasErrors()` / `computed.getErrors()`
  - 调用 `computed.syncComputedModel()` 获取 computed model
- [x] 1.5 实现路径存在性验证降级逻辑:
  - 收集所有元素解析后的路径
  - 对每个路径调用 `existsSync(resolve(cwd, path))`
  - 存在任意不存在的路径 → 一次性 stderr 列出全部, exit code 1
  - 全部存在 → 正常继续

## Phase 2: CLI 命令注册

- [x] 2.1 在 `packages/cli/src/commands/index.ts` 中添加 `export { archiToRules } from './archi-to-rules.js'`
- [x] 2.2 在 `packages/cli/src/bin/cli.ts` 中注册 `archi-to-rules` 命令:
  - `program.command('archi-to-rules')`
  - `.description('Generate dependency-cruiser rules from C4 architecture model')`
  - `.option('-o, --output <path>', 'Output rules JSON file')`
  - `.action(async (options) => { ... })`
  - 从 `program.opts().cwd` 获取 `--cwd`
  - 调用 `await archiToRules({ cwd, output })`
- [x] 2.3 运行 `pnpm build` (或 `pnpm --filter @dcr-reporter/cli build`) 确认构建通过
- [x] 2.4 运行 `node packages/cli/bin/cli.js archi-to-rules --help` 验证命令帮助信息显示

## Phase 3: 测试夹具与测试目录

- [x] 3.1 创建测试目录结构:
  - `openspec/changes/add-archi-to-rules-command/tests/unit/`
  - `openspec/changes/add-archi-to-rules-command/tests/integration/`
  - `openspec/changes/add-archi-to-rules-command/tests/fixtures/`
- [x] 3.2 创建 C4 测试夹具文件:
  - `tests/fixtures/simple-archi.c4`: 含 2 个 package、1 个 module、1 条 dependency
  - `tests/fixtures/multi-file/main.c4` 和 `tests/fixtures/multi-file/shared.c4`: 多文件解析
  - `tests/fixtures/broken-syntax.c4`: 语法错误 (如缺失大括号)
  - `tests/fixtures/no-deps.c4`: 含 1 个 package 但无 dependency 声明

## Phase 4: 单元测试

- [x] 4.1 编写 `tests/unit/path-resolution.test.ts` (mock `@likec4/language-services` 的 `fromSources`/`syncComputedModel`):
  - 自身 link 直接使用
  - package 祖先 link 下钻 (拼接 `src/`)
  - module 祖先 link 下钻 (不拼接)
  - 无 link 默认约定 (package 第一段: `packages/<pkg>/src/`)
  - 无 link 默认约定 (非 package 第一段: `src/`)
  - link strip 文件名和扩展名
  - link 包含 `../` 保持字面量
  - ancestors() 返回空数组时回退到默认约定
- [x] 4.2 编写 `tests/unit/rule-generation.test.ts`:
  - 3 个元素生成 3 条规则, name 前缀 `archi-`
  - 规则 `to.dependencyTypes` 为 `["local"]`
  - `pathNot` 格式: 自身 + 3 个依赖目标, 4 个路径
  - 零依赖元素, pathNot 仅含自身目录
  - FQN 含连字符的 `name` 转换
  - 多个 dependency 指向同一路径的去重
  - 自身路径与依赖路径相同 (自引用) 的去重
  - `pathNot` 正则格式验证
- [x] 4.3 编写 `tests/unit/config-update.test.ts` (mock `fs.readFileSync`/`writeFileSync`):
  - extends 不存在时添加
  - extends 为字符串时转换为数组
  - extends 已有条目时幂等跳过
  - extends 数组中有其他条目时追加
  - 不支持的文件格式 (ESM export default) 降级处理
- [x] 4.4 运行单元测试确认全部通过:
  - `cd packages/cli && node --test ../../openspec/changes/add-archi-to-rules-command/tests/unit/*.test.ts`

## Phase 5: 集成测试

- [x] 5.1 编写 `tests/integration/archi-to-rules.test.ts`:
  - AC-1: 在临时目录创建含 package/module 的 `.c4` 文件, spawn CLI, 验证 exit code 0
  - AC-7: 创建 `link="nonexistent/path/"` 的元素, 验证 stderr 含警告, exit code 1
  - AC-8: 不传 `--output` 验证默认路径; 传 `-o ./custom.json` 验证自定义路径
  - AC-9: 执行后验证 `.dependency-cruiser.js` 的 `extends` 包含规则文件引用
  - AC-10: 连续执行两次, 验证 `extends` 不重复
  - AC-11: `--cwd ./my-project` 验证路径基目录变更
  - AC-12: 删除架构目录, 验证错误信息和 exit code 1
  - AC-13: 语法错误的 `.c4` 文件, 验证解析错误信息和 exit code 1
  - B-16: 全部 project/outer 元素, 验证空规则文件, exit code 0
  - B-14: `--output` 父目录不存在, 验证自动创建
- [x] 5.2 运行集成测试确认全部通过:
  - `cd packages/cli && node --test ../../openspec/changes/add-archi-to-rules-command/tests/integration/*.test.ts`

## Phase 6: 构建与项目验证

- [x] 6.1 运行 `pnpm build --filter @dcr-reporter/cli` 确认 CLI 构建无错误
- [x] 6.2 运行 `pnpm build` 确认全项目构建通过
  - 注: frontend 包有已有问题 (missing jsdom, useExhaustiveDependencies lint), 不影响本变更
- [x] 6.3 运行 `pnpm test` 确认全部测试通过 (含所有包的测试)
  - 注: frontend 测试因已有问题跳过, CLI 和 e2e 全部通过
- [x] 6.4 运行 `pnpm lint` 确认代码风格无问题
  - `archi-to-rules.ts` 已通过 `biome check --fix --unsafe` 自动修正
  - 剩余 lint 错误均为已有代码 (open.ts, analyze.ts, server.ts, frontend 等)
- [x] 6.5 人工验证: 在项目根目录执行 `node packages/cli/bin/cli.js archi-to-rules`:
  - 确认从 `.dc-reporter/architecture/` 读取 `.c4` 文件
  - 确认 `.dc-reporter/archi-rules.json` 生成且内容格式正确
  - 确认 `.dependency-cruiser.js` 正确更新 `extends`
  - 确认 `extends` 幂等性: 再次执行, 配置文件不重复追加
  - 确认 `--help` 显示命令描述和选项
- [x] 6.6 人工验证: 删除架构目录后执行, 确认错误信息提示清晰
  - 已在集成测试 AC-12 中覆盖
