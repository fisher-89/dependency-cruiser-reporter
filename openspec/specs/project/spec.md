# 项目规范

## Purpose

dependency-cruiser-reporter 将 [dependency-cruiser](https://github.com/sverrejo/nmc-dependency-cruiser) 的 JSON 输出转换为交互式可视化，解决 dependency-cruiser 原生 HTML 报告能力有限的问题。

## Requirements

### Requirement: 核心功能

系统 SHALL 提供三个核心功能：

#### Scenario: 依赖图形可视化

- WHEN 用户上传或加载 dependency-cruiser JSON
- THEN 系统显示交互式依赖图形
- AND 使用混合聚合（展开 + 折叠目录）
- AND 支持 combo 容器显示目录层级

#### Scenario: 违规报告

- WHEN 图形包含违规记录
- THEN 系统按严重级别（error/warn/info）分组显示
- AND 显示违规规则名称、路径和消息

#### Scenario: 指标仪表板

- WHEN 用户切换到 Metrics 视图
- THEN 系统显示原始节点数、聚合节点数、依赖数、违规数
- AND 显示边类型分布（local/npm/core/dynamic）

### Requirement: 边类型分类

系统 SHALL 支持四种边类型：

| 类型 | 描述 | UI 颜色 |
|------|------|---------|
| `local` | 项目内部依赖 | 蓝色 |
| `npm` | 外部 npm 包 | 绿色 |
| `core` | Node.js 内置模块 | 灰色 |
| `dynamic` | 动态导入 (`import()`) | 橙色 |

#### Scenario: 边类型检测

- WHEN 处理依赖关系
- THEN 系统按以下优先级分类：
  - `dependencyTypes` 包含 `"npm"` 或 `"node_modules"` → `npm`
  - `dependencyTypes` 包含 `"core"` → `core`
  - `dependencyTypes` 包含 `"dynamic"` → `dynamic`
  - 否则 → `local`

### Requirement: CLI 命令

系统 SHALL 提供两个 CLI 命令：

#### Scenario: analyze 命令

- WHEN 用户执行 `dep-report analyze --path <dir>`
- THEN 系统运行 dependency-cruiser 分析
- AND 保存原始 JSON 输出（不执行聚合）
- AND 自动检测 `.dependency-cruiser.json` 配置

#### Scenario: open 命令

- WHEN 用户执行 `dep-report open -f <file>`
- THEN 系统启动 HTTP 服务器
- AND 自动检测文件格式（原始 dc 或 ProcessedGraph）
- AND 按需执行聚合（WASM 优先，Node.js 回退）

### Requirement: 目标用户支持

系统 SHALL 支持三类用户：

| 角色 | 使用场景 |
|------|----------|
| 开发者 | 开发期间分析项目依赖 |
| 技术主管 | 代码审查期间监控架构合规性 |
| DevOps | 集成到 CI/CD 管道 |

### Requirement: 非目标约束

系统 SHALL NOT 提供：

- 实时依赖监控
- IDE 集成（P0 范围外）
- 自定义规则定义（使用 dependency-cruiser 直接）

### Requirement: 功能路线图

系统 SHALL 按优先级实现功能：

#### P0 - 必须有（已完成）

- [x] Rust 预处理
- [x] 混合聚合
- [x] Combo 生成
- [x] 图形显示
- [x] 违规报告
- [x] 基础指标

#### P1 - 应该有

- [ ] 钻取/汇总
- [ ] 过滤器
- [ ] 搜索
- [ ] 多扫描比较
- [ ] 导出 JSON/CSV

#### P2 - 最好有

- [ ] 深色主题
- [ ] 移动端响应式
- [ ] 源码浏览器
- [ ] Pre-commit 钩子

## References

- OpenSpec 索引：`openspec/README.md`
- CLI 入口：`packages/cli/src/bin/cli.ts`
- 前端入口：`packages/frontend/src/App.tsx`
