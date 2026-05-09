## 1. 新增 resolve_element_overlaps 函数

- [x] 1.1 在 layout.rs 中新增 `resolve_element_overlaps(positions, elements, combo_rect)` 函数，处理 positions 数组中所有元素（节点 + combo）的重叠
- [x] 1.2 编写单元测试验证 resolve_element_overlaps 能分离完全重叠的两个节点

## 2. 修改初始位置为 circle layout

- [x] 2.1 在 `position_children_in_combo()` 中将 grid 初始化替换为 circle layout：元素沿圆周等距分布，半径根据 combo 尺寸和元素数量计算
- [x] 2.2 编写单元测试验证 circle 初始位置不产生重叠（相同大小元素场景）

## 3. 替换节点重叠解决逻辑

- [x] 3.1 在 `position_children_in_combo()` 中，force simulation 结束后调用 `resolve_element_overlaps()` 处理所有元素（节点 + combo），替代当前仅处理 combo 的 `resolve_overlaps()` 调用
- [x] 3.2 删除旧的 combo-only `resolve_overlaps()` 在 Phase 3 中的调用

## 4. re-clamp 后重叠处理

- [x] 4.1 在 re-clamp 步骤后添加重叠检查：如仍有重叠，扩展父组合 rect 尺寸以容纳所有子元素
- [x] 4.2 扩展 combo 尺寸后，偏移子树适配新位置
- [x] 4.3 编写单元测试验证 re-clamp 场景：子元素超出父组合边界时，combo 尺寸正确扩展

## 5. Phase 3 后更新 combo 尺寸

- [x] 5.1 在 `position_children_in_combo()` 完成子元素布局后，根据实际子元素位置重新计算 combo 尺寸（取 max(估算, 实际需要)）
- [x] 5.2 编写单元测试验证 combo 尺寸在子元素布局后正确反映实际需要

## 6. 集成验证

- [x] 6.1 运行 demo 项目生成布局数据，验证无节点重叠和组合重叠
- [x] 6.2 运行所有现有 layout 测试确保不回归
- [x] 6.3 新增回归测试：模拟 demo 项目的 combo 结构（7 个子 combo + 1 个直接节点），验证全部不重叠
