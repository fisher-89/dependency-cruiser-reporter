# 任务列表：代码结构对齐架构模型

## 阶段 0：准备工作

- [x] 0.1 确认当前 `pnpm build` 和 `pnpm test` 全部通过，作为基线
- [x] 0.2 运行 `dep-report archi-to-rules` 记录当前生成的 `archi-rules.json` 内容及验证失败的错误信息
- [x] 0.3 搜索所有代码和测试文件中硬编码的 `server/actions/`、`commands/analyze.ts`、`commands/archi-to-rules.ts`、`commands/dashboard.ts` 路径引用，建立完整映像列表

## 阶段 1：CLI — 创建 actions/ 目录并提取业务逻辑

- [x] 1.1 创建 `packages/cli/src/actions/` 目录
- [x] 1.2 创建 `packages/cli/src/actions/analyze.ts`：将 `commands/analyze.ts` 中的 `analyze` 函数、`AnalyzeOptions` 接口和所有辅助逻辑（不含 CLI 参数解析）移动到此处
- [x] 1.3 创建 `packages/cli/src/actions/archi-to-rules.ts`：将 `commands/archi-to-rules.ts` 中的 `archiToRules` 函数、所有类型定义（`ArchiToRulesOptions`、`ForbiddenRule` 等）和所有辅助函数（`resolveElementPath`、`buildForbiddenRule`、`validatePaths` 等）移动到此处

## 阶段 2：CLI — 转换 commands/ 为目录格式

- [x] 2.1 创建 `packages/cli/src/commands/analyze/` 目录
- [x] 2.2 创建 `packages/cli/src/commands/analyze/index.ts`：导入 `actions/analyze`，提供 CLI 参数解析和 `analyze` 命令处理函数
- [x] 2.3 创建 `packages/cli/src/commands/archi-to-rules/` 目录
- [x] 2.4 创建 `packages/cli/src/commands/archi-to-rules/index.ts`：导入 `actions/archi-to-rules`，提供 CLI 参数解析和 `archiToRules` 命令处理函数
- [x] 2.5 创建 `packages/cli/src/commands/dashboard/` 目录
- [x] 2.6 创建 `packages/cli/src/commands/dashboard/index.ts`：从原 `commands/dashboard.ts` 移动，导入 `server/server`，提供 CLI 参数解析和 `dashboard` 命令处理函数
- [x] 2.7 更新 `packages/cli/src/commands/index.ts`：将导出源从平面文件改为新的目录模块（`./analyze/index.js`、`./archi-to-rules/index.js`、`./dashboard/index.js`）
- [x] 2.8 删除 `packages/cli/src/commands/analyze.ts`、`packages/cli/src/commands/archi-to-rules.ts`、`packages/cli/src/commands/dashboard.ts` 三个旧文件
- [x] 2.9 执行 `pnpm build:ts` 验证编译通过

## 阶段 3：CLI — 创建 server/dep/ 和 server/dashboard/ 模块

- [x] 3.1 创建 `packages/cli/src/server/dep/` 目录
- [x] 3.2 创建 `packages/cli/src/server/dep/analyze.ts`：从 `server/actions/actions.ts` 提取 `POST /api/analyze` 路由处理函数，导入 `actions/analyze`
- [x] 3.3 创建 `packages/cli/src/server/dep/graph.ts`：从 `server/server.ts` 提取 `POST /api/graph` 路由处理函数，导入 `utils/convert`
- [x] 3.4 创建 `packages/cli/src/server/dashboard/` 目录
- [x] 3.5 创建 `packages/cli/src/server/dashboard/index.ts`：从 `server/server.ts` 提取静态文件托管和 SPA fallback 路由处理函数（`express.static` 和 `app.get('*')`）

## 阶段 4：CLI — 简化 server.ts 和更新引用

- [x] 4.1 更新 `packages/cli/src/server/server.ts`：
  - 删除 `POST /api/graph` 内联路由代码，改为导入并调用 `server/dep/graph`
  - 删除静态文件托管和 SPA fallback 路由代码，改为导入并调用 `server/dashboard`
  - 更新 `import`：`setupActionRoutes` 改为 `server/dep/analyze`，删除对 `server/actions/actions.js` 的导入
  - 保留 `setupArchitectureRoutes` 导入（位置不变）
- [x] 4.2 删除 `packages/cli/src/server/actions/` 目录及其所有文件
- [x] 4.3 更新 `packages/cli/src/server/architecture/architecture.ts`：将 `import` 路径从 `../../commands/archi-to-rules.js` 改为 `../../actions/archi-to-rules.js`
- [x] 4.4 执行 `pnpm build:ts` 验证编译通过
- [x] 4.5 执行 `pnpm test` 验证所有测试通过

## 阶段 5：更新架构模型 .c4 文件

- [x] 5.1 更新 `packages/frontend/src/types.ts` 确认导入路径正确（非物理移动，只是确认）
- [x] 5.2 更新 `D:\Projects\dependency-cruiser-reporter\.dc-reporter\architecture\frontend.c4`：新增 `types` 模块定义及依赖边
  - `App → types`、`components → types`、`hooks → types`
- [x] 5.3 更新 `D:\Projects\dependency-cruiser-reporter\.dc-reporter\architecture\rust.c4`：新增 `types` 和 `lib` 模块定义及依赖边
  - `aggregate → types`、`layout → types`、`violations → types`、`lib → types`
  - `lib → aggregate`、`lib → layout`、`lib → types`、`lib → violations`

## 阶段 6：验证

- [x] 6.1 执行 `pnpm build` 无错误通过（验证 AC6）
- [x] 6.2 执行 `pnpm test` 无错误通过（验证 AC7）
- [x] 6.3 在项目根目录执行 `dep-report archi-to-rules`，确认 exit code 为 0（验证 AC8）
- [x] 6.4 验证生成的 `.dc-reporter/archi-rules.json` 中所有 `from.path` 对应的目录或文件存在于磁盘上（验证 AC9）
- [x] 6.5 确认 `packages/cli/src/actions/` 目录存在（验证 AC1）
- [x] 6.6 确认 `packages/cli/src/server/actions/` 目录不存在（验证 AC2）
- [x] 6.7 确认 `packages/cli/src/server/dep/` 和 `packages/cli/src/server/dashboard/` 目录存在（验证 AC3）
- [x] 6.8 确认 `commands/*.ts` 平面文件已删除，`commands/*/index.ts` 目录存在（验证 AC4）
- [x] 6.9 代码审查 `server/server.ts`：确认其不包含 `/api/graph`、`/api/analyze`、静态文件托管的 inline 路由代码（验证 AC5）
- [x] 6.10 确认 `frontend.c4` 包含 `types` 模块定义（验证 AC10）
- [x] 6.11 确认 `rust.c4` 包含 `types` 和 `lib` 模块定义（验证 AC11）
