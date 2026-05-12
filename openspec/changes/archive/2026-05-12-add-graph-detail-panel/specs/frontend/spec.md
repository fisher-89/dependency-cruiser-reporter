## MODIFIED Requirements

### Requirement: Component architecture

系统 SHALL 实现以下组件层级：

```
App (root, state: data, viewMode, loading, error, selectedNodeId)
├── UploadArea (drag-and-drop + file input)
├── Navigation (Graph / Report / Metrics tabs)
│   ├── GraphView (flex container: canvas + detail panel)
│   │   ├── DependencyGraph (G6 comboCombined layout)
│   │   └── DetailPanel (node metadata, stability, deps, violations)
│   ├── ReportView (violations by severity)
│   └── MetricsView (summary stats)
```

### Requirement: State management

系统 SHALL 使用 React `useState` 管理状态（无外部状态管理库）：

| 状态 | 类型 | 所有者 |
|------|------|--------|
| `data` | `ProcessedGraph \| null` | App |
| `viewMode` | `'graph' \| 'report' \| 'metrics'` | App |
| `loading` | `boolean` | App |
| `error` | `string \| null` | App |
| `selectedNodeId` | `string \| null` | App |

#### Scenario: selectedNodeId 生命周期

- WHEN 用户单击 graph 节点
- THEN `selectedNodeId` 设置为被点击的节点 ID
- WHEN 用户双击 graph 节点
- THEN `selectedNodeId` 不变更
- WHEN graph 数据刷新（fetchGraph 或文件上传）
- THEN `selectedNodeId` 重置为 null

## ADDED Requirements

### Requirement: Graph view split layout

系统 SHALL 在 graph 视图使用 flex 分割布局：左侧为 G6 画布（flex: 1），右侧为 DetailPanel（固定宽度 320px）。

#### Scenario: 分割布局渲染

- **WHEN** graph 视图处于活动状态
- **THEN** G6 画布和 DetailPanel 并排渲染
- **AND** 面板宽度固定为 320px
- **AND** 画布填充剩余空间

#### Scenario: 面板出现时 G6 调整大小

- **WHEN** 面板从占位符过渡到内容（首次选择节点时高度可能变化）
- **THEN** G6 画布调用 `graph.resize()` 以适应其容器

### Requirement: Node click-to-select behavior

系统 SHALL 通过 300ms 定时器区分单击和双击。如果 `node:click` 在 300ms 内未被 `node:dblclick` 跟随，则节点变为选中状态。双击 SHALL 仅触发展开/折叠行为，不改变选中状态。

#### Scenario: 单击选择节点

- **WHEN** 用户单击 graph 节点且 300ms 内未发生双击
- **THEN** 该节点变为选中状态
- **AND** `onNodeSelect(nodeId)` 回调被调用
- **AND** DetailPanel 显示该节点信息

#### Scenario: 双击不触发选中

- **WHEN** 用户双击 graph 节点（两次点击间隔 < 300ms）
- **THEN** `onToggleDir` 被调用
- **AND** 不调用 `onNodeSelect`
- **AND** 当前选中的节点保持不变

#### Scenario: 点击不同节点切换选中

- **WHEN** 节点 A 当前被选中且用户单击节点 B
- **THEN** 选中状态切换到节点 B
- **AND** DetailPanel 更新以显示节点 B 的信息
