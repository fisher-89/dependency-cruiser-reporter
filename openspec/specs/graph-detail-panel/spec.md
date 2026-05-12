# Graph Detail Panel Spec

## Purpose

定义 graph 视图中节点详情面板（DetailPanel）的行为和展示内容。当用户选中一个节点时，面板显示节点的元数据、稳定性指标、依赖关系和相关违规信息。

## Requirements

### Requirement: Detail panel displays when node is selected

系统 SHALL 在 graph 画布右侧渲染一个持久侧边面板。当没有节点被选中时，面板 SHALL 显示占位消息。当节点被选中时，面板 SHALL 显示该节点的元数据。

#### Scenario: No node selected

- **WHEN** graph 视图已渲染且没有节点被点击
- **THEN** 详情面板显示占位消息（例如 "Click a node to view details"）

#### Scenario: Node selected via click

- **WHEN** 用户单击 graph 节点
- **THEN** 该节点变为选中状态
- **AND** 详情面板显示该节点的元数据
- **AND** 面板保持填充状态，直到选择不同的节点或 graph 数据刷新

#### Scenario: Double-click does not select

- **WHEN** 用户双击 graph 节点
- **THEN** 目录展开/折叠行为触发
- **AND** 选中的节点不变

### Requirement: Panel shows node identity information

系统 SHALL 在详情面板顶部显示节点的标签、完整路径、节点类型和违规计数。

#### Scenario: File node identity

- **WHEN** 选择了一个文件类型节点
- **THEN** 面板显示节点标签、来自 `node.path` 的完整路径、类型 "file" 和来自 `node.violation_count` 的违规计数

#### Scenario: Directory node identity

- **WHEN** 选择了一个目录类型节点
- **THEN** 面板显示节点标签、来自 `node.path` 的完整路径、类型 "directory" 和违规计数

### Requirement: Panel shows stability metric

系统 SHALL 计算并显示不稳定性指标 I = Ce / (Ce + Ca)，其中 Ce 是出边数量，Ca 是入边数量。

#### Scenario: Stability for a node with both dependencies and dependents

- **WHEN** 节点有 5 条出边和 12 条入边
- **THEN** 稳定性计算为 5 / (5 + 12) = 0.29
- **AND** 面板显示数值及可视化指示器（进度条或颜色编码）

#### Scenario: Stability for an isolated node

- **WHEN** 节点的出边和入边均为 0
- **THEN** 面板显示 "N/A" 表示稳定性

### Requirement: Panel shows dependencies grouped by edge type

系统 SHALL 按 `edge_type`（local、npm、core、dynamic）分组列出节点的出向依赖（节点为源）。每个依赖 SHALL 显示目标节点的标签。

#### Scenario: Dependencies with multiple edge types

- **WHEN** 节点具有 local 和 npm 类型的出边
- **THEN** 依赖按分组显示："Local (N)"、"NPM (N)" 等
- **AND** 每个分组列出目标节点标签
- **AND** 零边的分组隐藏

### Requirement: Panel shows dependents grouped by edge type

系统 SHALL 按 `edge_type` 分组列出节点的入向依赖（节点为目标）。每个依赖者 SHALL 显示源节点的标签。

#### Scenario: Dependents with multiple edge types

- **WHEN** 节点具有 local 和 npm 类型的入边
- **THEN** 依赖者按边类型分组显示
- **AND** 每个分组列出源节点标签

### Requirement: Panel shows associated violations

系统 SHALL 显示 `ProcessedGraph.violations` 中 `violation.from` 或 `violation.to` 匹配选中节点标签或路径的违规。每条违规 SHALL 显示严重级别、规则名称和 from/to 关系。

#### Scenario: Node with violations

- **WHEN** 节点有 3 条关联违规（2 条 error，1 条 warning）
- **THEN** 面板显示每条违规的严重徽章、规则名称和 from/to 信息
- **AND** 违规按严重级别排序（error 优先，然后是 warning，最后是 info）

#### Scenario: Node without violations

- **WHEN** 节点没有关联违规
- **THEN** 违规部分显示 "No violations" 或隐藏
