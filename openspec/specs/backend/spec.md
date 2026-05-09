# 后端规范

## Purpose

定义 Rust 后端的数据结构契约、WASM 接口、聚合算法实现和序列化规则。单一类型真相来源，通过 tsify 自动生成 TypeScript 类型。

## Requirements

### Requirement: 核心数据结构

系统 SHALL 定义以下数据结构（snake_case JSON 字段）：

#### ProcessedGraph（根）

| 字段 | 类型 | 描述 |
|------|------|------|
| `nodes` | `GraphNode[]` | 所有节点 |
| `edges` | `GraphEdge[]` | 所有边（依赖） |
| `combos` | `GraphCombo[]` | G6 combo 容器 |
| `meta` | `GraphMeta` | 聚合元数据 |
| `violations` | `ViolationInfo[]` | 违规信息 |

#### GraphNode

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | `string` | 唯一标识符 |
| `label` | `string` | 显示名称 |
| `node_type` | `NodeType` | 节点类型 |
| `path` | `string?` | 原始文件路径（聚合节点省略） |
| `violation_count` | `number` | 违规计数 |
| `orphan` | `boolean?` | 无依赖者标记 |
| `children` | `string[]?` | 子节点 ID（聚合时存在） |
| `combo` | `string?` | 父 combo ID |

#### GraphCombo

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | `string` | `combo:` 前缀标识符 |
| `label` | `string` | 显示名称（目录名） |
| `combo` | `string?` | 父 combo ID；根 combo 为 null |

#### GraphEdge

| 字段 | 类型 | 描述 |
|------|------|------|
| `source` | `string` | 源节点 ID |
| `target` | `string` | 目标节点 ID |
| `edge_type` | `EdgeType` | 边类型 |
| `weight` | `number` | 合并边计数 |
| `circular` | `boolean?` | 循环依赖标记 |

#### GraphMeta

| 字段 | 类型 | 描述 |
|------|------|------|
| `original_node_count` | `number` | 聚合前节点数 |
| `aggregated_node_count` | `number` | 聚合后节点数 |
| `total_violations` | `number` | 总违规数 |
| `expanded_dirs` | `string[]?` | 展开目录列表 |

#### ViolationInfo

| 字段 | 类型 | 描述 |
|------|------|------|
| `from` | `string` | 源模块路径 |
| `to` | `string` | 目标模块路径 |
| `rule` | `string` | 违规规则名 |
| `severity` | `'error' \| 'warn' \| 'info'` | 严重级别 |
| `message` | `string?` | 违规消息 |

### Requirement: 枚举类型

系统 SHALL 定义以下枚举：

#### NodeType

| 值 | 描述 |
|----|------|
| `file` | 单个源文件 |
| `directory` | 分组目录 |
| `package` | 分组 npm 包 |

#### EdgeType

| 值 | 描述 |
|----|------|
| `local` | 项目内部 |
| `npm` | 外部 npm 包 |
| `core` | Node.js 内置 |
| `dynamic` | 动态导入 |

### Requirement: WASM API

系统 SHALL 导出以下 WASM 函数：

#### Scenario: aggregate 函数

```rust
#[wasm_bindgen]
pub fn aggregate(
    content: &str,
    #[wasm_bindgen(js_name = maxNodes)] max_nodes: usize,
    #[wasm_bindgen(js_name = expandedDirs)] expanded_dirs: Option<Array>,
) -> Result<ProcessedGraph, JsError>
```

- WHEN JavaScript 调用 `aggregate`
- THEN 解析 `content`（dependency-cruiser JSON）
- AND 使用 `expanded_dirs` 控制聚合
- AND 返回 `ProcessedGraph` 或 `JsError`

#### Scenario: aggregate_from_str 函数

```rust
pub fn aggregate_from_str(
    content: &str,
    max_nodes: usize,
    expanded_dirs: Option<Vec<String>>,
) -> Result<ProcessedGraph, JsError>
```

- WHEN 调用核心逻辑
- THEN `expanded_dirs = None` 触发自动计算
- AND 返回 `ProcessedGraph` 或 `JsError`

### Requirement: Rust 模块结构

系统 SHALL 按以下结构组织代码：

```
packages/rust/src/
├── lib.rs           # 库入口，WASM 导出
├── lib_test.rs      # 单元测试
├── types.rs         # 数据结构
├── layout.rs        # 力导向布局
└── aggregate/
    ├── mod.rs       # 模块导出
    ├── edges.rs     # 边处理
    ├── expand.rs    # 自动展开算法
    ├── hybrid.rs    # 混合节点构建
    └── violations.rs # 违规解析
```

### Requirement: 核心聚合函数

系统 SHALL 实现以下核心函数：

| 函数 | 模块 | 用途 |
|------|------|------|
| `build_hybrid_nodes` | `aggregate/hybrid.rs` | 基于 expanded_dirs 构建节点和 combo |
| `compute_auto_expanded_dirs` | `aggregate/expand.rs` | 预算算法计算展开目录 |
| `aggregate_edges` | `aggregate/edges.rs` | 聚合并排序边 |
| `detect_edge_type` | `aggregate/edges.rs` | 从 dependencyTypes 分类边 |

### Requirement: 力导向布局

系统 SHALL 实现三阶段力导向布局算法，保证无重叠。

#### Phase 1: 自底向上 sizing

- 按深度排序 combo（最深优先）
- 计算每个 combo 包围所有子节点的最小尺寸
- 使用网格布局确定最小包围盒

#### Phase 2: 顶层 combo 力布局

- 初始化位置为圆形
- 应用排斥力（逆平方定律）防止重叠
- 应用中心吸引力保持紧凑
- 温度退火收敛
- 执行 `resolve_overlaps()` 保证无重叠

#### Phase 3: combo 内子元素布局

- 自顶向下处理 combo
- 子元素（节点 + 子 combo）初始位置使用 **circle layout**（替代 grid）
- 执行力模拟定位
- 对所有元素（节点 + combo）执行 `resolve_element_overlaps()`
- re-clamp 后重新检查重叠，如有重叠扩展父组合尺寸
- 偏移子 combo 子树保持相对位置

**力参数：**

| 参数 | 值 |
|------|-----|
| `REPULSION_STRENGTH` | 5000.0 |
| `ATTRACTION_STRENGTH` | 0.001 |
| `ITERATIONS` | 500 |
| `COOLING_FACTOR` | 0.98 |

**布局常量：**

| 参数 | 值 |
|------|-----|
| `NODE_SIZE` | 20.0 |
| `COMBO_PADDING` | 20.0 |
| `GAP` | 30.0 |

#### Scenario: 布局保证

- THEN 所有层级的兄弟节点不重叠
- AND 所有层级的兄弟 combo 不重叠
- AND 每个 combo 完全包含其子节点
- AND 相同输入产生相同输出（确定性）

### Requirement: 序列化规则

系统 SHALL 遵循以下序列化规则：

#### Rust serde 属性

```rust
#[serde(rename_all = "lowercase")]  // NodeType, EdgeType
#[serde(skip_serializing_if = "Option::is_none")]  // 可选字段
#[serde(default)]  // 缺失字段使用默认值
#[derive(Tsify)]  // 自动生成 TypeScript 类型
#[tsify(into_wasm_abi)]  // ProcessedGraph WASM ABI 转换
```

#### TypeScript 类型导入

```typescript
import type { ProcessedGraph, aggregate } from '@dcr-reporter/wasm';
```

使用 snake_case 匹配 JSON：`node_type`（非 `nodeType`）、`edge_type`（非 `edgeType`）

### Requirement: 错误处理

系统 SHALL 使用 `JsError` 进行 WASM 兼容错误处理：

#### Scenario: JSON 解析失败

- WHEN JSON 解析失败
- THEN 返回 `JsError::new("Invalid JSON: ...")`

### Requirement: Node.js 回退

当 WASM 不可用时，系统 SHALL 使用 Node.js 回退：

#### Scenario: convertDcOutput 函数

- WHEN WASM 模块不可用
- THEN 调用 `convertDcOutput` (TypeScript)
- AND 解析 dependency-cruiser JSON
- AND 分类边（`local` | `npm` | `core` | `dynamic`）
- AND 提取违规
- AND 返回 `ProcessedGraph`

#### TypeScript 边分类

| 条件 | 边类型 |
|------|--------|
| `dep.coreModule === true` | `core` |
| `dep.couldNotResolve === true` | `dynamic` |
| `dep.dependencyTypes` 包含 `npm`/`npm-dev`/`npm-optional`/`npm-peer` | `npm` |
| 否则 | `local` |

## Test Coverage

| 测试 | 用途 |
|------|------|
| `test_aggregate_from_str_*` | 验证 JSON 解析和聚合 |
| `test_wasm_aggregate_*` | 验证 WASM 绑定（仅 wasm32 目标） |
| `test_edge_type_detection` | 验证边分类 |
| `test_smart_expansion_*` | 验证自动展开预算算法 |
| `test_top_level_combos_no_overlap` | 验证力布局防止 combo 重叠 |
| `test_nested_combos` | 验证 combo 包含层级 |
| `test_three_level_nested_sibling_combos` | 验证三层嵌套 sibling combo 不重叠 |
| `test_four_level_deep_nested_sibling_combos` | 验证四层深层嵌套 sibling combo 不重叠 |
| `test_mixed_nodes_and_combos_nested` | 验证混合节点和 combo 的嵌套布局 |

## References

- Rust 源码：`packages/rust/src/`
- TypeScript 类型：`packages/frontend/src/types.ts`
- Node.js 回退：`packages/cli/src/utils/convert.ts`
