# 设计文档: graph-scan-loading-overlay

> **变更**: graph-scan-loading-overlay
> **日期**: 2026-06-03
> **状态**: 设计

---

## 架构组件

### 1. ScanOverlay 全屏遮罩层 (新增)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `packages/frontend/src/components/ScanOverlay.tsx` | **新增**。全屏遮罩层组件，在扫描期间覆盖整个应用界面（`position: fixed; inset: 0; z-index: 9999`），阻止所有用户交互。居中显示扫描状态卡片（旋转图标、状态文字、不确定进度条），扫描失败时切换为错误状态显示错误详情和关闭按钮 | `React`, `useT()` i18n hook | React 19, TypeScript |
| `packages/frontend/src/styles/main.css` | **修改**。新增 `scan-progress` 和 `scan-progress-bar` 两个 `@keyframes` 动画定义，用于不确定进度条的 CSS 动画 | 无外部依赖 | CSS |

**ScanOverlay 组件设计**：

```
ScanOverlay (外层 fixed 容器)
├── overlay 背景遮罩 (position: fixed; inset: 0; z-index: 9999; background: rgba(...))
│   └── 居中卡片
│       ├── [scanning 状态] 旋转 ScanIcon + 状态文字 + 不确定进度条
│       └── [error 状态]    错误图标 + 错误信息 + 关闭按钮
```

**ScanOverlay Props 接口**：

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `visible` | `boolean` | `false` | 控制遮罩层渲染（`false` 时返回 `null`） |
| `status` | `'scanning' \| 'error'` | `'scanning'` | 当前状态，决定渲染内容 |
| `errorMessage` | `string \| null` | `null` | 错误信息（仅 `status === 'error'` 时显示） |
| `onDismiss` | `(() => void) \| undefined` | `undefined` | 用户点击关闭按钮时的回调（仅 error 状态出现） |

**ScanOverlay 状态渲染矩阵**：

| 状态 | 图标 | 文字 | 进度条 | 关闭按钮 |
|------|------|------|--------|----------|
| `scanning` | ScanIcon (旋转动画) | `t('action.scanning')` | 不确定进度条动画 | 无 |
| `error` | 错误图标 (X/感叹号) | 错误详情文本 | 无 | "Close" 按钮 |

### 2. App 根组件 (修改)

| 文件 | 职责 | 依赖 | 技术 | 变更说明 |
|------|------|------|------|----------|
| `packages/frontend/src/App.tsx` | 应用根组件，管理全局状态和路由。**新增**遮罩层渲染逻辑和自动刷新流程；`handleScan` 成功时调用 `refresh()` 自动刷新；新增 `handleDismissScan` 处理关闭遮罩层 | `react-router-dom`, `useGraphData()`, `ScanOverlay` | React 19, TypeScript | 修改 |

**App 涉及的状态**：

| 状态 | 类型 | 说明 |
|------|------|------|
| `scanning` | `boolean` | 现有状态，驱动 `ScanOverlay` 渲染。失败时不自动设为 `false`，等待用户手动关闭 |
| `scanError` | `string \| null` | 现有状态，存储扫描错误信息。由 `ScanOverlay` 读取并显示 |

`scanOverlayStatus`（传递给 `ScanOverlay` 的 `status` prop）不需要独立的 `useState`，可以从 `scanning` 和 `scanError` 推导得出：
- `scanning === true && scanError === null` 时为 `'scanning'`
- `scanning === true && scanError !== null` 时为 `'error'`

**状态管理要点**：
- `handleScan` 在成功时先 `setScanning(false)` 再调用 `refresh()`，确保 `ScanOverlay` 先关闭然后图数据开始加载
- `handleScan` 在失败时保持 `scanning = true`，设置 `scanError`，遮罩层显示错误状态
- `handleDismissScan` 同时设置 `setScanning(false); setScanError(null)`

### 3. GraphViewLayout 组件 (修改)

| 文件 | 职责 | 依赖 | 技术 | 变更说明 |
|------|------|------|------|----------|
| `packages/frontend/src/components/GraphViewLayout.tsx` | action bar 容器。**移除**内联的 `scanError` 错误提示区域（错误显示已移至全屏遮罩层）；扫描按钮行为不变 | `React`, `useT()` | React 19, TypeScript | 修改 |

**变更详述**：
- 移除 `{scanError && (<div style={styles.errorText}>...)}` JSX 代码块
- 移除 `styles.errorText` 样式对象
- 保留 `scanError` prop 在接口类型定义中（向后兼容，调用方仍传入该 prop）
- Scan 按钮的 disabled 状态、spinning 动画、文案变化保持不变

### 4. 国际化层 (修改)

| 文件 | 职责 | 依赖 | 技术 | 变更说明 |
|------|------|------|------|----------|
| `packages/frontend/src/i18n/en.ts` | 英文翻译字典。**新增** `action.scanOverlayClose` 键 | 无 | TypeScript const object | 修改 |
| `packages/frontend/src/i18n/zh-CN.ts` | 中文翻译字典。**新增** `action.scanOverlayClose` 键 | 无 | TypeScript const object | 修改 |

**说明**：`action.scanning`、`action.scanError` 和 `action.scan` 已在 `add-dashboard-action-buttons` 变更中新增，本次无需重复添加。仅新增关闭按钮翻译。

### 5. CSS 层 (修改)

| 文件 | 职责 | 依赖 | 技术 | 变更说明 |
|------|------|------|------|----------|
| `packages/frontend/src/styles/main.css` | 全局样式定义。**新增** `@keyframes scan-progress`、`@keyframes scan-progress-bar` 动画及相关类选择器 | 无 | CSS | 修改 |

**新增 CSS 定义**：
- `@keyframes scan-progress`：使用 `transform: translateX()` 实现从左到右的不确定宽度扫描效果，动画周期约 2s，无限循环
- `.scan-progress-bar`：进度条填充元素，`position: absolute; animation: scan-progress 2s ease-in-out infinite`
- `.scan-progress-track`：进度条轨道，`position: relative; overflow: hidden; height: 4px`

---

## 数据流

### 扫描成功流程

```
用户点击 Scan 按钮
        |
        v
App.handleScan()
├── startTime = Date.now()
├── setScanning(true)
├── setScanError(null)
├── ScanOverlay 渲染（全屏遮罩，status='scanning'）
│
├── fetch POST /api/analyze
│       |
│       v
│   +---> 成功 (res.ok === true)
│   |       ├── 计算 elapsed = Date.now() - startTime
│   |       ├── if (elapsed < 500) await delay(500 - elapsed)
│   |       ├── setScanning(false)
│   |       ├── ScanOverlay 隐藏 (visible=false → return null)
│   |       └── 调用 refresh() → fetchGraph() → 新数据渲染
│   |
│   +---> 失败 (res.ok === false)
│   |       ├── 解析 body：`details` / `error` / `statusText`
│   |       ├── setScanError(错误信息) — 不设置 scanning = false
│   |       ├── ScanOverlay 显示错误详情 + 关闭按钮 (status='error')
│   |       └── 等待用户点击关闭 → handleDismissScan()
│   |               ├── setScanning(false)
│   |               └── setScanError(null)
│   |
│   └── 网络异常 (fetch 抛出异常)
│           ├── setScanError(err.message) — 不设置 scanning = false
│           ├── ScanOverlay 显示错误详情 + 关闭按钮 (status='error')
│           └── 等待用户点击关闭 → handleDismissScan()
│                   ├── setScanning(false)
│                   └── setScanError(null)
```

### 状态机

```
               点击 Scan
IDLE ──────────────────> SCANNING (全屏遮罩层)
  ^                          |
  |                    ┌─────┴─────┐
  |                    |           |
  |              成功完成         失败
  |                    |           |
  |                    v           v
  |                 IDLE        ERROR (遮罩层显示错误)
  |                               |
  |                         用户点击关闭
  └───────────────────────────────┘
```

### 数据模型

| 状态 | 类型 | 所有者 | 初始值 | 说明 |
|------|------|--------|--------|------|
| `scanning` | `boolean` | App | `false` | 扫描进行中或等待用户关闭错误遮罩层（错误时保持 `true`） |
| `scanError` | `string \| null` | App | `null` | 扫描错误信息，`null` 表示无错误 |

这两个状态与 `ScanOverlay` 的渲染关系：
- `scanning === false` → `ScanOverlay` 不渲染（`visible=false`）
- `scanning === true && scanError === null` → `ScanOverlay` 渲染，`status='scanning'`
- `scanning === true && scanError !== null` → `ScanOverlay` 渲染，`status='error'`

---

## 路由设计

本次变更为纯前端交互体验改进，不涉及任何路由或 API 端点的修改。

### 现有相关路由（无变更）

| 方法 | 路径 | 说明 | 变更 |
|------|------|------|------|
| POST | `/api/analyze` | 触发服务端 dependency-cruiser 扫描 | 无变更，接口行为不变 |
| POST | `/api/graph` | 获取处理后的图谱数据 | 扫描成功后由 `refresh()` 自动调用，非直接变更 |

### 前端路由（无变更）

| 路径 | 视图 | 说明 | 变更 |
|------|------|------|------|
| `/architecture` | ArchitectureView | 架构图 | 无变更 |
| `/graph` | DependencyGraph | 依赖图谱 | 无变更 |
| `/report` | ReportView | 违规报告 | 无变更 |
| `/metrics` | MetricsView | 指标统计 | 无变更 |

**结论**：本次变更不新增、修改或删除任何路由。

---

## 依赖

### 运行时依赖

| 依赖 | 版本 | 类型 | 用途 |
|------|------|------|------|
| `react` | ^19 | runtime | ScanOverlay 组件使用 React JSX、hooks（`useState`、`useEffect`、`useCallback`） |
| `react-dom` | ^19 | runtime | DOM 渲染，`position: fixed` 遮罩层挂载 |

### 构建依赖

| 依赖 | 用途 | 说明 |
|------|------|------|
| `typescript` | 类型检查与编译 | 项目已配置，无新增 |
| `vite` | 构建打包 | 项目已配置，无新增 |

### 测试依赖

| 依赖 | 用途 | 说明 |
|------|------|------|
| `@testing-library/react` | 组件渲染和交互测试 | 项目已有，ScanOverlay 使用已有模式 |
| `vite-plus/test` | 测试运行器（`vi` API） | 项目已有，提供 `vi.fn()`、`vi.mock()` 等功能 |

### CSS 依赖

ScanOverlay 使用 CSS 变量进行主题适配，所有颜色值通过 `var(--color-*)` 引用，无额外 CSS-in-JS 或 CSS 框架依赖。项目已有的 `variables.css` 提供以下 CSS 变量：

| CSS 变量 | 用途 |
|----------|------|
| `var(--color-bg)` | 页面背景色 |
| `var(--color-surface)` | 卡片背景色 |
| `var(--color-text-primary)` | 主要文字颜色 |
| `var(--color-text-secondary)` | 次要文字颜色 |
| `var(--color-accent)` | 强调色（进度条颜色） |
| `var(--color-error)` | 错误色（错误图标和文字） |
| `var(--color-border)` | 边框色（进度条轨道颜色） |

---

## 决策

### 决策 1：scanOverlayStatus 从现有状态推导，不新增独立 useState

- **选择**：`scanOverlayStatus` 通过 `scanning` 和 `scanError` 推导：`scanning === true && scanError === null` 为 `'scanning'`；`scanning === true && scanError !== null` 为 `'error'`
- **原因**：避免冗余状态导致的不一致风险。`scanning` 和 `scanError` 已经是 App 的现有状态，推导属性与这两个状态始终保持同步，无需额外同步逻辑。
- **替代方案**：新增 `scanOverlayStatus` 独立 `useState`。被拒绝的原因是：需要额外的同步代码来确保三个状态（`scanning`、`scanError`、`scanOverlayStatus`）的一致性，增加维护负担和 bug 风险。

### 决策 2：扫描成功后调用 refresh() 实现自动刷新

- **选择**：`handleScan` 成功后先 `setScanning(false)`，再调用 `refresh()`
- **原因**：与 proposal 和 spec 一致。用户期望"扫描即刷新"，不需要手动点击 Refresh。先关闭遮罩层再刷新，避免遮罩层遮挡加载状态的视觉反馈。
- **替代方案**：在 `finally` 块中调用 `refresh()` 或在 `setScanning(false)` 之前调用。被拒绝的原因是：`finally` 中调用会在失败时也触发刷新，不符合"失败不刷新"的要求；在 `setScanning(false)` 之前调用会导致遮罩层覆盖刷新后的数据渲染。

### 决策 3：失败时保持 scanning=true 直到用户手动关闭

- **选择**：扫描失败时 `scanning` 保持 `true`，`scanError` 设置为错误信息，遮罩层显示"error"状态。用户点击"Close"后才关闭遮罩层。
- **原因**：错误信息需要足够醒目且持久，直到用户确认看到并主动关闭。自动关闭会导致用户可能错过错误信息。
- **替代方案**：扫描失败后自动关闭遮罩层，在 action bar 下方显示错误文字。被拒绝的原因是：这与 proposal 的"遮罩层中醒目标示错误信息"要求矛盾；小字错误容易被忽略。

### 决策 4：不确定进度条使用纯 CSS 动画

- **选择**：使用 `@keyframes` + `transform: translateX()` 实现不确定进度条动画
- **原因**：零 JavaScript 性能开销，GPU 合成层加速，不会阻塞主线程。动画在浏览器标签页切换后仍能持续运行（AC-9）。
- **替代方案**：使用 JavaScript setInterval 驱动进度条动画。被拒绝的原因是：标签页切换后 setInterval 会被浏览器限制频率（甚至停止），影响 AC-9 验收标准；JS 动画占用主线程，可能影响扫描请求的响应。

### 决策 5：最小显示时间（至少 500ms）

- **选择**：`handleScan` 中记录扫描开始时间，在成功响应后计算已用时间，若少于 500ms 则延迟关闭遮罩层至满 500ms
- **原因**：避免扫描快速完成（如缓存命中）时遮罩层一闪而过，造成视觉闪烁。
- **实现**：
  ```typescript
  const handleScan = useCallback(async () => {
    const startTime = Date.now();
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch('/api/analyze', { method: 'POST' });
      if (!res.ok) {
        // 错误处理...
        return;
      }
    } catch (err) {
      // 错误处理...
      return;
    }
    // 成功: 计算最小显示时间
    const elapsed = Date.now() - startTime;
    const minDisplay = 500;
    if (elapsed < minDisplay) {
      await new Promise((r) => setTimeout(r, minDisplay - elapsed));
    }
    setScanning(false);
    refresh();
  }, [refresh]);
  ```
- **替代方案**：不设最小时间。被拒绝的原因是：在快速扫描（<300ms）场景下遮罩层闪烁，影响用户体验。
- **最小时间选择依据**：500ms 是 UX 研究中"可感知反馈"的下限。低于 500ms 的闪烁对人眼来说是明显的视觉抖动。此值经过 proposal 风险评估确认。

### 决策 6：遮罩层使用 pointer-events 事件阻止策略

- **选择**：通过 `position: fixed; inset: 0` 的 div 天然截获所有指针事件（click、drag、touch），配合键盘事件阻止（`onKeyDown`/`onKeyUp` + 全局 `keydown`/`keyup` 监听器）阻止所有用户输入
- **原因**：纯 CSS + React 事件处理，无需额外 DOM 操作。底层元素无法接收鼠标/触摸事件。键盘事件通过 React 的合成事件在遮罩层的 `tabIndex={0}` 容器上捕获。
- **替代方案**：在 document 上添加全局事件监听器并阻止传播/默认行为。被拒绝的原因是：全局事件监听需要手动管理（绑定/解绑），容易造成内存泄漏或事件冲突，且与 React 合成事件系统不一致。

### 决策 7：ScanOverlay 作为独立文件，不内联在 App.tsx

- **选择**：`ScanOverlay` 创建为独立组件文件 `components/ScanOverlay.tsx`
- **原因**：保持组件的可测试性和可维护性。App.tsx 当前已有 500+ 行，内联添加遮罩层会进一步膨胀。独立组件可以被单元测试独立验证。
- **替代方案**：在 App.tsx 内部定义 `ScanOverlay` 作为局部组件。被拒绝的原因是：无法单独测试；与现有组件组织方式不一致。

---

## 风险

### R1：全屏遮罩层 z-index 不够高，被其他元素覆盖

| 属性 | 值 |
|------|-----|
| **影响** | 中：遮罩层不能完全阻止交互 |
| **概率** | 低 |
| **缓解措施** | 使用 `z-index: 9999` 并确保 `ScanOverlay` 在 React 组件树的最外层渲染（App 根 `<div>` 的第一个子元素），在所有导航和视图内容之前。添加 E2E 测试验证遮罩层为最高层级。 |
| **状态** | 可接受 |

### R2：扫描快速完成（< 300ms）时遮罩层闪烁

| 属性 | 值 |
|------|-----|
| **影响** | 低：短暂闪烁影响视觉体验 |
| **概率** | 中 |
| **缓解措施** | 设置最小显示时间 500ms（决策 5），在成功响应后计算已用时间，若少于 500ms 则延迟关闭。错误状态不需要最小时间。 |
| **状态** | 已缓解 |

### R3：进度条动画在低端设备上卡顿

| 属性 | 值 |
|------|-----|
| **影响** | 低：进度条动画不平滑 |
| **概率** | 低 |
| **缓解措施** | 使用 CSS `@keyframes` 动画而非 JS 驱动动画，利用 GPU 合成层（`transform: translateX()`）确保性能。CSS 动画由浏览器合成器线程独立运行，不占用主线程。 |
| **状态** | 已缓解 |

### R4：遮罩层阻止了扫描完成后的自动 refresh 的 fetch 调用

| 属性 | 值 |
|------|-----|
| **影响** | 高：refresh 无法正常执行，图数据不会更新 |
| **概率** | 低 |
| **缓解措施** | 遮罩层仅阻止用户输入事件（pointer-events / 事件监听），不影响 JavaScript 发起的 fetch 调用。将 `refresh()` 调用放在 `setScanning(false)` 之后执行，此时遮罩层已关闭，完全不存在事件阻止问题。 |
| **状态** | 已缓解 |

### R5：遮罩层在深色/浅色主题切换时颜色不匹配

| 属性 | 值 |
|------|-----|
| **影响** | 中：视觉不一致 |
| **概率** | 低 |
| **缓解措施** | 所有颜色使用 CSS 变量（`var(--color-bg)`、`var(--color-surface)`、`var(--color-accent)` 等），自动跟随主题变化。遮罩层背景使用不同透明度的 rgba 值：light 主题 `rgba(0, 0, 0, 0.5)`，dark 主题 `rgba(0, 0, 0, 0.7)`。 |
| **状态** | 已缓解 |

---

## 受影响文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `packages/frontend/src/components/ScanOverlay.tsx` | **新增** | 全屏遮罩层组件，支持 scanning/error 两种状态 |
| `packages/frontend/src/App.tsx` | 修改 | `handleScan` 成功后调用 `refresh()`；失败时保持 `scanning=true`；新增 `handleDismissScan`；渲染 `ScanOverlay` |
| `packages/frontend/src/components/GraphViewLayout.tsx` | 修改 | 移除 `scanError` 内联错误文本渲染 |
| `packages/frontend/src/styles/main.css` | 修改 | 新增 `@keyframes scan-progress` 动画及 `.scan-progress-track` / `.scan-progress-bar` 类选择器 |
| `packages/frontend/src/i18n/en.ts` | 修改 | 新增 `action.scanOverlayClose` 翻译键 |
| `packages/frontend/src/i18n/zh-CN.ts` | 修改 | 新增 `action.scanOverlayClose` 翻译键 |
