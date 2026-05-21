## MODIFIED Requirements

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
