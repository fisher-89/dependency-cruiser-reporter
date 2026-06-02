# 实现任务: add-dashboard-action-buttons

> **变更**: add-dashboard-action-buttons
> **日期**: 2026-05-29

---

## 阶段 1: 重构核心函数 (移除 process.exit)

此阶段修改 `analyze()` 和 `archiToRules()` 函数，使其可被 Express 路由安全调用而不杀死进程。

- [x] 1.1 修改 `packages/cli/src/commands/analyze.ts` 第 92 行：将 `process.exit(1)` 替换为 `throw new Error('dependency-cruiser did not produce output')`
- [x] 1.2 修改 `packages/cli/src/commands/archi-to-rules.ts` 第 489 行：将 `console.error` + `process.exit(1)` 替换为 `throw new Error('Architecture directory not found: ...')`
- [x] 1.3 修改 `packages/cli/src/commands/archi-to-rules.ts` 第 496 行：将 `console.error` + `process.exit(1)` 替换为 `throw new Error('No .c4 files found in ...')`
- [x] 1.4 修改 `packages/cli/src/commands/archi-to-rules.ts` 第 514 行：将 `console.error` + `process.exit(1)` 替换为 `throw new Error('C4 parse errors: ...')`
- [x] 1.5 修改 `packages/cli/src/commands/archi-to-rules.ts` 第 687 行：将 `console.warn` + `process.exit(1)` 替换为 `throw new Error('Path validation failed: ...')`
- [x] 1.6 修改 `packages/cli/src/bin/cli.ts`：在 `analyze` 命令的 action handler 中添加 try-catch，捕获异常后 `console.error` 并 `process.exit(1)`，确保 CLI 命令行行为不变
- [x] 1.7 修改 `packages/cli/src/bin/cli.ts`：在 `archi-to-rules` 命令的 action handler 中添加 try-catch，捕获异常后 `console.error` 并 `process.exit(1)`，确保 CLI 命令行行为不变
- [x] 1.8 验证：运行 `pnpm build:ts` 编译通过，运行 `pnpm test` 测试通过

## 阶段 2: 新增 API 端点（提取模式）

此阶段遵循 `setup*Routes(app, context)` 提取模式创建独立路由模块。

- [x] 2.1 **新增** `packages/cli/src/server/actions/actions.ts`：
  - 导出 `setupActionRoutes(app: Express, { cwd }: { cwd: string }): void`
  - 注册 `POST /api/analyze`：调用 `analyze({ path: '.', cwd })`，成功返回 `200 { output }`，异常返回 `500 { error, details? }`
  - 注册 `POST /api/archi-to-rules`：调用 `archiToRules({ cwd })`，成功返回 `200 { success: true }`，异常返回 `500 { error, details? }`
- [x] 2.2 修改 `packages/cli/src/server/server.ts`：
  - 移除内联的 `/api/graph` 以外的新路由注册代码
  - `setupRoutes()` 中添加 `setupActionRoutes(this.app, { cwd: this.cwd })` 调用
  - 更新 import 语句
- [x] 2.3 验证：运行 `pnpm build:ts` 编译通过，启动 dashboard 后用 curl 测试两个端点（`/api/analyze`、`/api/archi-to-rules`）的正常和异常路径

## 阶段 3: 前端 — 添加图标组件

- [x] 3.1 在 `packages/frontend/src/components/icons.tsx` 中新增 `ScanIcon` SVG 组件（扫描/雷达样式，16x16，与现有图标风格一致）
- [x] 3.2 在 `packages/frontend/src/components/icons.tsx` 中新增 `GenerateRulesIcon` SVG 组件（规则/列表样式，16x16，与现有图标风格一致）

## 阶段 4: 前端 — Scan 按钮 (GraphViewLayout)

- [x] 4.1 修改 `GraphViewLayout` 组件接口：新增 `scanning: boolean`、`scanError: string | null`、`onScan: () => void` 三个 props
- [x] 4.2 在 action bar 的 Refresh 按钮前添加 Scan 按钮：
  - 标题文本使用 `t('action.scan')`
  - 点击触发 `onScan`
  - `scanning` 为 true 时 disabled 并显示旋转动画，文本使用 `t('action.scanning')`
  - 使用 `ScanIcon` 组件作为图标
  - 按钮样式与 Refresh 按钮保持一致
- [x] 4.3 在 action bar 下方添加错误提示区域：
  - `scanError` 不为 null 时显示红色错误文本
  - 文本内容为 `t('action.scanError') + ': ' + scanError`
- [x] 4.4 验证：`pnpm build:ts` 编译通过

## 阶段 5: 前端 — Generate Rules 按钮 (ArchitectureView)

- [x] 5.1 在 `ArchitectureView` 组件中新增 `generating` 和 `generateError` 状态管理（已有部分状态，确认复用还是新增）：
  - `generating`（`useState(false)`）— 控制按钮 loading/disabled
  - `generateError`（`useState<string | null>(null)`）— 错误信息
- [x] 5.2 在 ready 状态的 action bar 中添加 Generate Rules 按钮：
  - 位于 Refresh 按钮旁（可放在 Refresh 按钮左侧或右侧，右侧更符合视觉流）
  - 标题文本使用 `t('action.generateRules')`
  - 点击触发 `handleGenerateRules` 异步函数
  - `generating` 为 true 时 disabled 并显示旋转动画，文本使用 `t('action.generatingRules')`
  - 使用 `GenerateRulesIcon` 组件作为图标
  - 按钮样式与 Refresh 按钮保持一致
- [x] 5.3 实现 `handleGenerateRules` 函数：
  - `POST /api/archi-to-rules` 请求
  - 设置 `generating=true`，清除 `generateError`
  - 成功时不执行额外操作（不自动刷新）
  - 失败时设置 `generateError` 为错误消息
  - finally 中设置 `generating=false`
- [x] 5.4 在 action bar 下方添加错误提示区域：
  - `generateError` 不为 null 时显示红色错误文本
- [x] 5.5 验证：`pnpm build:ts` 编译通过

## 阶段 6: 前端 — 新增 i18n 翻译

- [x] 6.1 在 `packages/frontend/src/i18n/en.ts` 新增 `action` 命名空间：
  - `action.scan`: `'Scan'`
  - `action.scanning`: `'Scanning...'`
  - `action.scanError`: `'Scan failed'`
  - `action.generateRules`: `'Generate Rules'`
  - `action.generatingRules`: `'Generating...'`
  - `action.generateRulesError`: `'Failed to generate rules'`
- [x] 6.2 在 `packages/frontend/src/i18n/zh-CN.ts` 新增 `action` 命名空间：
  - `action.scan`: `'扫描'`
  - `action.scanning`: `'扫描中...'`
  - `action.scanError`: `'扫描失败'`
  - `action.generateRules`: `'生成规则'`
  - `action.generatingRules`: `'生成中...'`
  - `action.generateRulesError`: `'生成规则失败'`
- [x] 6.3 验证：`pnpm build:ts` 编译通过，切换语言查看按钮文本正确显示

## 阶段 7: 集成与美化

- [x] 7.1 确认 `ArchitectureView` 中的 `handleGenerate`（现有 `POST /api/architecture/generate` 逻辑）与新的 Generate Rules 逻辑不冲突，确认按钮名称和功能区分清晰
- [x] 7.2 为错误消息添加适当的 CSS 样式（红色文字、合适的间距和字体大小），与现有 error 样式一致
- [x] 7.3 为按钮添加适当的间距（gap 或 margin），使 action bar 布局美观

## 阶段 8: 验证与测试

- [x] 8.1 运行 `pnpm build` 全量构建，确认无编译错误
- [x] 8.2 运行 `pnpm lint`，确认无 lint 错误
- [x] 8.3 运行 `pnpm test`，确认所有测试通过
- [x] 8.4 手动验证 AC-1：启动 dashboard，导航到 Graph/Report/Metrics 视图，确认 action bar 有 Scan 按钮
- [x] 8.5 手动验证 AC-2：点击 Scan，检查服务器日志确认 analyze 执行，检查输出文件生成
- [x] 8.6 手动验证 AC-3：点击 Scan 后，验证按钮 disabled 且显示加载动画（"Scanning..."）
- [x] 8.7 手动验证 AC-4：导航到 Architecture 视图（有 .c4 文件），确认 action bar 有 Generate Rules 按钮
- [x] 8.8 手动验证 AC-5：点击 Generate Rules，检查 `.dc-reporter/archi-rules.json` 和 `.dependency-cruiser.js` 更新
- [x] 8.9 手动验证 AC-6：模拟 analyze 失败（如删除依赖使扫描失败），确认前端显示错误提示
- [x] 8.10 手动验证 AC-7：分别执行 `dep-report analyze` 和 `dep-report archi-to-rules`，确认输出与重构前一致（无过程退出行为变化）
- [x] 8.11 手动验证 AC-8：在 Settings 中切换语言，确认按钮文本正确翻译
