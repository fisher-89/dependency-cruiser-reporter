## ADDED Requirements

### Requirement: Scan 按钮

系统 SHALL 在 Graph/Report/Metrics 视图的 action bar 中提供 "Scan" 按钮，点击后调用 `POST /api/analyze` 扫描当前工作目录。

#### Scenario: Scan 按钮渲染

- **WHEN** 用户在 Graph、Report 或 Metrics 视图
- **THEN** action bar 显示 "Scan" 按钮，位于 Refresh 按钮右侧
- **AND** 按钮使用与 Refresh 按钮一致的样式（`actionBtn`）

#### Scenario: Scan 按钮点击

- **WHEN** 用户点击 "Scan" 按钮
- **THEN** 按钮进入 loading 状态（disabled + 旋转图标）
- **AND** 前端发送 `POST /api/analyze`（无 body）
- **AND** 服务器在当前 cwd 执行扫描

#### Scenario: Scan 成功

- **WHEN** `POST /api/analyze` 返回 200
- **THEN** 按钮恢复正常状态
- **AND** 不自动刷新图形数据

#### Scenario: Scan 失败

- **WHEN** `POST /api/analyze` 返回非 200
- **THEN** 按钮恢复正常状态
- **AND** 显示错误信息（来自响应 body 的 `error` 字段）

### Requirement: Generate Rules 按钮

系统 SHALL 在 Architecture 视图的 action bar 中提供 "Generate Rules" 按钮，点击后调用 `POST /api/archi-to-rules` 从 C4 模型生成 dependency-cruiser 规则。

#### Scenario: Generate Rules 按钮渲染

- **WHEN** 用户在 Architecture 视图且 `state.status === 'ready'`
- **THEN** action bar 显示 "Generate Rules" 按钮，位于 Refresh 按钮右侧
- **AND** 按钮样式与 Refresh 按钮一致

#### Scenario: Generate Rules 按钮隐藏（empty 状态）

- **WHEN** Architecture 视图处于 empty 状态（无 .c4 文件）
- **THEN** 不显示 "Generate Rules" 按钮

#### Scenario: Generate Rules 按钮隐藏（loading/error 状态）

- **WHEN** Architecture 视图处于 loading 或 error 状态
- **THEN** 不显示 "Generate Rules" 按钮

#### Scenario: Generate Rules 按钮点击

- **WHEN** 用户点击 "Generate Rules" 按钮
- **THEN** 按钮进入 loading 状态（disabled + 旋转图标）
- **AND** 前端发送 `POST /api/archi-to-rules`（无 body）

#### Scenario: Generate Rules 成功

- **WHEN** `POST /api/archi-to-rules` 返回 200
- **THEN** 按钮恢复正常状态
- **AND** 不自动刷新 Architecture 视图

#### Scenario: Generate Rules 失败

- **WHEN** `POST /api/archi-to-rules` 返回非 200
- **THEN** 按钮恢复正常状态
- **AND** 显示错误信息（来自响应 body）

### Requirement: 按钮国际化

系统 SHALL 支持按钮文本的中英文翻译。

| Key | English | 中文 |
|-----|---------|------|
| `nav.scan` | Scan | 扫描 |
| `nav.generateRules` | Generate Rules | 生成规则 |

#### Scenario: 英文显示

- **WHEN** 当前语言为 `en`
- **THEN** Scan 按钮文本为 "Scan"
- **AND** Generate Rules 按钮文本为 "Generate Rules"

#### Scenario: 中文显示

- **WHEN** 当前语言为 `zh-CN`
- **THEN** Scan 按钮文本为 "扫描"
- **AND** Generate Rules 按钮文本为 "生成规则"

### Requirement: GraphViewLayout 接口扩展

`GraphViewLayout` 组件 SHALL 新增 `onScan` 和 `scanning` props 以支持 Scan 按钮。

#### Scenario: onScan 未提供时隐藏按钮

- **WHEN** `onScan` prop 为 `undefined`
- **THEN** 不显示 Scan 按钮（保持向后兼容）

#### Scenario: onScan 提供时显示按钮

- **WHEN** `onScan` prop 已提供
- **THEN** 显示 Scan 按钮
- **AND** `scanning` 为 true 时按钮 disabled 且图标旋转
