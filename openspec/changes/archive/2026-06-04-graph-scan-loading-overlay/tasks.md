# 实现任务: graph-scan-loading-overlay

> **变更**: graph-scan-loading-overlay
> **日期**: 2026-06-03

---

## 阶段 1: CSS 动画和样式基础

此阶段定义进度条动画 keyframes 和 ScanOverlay 所需的基础样式。必须先于阶段 2 完成，因为 ScanOverlay 组件依赖这些 CSS 定义。

- [x] 1.1 在 `packages/frontend/src/styles/main.css` 中新增 `@keyframes scan-progress` 动画：
  - 使用 `transform: translateX()` 实现从左到右的不确定宽度扫描效果
  - 动画周期约 2s，无限循环（`infinite`）
  - 初始状态 `translateX(-100%)`，结束状态 `translateX(400%)`（确保进度条滑过整个容器）
- [x] 1.2 在 `packages/frontend/src/styles/main.css` 中新增 `.scan-progress-track` 类选择器：
  - `position: relative; overflow: hidden`
  - `background: var(--color-border)` 适配主题
  - `height: 4px; border-radius: 2px`
- [x] 1.3 在 `packages/frontend/src/styles/main.css` 中新增 `.scan-progress-bar` 类选择器：
  - `position: absolute; top: 0; left: 0; height: 100%`
  - `background: var(--color-accent)` 适配主题
  - `animation: scan-progress 2s ease-in-out infinite`
  - `border-radius: 2px`
- [x] 1.4 验证：运行 `pnpm build:ts` 确认编译通过，CSS 动画无语法错误

## 阶段 2: 新增 ScanOverlay 组件

此阶段创建独立的 `ScanOverlay` 全屏遮罩层组件。依赖阶段 1（CSS 动画定义）。

- [x] 2.1 **新增** `packages/frontend/src/components/ScanOverlay.tsx` 组件文件，包含 Props 接口定义：
  - `visible: boolean` — 控制遮罩层渲染（`false` 时返回 `null`）
  - `status: 'scanning' | 'error'` — 当前状态
  - `errorMessage: string | null` — 错误信息（仅 error 状态显示）
  - `onDismiss?: () => void` — 关闭按钮回调
- [x] 2.2 实现 `ScanOverlay` 的外层容器：
  - `visible === false` 时返回 `null`（不渲染任何 DOM）
  - `visible === true` 时渲染全屏遮罩层：`position: fixed; inset: 0; z-index: 9999`
  - `display: flex; align-items: center; justify-content: center` 使内容居中
  - light 主题背景：`background: rgba(0, 0, 0, 0.5)`，dark 主题背景：`background: rgba(0, 0, 0, 0.7)`（通过 CSS 变量或内联判断）
  - 使用 `backdrop-filter: blur(2px)` 增加毛玻璃效果
  - `data-testid="scan-overlay"` 用于 E2E 测试
  - 外层 div 设置 `tabIndex={0}` 以捕获键盘事件
- [x] 2.3 实现 scanning 状态的渲染逻辑：
  - 居中卡片容器：`background: var(--color-surface)`、`border-radius: 12px`、`padding: 32px`
  - 卡片内 flex 列布局，`align-items: center`、`gap: 16px`（图标和文字之间）、`gap: 12px`（文字和进度条之间）
  - 状态文字：使用 `useT()` 读取 `t('action.scanning')` （i18n 已存在）
  - ScanIcon 组件（来自 `components/icons.tsx`）包裹在 `.spinning` 样式的 span 中
  - 进度条：`div.scan-progress-track` 内嵌 `div.scan-progress-bar`
- [x] 2.4 实现 error 状态的渲染逻辑：
  - 错误图标：SVG X-circle 图标，颜色使用 `var(--color-error)`
  - 错误标题文本：`t('action.scanError')`（加粗，较大字号）
  - 错误详情文本：`errorMessage` prop 内容（较小字号，`var(--color-text-secondary)`）
  - "Close" 按钮文本：`t('action.scanOverlayClose')`（翻译键在阶段 5 添加，先写 fallback 文本）
  - 关闭按钮样式：与现有 action bar 按钮一致的 `border: 1px solid var(--color-border)`、`padding: 6px 12px`、`border-radius: 6px`
  - 关闭按钮点击触发 `onDismiss` 回调
  - 进度条替换为错误图标
- [x] 2.5 实现键盘事件阻止（扫描期间阻止快捷键传递到底层组件）：
  - 遮罩层最外层 div 设置 `onKeyDown` 和 `onKeyUp` 事件处理器，调用 `e.stopPropagation()`、`e.preventDefault()`
  - 在 `useEffect`（依赖 `visible`）中注册全局 `keydown`/`keyup` 事件监听器，阻止所有键盘事件传播
  - 在 `useEffect` 的 cleanup 函数中移除全局事件监听器
- [x] 2.6 验证：运行 `pnpm build:ts` 确认编译通过

## 阶段 3: 新增 i18n 翻译

此阶段为 ScanOverlay 的关闭按钮添加中英文翻译。阶段 2 依赖此阶段的翻译键，但可以先使用 fallback 文本再替换。

- [x] 3.1 在 `packages/frontend/src/i18n/en.ts` 的 `action` 命名空间下新增：
  - `scanOverlayClose: 'Close'`
- [x] 3.2 在 `packages/frontend/src/i18n/zh-CN.ts` 的 `action` 命名空间下新增：
  - `scanOverlayClose: '关闭'`
- [x] 3.3 验证：运行 `pnpm build:ts` 确认编译通过

## 阶段 4: 修改 App.tsx — handleScan 和状态管理

此阶段修改 App 根组件的扫描逻辑，实现全屏遮罩层的驱动和自动刷新。依赖阶段 2（ScanOverlay 组件存在）。

- [x] 4.1 在 `packages/frontend/src/App.tsx` 的 JSX 中渲染 `ScanOverlay`：
  - 放在根 `<div style={styles.container}>` 的第一个子元素位置（在所有其他内容之前）
  - `<ScanOverlay visible={scanning} status={scanning && scanError ? 'error' : 'scanning'} errorMessage={scanError} onDismiss={handleDismissScan} />`
  - 确保 `ScanOverlay` 的 z-index 高于 header 和所有视图内容
- [x] 4.2 修改 `App.tsx` 的 `handleScan` 回调：
  - 记录扫描开始时间：`const startTime = Date.now()`
  - `setScanning(true)`、`setScanError(null)`
  - 移除 `finally` 块中的 `setScanning(false)` 调用
  - 成功时（`res.ok === true`）：
    - 计算已用时间 `elapsed = Date.now() - startTime`
    - 若 `elapsed < 500` 则 `await new Promise(r => setTimeout(r, 500 - elapsed))`
    - `setScanning(false)`
    - 调用 `refresh()`
  - 失败时（`!res.ok`）：
    - 解析 body 提取错误信息（`details` / `error` / `statusText`）
    - `setScanError(错误信息)` — 不设置 `scanning = false`
    - `return`（不进入成功路径）
  - 网络异常（`catch`）：
    - `setScanError(err.message)` — 不设置 `scanning = false`
    - `return`
- [x] 4.3 **新增** `handleDismissScan` 回调：
  - 使用 `useCallback` 包裹
  - `setScanning(false)`
  - `setScanError(null)`
- [x] 4.4 确认 `handleScan` 的 `useCallback` 依赖数组：添加 `refresh` 依赖
- [x] 4.5 验证：运行 `pnpm build:ts` 确认编译通过

## 阶段 5: 修改 GraphViewLayout — 移除内联错误提示

此阶段移除 action bar 下方的内联错误提示，该功能已移至全屏遮罩层。依赖阶段 4 中 `handleScan` 不再依赖 `GraphViewLayout` 显示错误。

- [x] 5.1 在 `packages/frontend/src/components/GraphViewLayout.tsx` 中移除 `scanError` 渲染逻辑：
  - 移除 `{scanError && (<div style={styles.errorText}>...)}` JSX 代码块
  - 移除 `styles.errorText` 样式对象
  - 保留 `scanError` prop 在接口类型定义中（向后兼容，调用方仍传入）
- [x] 5.2 验证：运行 `pnpm build:ts` 确认编译通过

## 阶段 6: 单元测试

此阶段为新增的 ScanOverlay 组件和修改后的 App/GraphViewLayout 逻辑添加单元测试。依赖阶段 2（ScanOverlay 组件存在）和阶段 3（i18n 翻译）。

- [x] 6.1 **新增** `packages/frontend/src/__tests__/unit/GraphViewLayout.noScanError.test.tsx`，覆盖以下场景：
  - `scanError` 被传入时，`GraphViewLayout` 不再渲染错误文字（AC-6 行为变更）
  - `scanError` 被传入时，Scan 按钮状态不受影响（仍由 `scanning` prop 控制）
  - 与现有 `GraphViewLayout.test.tsx` 互补，不修改现有测试文件
- [x] 6.2 **新增** `packages/frontend/src/__tests__/unit/ScanOverlay.test.tsx`，覆盖以下场景：
  - `visible=false` 时组件不渲染任何 DOM（返回 `null`）
  - `visible=true; status=scanning` 时显示全屏遮罩层（`data-testid="scan-overlay"`）
  - `visible=true; status=scanning` 时居中卡片包含旋转 ScanIcon 和扫描文字 `t('action.scanning')`
  - `visible=true; status=scanning` 时显示不确定进度条（`.scan-progress-track` 元素）
  - `visible=true; status=error; errorMessage="测试错误"` 时显示错误信息和关闭按钮
  - 点击关闭按钮触发 `onDismiss` 回调
  - 遮罩层背景使用 `position: fixed; inset: 0` 样式
  - 遮罩层 `z-index` 为 9999
  - 遮罩层 `data-testid` 为 `scan-overlay`
- [x] 6.3 **修改** `packages/frontend/src/__tests__/unit/GraphViewLayout.test.tsx`：
  - 移除 AC-6 相关测试（`scanError` 的渲染和隐藏测试），因为 `GraphViewLayout` 不再渲染错误信息
  - 保留 `scanError` prop 在 props 接口中的测试（验证 prop 可以被传入但不显示）
- [x] 6.4 **修改** `packages/frontend/src/__tests__/integration/AppRouting.test.tsx`（如存在）：
  - 添加模拟 Scan 按钮点击的测试场景
  - 验证扫描期间 `ScanOverlay` 出现
  - 验证扫描完成后 `ScanOverlay` 消失

## 阶段 7: 最小显示时间验证

此阶段为最小显示时间逻辑添加专项测试。

- [x] 7.1 编写最小显示时间专项测试（可以放在 `ScanOverlay.test.tsx` 末尾或独立文件）：
  - 模拟快速扫描：mock `fetch` 立即返回（< 500ms），验证遮罩层至少显示 500ms 后才关闭
  - 模拟慢速扫描：mock `fetch` 在 800ms 后返回，验证遮罩层在 fetch 返回后立即关闭（不等待额外延迟）
  - 通过 mock `Date.now()` 或使用 `vi.advanceTimersByTime` 控制时间流逝

## 阶段 8: 集成与验证

- [x] 8.1 运行 `pnpm build` 全量构建，确认无编译错误
- [x] 8.2 运行 `pnpm lint`，确认无 lint 错误
- [x] 8.3 运行 `pnpm test`，确认所有测试通过
- [x] 8.4 手动验证 AC-1：启动 dashboard，导航到 Graph 视图，点击 Scan，确认全屏遮罩层立即出现，覆盖 header 和顶部导航
- [x] 8.5 手动验证 AC-2：遮罩层显示后，尝试点击导航标签（Architecture/Graph/Report/Metrics）、拖动画布、按键盘快捷键（如 Ctrl+R），确认无任何操作响应
- [x] 8.6 手动验证 AC-3：遮罩层居中显示不确定进度条和 i18n 状态文字（英文 "Scanning..." / 中文 "扫描中..."）
- [x] 8.7 手动验证 AC-4：扫描完成后遮罩层自动关闭，图数据自动刷新（观察 Graph/Report/Metrics 视图更新）
- [x] 8.8 手动验证 AC-5：遮罩层关闭后点击导航标签、拖动画布等操作恢复正常响应
- [x] 8.9 手动验证 AC-6：模拟扫描失败（如断开服务器或返回 500），遮罩层显示错误详情和 "Close" 按钮
- [x] 8.10 手动验证 AC-7：在错误状态遮罩层中点击 "Close" 按钮，遮罩层消失，UI 恢复可交互状态
- [x] 8.11 手动验证 AC-8：在 Settings 中切换深色/浅色主题，验证遮罩层背景、文字、进度条颜色适配主题
- [x] 8.12 手动验证 AC-9：扫描期间切换浏览器标签页再切回，遮罩层状态保持，进度条动画持续运行
- [x] 8.13 手动验证 AC-10：关闭后端服务器后点击 Scan，验证网络异常时遮罩层正确显示 "Failed to fetch" 相关错误信息
