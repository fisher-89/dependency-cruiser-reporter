## Context

当前布局算法（`layout.rs`）分三阶段：
1. **Phase 1** - 自底向上计算 combo 尺寸（网格布局）
2. **Phase 2** - 顶层 combo 力导向布局（防重叠）
3. **Phase 3** - 自顶向下在 combo 内用网格定位子元素

**问题根因**：Phase 2 的力导向布局 + 后处理防重叠仅应用于顶层 combo。Phase 3 的 `position_children_in_combo` 使用简单网格排列子 combo，但网格计算没有考虑 combo 的实际尺寸差异，当子 combo 尺寸差异大或数量多时，网格列宽/行高计算虽正确，但 combo 内子 combo 之间没有额外间隙保证，且子 combo 移动后 `offset_subtree` 只做平移不做重叠检测。

具体场景：`root → src → (components, utils, hooks)` 这样的三层嵌套，components 下还有子 combo 时，sibling combo 可能重叠。

## Goals / Non-Goals

**Goals:**
- 保证所有层级 sibling combo 不重叠
- 保持现有 Phase 1 自底向上 sizing 逻辑
- 保持确定性布局

**Non-Goals:**
- 重新设计整个布局算法
- 优化布局美观性（仅修复重叠 bug）
- 修改前端渲染代码

## Decisions

### Decision 1: 在 Phase 3 网格定位后添加 sibling 防重叠后处理

**选择**：在 `position_children_in_combo` 完成网格定位后，对同级子 combo 执行与 Phase 2 相同的防重叠后处理逻辑（矩形重叠检测 → 沿轴分离）。

**备选方案**：
- (A) 对每层 sibling combo 应用完整力导向布局 → 过度工程化，性能开销大，且嵌套层可能很深
- (B) 增大 GAP 值让网格自动避开 → 不保证不重叠，且浪费空间

**理由**：后处理方式简单、确定性、与顶层逻辑一致，O(n²) 但每层子 combo 数量有限。

### Decision 2: 提取公共防重叠函数供 Phase 2 和 Phase 3 复用

**选择**：将 `apply_force_layout` 中的后处理重叠分离逻辑提取为 `resolve_overlaps` 函数，Phase 2 和 Phase 3 共用。

**理由**：消除重复代码，保证行为一致。

## Risks / Trade-offs

- [嵌套层级深时 O(n²) 开关] → 每层 sibling 数量有限（通常 < 20），风险可忽略
- [增大 combo 尺寸可能导致父 combo 需要重新 sizing] → Phase 1 已完成 sizing，后处理只移动位置不改变尺寸，不需要重算
