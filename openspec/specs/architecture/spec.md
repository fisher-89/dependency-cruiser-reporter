# 架构规范

## Purpose

定义 dependency-cruiser-reporter 的三组件架构、数据流管道、混合聚合策略和展开目录算法。

## Requirements

### Requirement: 三组件架构

系统 SHALL 由三个独立组件组成：

| 组件 | 路径 | 职责 |
|------|------|------|
| CLI | `packages/cli/` | 命令行工具，运行 dependency-cruiser、启动服务器 |
| Rust 后端 | `packages/rust/` | WASM 模块，JSON 解析、聚合、布局计算 |
| React 前端 | `packages/frontend/` | 交互式可视化 |

#### Scenario: 组件通信

- WHEN 用户执行 `dep-report dashboard`
- THEN CLI 启动 Express 服务器
- AND 前端从 `/api/graph` 加载数据
- AND Rust 后端（WASM）执行聚合计算

### Requirement: 数据流管道

系统 SHALL 遵循延迟转换数据流：

```
dependency-cruiser JSON → analyze (保存原始) → dashboard (按需聚合) → ProcessedGraph → 前端渲染
```

#### Scenario: analyze 模式

- WHEN 用户执行 `dep-report analyze --path ./project`
- THEN 系统调用 dependency-cruiser API `cruise()`
- AND 保存原始 JSON 到文件
- AND 不执行聚合（延迟到 open）

#### Scenario: dashboard 模式

- WHEN 用户执行 `dep-report dashboard -f file.json`
- THEN 服务器启动并检测文件格式
- IF 文件是原始 dependency-cruiser 格式
  - THEN 调用 `convertWithFallback`（WASM 优先，Node.js 回退）
- IF 文件是 ProcessedGraph 格式
  - THEN 直接使用

#### Scenario: 前端交互

- WHEN 浏览器加载前端
- THEN 调用 `POST /api/graph` 加载图数据
- AND 可选在 POST body 中指定 `expandedDirs` 控制聚合

### Requirement: 混合聚合策略

系统 SHALL 支持混合聚合：部分目录展开显示文件级节点，其他目录折叠为目录节点。

#### Scenario: 展开目录控制

- WHEN 提供 `expanded_dirs` 参数
- THEN `expanded_dirs` 中的目录显示文件级节点
- AND 其他目录折叠为单一节点
- AND 边按权重合并

#### Scenario: 自动展开算法

- WHEN `expanded_dirs` 未提供
- THEN 系统调用 `compute_auto_expanded_dirs` 预算算法
- AND 目标节点数 ~200
- AND 按深度层级处理（深度 1 优先）
- AND 违规多的目录优先展开
- AND 每层作为"事务"：超预算则回滚

### Requirement: 预算算法参数

聚合算法 SHALL 使用以下常量：

| 参数 | 值 | 用途 |
|------|-----|------|
| `TARGET_NODE_BUDGET` | 200 | 输出目标最大节点数 |
| `MAX_DIRECT_CHILDREN` | 50 | 拒绝展开的子节点阈值 |

#### Scenario: 层级处理

- WHEN 执行自动展开
- THEN 按深度处理目录（深度 1 → 2 → ...）
- AND 跳过直接子节点 >50 的目录
- AND 每层检查预算
- IF 预算超限 THEN 回滚当前层

### Requirement: Combo 生成

系统 SHALL 生成 AntV G6 combo 容器用于视觉层级：

#### Scenario: combo 结构

- WHEN 生成 combo
- THEN combo ID 使用 `combo:` 前缀（如 `combo:src/components`）
- AND 单子 combo 被折叠：子节点移到父 combo
- AND combo 可嵌套（通过 `combo` 字段）

#### Scenario: 聚合级别派生

- WHEN 所有模块展开 → `file` 级别
- WHEN 部分目录展开 → `directory` 级别
- WHEN 无目录展开 → `package` 级别

### Requirement: 边聚合

当文件折叠到目录时，边 SHALL 被合并：

#### Scenario: 边合并

- WHEN 多个文件级边折叠
- THEN 边 `weight` 字段累积合并计数
- AND 边 `circular` 字段为 true 若任一合并边是循环的
- AND 边 `edge_type` 取合并边多数投票

#### Scenario: 边排序和截断

- WHEN 边处理完成
- THEN 按权重降序排序
- AND 截断到 `max_nodes`（上限 10000）

### Requirement: 违规显示

违规 SHALL 按模块计数并聚合：

#### Scenario: 违规计数

- WHEN 模块有违规
- THEN 模块 `violation_count` 字段累积
- WHEN 目录折叠
- THEN 目录节点 `violation_count` 为所有子节点总和

### Requirement: 循环依赖标记

系统 SHALL 标记循环依赖边：

#### Scenario: 循环标记

- WHEN 边属于循环依赖链
- THEN 边 `circular` 字段设为 true
- WHEN 边聚合
- THEN `circular: true` 在聚合边中保留

## Performance Characteristics

| 节点数 | 展开目录 | 输出大小 | 加载时间 |
|--------|----------|----------|----------|
| 100 | 全部 | ~100 节点 | <100ms |
| 5,000 | ~200 节点量 | ~200 节点 | <500ms |
| 20,000 | 仅顶层 | ~50 节点 | <1s |
| 100,000 | 包级 | ~20 节点 | <3s |

## References

- OpenSpec 架构规范：`openspec/specs/architecture/spec.md`
- Rust 实现：`packages/rust/src/aggregate/`
