## MODIFIED Requirements

### Requirement: 力导向布局

系统 SHALL 实现三阶段力导向布局算法：

#### Phase 1: 自底向上 sizing

- 按深度排序 combo（最深优先）
- 计算每个 combo 包围所有子节点的最小尺寸
- 使用网格布局确定最小包围盒

#### Phase 2: 顶层 combo 力布局

- 初始化位置为圆形
- 应用排斥力（逆平方定律）防止重叠
- 应用中心吸引力保持紧凑
- 温度退火收敛

**力参数：**

| 参数 | 值 |
|------|-----|
| `REPULSION_STRENGTH` | 5000.0 |
| `ATTRACTION_STRENGTH` | 0.001 |
| `ITERATIONS` | 500 |
| `COOLING_FACTOR` | 0.98 |

#### Phase 3: combo 内网格定位

- 自顶向下处理 combo
- 子节点排列为网格：`cols = ceil(sqrt(n))`
- 偏移子 combo 子树保持相对位置
- **网格定位后对同级子 combo 执行防重叠后处理**：检测矩形重叠并沿最小移动方向分离

**布局常量：**

| 参数 | 值 |
|------|-----|
| `NODE_SIZE` | 20.0 |
| `COMBO_PADDING` | 20.0 |
| `GAP` | 30.0 |

#### Scenario: 布局保证

- THEN 无兄弟 combo 重叠（所有层级，不仅是顶层）
- AND 每个 combo 完全包含其子节点
- AND 相同输入产生相同输出（确定性）

#### Scenario: 多级嵌套 sibling 不重叠

- **WHEN** 存在三层或更多层级的 combo 嵌套（如 root → src → (components, utils)）
- **THEN** 每一层级的 sibling combo 不重叠

#### Scenario: 深层嵌套 sibling 不重叠

- **WHEN** 存在深层嵌套 combo（如 root → src → components → (ui, layout)）
- **THEN** 最深层 sibling combo（ui, layout）不重叠

## ADDED Requirements

### Requirement: 防重叠函数复用

系统 SHALL 提供公共 `resolve_overlaps` 函数，供 Phase 2 顶层 combo 后处理和 Phase 3 combo 内定位后处理复用。

#### Scenario: Phase 2 使用 resolve_overlaps

- **WHEN** 顶层 combo 力导向布局完成
- **THEN** 调用 `resolve_overlaps` 消除残留重叠

#### Scenario: Phase 3 使用 resolve_overlaps

- **WHEN** 每个 combo 内子元素网格定位完成
- **THEN** 对该 combo 的子 combo 调用 `resolve_overlaps` 消除重叠
