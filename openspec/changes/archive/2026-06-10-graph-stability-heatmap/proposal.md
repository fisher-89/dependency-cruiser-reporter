## 问题

当前依赖图谱的节点视觉编码仅反映节点类型（file/directory/package），通过 fill 和 stroke 颜色区分。用户无法直观感知每个模块的架构稳定性——即模块对其依赖项的脆弱程度。

虽然 DetailPanel 已在客户端计算并显示 instability 指标（I = Ce / (Ce + Ca)），但该信息仅在选择单个节点后才可见，无法在全局图谱上一眼识别出哪些模块是高风险的"不稳定"模块。

具体痛点：
1. **缺乏全局热力视图**：用户无法在不逐个点击节点的情况下，快速识别架构中最不稳定的模块
2. **计算位置分散**：现有 DetailPanel 在 TypeScript 侧重复计算 instability，而 Rust 后端已有完整的边拓扑数据，更适合在聚合阶段完成计算
3. **视觉编码不足**：节点大小、颜色仅编码类型信息，未能利用视觉通道传达架构质量指标

## 提案

在 Rust 聚合管线中新增 `instability` 指标计算，作为 `GraphNode` 的可选字段。在前端新增"稳定性热力图"切换按钮，开启后节点基于 instability 值渲染散射阴影（shadow glow）效果，保留原有节点类型颜色。

### 稳定性计算

在 Rust `aggregate()` 函数中，于 `aggregate_edges()` 之后新增 `compute_instability()` 步骤：

```
instability = ΣW_out / (ΣW_out + ΣW_in)
```

- ΣW_out = 以该节点为 source 的所有边的 weight 之和（weight 即被聚合的原始依赖数量）
- ΣW_in = 以该节点为 target 的所有边的 weight 之和
- 若 ΣW_out + ΣW_in == 0，则 instability 为 None（孤立节点，无阴影）

使用 `weight` 加权而非简单计数聚合边，因为聚合后的边数会掩盖真实的依赖强度。例如，一个模块聚合后只有 3 条出边，但其中一条 weight=100（背后 100 个文件都依赖同一目标），未加权会严重低估其不稳定性。

前端 DetailPanel 中的 instability 计算也同步改为加权，与 Rust 后端保持一致。

### 阴影映射

| Instability 范围 | 阴影表现 |
|------------------|----------|
| I = 0.0（稳定） | shadowBlur = 0，无阴影 |
| 0 < I < 0.5 | shadowBlur 线性映射 4-8px，颜色从透明渐变至橙色 |
| 0.5 <= I < 1.0 | shadowBlur 线性映射 8-14px，颜色从橙色渐变至红色 |
| I = 1.0（极不稳定） | shadowBlur = 16px，shadowColor = 暖红色（如 #f5222d 50% 透明度） |

阴影始终居中（shadowOffsetX = 0, shadowOffsetY = 0），不改变节点位置。

### 架构变更

```
Rust aggregate() 管线:
  extract_edges → build_hybrid_nodes → compute_layout → aggregate_edges → compute_instability（新增）→ 返回

前端组件树:
  GraphViewLayout
    → action bar: Scan | [稳定性热力图切换按钮] | Refresh
    → DependencyGraph（接收 stabilityHeatmap prop）
      → node.style: 当 stabilityHeatmap=true 时，叠加 shadowBlur/shadowColor
```

## 能力

### 新增能力

- `instability-metric`：Rust 后端新增 instability 指标计算，在聚合管线中使用 edge.weight 加权计算 ΣW_out/(ΣW_out+ΣW_in)，将结果存储到 GraphNode 的 instability 可选字段，通过 JSON 序列化传递到前端
- `stability-heatmap`：前端稳定性热力图可视化，包括 GraphViewLayout 中的切换按钮、DependencyGraph 的阴影渲染逻辑、i18n 支持

## 变更范围

### 范围内

| 模块 | 变更内容 |
|------|----------|
| `packages/rust/src/types.rs` | GraphNode 新增 `instability: Option<f32>` 字段 |
| `packages/rust/src/aggregate/` | 新增 `instability.rs` 模块，包含 `compute_instability()` 函数，使用 edge.weight 加权计算 ΣW_out/(ΣW_out+ΣW_in) |
| `packages/rust/src/aggregate/mod.rs` | 导出 `compute_instability` |
| `packages/rust/src/lib.rs` | aggregate() 函数中，在 aggregate_edges 之后调用 compute_instability |
| `packages/frontend/src/types.ts` | 从 WASM 类型自动获取 instability 字段（自动生成，无手动修改） |
| `packages/frontend/src/components/DetailPanel.tsx` | stability 计算改为使用 edge.weight 加权，与 Rust 后端公式一致 |
| `packages/frontend/src/components/DependencyGraph/DependencyGraph.tsx` | 新增 `stabilityHeatmap` prop，在 node.style 回调中根据 instability 应用 shadow |
| `packages/frontend/src/components/DependencyGraph/buildGraphData.ts` | G6NodeData 新增 instability 传递 |
| `packages/frontend/src/components/GraphViewLayout.tsx` | action bar 新增稳定性热力图切换按钮 |
| `packages/frontend/src/App.tsx` | 新增 `stabilityHeatmap` 状态并传递给 GraphViewLayout 和 DependencyGraph |
| `packages/frontend/src/i18n/en.ts` | 新增 action.stabilityHeatmap 键 |
| `packages/frontend/src/i18n/zh-CN.ts` | 新增 action.stabilityHeatmap 键 |

### 范围外

- 不新增热力图图例（legend）
- 不改动节点 fill/stroke 颜色——仅通过阴影叠加
- 不涉及 CLI 或 E2E 测试变更
- 不涉及 Rust 布局算法变更
- 不涉及边（edge）的视觉变更

## 验收标准

| # | 标准 | 验证方法 |
|---|------|----------|
| 1 | Rust compute_instability 使用 edge.weight 加权计算 ΣW_out/(ΣW_out+ΣW_in)，孤立节点返回 None | 单元测试：构造已知边拓扑和权重的节点集，断言加权计算结果 |
| 2 | GraphNode JSON 序列化包含 instability 字段（非 None 时） | Rust 单元测试：序列化 ProcessedGraph，断言 instability 存在且值正确 |
| 3 | 前端接收到 instability 数据并传递到 G6NodeData | 日志或测试：buildGraphData 输出的节点包含 instability |
| 4 | DetailPanel stability 计算使用 edge.weight 加权，与 Rust 公式一致 | 手动验证：选中同一节点，DetailPanel 显示的 I 值与 Rust 后端 instability 字段一致 |
| 5 | 热力图默认关闭，图谱节点无阴影 | 视觉检查：首次加载图谱，节点无散射阴影 |
| 6 | 点击热力图切换按钮，节点显示阴影 | 交互测试：点击按钮打开热力图，不稳定节点出现暖色阴影，稳定节点无阴影 |
| 7 | 热力图关闭后阴影消失，节点恢复原始外观 | 交互测试：再次点击按钮关闭热力图，所有节点阴影消失 |
| 8 | 节点类型颜色在热力图开启前后保持一致 | 视觉检查：file/directory/package 的 fill/stroke 不因热力图而改变 |
| 9 | 切换按钮显示正确的 i18n 文本 | 视觉检查：中文环境下显示"稳定性热力图"，英文显示 "Stability Heatmap" |
| 10 | 孤立节点（无入边无出边）不渲染阴影 | 视觉检查：或 E2E 截图对比 |

## 风险

| 风险 | 影响 | 可能性 | 缓解措施 |
|------|------|--------|----------|
| G6 shadow 渲染性能下降（大量节点同时渲染阴影） | 图谱交互卡顿 | 中 | shadowBlur 上限为 16px；仅在显式开启热力图时渲染阴影，不影响默认性能 |
| Rust instability 计算与 DetailPanel 前端计算不一致 | 指标数值冲突 | 低 | 两者使用相同的加权公式 ΣW_out/(ΣW_out+ΣW_in)；DetailPanel 可从节点 instability 字段读取 Rust 计算值作为单一事实来源 |
| 阴影被 combo 容器裁剪 | 部分效果不可见 | 低 | 在 styles 中确认 combo 容器 overflow: visible；G6 的 halo/shadow 通常不受 combo 裁剪影响 |
| instability 为 None 的节点在 TS 侧类型处理不当 | 渲染异常 | 低 | buildGraphData 对 instability === null/undefined 的节点不做阴影处理 |
