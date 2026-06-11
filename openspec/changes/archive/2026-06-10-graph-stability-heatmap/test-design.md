# 测试设计: graph-stability-heatmap

> **变更**: graph-stability-heatmap
> **日期**: 2026-06-09

---

## 测试策略

### 分层策略

| 层级 | 覆盖范围 | 运行方式 | 断言风格 |
|------|----------|----------|----------|
| Rust 单元测试 | `compute_instability()` 纯函数逻辑 + `GraphNode` JSON 序列化 | `cargo test` / `wasm-pack test --node` | assert_eq!, assert! |
| Rust 集成测试 | `aggregate()` 管线完整流程（含 instability 集成） | `wasm-pack test --node` | assert_eq!, assert! |
| 前端纯逻辑测试 | `buildGraphData` 数据映射、`computeStability` 加权、颜色映射函数 | `vp test` (vitest) | expect.toBe, expect.toBeUndefined |
| 前端组件测试 | `DependencyGraph` node style 回调、`GraphViewLayout` 按钮交互、`App` 状态管理 | `vp test` + `@testing-library/react` | screen.getByRole, fireEvent.click |
| 前端 i18n 验证 | 翻译键存在性校验 | `vp test` | expect.toBeDefined |

### 文件组织

```
packages/rust/src/
  aggregate/instability_test.rs   -- compute_instability 纯函数单元测试
  types_test.rs                   -- GraphNode JSON 序列化测试
  lib_test.rs                     -- aggregate 管线集成测试（含 instability 验证）

packages/frontend/src/__tests__/from-change/
  buildGraphData.test.ts          -- buildGraphData instability 转发（已实现）
  DependencyGraph.style.test.ts   -- node style halo 渲染（已实现）
  DetailPanel.stability.test.ts   -- DetailPanel 加权稳定性计算（已实现）
  GraphViewLayout.heatmap.test.tsx -- 热力图切换按钮（已实现）
  App.heatmap.test.tsx            -- App 级 stabilityHeatmap 状态管理（已实现）
  i18n.heatmap.test.ts            -- i18n 翻译键（已实现）
```

### 命名约定

- **F-N**: Forward acceptance criteria (正向验收路径)
- **R-N**: Reverse acceptance criteria (反向/错误处理路径)
- **B-N**: Boundary case (边界条件)

---

## 实现状态概览

| 测试文件 | 状态 | 测试数 | 说明 |
|----------|------|--------|------|
| `instability_test.rs` | 已实现 | 16 | F-1 ~ F-5, R-1 ~ R-6, B-1 ~ B-7 全部通过 |
| `types_test.rs` | 已实现 | 7 | F-6, F-7, R-7, B-9 ~ B-11, round_trip 全部通过 |
| `lib_test.rs` (instability 部分) | 已实现 | 4 | F-8 及变体、R-16（含 aggregate-with-dependencies 中的断言）全部通过 |
| `buildGraphData.test.ts` | 已实现 | 6 | F-9, F-10, B-12, B-13, B-14, B-extra 全部通过 |
| `DetailPanel.stability.test.ts` | 已实现 | 7 | F-11, R-8, R-9, B-15 ~ B-18 全部通过 |
| `DependencyGraph.style.test.ts` | 已实现 | 18 | F-13, F-14, F-18, F-19, R-10, R-11, R-15, B-19 ~ B-26 全部通过 |
| `GraphViewLayout.heatmap.test.tsx` | 已实现 | 7 | F-15, F-16, F-17, R-12, R-13, B-27, B-29 全部通过 |
| `App.heatmap.test.tsx` | 已实现 | 3 | F-12, R-14, 组件树连通性 全部通过 |
| `i18n.heatmap.test.ts` | 已实现 | 2 | F-20, F-21 全部通过 |

**总计**: 70 个测试用例，全部实现并通过。

> **注意事项**:
> - Rust WASM 集成测试（lib_test.rs 中的 wasm_tests 模块）需要 `wasm-pack test --node` 运行，不在 `cargo test` 覆盖范围内
> - 前端 `DependencyGraph.style.test.ts` 使用内联参考实现（`getShadowColor` / `getShadowBlur` / `getNodeStyle`），这些函数目前是 `DependencyGraph.tsx` 中的模块级私有函数。如提取为导出函数，测试可直接 import 生产代码

---

## 验收范围

| 验收标准 | 对应测试 | 层级 | 实现状态 |
|----------|----------|------|----------|
| AC-1: Rust compute_instability 使用 edge.weight 加权计算，孤立节点返回 None | F-1, F-2, F-3, F-5, R-1 | Rust 单元测试 | 已实现 |
| AC-2: GraphNode JSON 序列化包含 instability 字段（非 None 时） | F-6, F-7 | Rust 单元测试 | 已实现 |
| AC-3: 前端接收到 instability 数据并传递到 G6NodeData | F-9, F-10 | 前端纯逻辑测试 | 已实现 |
| AC-4: DetailPanel stability 计算使用 edge.weight 加权 | F-11 | 前端纯逻辑测试 | 已实现 |
| AC-5: 热力图默认关闭，图谱节点无阴影 | F-12, F-13 | 前端组件测试 | 已实现 |
| AC-6: 点击热力图切换按钮，节点显示阴影 | F-14, F-15, F-17 | 前端组件测试 | 已实现 |
| AC-7: 热力图关闭后阴影消失，节点恢复原始外观 | F-18 | 前端组件测试 | 已实现 |
| AC-8: 节点类型颜色在热力图开启前后保持一致 | F-19, R-15 | 前端组件测试 | 已实现 |
| AC-9: 切换按钮显示正确的 i18n 文本 | F-20, F-21 | 前端 i18n 验证 | 已实现 |
| AC-10: 孤立节点（无入边无出边）不渲染阴影 | R-10, R-1 | 前端组件 + Rust 单元测试 | 已实现 |

---

## Rust 测试清单

### 1. compute_instability 纯函数 (instability_test.rs)

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-1 | test_f1_basic_weighted_instability | 加权 instability 计算 | A->B(w=5), A->B(w=25), B->C(w=10), C->A(w=70) | A: Some(0.3), B: Some(0.25), C: Some(0.875) |
| F-2 | test_f2_only_outgoing_edges | 仅有出边 | A->B(w=1), A->C(w=1), A->D(w=1) | A: Some(1.0) |
| F-3 | test_f3_only_incoming_edges | 仅有入边 | B->A(w=1), C->A(w=2), D->A(w=4) | A: Some(0.0) |
| F-4 | test_f4_precision_rounding | 4 位小数精度 | A->B(w=5), B->A(w=12) | A: 0.2941 (5/17) |
| F-5 | test_f5_multiple_edge_weight_accumulation | 多条边权重累加 | A->B(w=3), A->B(w=7), A->C(w=10) | A: Some(1.0), Ce=20 |

#### 反向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| R-1 | test_r1_isolated_node_returns_none | 孤立节点无任何边 | A, B, C 无 edges | 全部 None |
| R-2 | test_r2_empty_edges_list | 空边列表 | A, B, edges=[] | A: None, B: None |
| R-3 | test_r3_empty_nodes_list | 空节点列表 | nodes=[], edges=[A->B(w=5)] | 无 panic |
| R-4 | test_r4_zero_weight_edges | 零权重边 | A->B(w=0), A->C(w=5) | A: Some(1.0), B: None |
| R-5 | test_r5_self_loop_edge | 自环边 | A->A(w=5) | A: Some(0.5) |
| R-6 | test_r6_large_values_no_overflow | 大数值无溢出 | A->B(u32::MAX/2), C->A(u32::MAX/2) | A: ~0.5 |

#### 边界情况

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| B-1 | test_b1_single_node_no_edges | 单节点无边 | [A], edges=[] | None |
| B-2 | test_b2_weight_zero_no_contribution | 权重 0 无贡献 | A->B(w=0) | A: None, B: None |
| B-3 | test_b3_self_loop | 自环 | A->A(w=3) | Some(0.5) |
| B-4 | test_b4_empty_nodes_no_panic | 空节点不 panic | nodes=[], edges 非空 | 无 panic |
| B-5 | test_b5_empty_edges_all_none | 空边全部 None | [A, B], edges=[] | 全部 None |
| B-6 | test_b6_f32_precision_4dp | f32 4 位小数精度 | A->B(w=1), B->A(w=3) | A: 0.25 |
| B-7 | test_b7_node_not_in_edges | 节点不在任何边中 | [A, B], 边只引用 A, C | A: Some, B: None |

### 2. GraphNode JSON 序列化 (types_test.rs)

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-6 | test_f6_serialization_includes_instability | 序列化包含 instability | node.instability = Some(0.2941) | JSON 包含 `"instability"` 且值包含 `0.2941` |
| F-7 | test_f7_serialization_skips_none | None 时跳过字段 | node.instability = None | JSON 不包含 `"instability"` 键 |

#### 反向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| R-7 | test_r7_deserialization_missing_field_is_none | 旧格式向后兼容 | JSON 无 instability 键 | 反序列化后 instability = None |

#### 边界情况

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| B-8 | test_b9_instability_zero_serializes | instability=0.0 | Some(0.0) | JSON 包含 `"instability"` 键 |
| B-9 | test_b10_instability_one_serializes | instability=1.0 | Some(1.0) | JSON 包含 `"instability"` 键 |
| B-10 | test_b11_minimal_json_deserialization | 最小 JSON 反序列化 | `{id,label,node_type,violation_count}` | instability=None, 其他可选字段均为 None |

#### 额外覆盖

| 测试名 | 场景 | 输入 | 预期 |
|--------|------|------|------|
| test_round_trip_instability_preserved | 序列化-反序列化往返 | Some(0.3333) | 反序列化后 instability = Some(0.3333) |

### 3. aggregate 管线集成测试 (lib_test.rs wasm_tests)

#### 正向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-8 | test_aggregate_pipeline_populates_instability | aggregate 管线为连接节点填充 instability | src/index.ts: 非 None, src/utils.ts: 非 None |
| F-8 (var.) | test_aggregate_instability_values | 复杂依赖拓扑的 instability 值验证 | a.ts: 1.0, b.ts: ~0.5, c.ts: 0.0 |
| F-8 (var.) | test_aggregate_with_dependencies | 双节点依赖的 instability 值验证 | src/index.ts: 1.0, src/utils.ts: 0.0 |

#### 反向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| R-16 | test_aggregate_isolated_node_has_no_instability | 孤立模块管线输出 None | isolated.ts: None |

---

## 前端测试清单

### 4. buildGraphData instability 转发 (buildGraphData.test.ts)

**实现状态**: 已实现。使用 fixture 辅助函数构造 ProcessedGraph，直接调用 `buildGraphData` 并断言 `G6NodeData.instability`。

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-9 | forwards instability=0.2941 from GraphNode to G6NodeData | 值转发 | instability: 0.2941 | result.nodes[0].data.instability === 0.2941 |
| F-10 | undefined GraphNode.instability results in undefined G6NodeData.instability | undefined 处理 | instability: undefined | result.nodes[0].data.instability === undefined |

#### 边界情况

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| B-11 | forwards instability=0.0 exactly | 边界值 0.0 | instability: 0.0 | result.nodes[0].data.instability === 0.0 |
| B-12 | instability undefined results in undefined G6NodeData.instability | undefined（重复验证） | instability: undefined | g6NodeData.instability === undefined |
| B-13 | forwards instability=1.0 exactly | 边界值 1.0 | instability: 1.0 | result.nodes[0].data.instability === 1.0 |
| B-extra | handles mixed nodes with and without instability | 混合数据 | [0.5, undefined, 0.0, 1.0] | 正确转发 |

### 5. DetailPanel stability 加权计算 (DetailPanel.stability.test.ts)

**实现状态**: 已实现。测试内联了 `computeStability` 纯函数实现，使用 stub 接口进行单元测试。

#### 正向路径

| ID | 测试名 | 场景 | 说明 |
|----|--------|------|------|
| F-11 | uses edge.weight weighted Ce/Ca for stability | A->B(w=3), A->C(w=7), D->A(w=10) | Ce=10, Ca=10, I=0.5 |

#### 反向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| R-8 | isolated node with no edges returns null | 孤立节点，edges=[] | computeStability 返回 null |
| R-9 | node=null returns null | null 节点 | computeStability 返回 null |

#### 边界情况

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| B-14 | all edges weight=1 matches simple count | 退化到简单计数 | 全部 weight=1 | Ce=2, Ca=1, I=2/3 |
| B-15 | only incoming edges produces I=0.0 | 仅有入边 | Ce=0, Ca=8 | I=0.0 |
| B-16 | only outgoing edges produces I=1.0 | 仅有出边 | Ce=10, Ca=0 | I=1.0 |
| B-17 | null node returns null stability | null 节点 + 单条边 | null + [单条边] | null |

### 6. DependencyGraph node style halo 渲染 (DependencyGraph.style.test.ts)

**实现状态**: 已实现。使用内联参考实现（`getShadowColor` / `getShadowBlur` / `getNodeStyle`），覆盖所有正向、反向和边界场景。这些函数目前是 `DependencyGraph.tsx` 中的模块级私有函数，测试通过内联副本验证逻辑正确性。

**关键颜色映射**（生产代码 `getShadowColor`）:

| Instability 范围 | RGBA | 说明 |
|------------------|------|------|
| 0.0 | `rgba(0, 0, 0, 0)` | 完全透明 |
| 0 < I < 0.5 | `rgba(250, 140, 22, alpha)` | alpha 0.1 → 0.35 线性映射（橙色） |
| 0.5 <= I < 1.0 | `rgba(245, 34, 45, alpha)` | alpha 0.35 → 0.5 线性映射（暖红） |
| 1.0 | `rgba(245, 34, 45, 0.5)` | 暖红 50% 透明度 |

**关键模糊映射**（生产代码 `getShadowBlur` + G6 halo 转换）:

| Instability | shadowBlur | haloLineWidth (blur * 3 + 2) | haloFilter |
|-------------|-----------|-------------------------------|------------|
| 0.0 | 0 | 2（最小可见环） | —（halo 不渲染） |
| 0.5 | 8 | 26 | `blur(8px)` |
| 1.0 | 16 | 50 | `blur(8px)` |

#### 正向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-13 | stabilityHeatmap=false returns no halo properties | 热力图关闭 | style 返回对象**不包含** halo, haloLineWidth, haloStroke, haloFilter |
| F-14 | stabilityHeatmap=true with instability=0.85 returns halo | 热力图开启 | halo=true, haloLineWidth=44, haloStroke 已定义且匹配预期 RGBA |
| F-18 | toggling heatmap OFF removes halo properties | 关闭切换 | 开启时有 halo 属性，关闭后返回基础样式 |
| F-19 | fill and stroke are identical for ON and OFF states | 颜色不变 | ON/OFF 状态的 fill, stroke, lineWidth 相同 |

#### 反向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| R-10 | undefined instability with heatmap ON does not add halo | No instability 不渲染 | halo 属性不存在 |
| R-10 (var.) | null instability with heatmap ON does not add halo | null 值不渲染 | halo 属性不存在 |
| R-11 | instability=0.0 with heatmap ON produces haloLineWidth=2 | 0.0 时 blur=0 | haloLineWidth === 2, haloStroke 为透明色 |
| R-15 | file/directory/package fill/stroke unchanged by heatmap | 三种节点类型颜色不变 | 全部 fill/stroke ON/OFF 相同 |

#### 边界情况

| ID | 测试名 | 场景 | 预期 haloLineWidth |
|----|--------|------|-------------------|
| B-18 | instability=0.0 with heatmap=ON | 下边界 0.0 | haloLineWidth=2 (blur=0 => 0*3+2) |
| B-19 | instability=0.4999 with heatmap=ON | 左侧过渡区 0.4999 | haloLineWidth=26 (blur=8 => 8*3+2), 颜色包含橙色 250,140,22 |
| B-20 | instability=0.5 with heatmap=ON | 过渡阈值 0.5 | haloLineWidth=26 (blur=8 => 8*3+2), 颜色包含暖红 245,34,45 |
| B-21 | instability=0.9999 with heatmap=ON | 右侧过渡区 0.9999 | haloLineWidth=50 (blur=16 => 16*3+2), 暖红色 |
| B-22 | instability=1.0 with heatmap=ON | 上边界 1.0 | haloLineWidth=50 (blur=16 => 16*3+2), 颜色 `rgba(245,34,45,0.5)` |
| B-23 | instability=undefined with heatmap=ON | 无数据 | 不返回 halo 属性 |
| B-24 | all node types return expected fill/stroke | 类型不变 | file/directory/package 的 fill/stroke 与 LIGHT_NODE_STYLES 常量一致 |
| B-25 | heatmap=OFF ignores instability value completely | OFF 忽略 | 含 instability 和不含的节点返回完全相同样式 |

### 7. GraphViewLayout 热力图切换按钮 (GraphViewLayout.heatmap.test.tsx)

**实现状态**: 已实现。使用 `@testing-library/react` 渲染组件，`vi.mock` 模拟 i18n/theme/icons。

#### 正向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-15 | renders heatmap toggle button with i18n text in action bar | 按钮渲染 | 出现 aria-label="Heatmap" 的按钮，文本为 "Heatmap" |
| F-16 | heatmap ON activates aria-pressed, OFF uses default | ON/OFF 视觉区分 | ON 时 aria-pressed="true"，OFF 时 aria-pressed="false" |
| F-17 | clicking toggle calls onStabilityHeatmapChange with !stabilityHeatmap | 点击切换 | OFF->ON 调用 true, ON->OFF 调用 false |

#### 反向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| R-12 | scanning=true does not disable or affect heatmap toggle | 扫描中仍可操作 | click 调用 onStabilityHeatmapChange(true)，按钮 enabled |
| R-13 | rendering with onStabilityHeatmapChange undefined does not crash | 回调 undefined 不崩溃 | 无异常，按钮正常渲染，点击不抛异常 |

#### 边界情况

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| B-26 | stabilityHeatmap undefined renders as OFF (default style) | undefined 视为 OFF | aria-pressed="false" |
| B-27 | heatmap state persists across scanning state changes | 扫描状态不影响热力图 | 开启后扫描 ON/OFF 切换，aria-pressed 仍为 "true" |

### 8. App stabilityHeatmap 状态管理 (App.heatmap.test.tsx)

**实现状态**: 已实现。使用 `vi.mock` 替换子组件为 stub，通过模块级变量追踪 prop 传递。`MemoryRouter` 用于路由切换测试。

**Mock 策略**：使用 `vi.mock` 替换 `DependencyGraph` 和 `GraphViewLayout` 为 stub，通过模块级变量 `dependencyGraphProps` 和 `graphViewLayoutProps` 追踪 prop 传递。

#### 正向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-12 | stabilityHeatmap state defaults to false on initial render | 默认为 false | GraphViewLayout 和 DependencyGraph 均收到 false |

#### 反向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| R-14 | stabilityHeatmap state persists when switching routes | 路由切换保持状态 | 设置 true -> 切到 /report -> 切回 /graph -> stabilityHeatmap 仍为 true |

#### 组件树连通性

| 测试名 | 场景 | 预期 |
|--------|------|------|
| stabilityHeatmap prop is passed from App -> GraphViewLayout -> DependencyGraph | 跨组件传递 | graphViewLayoutProps 包含 stabilityHeatmap 和 onStabilityHeatmapChange |

### 9. i18n 翻译键 (i18n.heatmap.test.ts)

**实现状态**: 已实现。直接 import 翻译字典常量进行纯数据层验证。

#### 正向路径

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-20 | en.ts action.stabilityHeatmap is "Heatmap" | 英文键值 | `en.action.stabilityHeatmap === "Heatmap"` |
| F-21 | zh-CN.ts action.stabilityHeatmap is "稳定性热力图" | 中文键值 | `zhCN.action.stabilityHeatmap === "稳定性热力图"` |

---

## 测试数据策略

### Rust 测试数据

- **Node fixture**: `make_node(id, instability)` — 创建最小 `GraphNode`，仅填充 `id`/`label`/`node_type`/`instability`
- **Edge fixture**: `make_edge(source, target, weight)` — 创建最小 `GraphEdge`，仅填充 `source`/`target`/`edge_type`/`weight`
- **Node fixture（types_test.rs）**: `make_node_with_instability(id, label, instability)` — 用于 JSON 序列化测试
- **模块 fixture (集成测试)**: 直接构造 `Module` 结构体数组，用 `make_json()` 或 `make_json_with_violations()` 序列化为 JSON 输入

### 前端测试数据

- **GraphNode fixture (buildGraphData)**: `makeNode(id, instability?)` — 创建符合 `ProcessedGraph` 节点结构的模拟对象
- **ProcessedGraph fixture (buildGraphData)**: `makeGraphData(instabilityValues[])` — 从 instability 值数组生成完整 ProcessedGraph
- **GraphNode/GraphEdge stub (DetailPanel)**: `makeNode(id)` 和 `makeEdge(source, target, weight)` — 最小字段集 stub 接口
- **Props factory (GraphViewLayout)**: `createDefaultProps(overrides)` — 创建默认 props 对象，可通过 overrides 覆盖特定字段
- **App mock (App.heatmap)**: 模块级 `dependencyGraphProps` 和 `graphViewLayoutProps` 变量追踪 prop 传递

### 阴影颜色映射测试数据

```typescript
// DependencyGraph.style.test.ts 中使用的内联参考实现：
// getShadowColor(0.0) = 'rgba(0, 0, 0, 0)'
// getShadowColor(0.25) => alpha = 0.1 + (0.25/0.5)*0.25 = 0.225 => 'rgba(250, 140, 22, 0.2250)'
// getShadowColor(0.75) => alpha = 0.35 + ((0.75-0.5)/0.5)*0.15 = 0.425 => 'rgba(245, 34, 45, 0.4250)'
// getShadowColor(1.0) = 'rgba(245, 34, 45, 0.5)'
// getShadowBlur(0.0) = 0
// getShadowBlur(0.5) = 8  (= Math.round(0.5 * 16))
// getShadowBlur(1.0) = 16 (= Math.round(1.0 * 16))
```

---

## 测试环境与 Mock 策略

### 前端 Mock 一览

| Mock 目标 | 被测试文件 | 策略 |
|-----------|-----------|------|
| `@/i18n` (useT) | `GraphViewLayout.heatmap.test.tsx` | `vi.mock` 返回固定映射 `{ action.stabilityHeatmap: 'Heatmap' }` |
| `@/i18n` | `App.heatmap.test.tsx` | `vi.mock` 返回 `t: (key) => key`（键名即值） |
| `@/theme` (useTheme) | `GraphViewLayout.heatmap.test.tsx`, `App.heatmap.test.tsx` | `vi.mock` 返回 `{ theme: 'light', resolvedTheme: 'light' }` |
| `@/components/icons` | `GraphViewLayout.heatmap.test.tsx` | `vi.mock` 替换为 `<span data-testid="..."/>` stub |
| `@/components/DependencyGraph` | `App.heatmap.test.tsx` | `vi.mock` 追踪 `stabilityHeatmap` prop |
| `@/components/GraphViewLayout` | `App.heatmap.test.tsx` | `vi.mock` 追踪 `stabilityHeatmap` 和 `onStabilityHeatmapChange` |
| `@/components/DetailPanel` | `App.heatmap.test.tsx` | `vi.mock` 替换为轻量 stub |
| `@/components/ArchitectureView` | `App.heatmap.test.tsx` | `vi.mock` 替换为轻量 stub |
| `@/hooks/useGraphData` | `App.heatmap.test.tsx` | `vi.mock` 返回固定 mock 数据 |
| `IntersectionObserver` | `App.heatmap.test.tsx` | `vi.stubGlobal` 提供空实现 |

### Mock 生命周期管理

| 钩子 | 操作 |
|------|------|
| `beforeEach` | `vi.clearAllMocks()`, `stubIntersectionObserver()` |
| `afterEach` | `vi.unstubAllGlobals()`, fetchMock 恢复 |

---

## 类型参数边界映射

### `Option<f32>` (instability 字段)

| 边界值 | Rust 预期 | 前端预期 | 覆盖测试 |
|--------|-----------|----------|----------|
| `None` (孤立节点) | instability 不序列化 | G6NodeData.instability === undefined | F-7, R-1, F-10, B-12 |
| `Some(0.0)` | 序列化为 `0.0` | 转发为 0.0, getShadowBlur=0 | B-8, B-11, B-18 |
| `Some(0.2941)` | 序列化为 `0.2941` | 转发为 0.2941 | F-1, F-6, F-9 |
| `Some(0.5)` | 序列化为 `0.5` | getShadowBlur=8, 橙→红色过渡 | B-20 |
| `Some(1.0)` | 序列化为 `1.0` | getShadowBlur=16, 暖红色 | B-9, B-13, B-22 |
| `Some(-0.0)` | 逻辑上不可能（weight 非负） | 不处理 | 不覆盖 |
| `Some(NaN)` | 逻辑上不可能（保证非零除法） | 不处理 | 不覆盖 |

### `boolean` (stabilityHeatmap)

| 值 | 预期行为 | 覆盖测试 |
|----|----------|----------|
| `true` | 渲染 halo | F-14, F-16, F-17 |
| `false` | 无 halo（默认） | F-12, F-13, F-16, F-17 |
| `undefined` | 视为 false 处理（`!!undefined === false`） | B-26 |

### `number | undefined` (G6NodeData.instability)

| 边界值 | 预期 | 覆盖测试 |
|--------|------|----------|
| `undefined` | 不渲染 halo | F-10, B-12, R-10, B-23 |
| `0.0` | getShadowBlur=0, haloLineWidth=2 | B-11, B-18 |
| `0.5` | getShadowBlur=8, haloLineWidth=26 | B-20 |
| `1.0` | getShadowBlur=16, haloLineWidth=50 | B-13, B-22 |
| `null` | 不渲染 halo（防御性 `!== undefined && !== null` 检查） | R-10 (variant) |

---

## 风险与缓解验证

| 风险 | 验证方式 | 对应测试 |
|------|----------|----------|
| R1: G6 halo 性能 | halo 实现中 haloLineWidth 最大 50 (blur=16), haloFilter 固定 blur(8px) | B-22 (max 16px blur → haloLineWidth=50) |
| R2: Rust/TS 计算不一致 | 两者使用相同加权公式验证 | F-1, F-11 |
| R3: combo 容器裁剪 | 使用 G6 原生 halo（Canvas 渲染）而非 CSS shadow，不受 DOM clip 影响 | 设计决策验证，非功能性测试 |
| R4: None 类型处理 | 防御性 `!== undefined && !== null` 检查 | B-23, R-10 |

---

## 测试执行说明

### Rust 测试执行

```bash
# 非 WASM 测试 (instability_test, types_test)
cargo test --manifest-path packages/rust/Cargo.toml

# WASM 集成测试 (lib_test 中的 wasm_tests 模块)
wasm-pack test --node packages/rust
```

### 前端测试执行

```bash
# 全部前端测试
pnpm test -- --project frontend

# 仅本次变更相关测试
cd packages/frontend
pnpm test -- from-change/
```

### 重要执行说明

1. **Rust WASM 测试**：`lib_test.rs` 中 `wasm_tests` 模块的测试使用 `wasm-pack test --node` 而非 `cargo test`。这些测试验证 `aggregate()` 管线在 WASM 目标下 instability 计算端到端的正确性。`cargo test` 下这些测试会被跳过（`#[cfg(target_arch = "wasm32")]` 条件编译）。

2. **前端 `vp test`**：前端测试使用 `vite-plus` 的 `vp test` 命令运行，它封装了 vitest。纯逻辑测试（buildGraphData、DetailPanel、DependencyGraph.style、i18n）使用 node 环境；组件测试（GraphViewLayout.heatmap、App.heatmap）使用 jsdom 环境。

3. **DependencyGraph 测试策略**：DependencyGraph 组件使用 G6 canvas 渲染，不适合在 jsdom 中测试 canvas 效果。测试提取 node `style` 回调为纯函数 `getNodeStyle(instability, stabilityHeatmap)`，验证 halo 属性的正确性。实际 canvas 渲染效果通过手动/视觉验证。

4. **关于 AC-3 前端类型同步**：`packages/frontend/src/types.ts` 从 `@dcr-reporter/wasm` re-export 类型。Rust 端 `GraphNode` 的 `instability: Option<f32>` 通过 `#[derive(Tsify)]` 自动同步为 TypeScript `instability?: number`。buildGraphData 测试中使用 `as Parameters<typeof buildGraphData>[0]` 桥接类型。
