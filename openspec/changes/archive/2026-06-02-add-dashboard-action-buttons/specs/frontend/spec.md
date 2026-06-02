## MODIFIED Requirements

### Requirement: 组件架构

> **变更说明**: `GraphViewLayout` 的 props 扩展 `onScan` 和 `scanning`；`ArchitectureView` 的 action bar 增加 Generate Rules 按钮；`App` 新增 `handleScan` 状态和方法。

#### Scenario: GraphViewLayout 扩展 props

- **WHEN** `GraphViewLayout` 渲染且 `onScan` prop 已提供
- **THEN** action bar 中 Refresh 按钮右侧显示 "Scan" 按钮
- **AND** `scanning` 为 true 时按钮 disabled 且图标旋转
- **AND** `onScan` 为 undefined 时不显示按钮（向后兼容）

#### Scenario: ArchitectureView action bar 扩展

- **WHEN** `ArchitectureView` 渲染且 `state.status === 'ready'`
- **THEN** action bar 中 Refresh 按钮右侧显示 "Generate Rules" 按钮
- **AND** 点击后调用 `POST /api/archi-to-rules`
- **AND** 按钮在 loading/error/empty 状态下不显示

#### Scenario: App handleScan

- **WHEN** `App` 渲染 Graph/Report/Metrics 视图
- **THEN** `handleScan` 回调传递给 `GraphViewLayout` 的 `onScan` prop
- **AND** `scanning` 状态传递给 `GraphViewLayout` 的 `scanning` prop
- **AND** `handleScan` 发送 `POST /api/analyze` 并在完成/失败后更新 `scanning` 状态

### Requirement: 样式规范

> **变更说明**: 新增按钮复用现有 `actionBtn` 样式，无新增 CSS 变量。

### Requirement: 项目结构

> **变更说明**: 无新增文件。`GraphViewLayout.tsx`、`ArchitectureView.tsx`、`App.tsx` 内联修改。
