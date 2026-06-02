# 提案: add-dashboard-action-buttons

> **变更**: add-dashboard-action-buttons
> **日期**: 2026-05-29
> **状态**: 提案

---

## 问题

当前用户只能通过 CLI 执行 `dep-report analyze`（扫描依赖）和 `dep-report archi-to-rules`（生成规则）。在 Web Dashboard 中查看图形时，若想重新扫描或从架构模型生成规则，必须切换到终端手动执行命令。这打断了可视化分析的工作流。

---

## 提案

在 Dashboard 页面增加两个操作按钮：

1. **Scan（扫描）按钮** — 在 Graph/Report/Metrics 视图的 action bar 中，点击后调用 `POST /api/analyze`，服务器执行 `analyze()` 扫描当前工作目录，完成后用户可手动刷新图形查看新结果。
2. **Generate Rules（生成规则）按钮** — 在 Architecture 视图的 action bar 中，点击后调用 `POST /api/archi-to-rules`，服务器执行 `archiToRules()` 从 C4 模型生成 dependency-cruiser 规则。

两个按钮独立操作，无自动联动。`analyze` 始终扫描服务器启动时指定的 `cwd`。

为支持在 Express 服务器中调用这些函数（不杀死进程），需将 `analyze()` 和 `archiToRules()` 内部的 `process.exit()` 调用移除，改为抛出异常或返回错误，由 CLI 命令层处理进程退出。

---

## 能力

### 新增能力

- `dashboard-action-buttons` — Dashboard 操作按钮：Scan（扫描）和 Generate Rules（生成规则）

### 修改的能力

- `cli` — 新增 `POST /api/analyze` 和 `POST /api/archi-to-rules` 端点；重构 `analyze()` 和 `archiToRules()` 移除 `process.exit()`，使核心逻辑可被服务器调用
- `frontend` — ArchitectureView 和 GraphViewLayout 的 action bar 增加操作按钮；新增翻译 key

---

## 变更范围

### 实现以下特性

- Architecture 视图 action bar 增加 "Generate Rules" 按钮
- Graph/Report/Metrics 视图 action bar 增加 "Scan" 按钮
- `POST /api/analyze` API 端点，调用 `analyze({ path: '.', cwd })`
- `POST /api/archi-to-rules` API 端点，调用 `archiToRules({ cwd })`
- `analyze()` 和 `archiToRules()` 重构：移除内部 `process.exit()`，错误通过异常传播
- 按钮的 loading/disabled 状态和成功/失败提示
- 中英文翻译

### 不要修改

- 按钮之间无自动联动（scan 成功后不自动刷新图形，generate 成功后不自动触发 scan）
- 不改变现有 CLI 命令的参数接口
- 不增加目录选择或路径配置 UI
- 不修改 WASM 后端

---

## 验收标准

| ID | 验收条件 | 验证方法 | 优先级 |
|----|---------|----------|--------|
| AC-1 | Graph/Report/Metrics 视图显示 "Scan" 按钮 | 启动 dashboard，导航到 Graph 视图，确认 action bar 有 Scan 按钮 | P0 |
| AC-2 | 点击 Scan 按钮触发 `POST /api/analyze`，扫描当前 cwd | 点击 Scan，检查服务器日志确认 analyze 执行，检查输出文件生成 | P0 |
| AC-3 | Scan 执行期间按钮显示 loading 状态并禁用 | 点击 Scan，验证按钮 disabled 且显示加载动画 | P0 |
| AC-4 | Architecture 视图显示 "Generate Rules" 按钮 | 导航到 Architecture 视图（有 .c4 文件），确认 action bar 有 Generate Rules 按钮 | P0 |
| AC-5 | 点击 Generate Rules 触发 `POST /api/archi-to-rules`，生成规则文件 | 点击按钮，检查 `.dc-reporter/archi-rules.json` 生成，`.dependency-cruiser.js` 更新 | P0 |
| AC-6 | API 错误时前端显示错误信息，不崩溃 | 模拟 analyze 失败（如无配置文件），验证前端显示错误提示 | P1 |
| AC-7 | CLI 命令行为不变 | 分别执行 `dep-report analyze` 和 `dep-report archi-to-rules`，验证输出与重构前一致 | P1 |
| AC-8 | 按钮文本支持中英文切换 | 切换语言，验证按钮文本正确翻译 | P1 |

---

## 风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| `analyze()` 重构引入回归，CLI 命令行为变化 | 中 | 低 | 保持函数签名不变，CLI 命令层包装 `process.exit` |
| 扫描大项目耗时长，HTTP 请求超时 | 中 | 中 | 前端设置合理超时，显示 loading 状态 |
| `archiToRules()` 中 `process.exit(1)` 路径较多，遗漏某个 | 低 | 中 | 逐一审查所有 `process.exit` 调用点，改为 throw |
