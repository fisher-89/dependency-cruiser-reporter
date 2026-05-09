# 布局无重叠规范

## Purpose

定义布局算法的无重叠保证，确保所有层级的兄弟节点和兄弟组合不重叠。

## Requirements

### Requirement: 兄弟节点不重叠

系统 SHALL 保证同一 combo 内的兄弟节点不重叠。

#### Scenario: 同一 combo 内多个节点

- **WHEN** 一个 combo 包含多个节点（无子 combo）
- **THEN** 所有节点的矩形区域不重叠

#### Scenario: 节点与子 combo 混合

- **WHEN** 一个 combo 同时包含节点和子 combo
- **THEN** 所有节点之间不重叠
- **AND** 所有子 combo 之间不重叠
- **AND** 节点与子 combo 之间不重叠

### Requirement: 兄弟组合不重叠

系统 SHALL 保证同一父组合内的兄弟组合不重叠，适用于所有层级。

#### Scenario: 顶层组合不重叠

- **WHEN** 多个顶层组合存在
- **THEN** 所有顶层组合的矩形区域不重叠

#### Scenario: 嵌套组合不重叠

- **WHEN** 一个非根 combo 包含多个子 combo
- **THEN** 所有子 combo 的矩形区域不重叠

#### Scenario: 多层嵌套

- **WHEN** 组合层级深度 >= 3
- **THEN** 每一层级的兄弟组合均不重叠

### Requirement: 组合包含性

系统 SHALL 保证每个组合完全包含其所有子元素。

#### Scenario: 组合包含子节点

- **WHEN** 节点 N 属于组合 C
- **THEN** N 的矩形区域完全在 C 的矩形区域内

#### Scenario: 组合包含子组合

- **WHEN** 组合 C1 是组合 C2 的子组合
- **THEN** C1 的矩形区域完全在 C2 的矩形区域内

### Requirement: 布局确定性

系统 SHALL 保证相同输入产生相同布局输出。

#### Scenario: 重复布局

- **WHEN** 对相同输入多次调用 `compute_layout()`
- **THEN** 每次产生的节点和组合坐标完全相同
