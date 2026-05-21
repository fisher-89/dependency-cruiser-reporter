## Why

布局算法存在两个独立缺陷导致节点和组合重叠：
1. **节点重叠**：force simulation 后节点可能落在相同位置，且 `resolve_overlaps()` 只处理 combo 不处理 node
2. **组合重叠**：re-clamp 步骤将已分离的组合推回边界时可能重新引入重叠

实际数据验证：demo 项目产生 1 个组合重叠（services/store）和 1 个节点重叠（userService/reportService 完全重合）。

## What Changes

- 修改 `position_children_in_combo()` 添加节点重叠检测和解决
- 使用 circle layout 作为初始位置替代 grid layout（更均匀的初始分布）
- re-clamp 后迭代检查重叠，必要时扩展父组合大小
- 调整算法顺序：先完成子元素布局再确定父组合最终尺寸

## Capabilities

### New Capabilities

- `layout-no-overlap`: 布局算法保证所有层级的兄弟节点和兄弟组合均不重叠

### Modified Capabilities

- `backend`: 修改力导向布局算法的初始位置策略和重叠解决逻辑

## Impact

- **核心文件**：`packages/rust/src/layout.rs`
- **测试文件**：`packages/rust/src/layout_test.rs`
- **API 影响**：无（内部算法变更，输出格式不变）
- **性能影响**：可能略微增加（迭代重叠检测），但布局质量显著提升
