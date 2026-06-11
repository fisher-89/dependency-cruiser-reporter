# 设计文档: graph-stability-heatmap

> **变更**: graph-stability-heatmap
> **日期**: 2026-06-09
> **状态**: 设计

---

## 架构组件

### 1. Rust `compute_instability` 模块 (新增)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `packages/rust/src/aggregate/instability.rs` | **新增**。实现 `compute_instability()` 函数，接收已聚合的 `GraphEdge` 列表和 `&mut [GraphNode]`，遍历 edges 统计每个节点的 SigmaW_out 和 SigmaW_in（使用 `edge.weight` 加权），计算 SigmaW_out/(SigmaW_out+SigmaW_in) 并设置到 `GraphNode.instability` 字段。孤立节点（SigmaW_out + SigmaW_in == 0）保持 `None`。结果保留 4 位小数 | `crate::types::{GraphEdge, GraphNode}` | Rust, serde |
| `packages/rust/src/aggregate/mod.rs` | **修改**。新增 `mod instability` 声明和 `pub(super) use instability::compute_instability` 导出 | 无外部依赖 | Rust |

**算法细节**：

```
compute_instability(nodes, edges):
  1. 初始化 HashMap<node_id, (sum_w_out, sum_w_in)>
  2. 遍历 edges:
     - edges[i].source -> sum_w_out[source] += edges[i].weight
     - edges[i].target -> sum_w_in[target] += edges[i].weight
  3. 遍历 nodes:
     - total = sum_w_out + sum_w_in
     - if total == 0: node.instability = None
     - else: node.instability = Some((sum_w_out as f32 / total).round_4dp())
```

**函数签名**：

```rust
pub(super) fn compute_instability(nodes: &mut [GraphNode], edges: &[GraphEdge])
```

使用 weight 加权的理由：聚合后的边数会掩盖真实的依赖强度。例如一个模块聚合后只有 3 条出边，但其中一条 weight=100，未加权会严重低估其不稳定性。

### 2. Rust `GraphNode` 类型修改 (修改)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `packages/rust/src/types.rs` | **修改**。`GraphNode` 结构体新增 `instability: Option<f32>` 字段，使用 `#[serde(skip_serializing_if = "Option::is_none")]` 注解，非 `None` 时序列化到 JSON | `serde`, `tsify`, `wasm_bindgen` | Rust |

**新增字段**：

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Tsify)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub node_type: NodeType,
    // ... existing fields ...
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instability: Option<f32>,  // NEW
}
```

### 3. Rust `aggregate()` 管线修改 (修改)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `packages/rust/src/lib.rs` | **修改**。在 `aggregate()` 函数中，`aggregate_edges()` 调用之后、`GraphMeta` 构造之前，插入 `compute_instability(&mut nodes, &edges)` 调用 | `aggregate::compute_instability` | Rust |

**管线变更**：

```
Before:  extract_edges -> build_hybrid_nodes -> compute_layout -> aggregate_edges -> meta -> return
After:   extract_edges -> build_hybrid_nodes -> compute_layout -> aggregate_edges -> compute_instability -> meta -> return
```

### 4. 前端 `buildGraphData` 数据传递 (修改)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `packages/frontend/src/components/DependencyGraph/buildGraphData.ts` | **修改**。`G6NodeData` 接口新增 `instability?: number` 字段。`buildGraphData()` 中从 `GraphNode` 将 `instability` 值映射到 `G6NodeData` | `@antv/g6`, `../../types` | TypeScript |

**G6NodeData 变更**：

```typescript
export interface G6NodeData {
  label?: string;
  node_type?: NodeType;
  violation_count?: number;
  instability?: number;  // NEW
  [key: string]: unknown;
}
```

### 5. 前端 `DependencyGraph` 热力图渲染 (修改)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `packages/frontend/src/components/DependencyGraph/DependencyGraph.tsx` | **修改**。`Props` 接口新增 `stabilityHeatmap?: boolean`。新增 `getShadowColor()` 和 `getShadowBlur()` 辅助函数。在 G6 node `style` 回调中，当 `stabilityHeatmap === true` 且节点有 `instability` 值时，使用 G6 v5 的 `halo` 属性渲染热力图光环；热力图关闭或节点无 instability 时仅返回基础样式。使用 `useRef` 存储 `stabilityHeatmap` 值，避免热力图切换导致 G6 Graph 实例销毁重建 | `@antv/g6`, `../../theme/constants` | React 19, TypeScript, G6 v5 |

**Props 变更**：

```typescript
interface Props {
  data: ProcessedGraph;
  onToggleDir?: (dir: string) => void;
  onNodeSelect?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  stabilityHeatmap?: boolean;  // NEW
}
```

**颜色映射函数**：

```typescript
function getShadowColor(instability: number): string {
  if (instability === 0) return 'rgba(0, 0, 0, 0)';           // 完全透明（无光环）
  if (instability < 0.5) {
    const alpha = 0.1 + (instability / 0.5) * 0.25;            // 10% -> 35%
    return `rgba(250, 140, 22, ${alpha.toFixed(4)})`;          // 橙色
  }
  if (instability < 1.0) {
    const alpha = 0.35 + ((instability - 0.5) / 0.5) * 0.15;  // 35% -> 50%
    return `rgba(245, 34, 45, ${alpha.toFixed(4)})`;           // 暖红
  }
  return 'rgba(245, 34, 45, 0.5)';                             // 全红 50%
}
```

**模糊半径映射函数**：

```typescript
function getShadowBlur(instability: number): number {
  if (instability === 0) return 0;
  return Math.round(instability * 16);  // 0 -> 16 线性映射
}
```

**G6 halo 渲染（关键实现细节）**：

G6 v5 不原生支持 CSS `shadowBlur`/`shadowColor` 属性（v4 legacy API）。替代方案是使用 G6 v5 原生的 `halo` 配置：

```typescript
// 在 node style 回调中
const isHeatmapOn = stabilityHeatmapRef.current;
const inst = nodeData?.instability;
if (isHeatmapOn && inst !== undefined && inst !== null) {
  const blur = getShadowBlur(inst);       // 0-16
  const color = getShadowColor(inst);     // RGBA
  return {
    fill: s.fill,
    stroke: s.stroke,
    lineWidth: 2,
    labelText: nodeData?.label ?? '',
    labelPlacement: 'bottom',
    labelFill: LABEL_FILL,
    halo: true,
    haloLineWidth: blur * 3 + 2,          // 范围 2-50px（放大便于观察）
    haloStroke: color,
    haloFilter: 'blur(8px)',              // 恒定柔和模糊
  };
}
// 热力图关闭时，返回基础样式（无 halo 属性）
```

**Ref 模式**：G6 Graph 实例在 `useEffect` 中创建，依赖数组包含 `stabilityHeatmapRef`（而非 `stabilityHeatmap` 原始值）。通过 `const stabilityHeatmapRef = useRef(stabilityHeatmap); stabilityHeatmapRef.current = stabilityHeatmap;` 的方式，将最新 prop 值注入 ref，同时保持依赖数组稳定，避免热力图切换导致 G6 实例重建。

**热力图映射表**：

| Instability 范围 | blur (raw) | haloLineWidth | haloStroke | 透明度 |
|------------------|-----------|---------------|------------|--------|
| 0.0（稳定） | 0 | 2 | rgba(0,0,0,0) 透明 | 0% |
| 0 < I < 0.5 | 1-8 | 5-26 | rgba(250,140,22,alpha) 橙色 | 10% -> 35% |
| 0.5 <= I < 1.0 | 8-15 | 26-47 | rgba(245,34,45,alpha) 暖红 | 35% -> 50% |
| 1.0（极不稳定） | 16 | 50 | rgba(245,34,45,0.50) 暖红 | 50% |

`haloFilter: 'blur(8px)'` 提供恒定柔和模糊效果，`haloLineWidth` 放大 3 倍 + 2 偏移以产生足够宽的光环用于视觉区分。

### 6. 前端 `GraphViewLayout` 热力图切换按钮 (修改)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `packages/frontend/src/components/GraphViewLayout.tsx` | **修改**。`GraphViewLayoutProps` 新增 `stabilityHeatmap` 和 `onStabilityHeatmapChange` props。action bar 中 Scan 按钮和 Refresh 按钮之间新增热力图切换按钮，点击时通过 `onStabilityHeatmapChange` 回调通知父组件 | `React`, `useT()` | React 19, TypeScript |

**Props 变更**：

```typescript
interface GraphViewLayoutProps {
  loading: boolean;
  onRefresh: () => void;
  children: ReactNode;
  stabilityHeatmap: boolean;           // NEW
  onStabilityHeatmapChange: (value: boolean) => void;  // NEW
}
```

**按钮样式**：与现有 Scan/Refresh 按钮一致的 `actionBtn` 样式。打开时使用 `accent` 色作为边框或背景变化以区分激活状态。使用 `aria-pressed` 属性标识 toggle 状态。

**按钮位置**：`Scan | [稳定性热力图] | Refresh`

### 7. 前端 `App` 状态管理 (修改)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `packages/frontend/src/App.tsx` | **修改**。新增 `stabilityHeatmap` state（默认 `false`）。在路由 `/graph` 下的 `GraphViewLayout` 和 `DependencyGraph` 中传递 `stabilityHeatmap` prop 和 `handleStabilityHeatmapChange` 处理函数。同时在 `/report`、`/metrics` 路由的 `GraphViewLayout` 中也透传热力图 props，确保路由切换保持状态 | `React` | React 19, TypeScript |

**新增状态**：

```typescript
const [stabilityHeatmap, setStabilityHeatmap] = useState(false);
```

**传递路径**：

```
App
  +-- GraphViewLayout (receives: stabilityHeatmap, onStabilityHeatmapChange)
  |   +-- DependencyGraph (receives: stabilityHeatmap)
  |   +-- ReportView / MetricsView (via shared GraphViewLayout)
  +-- ArchitectureView (不涉及热力图)
```

### 8. 前端 DetailPanel 加权计算 (修改)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `packages/frontend/src/components/DetailPanel.tsx` | **修改**。`stability` 的 `useMemo` 计算从简单计数 `ce++` 改为使用 `edge.weight` 加权：`ce += e.weight`、`ca += e.weight`，与 Rust 后端加权公式保持一致 | `React` | React 19, TypeScript |

**变更前后对比**：

```typescript
// Before: 简单计数
for (const e of edges) {
  if (e.source === node.id) ce++;
  if (e.target === node.id) ca++;
}

// After: 使用 edge.weight 加权
for (const e of edges) {
  if (e.source === node.id) ce += e.weight;
  if (e.target === node.id) ca += e.weight;
}
```

### 9. 国际化层 (修改)

| 文件 | 职责 | 依赖 | 技术 |
|------|------|------|------|
| `packages/frontend/src/i18n/en.ts` | **修改**。`action` 命名空间下新增 `stabilityHeatmap: 'Heatmap'` | 无 | TypeScript const object |
| `packages/frontend/src/i18n/zh-CN.ts` | **修改**。`action` 命名空间下新增 `stabilityHeatmap: '稳定性热力图'` | 无 | TypeScript const object |

---

## 数据流

### 数据生成流程

```
dependency-cruiser JSON
        |
        v
Rust aggregate()
  +-- extract_edges(&modules)
  +-- build_hybrid_nodes(&modules, &violation_counts, &expanded_set)
  |       +-- -> (nodes, combos, node_lookup)
  +-- compute_layout(&mut nodes, &mut combos)
  +-- aggregate_edges(&all_edges, &node_lookup, &edge_violations, max_nodes)
  |       +-- -> edges (with weight = count)
  +-- compute_instability(&mut nodes, &edges)    <-- NEW
  |       +-- 对每个 node: instability = SigmaW_out / (SigmaW_out + SigmaW_in)
  |       +-- 使用 edge.weight 加权
  +-- -> ProcessedGraph { nodes(含 instability), edges, combos, meta, violations }
```

### 前端热力图数据流

```
Rust WASM -> JSON -> ProcessedGraph
                        |
                        v
App.tsx: data = ProcessedGraph (含 nodes[].instability)
                        |
                        v
buildGraphData(data)
  +-- G6NodeData.instability = GraphNode.instability
                        |
                        v
DependencyGraph
  +-- props: stabilityHeatmap (boolean, via useRef)
  +-- node.style 回调: if (stabilityHeatmap && d.data?.instability !== undefined)
  |     +-- 计算 halo（haloLineWidth = blur*3+2, haloStroke = getShadowColor(inst), haloFilter = 'blur(8px)'）
  +-- else: 返回基础 fill/stroke，无 halo 属性
```

### 用户交互流程

```
用户点击 "稳定性热力图" 按钮
        |
        v
GraphViewLayout.onStabilityHeatmapChange(!stabilityHeatmap)
        |
        v
App setStabilityHeatmap -> 状态更新触发重渲染
        |
        v
DependencyGraph 接收新的 stabilityHeatmap prop
        |
        v
stabilityHeatmapRef.current = stabilityHeatmap (在 render 阶段更新)
        |
        v
G6 node.style 回调在下次绘制时读取 ref 中的最新值
  +-- true:  根据各节点 instability 渲染 halo 光环
  +-- false: 所有节点无 halo，恢复原始外观
```

---

## 数据模型

### Rust GraphNode (修改)

| 字段 | 类型 | 序列化 | 说明 |
|------|------|--------|------|
| `id` | `String` | 始终存在 | 节点唯一标识 |
| `label` | `String` | 始终存在 | 显示标签 |
| `node_type` | `NodeType` | 始终存在 | File / Directory / Package |
| `path` | `Option<String>` | `skip_serializing_if` | 文件路径 |
| `violation_count` | `u32` | 始终存在 | 违规计数 |
| `orphan` | `Option<bool>` | `skip_serializing_if` | 孤儿模块标记 |
| `children` | `Option<Vec<String>>` | `skip_serializing_if` | 子节点列表 |
| `combo` | `Option<String>` | `skip_serializing_if` | 所属 combo ID |
| `rect` | `Option<Rect>` | `skip_serializing_if` | 布局坐标 |
| `instability` | **`Option<f32>`** | **`skip_serializing_if`** | **稳定性指标 (NEW)** |

### TypeScript GraphNode (wasm 类型，自动生成)

```typescript
interface GraphNode {
  id: string;
  label: string;
  node_type: 'file' | 'directory' | 'package';
  path?: string;
  violation_count: number;
  orphan?: boolean;
  children?: string[];
  combo?: string;
  rect?: { top: number; left: number; width: number; height: number };
  instability?: number;  // NEW
}
```

### G6NodeData (修改)

| 字段 | 类型 | 说明 |
|------|------|------|
| `label` | `string \| undefined` | 节点标签 |
| `node_type` | `NodeType \| undefined` | 节点类型 |
| `violation_count` | `number \| undefined` | 违规计数 |
| `instability` | **`number \| undefined`** | **稳定性指标 (NEW)** |

---

## 路由设计

本次变更为纯后端计算指标 + 前端交互改进，不涉及任何 API 端点的修改。

### 现有相关路由（无变更）

| 方法 | 路径 | 说明 | 变更 |
|------|------|------|------|
| POST | `/api/graph` | 获取处理后的图谱数据（含新增的 instability 字段） | 无变更，数据由 Rust WASM 在服务端直接生成 |
| POST | `/api/analyze` | 触发服务端 dependency-cruiser 扫描 | 无变更 |

### 前端路由（无变更）

| 路径 | 视图 | 说明 | 变更 |
|------|------|------|------|
| `/architecture` | ArchitectureView | 架构图 | 无变更 |
| `/graph` | DependencyGraph | 依赖图谱（含热力图） | 无变更 |
| `/report` | ReportView | 违规报告 | 无变更 |
| `/metrics` | MetricsView | 指标统计 | 无变更 |

---

## 决策

### 决策 1：Rust 端使用 edge.weight 加权计算 instability

- **选择**：`compute_instability()` 使用 `edge.weight` 加权计算 SigmaW_out/(SigmaW_out+SigmaW_in)，而非简单计数
- **原因**：聚合后的边 weight 代表背后被合并的原始依赖数量。例如一个模块聚合后只有 3 条出边，但其中一条 weight=100，若未加权会严重低估其不稳定性。加权计算更准确地反映了真实的架构稳定性。
- **替代方案**：简单计数（每条边计 1）。被拒绝的原因是：聚合过程会合并多条原始依赖为一条边，丢失了依赖强度的信息。简单计数无法反映真实的依赖脆弱度。
- **精度选择**：结果保留 4 位小数，通过 `(value * 10000.0).round() / 10000.0` 实现。兼顾精度和可读性。

### 决策 2：热力图状态管理在 App 根组件

- **选择**：`stabilityHeatmap` 状态在 `App.tsx` 中管理，通过 props 传递给 `GraphViewLayout` 和 `DependencyGraph`
- **原因**：热力图状态需要在多个组件间共享。`GraphViewLayout` 需要知道状态以显示按钮的激活样式。`DependencyGraph` 需要状态以决定是否渲染阴影。路由切换（/graph -> /report -> /graph）需要保持热力图状态。提升状态到 App 是最简单的跨路由持久化方式。
- **替代方案**：在 `GraphViewLayout` 内部管理状态并通过 context 传递给 `DependencyGraph`。被拒绝的原因是：引入 context 增加了不必要的复杂度，且路由切换时 `GraphViewLayout` 卸载/挂载会导致状态丢失。

### 决策 3：热力图光环使用 G6 原生 halo 属性

- **选择**：在 G6 node `style` 回调中使用 `halo` 对象渲染稳定性热力图光环。`haloLineWidth` 由 `getShadowBlur(instability)` 计算后经 `blur * 3 + 2` 放大（范围 2-50px），`haloStroke` 由 `getShadowColor(instability)` 生成 RGBA 颜色，`haloFilter` 固定为 `'blur(8px)'` 产生柔和渐变效果。
- **原因**：实际测试中发现 G6 的 `shadowBlur`/`shadowColor` 属性在 AntV G6 v5 的节点渲染管线中不被原生支持（这些属性属于 v4 API，v5 中已移除）。而 G6 v5 原生支持 `halo` 配置，可以为节点绘制围绕外轮廓的光环，通过 `haloLineWidth` 控制光环宽度、`haloStroke` 控制颜色、`haloFilter` 添加模糊滤镜，能有效实现从"无光环"（稳定）到"宽暖色光环"（不稳定）的连续视觉编码。性能开销可控，仅在热力图开启时渲染。
- **视觉映射**：`instability=0` -> `haloLineWidth=2`（最小可见光环，透明色）；`instability=0.5` -> `haloLineWidth=26`（橙色，35% 透明度）；`instability=1.0` -> `haloLineWidth=50`（红色，50% 透明度）。`haloFilter: 'blur(8px)'` 提供均匀的柔和过渡。
- **替代方案**：使用 canvas 原生 `shadowBlur`/`shadowColor` 属性。被拒绝的原因是：G6 v5 节点 `style` 回调在内部渲染管线中不识别这些属性（v4 legacy API），实际测试中无法产生可见阴影效果。
- **替代方案 2**：使用 SVG `<filter>` 叠加层。被拒绝的原因是：需要额外 DOM 操作，与 G6 Canvas 渲染模式不兼容。

### 决策 4：DetailPanel 前端计算改为加权

- **选择**：DetailPanel 的 stability `useMemo` 从简单计数 `ce++` 改为 `ce += e.weight`，保持与 Rust 后端公式一致
- **原因**：DetailPanel 和 Rust 后端应使用相同的公式计算 instability，否则用户在同一节点上会看到两个不同的 instability 值，造成困惑。
- **替代方案**：DetailPanel 直接读取 `node.instability`。被拒绝的原因是：DetailPanel UI 显示完整的 Ce/(Ce+Ca) 计算过程，需要 `ce` 和 `ca` 的详细数值，而不仅仅是最终的 I 值。从 `node.instability` 无法反推出 Ce 和 Ca。

### 决策 5：G6NodeData 手动转发 instability，而非依赖自动类型生成

- **选择**：在 `buildGraphData.ts` 中手动从 `GraphNode` 将 `instability` 映射到 `G6NodeData`
- **原因**：`buildGraphData` 当前已经对所有节点字段进行手动映射（`label`、`node_type`、`violation_count`），保持一致性。`G6NodeData` 类型定义与 Rust `GraphNode` 是独立的——后者由 WASM/tsify 自动生成，前者是前端手动定义的类型。所有节点数据都应该在 `buildGraphData` 中显式传递。
- **替代方案**：通过 tsify 自动将 `instability` 类型同步到前端。被拒绝的原因是：tsify 自动类型仅用于 `packages/frontend/src/types.ts` 中的 `GraphNode`，而 `G6NodeData` 是前端独立定义的类型，需要手动映射。

### 决策 6：instability 为 None 时不渲染 halo

- **选择**：孤立节点（无入边无出边）的 `instability` 为 `None`，前端渲染时不做 halo 处理
- **原因**：孤立节点没有依赖关系，不适用稳定性指标。显示 halo 会误导用户认为它有 instability=0.0（完全稳定），而实际上 instability 指标对其无意义。用"无光环"来编码"指标不适用"比用"绿色/无光环"更清晰。
- **替代方案**：孤立节点按 instability=0 处理（`haloLineWidth=2`，透明色）。被拒绝的原因是：数学上 Ce/(Ce+Ca)=0/0 是没有意义的，设为 0 会错误地暗示该节点"完全稳定"。

### 决策 7：使用 ref 模式避免 G6 实例重建

- **选择**：使用 `useRef` 存储 `stabilityHeatmap` 的当前值，G6 `useEffect` 的依赖数组包含 `stabilityHeatmapRef` 而非 `stabilityHeatmap` 原始状态值
- **原因**：G6 Graph 实例通过 `useEffect` 创建，如果直接将 `stabilityHeatmap` 加入依赖数组，每次热力图切换都会触发 `useEffect` 的 cleanup（销毁 G6 实例）和重新创建。这会导致不必要的性能开销和视觉闪烁。使用 ref 模式可以在每次 render 时更新 ref 值，而 G6 实例仅创建一次，node style 回调通过 ref 读取最新的 `stabilityHeatmap` 值。
- **替代方案**：将 `stabilityHeatmap` 直接加入 `useEffect` 依赖数组。被拒绝的原因是：每次切换都需要销毁和重建 G6 实例，在大图谱上会导致显著的性能下降和视觉闪烁。

### 决策 8：阴影颜色使用 RGBA 插值，不额外创建图例

- **选择**：阴影颜色从透明到橙色到红色的连续插值，通过 rgba 透明度混合实现
- **原因**：符合 proposal 的"不新增热力图图例"的范围外限制。连续的颜色渐变已经能在视觉上区分不稳定程度，用户可以通过 DetailPanel 查看精确值。
- **替代方案**：创建独立的图例组件说明颜色映射。被拒绝的原因是：proposal 明确将其列为范围外，保持设计简洁。

---

## 风险

### R1：G6 halo 渲染性能下降

| 属性 | 值 |
|------|-----|
| **影响** | 中：大量节点同时渲染光环时交互卡顿 |
| **概率** | 中 |
| **缓解措施** | haloLineWidth 上限为 50px（对应 instability=1.0）；仅在热力图开启时渲染 halo；用户可按需切换关闭 |
| **状态** | 可接受 |

### R2：Rust instability 计算与 DetailPanel 前端计算不一致

| 属性 | 值 |
|------|-----|
| **影响** | 中：同一节点显示两个不同的 I 值 |
| **概率** | 低 |
| **缓解措施** | 两者使用完全相同的加权公式 SigmaW_out/(SigmaW_out+SigmaW_in)，使用 `edge.weight` 而非简单计数 |
| **状态** | 已缓解 |

### R3：halo 光环被 combo 容器裁剪

| 属性 | 值 |
|------|-----|
| **影响** | 低：部分光环效果不可见 |
| **概率** | 低 |
| **缓解措施** | G6 v5 halo 在 canvas 层面渲染，不受 combo DOM 容器的 overflow/clip 影响。确认 `combo` 类型的 style 中不设置 `overflow: hidden` |
| **状态** | 已缓解 |

### R4：instability 为 None 的节点在 TypeScript 侧类型处理不当

| 属性 | 值 |
|------|-----|
| **影响** | 低：渲染异常或 console error |
| **概率** | 低 |
| **缓解措施** | buildGraphData 中 `n.instability` 为 `undefined` 时不做特殊处理（直接传递 `undefined`）；DependencyGraph node style 中对 `instability === undefined || instability === null` 的节点不做 halo 处理 |
| **状态** | 已缓解 |

---

## 受影响文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `packages/rust/src/types.rs` | 修改 | `GraphNode` 新增 `instability: Option<f32>` 字段 |
| `packages/rust/src/aggregate/instability.rs` | **新增** | `compute_instability()` 函数，使用 edge.weight 加权计算 |
| `packages/rust/src/aggregate/mod.rs` | 修改 | 导出 `compute_instability` |
| `packages/rust/src/lib.rs` | 修改 | `aggregate()` 管线中增加 `compute_instability` 调用 |
| `packages/rust/src/aggregate/instability_test.rs` | **新增** | compute_instability 单元测试（F-1~F-5, R-1~R-6, B-1~B-7） |
| `packages/rust/src/types_test.rs` | 修改 | 新增 instability JSON 序列化/反序列化测试（F-6, F-7, R-7, B-9~B-11） |
| `packages/rust/src/lib_test.rs` | 修改 | 集成测试含 instability 断言（F-8, R-16） |
| `packages/frontend/src/types.ts` | 无变更 | wasm 自动类型生成 |
| `packages/frontend/src/components/DetailPanel.tsx` | 修改 | stability 计算改为 edge.weight 加权 |
| `packages/frontend/src/components/DependencyGraph/DependencyGraph.tsx` | 修改 | 新增 `stabilityHeatmap` prop，node style 叠加 halo |
| `packages/frontend/src/components/DependencyGraph/buildGraphData.ts` | 修改 | `G6NodeData` 新增 `instability`，`buildGraphData` 转发该字段 |
| `packages/frontend/src/components/GraphViewLayout.tsx` | 修改 | 新增热力图切换按钮和 props |
| `packages/frontend/src/App.tsx` | 修改 | 新增 `stabilityHeatmap` 状态并透传 |
| `packages/frontend/src/i18n/en.ts` | 修改 | 新增 `action.stabilityHeatmap` 键 |
| `packages/frontend/src/i18n/zh-CN.ts` | 修改 | 新增 `action.stabilityHeatmap` 键 |
| `packages/frontend/src/__tests__/from-change/buildGraphData.test.ts` | **新增** | buildGraphData instability 转发测试 |
| `packages/frontend/src/__tests__/from-change/DetailPanel.stability.test.ts` | **新增** | DetailPanel 加权计算测试 |
| `packages/frontend/src/__tests__/from-change/DependencyGraph.style.test.ts` | **新增** | G6 node style halo 渲染测试 |
| `packages/frontend/src/__tests__/from-change/GraphViewLayout.heatmap.test.tsx` | **新增** | 热力图切换按钮交互测试 |
| `packages/frontend/src/__tests__/from-change/App.heatmap.test.tsx` | **新增** | App 级状态管理测试 |
| `packages/frontend/src/__tests__/from-change/i18n.heatmap.test.ts` | **新增** | i18n 翻译键测试 |
