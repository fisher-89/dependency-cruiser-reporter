# 实现任务: graph-stability-heatmap

> **变更**: graph-stability-heatmap
> **日期**: 2026-06-09

---

## 阶段 1: Rust 类型扩展

此阶段在 Rust `GraphNode` 类型中新增 `instability` 字段，为后续计算管线提供数据结构支持。必须先于阶段 2 完成，因为 `compute_instability` 函数依赖该字段的存在。

- [x] 1.1 在 `packages/rust/src/types.rs` 的 `GraphNode` 结构体中新增 `instability: Option<f32>` 字段：
  - 插入在 `rect` 字段之后
  - 添加 `#[serde(skip_serializing_if = "Option::is_none")]` 注解
  - 与现有可选字段（`path`、`orphan`、`children`、`combo`、`rect`）保持一致风格
- [x] 1.2 验证：运行 `pnpm build:rust` 确认编译通过
- [x] 1.3 验证：运行 `pnpm build:ts` 确认 wasm 类型自动生成正常

## 阶段 2: Rust compute_instability 模块

此阶段新建 `instability.rs` 模块，实现加权 instability 计算函数。依赖阶段 1（`GraphNode.instability` 字段存在）。

- [x] 2.1 **新增** `packages/rust/src/aggregate/instability.rs` 文件：
  - 导入 `crate::types::{GraphEdge, GraphNode}`
  - 实现 `pub(crate) fn compute_instability(nodes: &mut [GraphNode], edges: &[GraphEdge])` 函数（在 mod.rs 中以 `pub(super)` 重导出）
  - 使用 `HashMap<&str, (f32, f32)>` 追踪每个节点 ID 的 `(sum_w_out, sum_w_in)`
  - 遍历 `edges`：
    - `edge.source` -> sum_w_out 累加 `edge.weight as f32`
    - `edge.target` -> sum_w_in 累加 `edge.weight as f32`
  - 遍历 `nodes`：
    - 计算 `total = sum_w_out + sum_w_in`
    - 若 `total == 0.0`，设置 `node.instability = None`
    - 否则计算 `value = sum_w_out / total`，保留 4 位小数：`(value * 10000.0).round() / 10000.0`
    - 设置 `node.instability = Some(rounded_value)`
- [x] 2.2 在 `packages/rust/src/aggregate/mod.rs` 中注册新模块：
  - 新增 `mod instability;`
  - 新增行 `pub(super) use instability::compute_instability;`
- [x] 2.3 验证：运行 `pnpm build:rust` 确认编译通过

## 阶段 3: Rust aggregate 管线集成

此阶段在 `aggregate()` 函数中调用 `compute_instability`。依赖阶段 2（函数存在并可调用）。

- [x] 3.1 在 `packages/rust/src/lib.rs` 中：
  - 在 `use aggregate::...` 导入列表中添加 `compute_instability`
  - 在 `let edges = aggregate_edges(...)` 调用之后、`let meta = GraphMeta { ... }` 之前，插入：
    ```rust
    compute_instability(&mut nodes, &edges);
    ```
- [x] 3.2 验证：运行 `pnpm build:rust` 确认编译通过

## 阶段 4: Rust 单元测试

此阶段为 `compute_instability` 函数、JSON 序列化/反序列化以及集成行为添加单元测试。依赖阶段 2 和 3（函数实现且可调用）。

- [x] 4.1 **新增** `packages/rust/src/aggregate/instability_test.rs` 文件（模块内测试，通过 `#[cfg(test)]` 条件编译）：
  - 在 `instability.rs` 末尾添加 `#[cfg(test)] #[path = "instability_test.rs"] mod instability_test;`
  - 实现正向路径测试（F-1 ~ F-5）：
    - F-1: 基础加权计算，A->B(w=5+25), B->C(w=10), C->A(w=70) -> A:0.3, B:0.25, C:0.875
    - F-2: 仅有出边，A->B/C/D(w=1 each) -> A:1.0
    - F-3: 仅有入边，B/C/D->A(w=1+2+4) -> A:0.0
    - F-4: 4 位小数精度，A->B(w=5), B->A(w=12) -> A:0.2941 (5/17)
    - F-5: 多条边权重累加，A->B(w=3+7), A->C(w=10) -> A:1.0, Ce=20
  - 实现反向路径测试（R-1 ~ R-6）：
    - R-1: 孤立节点返回 None，A/B/C 无边 -> 全部 None
    - R-2: 空边列表 -> 全部 None，无 panic
    - R-3: 空节点列表 -> 无 panic
    - R-4: 零权重边，A->B(w=0), A->C(w=5) -> A:1.0, B:None
    - R-5: 自环边，A->A(w=5) -> A:0.5
    - R-6: 大值无溢出，A->B(u32::MAX/2), C->A(u32::MAX/2) -> A:~0.5
  - 实现边界测试（B-1 ~ B-7）：
    - B-1: 单节点无边 -> None
    - B-2: 权重 0 无贡献 -> A:None, B:None
    - B-3: 自环 -> Some(0.5)
    - B-4: 空节点不 panic
    - B-5: 空边全部 None
    - B-6: f32 精度 0.25
    - B-7: 节点不在边中 -> 有引用的 Some，无引用的 None
- [x] 4.2 **新增/修改** `packages/rust/src/types_test.rs` 中 instability 序列化/反序列化测试：
  - F-6: `Some(0.2941)` 序列化后 JSON 包含 `"instability"` 键
  - F-7: `None` 序列化后 JSON 跳过 `"instability"` 键
  - R-7: 旧 JSON 格式（无 instability 键）反序列化为 `None`
  - B-9: `Some(0.0)` 序列化包含 `"instability"` 键
  - B-10: `Some(1.0)` 序列化包含 `"instability"` 键
  - B-11: 最小 JSON 反序列化 -> 全部可选字段为 None
  - Round-trip: `Some(0.3333)` 序列化再反序列化保持值不变
- [x] 4.3 在 `packages/rust/src/lib_test.rs` 的 wasm 集成测试中添加 instability 验证：
  - F-8: aggregate 管线在连接节点上填充 instability（index.ts: Some(1.0), utils.ts: Some(0.0)）
  - F-8 variant: 复杂依赖拓扑验证（a.ts: 1.0, b.ts: 0.5, c.ts: 0.0）
  - R-16: 孤立模块管线输出 None（isolated.ts: None）
- [x] 4.4 验证：运行 `pnpm test`（Rust 部分），确认所有测试通过

## 阶段 5: 前端 buildGraphData 转发 instability

此阶段在 `G6NodeData` 和 `buildGraphData` 中新增 instability 字段，使节点 instability 数据能被 G6 节点的 style 回调访问。此阶段可与阶段 6 并行（无依赖关系），但必须在阶段 7 之前完成。

- [x] 5.1 在 `packages/frontend/src/components/DependencyGraph/buildGraphData.ts` 的 `G6NodeData` 接口中新增 `instability?: number` 字段
- [x] 5.2 在 `buildGraphData()` 函数的 `data.nodes.map(...)` 回调中，将 `n.instability` 值传递到 G6NodeData：
  ```typescript
  data: {
    label: n.label,
    node_type: n.node_type,
    violation_count: n.violation_count,
    instability: n.instability,  // NEW: undefined when None, number when Some
  }
  ```
- [x] 5.3 验证：运行 `pnpm build:ts` 确认编译通过

## 阶段 6: 前端 i18n 翻译

此阶段新增热力图切换按钮的中英文翻译。可与阶段 5 并行执行。

- [x] 6.1 在 `packages/frontend/src/i18n/en.ts` 的 `action` 命名空间下新增：
  - `stabilityHeatmap: 'Heatmap'`
- [x] 6.2 在 `packages/frontend/src/i18n/zh-CN.ts` 的 `action` 命名空间下新增：
  - `stabilityHeatmap: '稳定性热力图'`
- [x] 6.3 验证：运行 `pnpm build:ts` 确认编译通过

## 阶段 7: 前端 DependencyGraph 热力图渲染（核心可视化）

此阶段实现热力图核心可视化——根据 instability 值在 G6 节点上渲染 halo 光环。依赖阶段 5（`G6NodeData.instability` 数据可用）。

**技术前提**：G6 v5 不原生支持 CSS `shadowBlur`/`shadowColor` 属性（这些是 v4 legacy API）。使用 G6 v5 原生 `halo` 属性实现光环效果。

- [x] 7.1 在 `packages/frontend/src/components/DependencyGraph/DependencyGraph.tsx` 的 `Props` 接口中新增 `stabilityHeatmap?: boolean` 字段
- [x] 7.2 实现 `getShadowColor(instability: number): string` 辅助函数：
  - `instability === 0` -> 返回透明色 `'rgba(0, 0, 0, 0)'`
  - `0 < instability < 0.5` -> 颜色从透明线性过渡到橙色 `rgba(250, 140, 22, alpha)`
    - alpha = 0.1 + (instability / 0.5) * 0.25（透明度 10%~35%）
  - `0.5 <= instability < 1.0` -> 颜色从橙色线性过渡到暖红 `rgba(245, 34, 45, alpha)`
    - alpha = 0.35 + ((instability - 0.5) / 0.5) * 0.15（透明度 35%~50%）
  - `instability === 1.0` -> `'rgba(245, 34, 45, 0.5)'`
- [x] 7.3 实现 `getShadowBlur(instability: number): number` 辅助函数：
  - `instability === 0` -> 0
  - `0 < instability <= 1` -> `Math.round(instability * 16)`（0-16px 线性映射）
- [x] 7.4 使用 ref 模式避免 G6 实例重建：
  - 创建 `const stabilityHeatmapRef = useRef(stabilityHeatmap)` 存储 prop 值
  - 在每次 render 时更新：`stabilityHeatmapRef.current = stabilityHeatmap`
  - G6 创建的 `useEffect` 依赖数组包含 `stabilityHeatmapRef`（而非 `stabilityHeatmap` 原始值）
- [x] 7.5 修改 `DependencyGraph` 中的 G6 node `style` 回调，使用 G6 v5 halo 属性渲染热力图光环：
  - 从 ref 读取稳定性热力图开关状态：`const isHeatmapOn = stabilityHeatmapRef.current`
  - 当 `isHeatmapOn === true` 且 `d.data?.instability !== undefined && !== null` 时：
    - 计算 `const blur = getShadowBlur(d.data.instability)`
    - 计算 `const color = getShadowColor(d.data.instability)`
    - 返回对象包含：`fill`、`stroke`、`lineWidth`、`labelText`、`labelPlacement`、`labelFill` 基础样式
    - 叠加 G6 halo 光环：`halo: true`、`haloLineWidth: blur * 3 + 2`、`haloStroke: color`、`haloFilter: 'blur(8px)'`
  - 当热力图关闭或节点无 `instability` 值时：返回原始样式（不含 halo 属性）
  - 注意：`haloLineWidth` 放大 3 倍 + 2 偏移是为了产生足够宽的光环用于视觉区分
- [x] 7.6 验证：运行 `pnpm build:ts` 确认编译通过

## 阶段 8: 前端 GraphViewLayout 热力图切换按钮

此阶段在 action bar 中添加热力图切换按钮。依赖阶段 6（i18n 翻译键可用）。

- [x] 8.1 在 `packages/frontend/src/components/GraphViewLayout.tsx` 的 `GraphViewLayoutProps` 接口中新增：
  - `stabilityHeatmap: boolean` —— 控制按钮激活状态
  - `onStabilityHeatmapChange: (value: boolean) => void` —— 点击回调
- [x] 8.2 在 action bar 中，Scan 按钮和 Refresh 按钮之间，新增热力图切换按钮：
  - 使用与现有按钮一致的 `actionBtn` 样式
  - 按钮文本使用 `useT()` 读取 `t('action.stabilityHeatmap')`
  - 点击时调用 `onStabilityHeatmapChange(!stabilityHeatmap)`
  - 当 `stabilityHeatmap === true` 时，按钮添加 `styles.actionBtnActive` 激活样式（accent 色边框和背景），以区分 ON/OFF 状态
  - 添加 `aria-pressed` 属性标识 toggle 状态
  - 添加 `title` 和 `aria-label` 属性
- [x] 8.3 验证：运行 `pnpm build:ts` 确认编译通过

## 阶段 9: 前端 App 状态管理

此阶段在 `App.tsx` 中新增 `stabilityHeatmap` 状态管理，并将其传递给子组件。依赖阶段 7 和 8（子组件已准备好接收 prop）。

- [x] 9.1 在 `packages/frontend/src/App.tsx` 中新增状态：
  ```typescript
  const [stabilityHeatmap, setStabilityHeatmap] = useState(false);
  ```
- [x] 9.2 创建 `handleStabilityHeatmapChange` 回调：
  ```typescript
  const handleStabilityHeatmapChange = useCallback((value: boolean) => {
    setStabilityHeatmap(value);
  }, []);
  ```
- [x] 9.3 在 `/graph`、`/report`、`/metrics` 路由的 `GraphViewLayout` prop 中透传：
  ```typescript
  <GraphViewLayout
    loading={loading}
    onRefresh={handleRefresh}
    stabilityHeatmap={stabilityHeatmap}
    onStabilityHeatmapChange={handleStabilityHeatmapChange}
  >
  ```
- [x] 9.4 在 `/graph` 路由的 `DependencyGraph` prop 中透传：
  ```typescript
  <DependencyGraph
    data={data}
    onToggleDir={toggleDir}
    onNodeSelect={handleNodeSelect}
    selectedNodeId={selectedNodeId}
    stabilityHeatmap={stabilityHeatmap}
  />
  ```
- [x] 9.5 验证：运行 `pnpm build:ts` 确认编译通过

## 阶段 10: 前端 DetailPanel 加权计算

此阶段将 DetailPanel 的 instability 计算从简单计数改为 edge.weight 加权，与 Rust 后端公式保持一致。

- [x] 10.1 在 `packages/frontend/src/components/DetailPanel.tsx` 的 `stability` useMemo 中，将边计数方式从 `ce++`/`ca++` 改为 `ce += e.weight`/`ca += e.weight`
  ```typescript
  // 修改前
  for (const e of edges) {
    if (e.source === node.id) ce++;
    if (e.target === node.id) ca++;
  }

  // 修改后
  for (const e of edges) {
    if (e.source === node.id) ce += e.weight;
    if (e.target === node.id) ca += e.weight;
  }
  ```
- [x] 10.2 确认 UI 显示的 instability 数值格式不变（仍为 `I = Ce / (Ce+Ca) = X.XX`）
- [x] 10.3 验证：运行 `pnpm build:ts` 确认编译通过

## 阶段 11: 前端单元测试

此阶段为前端新增的功能点编写单元测试。依赖阶段 5、6、7、8、9、10（功能实现完毕）。

- [x] 11.1 **新增** `packages/frontend/src/__tests__/from-change/buildGraphData.test.ts`：
  - F-9: 验证 `instability=0.2941` 从 GraphNode 正确转发到 G6NodeData
  - F-10: 验证 `instability=undefined` 转发为 `undefined`
  - B-12: 验证 `instability=0.0` 精确转发
  - B-13: 验证 `undefined` 转发为 `undefined`（重复验证）
  - B-14: 验证 `instability=1.0` 精确转发
  - B-extra: 验证混合节点（[0.5, undefined, 0.0, 1.0]）正确转发
- [x] 11.2 **新增** `packages/frontend/src/__tests__/from-change/DetailPanel.stability.test.ts`：
  - F-11: 验证 `edge.weight` 加权计算 Ce/Ca（A->B(w=3), A->C(w=7), D->A(w=10) -> Ce=10, Ca=10, I=0.5）
  - R-8: 孤立节点无边返回 null
  - R-9: node=null 返回 null
  - B-15 ~ B-18: 边界情况（全部 weight=1 / 仅有入边 / 仅有出边 / null 节点）
- [x] 11.3 **新增** `packages/frontend/src/__tests__/from-change/DependencyGraph.style.test.ts`：
  - F-13: 验证 `stabilityHeatmap=false` 时 node style 不包含 halo 属性
  - F-14: 验证 `stabilityHeatmap=true` + `instability=0.85` 时 node style 包含 halo
  - F-18: 验证热力图切换 ON -> OFF 时 halo 属性消失
  - F-19: 验证热力图开启前后 fill/stroke 颜色不变
  - R-10: 验证 `instability=undefined`（孤立节点）不渲染 halo
  - R-11: 验证 `instability=0.0` 时产生最小 halo（haloLineWidth=2）
  - R-15: 验证 file/directory/package 三种节点类型的 fill/stroke 不变
  - B-19 ~ B-26: 边界值 haloLineWidth 验证
- [x] 11.4 **新增** `packages/frontend/src/__tests__/from-change/GraphViewLayout.heatmap.test.tsx`：
  - F-15: 验证热力图切换按钮渲染在 action bar 中
  - F-16: 验证 ON/OFF 状态的视觉区分（aria-pressed 属性）
  - F-17: 验证点击切换调用 `onStabilityHeatmapChange` 并传入正确的布尔值
  - R-12: 验证扫描中按钮仍然可用
  - R-13: 验证 `onStabilityHeatmapChange` 为 undefined 时不崩溃
  - B-27: 验证稳定性热力图状态不受扫描状态变化影响
- [x] 11.5 **新增** `packages/frontend/src/__tests__/from-change/App.heatmap.test.tsx`：
  - F-12: 验证 `stabilityHeatmap` 默认值为 `false` 并正确传递到子组件
  - R-14: 验证路由切换（/graph -> /report -> /graph）保持热力图状态
  - 组件树连通性: 验证 `stabilityHeatmap` prop 从 App 经 GraphViewLayout 到 DependencyGraph 的正确传递
- [x] 11.6 **新增** `packages/frontend/src/__tests__/from-change/i18n.heatmap.test.ts`：
  - F-20: 验证英文翻译 `action.stabilityHeatmap === 'Heatmap'`
  - F-21: 验证中文翻译 `action.stabilityHeatmap === '稳定性热力图'`
- [x] 11.7 验证：运行 `pnpm test`（前端部分），确认所有测试通过

## 阶段 12: 集成与验证

此阶段进行全量构建、测试和手动验证所有验收标准。

- [x] 12.1 运行 `pnpm build` 全量构建，确认无编译错误
- [x] 12.2 运行 `pnpm lint`，确认无 lint 错误
- [x] 12.3 运行 `pnpm test`，确认所有测试（Rust + TypeScript）通过
- [x] 12.4 手动验证 AC-1（Rust 加权计算）：运行 Rust 单元测试 `test_f1_basic_weighted_instability` 等通过
- [x] 12.5 手动验证 AC-2（JSON 序列化）：Rust 测试 `test_f6_serialization_includes_instability` 通过
- [x] 12.6 手动验证 AC-3（前端接收数据）：前端测试 `buildGraphData.test.ts` 通过，或启动 dashboard 在 DevTools 中检查 G6 节点数据包含 `instability` 字段
- [x] 12.7 手动验证 AC-4（DetailPanel 加权一致）：选中一个节点，DetailPanel 显示的 I 值与 Rust 后端计算的 instability 一致（通过加权公式计算）
- [x] 12.8 手动验证 AC-5（默认关闭）：首次加载图谱，确认所有节点无 halo（热力图默认 OFF）
- [x] 12.9 手动验证 AC-6（开启热力图）：点击"稳定性热力图"按钮，确认不稳定节点出现暖色 halo，稳定节点无 halo
- [x] 12.10 手动验证 AC-7（关闭热力图）：再次点击按钮关闭热力图，确认所有节点 halo 消失，恢复原始外观
- [x] 12.11 手动验证 AC-8（节点类型颜色不变）：热力图开启前后，file/directory/package 节点的 fill/stroke 颜色不变
- [x] 12.12 手动验证 AC-9（i18n）：切换语言为中/英文，热力图按钮文字正确显示"稳定性热力图"/"Heatmap"
- [x] 12.13 手动验证 AC-10（孤立节点无 halo）：在数据中寻找孤立节点（或在 Demo 中选中无依赖节点），确认热力图开启时该节点无 halo
