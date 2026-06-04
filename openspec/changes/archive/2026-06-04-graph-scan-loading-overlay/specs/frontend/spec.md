## MODIFIED Requirements

### Requirement: 组件架构

系统 SHALL 实现以下组件层级：

```
main.tsx
└── <ThemeProvider>
    └── <I18nProvider>
        └── App (root, state: data, viewMode, loading, error, selectedNodeId, scanning, scanError)
            ├── <ScanOverlay> (full-screen, conditionally rendered when scanning)
            ├── Header
            │   ├── Title
            │   ├── LanguageSwitcher (EN | 中文 buttons)
            │   ├── ThemeToggle (sun/moon/monitor cycle button)
            │   └── Navigation (Architecture / Graph / Report / Metrics tabs)
            ├── DirectoryPicker (when no .dc-reporter found)
            ├── UploadArea (drag-and-drop + file input, fallback)
            ├── ArchitectureView (lazy-loaded, ReactLikeC4 + LikeC4ModelProvider)
            ├── GraphView (flex container: canvas + detail panel)
            │   ├── DependencyGraph (G6 comboCombined layout)
            │   └── DetailPanel (node metadata, stability, deps, violations)
            ├── ReportView (violations by severity)
            └── MetricsView (summary stats)
```

#### Scenario: ScanOverlay 渲染位置

- **WHEN** `App` 渲染且 `scanning` 为 `true`
- **THEN** `<ScanOverlay>` 作为 App 根 `<div>` 的第一个子元素渲染
- **AND** 使用 `position: fixed; inset: 0; z-index: 9999` 覆盖所有内容
- **AND** 所有用户通过叠加层无法与底层元素交互

### Requirement: 状态管理

系统 SHALL 使用 React `useState` 管理状态（无外部状态管理库）：

| 状态 | 类型 | 所有者 |
|------|------|--------|
| `data` | `ProcessedGraph \| null` | App |
| `viewMode` | `'architecture' \| 'graph' \| 'report' \| 'metrics'` | App |
| `loading` | `boolean` | App |
| `error` | `string \| null` | App |
| `selectedNodeId` | `string \| null` | App |
| `scanning` | `boolean` | App |
| `scanError` | `string \| null` | App |

#### Scenario: scanning 状态转换

- **WHEN** Scan 按钮被点击
- **THEN** `scanning` 设置为 `true`
- **AND** `ScanOverlay` 渲染
- **WHEN** `POST /api/analyze` 成功完成
- **THEN** `scanning` 设置为 `false`
- **AND** 调用 `refresh()`
- **AND** `ScanOverlay` 关闭
- **WHEN** `POST /api/analyze` 失败
- **THEN** `scanning` 保持为 `true`（用户手动关闭前）
- **AND** `scanError` 设置为错误信息
- **AND** `ScanOverlay` 显示错误状态

### Requirement: GraphViewLayout 扩展 props

系统 SHALL 在 action bar 中提供 Scan 按钮。扫描期间，按钮显示 "Scanning..." 并 disabled，全屏遮罩层阻止交互。

#### Scenario: GraphViewLayout action bar 带 Scan 按钮

- **WHEN** `GraphViewLayout` 渲染且 `onScan` prop 已提供
- **THEN** action bar 中 Refresh 按钮右侧显示 "Scan" 按钮
- **AND** `scanning` 为 true 时按钮 disabled 且文案显示 `t('action.scanning')`
- **AND** `scanning` 为 false 时按钮文案显示 `t('action.scan')`
- **AND** `onScan` 为 undefined 时不显示按钮（向后兼容）

### Requirement: App handleScan

系统 SHALL 在 App 中实现 `handleScan` 回调，处理扫描流程并通过 `onScan` prop 传递给 `GraphViewLayout`。

#### Scenario: handleScan 成功流程

- **WHEN** App 渲染 Graph/Report/Metrics 视图
- **THEN** `handleScan` 回调传递给 `GraphViewLayout` 的 `onScan` prop
- **AND** `scanning` 状态传递给 `GraphViewLayout` 的 `scanning` prop
- **AND** `handleScan` 先设置 `scanning` 为 `true`，发送 `POST /api/analyze`
- **AND** 响应 ok 后设置 `scanning` 为 `false`
- **AND** 响应 ok 后调用 `refresh()` 自动刷新图数据
- **AND** 扫描期间 `ScanOverlay` 全屏显示

#### Scenario: handleScan 失败流程

- **WHEN** `POST /api/analyze` 返回非 ok 状态码
- **THEN** 解析响应 JSON 提取 `details` 或 `error` 字段
- **AND** 设置 `scanError` 为提取的错误信息
- **AND** `scanning` 保持为 `true`（等待用户手动关闭遮罩层）

#### Scenario: handleScan 网络异常

- **WHEN** `POST /api/analyze` 抛出网络异常（如 `TypeError: Failed to fetch`）
- **THEN** 设置 `scanError` 为异常信息
- **AND** `scanning` 保持为 `true`（等待用户手动关闭遮罩层）

## ADDED Requirements

### Requirement: 扫描完成自动刷新

系统 SHALL 在扫描成功完成后，自动调用 `refresh()` 重新加载图数据。

#### Scenario: 扫描成功触发自动刷新

- **WHEN** `POST /api/analyze` 返回响应且 `res.ok` 为 `true`
- **THEN** `scanning` 被设置为 `false`
- **AND** `refresh()` 被调用
- **AND** `refresh()` 内部调用 `fetchGraph([])` 发送 `POST /api/graph`
- **AND** 新的 `ProcessedGraph` 数据渲染到所有视图

#### Scenario: 扫描失败不触发自动刷新

- **WHEN** `POST /api/analyze` 返回非 ok 响应或抛出异常
- **THEN** `refresh()` 不被调用
- **AND** 当前图数据保持不变
- **AND** 遮罩层显示错误信息

## Module Contract

### Component: App (modified)

| State | Type | New behavior |
|-------|------|-------------|
| `scanning` | `boolean` | Drives `ScanOverlay` visibility. No longer used solely for button disabled state. |
| `scanError` | `string \| null` | Stores scan error message. Read by `ScanOverlay` when `status === 'error'`. |

### Function: handleScan (modified)

| Aspect | Behavior |
|--------|----------|
| Before change | Only sets `scanning` states and captures errors. No auto-refresh on success. Error displayed inline in action bar. |
| After change | On success: calls `refresh()` after `setScanning(false)`. On failure: keeps `scanning = true` until user dismisses overlay. |

### i18n keys (added)

| Key | English | Chinese |
|-----|---------|---------|
| `action.scanning` | Scanning... | 扫描中... |
| `action.scanError` | Scan failed | 扫描失败 |
| `action.scanOverlayClose` | Close | 关闭 |
