# 前端规范

## Purpose

定义 React 前端的组件架构、视图行为、数据加载机制和 AntV G6 布局集成。

## Requirements

### Requirement: 技术栈

前端 SHALL 使用以下技术：

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| AntV G6 | 5 | 图形可视化（combo tree + force layout） |
| Vite | 5 | 构建工具 |
| TypeScript | 5 | 类型安全 |
| Biome | latest | 代码检查和格式化 |

### Requirement: 组件架构

系统 SHALL 实现以下组件层级：

```
App (root, state: data, viewMode, loading, error)
├── UploadArea (drag-and-drop + file input)
├── Navigation (Graph / Report / Metrics tabs)
│   ├── DependencyGraph (G6 comboCombined layout)
│   ├── ReportView (violations by severity)
│   └── MetricsView (summary stats)
```

#### Scenario: App 根组件

- WHEN App 挂载
- THEN 调用 `GET /api/config` 检查服务器数据
- IF `hasGraphFile: true` THEN 调用 `POST /api/graph` 加载数据
- IF `hasGraphFile: false` THEN 显示上传区域

#### Scenario: 视图切换

- WHEN 用户点击导航标签
- THEN 切换 `viewMode` 状态（`'graph'` | `'report'` | `'metrics'`）
- AND 条件渲染对应视图组件

### Requirement: 数据加载

系统 SHALL 支持两种数据加载路径：

#### Scenario: 服务器模式

- WHEN App 挂载且服务器有图文件
- THEN 调用 `GET /api/config` → `{ hasGraphFile: true }`
- AND 调用 `POST /api/graph` 可选 body `{ expandedDirs: [...] }`
- AND 服务器返回 `ProcessedGraph`

#### Scenario: 文件上传模式

- WHEN 用户拖放或选择 JSON 文件
- THEN 读取文件文本
- AND `JSON.parse` 解析
- AND 设置 `data` 状态

### Requirement: 状态管理

系统 SHALL 使用 React `useState` 管理状态（无外部状态管理库）：

| 状态 | 类型 | 所有者 |
|------|------|--------|
| `data` | `ProcessedGraph \| null` | App |
| `viewMode` | `'graph' \| 'report' \| 'metrics'` | App |
| `loading` | `boolean` | App |
| `error` | `string \| null` | App |

#### Scenario: 状态转换

```
Idle → Loading (文件选择/服务器加载)
Loading → Loaded (解析成功)
Loading → Error (解析失败)
Loaded → GraphView/ReportView/MetricsView (视图切换)
Error → Loading (重试上传)
```

### Requirement: Graph 视图

系统 SHALL 使用 AntV G6 渲染依赖图形：

#### Scenario: G6 comboCombined 布局

- WHEN 渲染图形
- THEN 使用 `comboCombined` 布局算法
- AND 使用预计算 `combos` 数组显示目录层级
- AND 节点通过 `combo` 字段引用父容器
- AND 边宽度基于 `weight` 字段

#### Scenario: 数据映射

| G6 元素 | 数据源 |
|---------|--------|
| nodes | `data.nodes` |
| edges | `data.edges` |
| combos | `data.combos` |
| info bar | `data.meta` |

#### Scenario: 循环依赖高亮

- WHEN 边 `circular` 字段为 true
- THEN 边高亮显示（红色）

### Requirement: Report 视图

系统 SHALL 按严重级别分组显示违规：

#### Scenario: 汇总卡片

- WHEN 显示 Report 视图
- THEN 显示三个汇总卡片：
  - Errors: `violations.filter(v => v.severity === 'error').length`
  - Warnings: `violations.filter(v => v.severity === 'warn').length`
  - Info: `violations.filter(v => v.severity === 'info').length`

#### Scenario: 违规项显示

- WHEN 显示违规项
- THEN 显示规则名称 + 严重徽章
- AND 显示 `from → to` 路径
- AND 显示消息（若有）

#### Scenario: 严重颜色

| 严重级别 | 边框颜色 |
|----------|----------|
| `error` | `#ef4444` (红) |
| `warn` | `#f59e0b` (琥珀) |
| `info` | `#3b82f6` (蓝) |

### Requirement: Metrics 视图

系统 SHALL 显示汇总统计仪表板：

#### Scenario: 关键指标

| 指标 | 数据源 |
|------|--------|
| 原始节点数 | `meta.original_node_count` |
| 聚合节点数 | `meta.aggregated_node_count` |
| 依赖数 | `edges.length` |
| 违规数 | `meta.total_violations` |

#### Scenario: 边类型分布

| 类型 | 计算 |
|------|------|
| `local` | `edges.filter(e => e.edge_type === 'local').length` |
| `npm` | `edges.filter(e => e.edge_type === 'npm').length` |
| `core` | `edges.filter(e => e.edge_type === 'core').length` |
| `dynamic` | `edges.filter(e => e.edge_type === 'dynamic').length` |

### Requirement: 样式规范

系统 SHALL 使用内联样式（定义在 `App.tsx` 的 `styles` 对象）：

| Token | Hex | 用途 |
|-------|-----|------|
| Primary | `#4a90d9` | 节点、链接 |
| Error | `#ef4444` | 错误 |
| Warning | `#f59e0b` | 警告 |
| Info | `#3b82f6` | 信息 |
| Background | `#f8fafc` | 页面背景 |

### Requirement: 项目结构

前端 SHALL 按以下结构组织：

```
packages/frontend/
├── src/
│   ├── App.tsx           # 主应用（所有视图内联）
│   ├── main.tsx          # React 入口
│   ├── types.ts          # TypeScript 类型定义
│   └── components/
│       ├── DependencyGraph.tsx  # G6 图形组件
│       └── buildGraphData.ts    # G6 数据转换
├── index.html            # HTML 模板
├── vite.config.ts        # Vite 配置
└── package.json
```

### Requirement: 命令

前端 SHALL 支持以下命令：

```bash
pnpm dev           # 启动开发服务器 (http://localhost:5173)
pnpm build         # 生产构建
pnpm lint          # Biome 代码检查
```

## References

- 前端源码：`packages/frontend/src/`
- 类型定义：`packages/frontend/src/types.ts`
