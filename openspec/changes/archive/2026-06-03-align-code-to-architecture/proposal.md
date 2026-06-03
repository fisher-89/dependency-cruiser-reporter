# 代码结构对齐架构模型

## 问题

项目已有 C4 架构模型定义在 `.dc-reporter/architecture/*.c4` 文件中，`archi-to-rules` 命令从这些 .c4 文件生成 `archi-rules.json`，通过 dependency-cruiser 强制执行模块边界。然而，实际的代码目录结构与架构模型存在多处不一致，导致以下问题：

1. `archi-rules.json` 中的规则指向不存在的路径（例如 `server/actions/` 在架构模型中为顶级 `actions/`），验证流于形式
2. 架构模型不再是"可执行的文档"——无法信任模型以理解代码组织
3. 模块职责模糊：`server.ts` 内联了三个不同关注点（前端静态托管、依赖图接口、CI 操作接口）

具体差距：

### CLI (packages/cli/src/)
- **P0**: `server/actions/actions.ts` 在错误层级。架构模型定义 `actions/` 是 `server/` 的同级目录，而非 `server/actions/`。业务逻辑（analyze、archi-to-rules）应位于 `actions/`，`commands/` 和 `server/` 都从 `actions/` 导入。
- **P0**: 缺失 `server/dep/` 模块。架构定义 `server/dep/analyze`（POST /api/analyze）和 `server/dep/graph`（POST /api/graph）。当前两条路由均内联在 `server.ts` 中。
- **P0**: 缺失 `server/dashboard/` 模块。架构定义其负责托管前端 dist 和 SPA fallback。当前内联在 `server.ts` 中。
- **P2**: `commands/analyze.ts`、`commands/archi-to-rules.ts`、`commands/dashboard.ts` 为平面文件。架构模型定义为子模块（目录），参照"模块可以是单文件"规则，应转换为 `commands/<name>/index.ts` 目录。

### 前端 (packages/frontend/src/)
- **P1**: `types.ts` 位于 src 根目录但未在架构模型中建模。被 App、hooks、theme、components 引用。架构模型需添加 `types` 模块及正确的依赖边。

### Rust 后端 (packages/rust/src/)
- **P1**: 架构模型缺失 `types` 模块（被 aggregate、layout、violations 引用的共享类型定义）和 `lib` 模块（crate 根入口，协调所有子模块的 WASM 导出点）。

### 架构模型文件缺失
- `frontend.c4`：缺少 `types` 模块定义及依赖关系
- `rust.c4`：缺少 `types` 和 `lib` 模块定义及依赖关系

## 提案

采用 Direction A：**严格重构代码以匹配架构模型**（而非调整架构模型以匹配代码）。

### 动作总览

1. **重构 CLI 源码结构**
   - 创建 `actions/` 目录：提取 `analyze` 和 `archi-to-rules` 业务逻辑到 `actions/analyze.ts` 和 `actions/archi-to-rules.ts`
   - 删除 `server/actions/` 目录，其 HTTP 路由转发至 `actions/` 模块
   - 创建 `server/dep/` 模块：从 `server.ts` 提取 `/api/analyze` 路由到 `server/dep/analyze.ts`，`/api/graph` 路由到 `server/dep/graph.ts`
   - 创建 `server/dashboard/` 模块：从 `server.ts` 提取前端静态托管和 SPA fallback 到 `server/dashboard/index.ts`
   - 将 `commands/*.ts` 转换为 `commands/*/index.ts` 目录格式
   - 更新所有 import 路径
   - 简化 `server.ts` 为模块编排入口

2. **更新架构模型 .c4 文件**
   - `frontend.c4`：新增 `types` 模块，补充 App → types、components → types 等依赖边
   - `rust.c4`：新增 `types` 模块和 `lib` 模块，补充 aggregate → types 等依赖边

3. **验证新结构**
   - `pnpm build` 通过
   - `pnpm test` 通过
   - `dep-report archi-to-rules` 生成正确的 `archi-rules.json`
   - 验证 `archi-rules.json` 中的路径与新代码结构匹配

## 能力

### 修改的能力

| 能力 | 变更类型 | 说明 |
|------|----------|------|
| `cli` | 修改 | 项目结构重构：提取 actions/、提取 server/dep/ 和 server/dashboard/、commands 目录化。CLI 功能和行为不变但代码组织重构。 |
| `frontend` | 修改 | 项目结构增加 `types` 作为架构模型中的显式模块。前端功能不变。 |
| `backend` | 修改 | Rust 模块结构增加 `types` 和 `lib` 作为架构模型中的显式模块。后端功能不变。 |

## 变更范围

### In Scope

- CLI 目录结构重构（文件移动、目录创建、import 路径更新）
- `server/actions/` 删除，替换为顶层 `actions/`
- `server.ts` 中的路由逻辑拆分到 `server/dep/` 和 `server/dashboard/`
- `commands/*.ts` 转换为 `commands/*/index.ts`
- `.c4` 架构模型文件更新（frontend.c4 + rust.c4）
- `archi-rules.json` 重新生成以验证新结构
- `pnpm build` 和 `pnpm test` 通过验证

### Out of Scope

- 功能变更：不新增或删除任何 CLI 命令、HTTP 端点或 UI 功能
- `archi-rules.ts` 路径解析算法修改：路径解析逻辑不变，仅实际路径变化
- packages/e2e/ 目录结构调整
- packages/frontend/src/ 目录下非 types.ts 的文件结构调整
- packages/rust/src/ 目录下非 .c4 模型相关的结构调整
- 布局算法、聚合逻辑等 Rust 核心算法变更

## 验收标准

| 编号 | 验收条件 | 验证方法 |
|------|----------|----------|
| AC1 | `actions/` 目录存在于 `packages/cli/src/` 根级 | 检查目录存在性 |
| AC2 | `server/actions/` 目录被删除 | 检查目录不存在 |
| AC3 | `server/dep/` 和 `server/dashboard/` 目录存在于 `packages/cli/src/server/` 下 | 检查目录存在性 |
| AC4 | `commands/*.ts` 的平面文件被替换为 `commands/*/index.ts` 目录 | 检查旧文件不存在，新目录存在 |
| AC5 | `server.ts` 不包含 `/api/graph`、`/api/analyze`、静态文件托管的 inline 路由代码 | 代码审查 |
| AC6 | `pnpm build` 无错误通过 | 执行并检查 exit code |
| AC7 | `pnpm test` 无错误通过 | 执行并检查 exit code |
| AC8 | `dep-report archi-to-rules` 可正常执行 | 在项目根执行并检查 exit code 0 |
| AC9 | 生成的 `archi-rules.json` 中所有 paths 均为有效路径 | 验证每个 from.path 对应的目录/文件存在 |
| AC10 | `frontend.c4` 包含 `types` 模块定义 | 检查 .c4 文件内容 |
| AC11 | `rust.c4` 包含 `types` 和 `lib` 模块定义 | 检查 .c4 文件内容 |
| AC12 | 所有 import 语句在新结构下正确解析 | `pnpm build` 通过即自动验证 |

## 风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| import 路径更新遗漏导致构建失败 | 中 | 高 | 逐步修改，每次修改后执行 `pnpm build:ts` 验证 |
| E2E 测试中硬编码路径需要更新 | 中 | 中 | 搜索所有测试文件中硬编码的路径引用并更新 |
| 架构模型 .c4 文件修改后其他模块依赖不一致 | 低 | 中 | 修改后立即运行 `dep-report archi-to-rules` 验证规则一致性 |
| 合并冲突：本次重构与其他分支变更冲突 | 中 | 高 | 拆分为多个小提交，按 actions→server→commands 顺序合并 |
| 导出接口命名冲突（actions/analyze vs commands/analyze） | 低 | 高 | 规划命名空间：`commands/analyze/index.ts` 仅处理 CLI 参数解析并转发至 `actions/analyze` |
