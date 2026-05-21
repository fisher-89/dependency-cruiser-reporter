## Context

当前 `compute_layout()` 使用三阶段算法：

```
Phase 1: 自底向上 sizing → compute_combo_size (grid layout 估算大小)
Phase 2: 顶层 combo 力布局 → apply_force_layout + resolve_overlaps
Phase 3: combo 内子元素定位 → position_children_in_combo (force simulation)
```

**已知缺陷**：
- Phase 3 的 force simulation 对节点和 combo 混合布局，但 `resolve_overlaps()` 仅处理 combo
- Phase 3 的 re-clamp 可能将已分离的组合推回重叠位置
- Phase 1 基于 grid layout 估算 combo 大小，Phase 3 实际用 force simulation 布局，大小可能不一致

## Goals / Non-Goals

**Goals:**
- 保证所有层级兄弟节点之间不重叠
- 保证所有层级兄弟组合之间不重叠
- re-clamp 后重叠不回退
- 相同输入产生相同输出（确定性）

**Non-Goals:**
- 不改变 WASM API 签名
- 不改变输出数据格式
- 不引入外部布局库
- 不追求全局最优布局（力导向是启发式算法）

## Decisions

### Decision 1: 用 circle layout 替代 grid 作为初始位置

**选择**：在 `position_children_in_combo()` 中使用 circle layout 初始化位置

**理由**：circle layout 保证初始时所有元素等距分布，减少 force simulation 收敛到重叠解的概率。grid layout 在列数/行数计算时容易使元素初始就重叠（特别是大小不一致的 combo + node 混合场景）。

**替代方案**：
- 保持 grid：初始位置重叠概率高，force simulation 需要更多迭代才能分离
- 随机初始化：不确定性，不同运行可能产生不同布局

### Decision 2: 扩展 resolve_overlaps 以支持节点

**选择**：在 `position_children_in_combo()` 中，force simulation 结束后对所有元素（节点 + combo）执行 overlap resolution

**理由**：当前只对 combo 执行 `resolve_overlaps()`，导致节点可能重叠。节点和 combo 都是矩形，可以用相同的重叠解决逻辑。

**实现**：将 `resolve_overlaps()` 泛化为接受通用矩形列表，或者在 `position_children_in_combo()` 中新增节点重叠解决步骤。考虑到节点位置直接存储在 `positions[]` 数组中（不在 combos 里），最简单的方案是新增 `resolve_element_overlaps()` 函数处理 positions 数组中的所有元素。

### Decision 3: re-clamp 后迭代重叠检测

**选择**：re-clamp 后重新检查重叠，如仍有重叠则扩展父组合大小

**理由**：当前 re-clamp 可能破坏 `resolve_overlaps()` 的结果。两种策略：
- A) 扩展父组合大小（接受溢出）
- B) 迭代 resolve → clamp → check 循环直到收敛

选择 A + 迭代检查：先尝试扩展父组合容纳所有子元素（Phase 1 的估算可能偏小），扩展后重新 clamp 就不会把子元素推回重叠。如果扩展后父组合超出外层组合，由外层处理。

**关键变更**：在 `position_children_in_combo()` 完成子元素布局后，根据实际布局结果更新 combo 的 rect 尺寸。

### Decision 4: 调整算法顺序 — 先子布局再定父尺寸

**选择**：修改 Phase 1 和 Phase 3 的交互方式

**当前流程**：
```
Phase 1: compute_combo_size (grid 估算) → 确定 combo 大小
Phase 3: position_children_in_combo → 在固定 combo 大小内布局
```

**新流程**：
```
Phase 1: compute_combo_size (grid 估算) → 初始 combo 大小（仅用于 Phase 2 顶层布局）
Phase 3: position_children_in_combo → 子元素布局
         → 根据实际子元素位置扩展 combo 大小（如果超出估算）
         → 偏移子树适配新位置
```

**理由**：Phase 1 的 grid 估算是下界，force simulation 后实际需要的空间可能更大。布局完成后根据实际需要更新 combo 尺寸，保证 containment 和 no-overlap 都满足。

## Risks / Trade-offs

- **[父组合扩展导致顶层布局失效]** → Phase 3 可能扩展 combo 大小，使 Phase 2 的顶层布局产生新的重叠。Mitigation：在所有 Phase 3 完成后，对顶层组合重新执行一次 `resolve_overlaps()`。
- **[迭代收敛问题]** → re-clamp + overlap resolution 循环可能不收敛。Mitigation：设置最大迭代次数，超时后强制扩展 combo 尺寸。
- **[性能影响]** → 更多重叠检测迭代。Mitigation：combo 数量通常 < 50，O(n²) 检测代价可接受。
