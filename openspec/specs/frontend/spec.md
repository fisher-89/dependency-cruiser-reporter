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
main.tsx
└── <ThemeProvider>
    └── <I18nProvider>
        └── App (root, state: data, viewMode, loading, error, selectedNodeId)
            ├── Header
            │   ├── Title
            │   ├── LanguageSwitcher (EN | 中文 buttons)
            │   ├── ThemeToggle (sun/moon/monitor cycle button)
            │   └── Navigation (Architecture / Graph / Report / Metrics tabs)
            ├── DirectoryPicker (when no .dc-reporter found)
            ├── UploadArea (drag-and-drop + file input, fallback)
            ├── ArchitectureView (lazy-loaded, ReactLikeC4 + LikeC4ModelProvider)
            ├── GraphView (flex container: canvas + detail panel)
            │   ├── DependencyGraph (G6 comboCombined layout)
            │   └── DetailPanel (node metadata, stability, deps, violations)
            ├── ReportView (violations by severity)
            └── MetricsView (summary stats)
```

#### Scenario: App 根组件

- WHEN App 挂载
- AND 检查是否已加载图文件
- AND 所有文本通过 `useT()` hook 获取翻译

#### Scenario: 视图切换

- WHEN 用户点击导航标签
- THEN 切换 `viewMode` 状态（`'architecture'` | `'graph'` | `'report'` | `'metrics'`）
- AND 条件渲染对应视图组件
- AND Architecture 视图使用 `React.lazy` 动态加载

#### Scenario: GraphViewLayout 扩展 props

- **WHEN** `GraphViewLayout` 渲染且 `onScan` prop 已提供
- **THEN** action bar 中 Refresh 按钮右侧显示 "Scan" 按钮
- **AND** `scanning` 为 true 时按钮 disabled 且图标旋转
- **AND** `onScan` 为 undefined 时不显示按钮（向后兼容）

#### Scenario: ArchitectureView action bar 扩展

- **WHEN** `ArchitectureView` 渲染且 `state.status === 'ready'`
- **THEN** action bar 中 Refresh 按钮右侧显示 "Generate Rules" 按钮
- **AND** 点击后调用 `POST /api/archi-to-rules`
- **AND** 按钮在 loading/error/empty 状态下不显示

#### Scenario: App handleScan

- **WHEN** `App` 渲染 Graph/Report/Metrics 视图
- **THEN** `handleScan` 回调传递给 `GraphViewLayout` 的 `onScan` prop
- **AND** `scanning` 状态传递给 `GraphViewLayout` 的 `scanning` prop
- **AND** `handleScan` 发送 `POST /api/analyze` 并在完成/失败后更新 `scanning` 状态

### Requirement: 状态管理

系统 SHALL 使用 React `useState` 管理状态（无外部状态管理库）：

| 状态 | 类型 | 所有者 |
|------|------|--------|
| `data` | `ProcessedGraph \| null` | App |
| `viewMode` | `'architecture' \| 'graph' \| 'report' \| 'metrics'` | App |
| `loading` | `boolean` | App |
| `error` | `string \| null` | App |
| `selectedNodeId` | `string \| null` | App |

主题和语言状态 SHALL 由各自 Provider 管理（非 App 本地状态）。

#### Scenario: 状态转换

```
Idle → Loading
Loading → WorkspaceReady (加载成功)
Loading → NoWorkspace (无图文件)
WorkspaceReady → ArchitectureView/GraphView/ReportView/MetricsView (视图切换)
NoWorkspace → DirectoryPicker (选择项目目录)
Error → Loading (重试)
```

### Requirement: 数据加载

系统 SHALL 支持三种数据加载路径：

#### Scenario: 服务器模式（依赖图）

- WHEN App 挂载且服务器有图文件
- THEN 调用 `POST /api/graph` 可选 body `{ expandedDirs: [...] }`
- AND 服务器返回 `ProcessedGraph`

#### Scenario: 服务器模式（架构图）

- WHEN 用户切换到 Architecture 视图且 `hasArchitectureDir` 为 true
- THEN ArchitectureView 调用 `GET /api/architecture/model`
- AND 接收服务端解析合并后的 `$ModelData` JSON
- AND 客户端通过 `LikeC4Model.create($data)` 构造运行时模型
- AND 计算布局后渲染 `ReactLikeC4`

#### Scenario: 文件上传模式

- WHEN 用户拖放或选择 JSON 文件
- THEN 读取文件文本
- AND `JSON.parse` 解析
- AND 设置 `data` 状态

#### Scenario: 无工作区

- WHEN 无图文件加载
- THEN 显示目录选择器界面
- AND 用户可选择项目目录或上传 JSON 文件

### Requirement: Architecture 视图路由

系统 SHALL 在导航栏中添加 Architecture 视图标签，位于现有三个标签之前。

#### Scenario: Architecture nav tab rendering

- **WHEN** Header 渲染
- **THEN** 导航栏显示 "Architecture" 标签作为第一个标签
- **AND** 标签使用 `t('nav.architecture')` 获取本地化文本
- **AND** 样式与现有标签一致

#### Scenario: Architecture view lazy loading

- **WHEN** 用户点击 Architecture 标签
- **THEN** 系统通过 `React.lazy(() => import('./components/ArchitectureView'))` 动态加载组件
- **AND** 加载期间显示 Suspense fallback
- **AND** 加载完成后渲染 ArchitectureView

### Requirement: 目录选择器

当未检测到 `.dc-reporter/` 工作区时，系统 SHALL 显示目录选择器界面。

#### Scenario: 目录选择器显示

- **WHEN** `hasArchitectureDir` 为 false 且 `hasGraphFile` 为 false
- **THEN** 显示目录选择器，提示用户选择项目目录
- **AND** 同时保留文件上传区域作为备选

#### Scenario: 选择目录后

- **WHEN** 用户在目录选择器中选择或输入项目路径
- **THEN** 系统重新检查新路径
- **AND** 若找到 `.dc-reporter/` 则显示对应视图

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

### Requirement: Graph view split layout

系统 SHALL 在 graph 视图使用 flex 分割布局：左侧为 G6 画布（flex: 1），右侧为 DetailPanel（固定宽度 320px）。

#### Scenario: 分割布局渲染

- **WHEN** graph 视图处于活动状态
- **THEN** G6 画布和 DetailPanel 并排渲染
- **AND** 面板宽度固定为 320px
- **AND** 画布填充剩余空间

#### Scenario: 面板出现时 G6 调整大小

- **WHEN** 面板从占位符过渡到内容（首次选择节点时高度可能变化）
- **THEN** G6 画布调用 `graph.resize()` 以适应其容器

### Requirement: Node click-to-select behavior

系统 SHALL 通过 300ms 定时器区分单击和双击。如果 `node:click` 在 300ms 内未被 `node:dblclick` 跟随，则节点变为选中状态。双击 SHALL 仅触发展开/折叠行为，不改变选中状态。

#### Scenario: 单击选择节点

- **WHEN** 用户单击 graph 节点且 300ms 内未发生双击
- **THEN** 该节点变为选中状态
- **AND** `onNodeSelect(nodeId)` 回调被调用
- **AND** DetailPanel 显示该节点信息

#### Scenario: 双击不触发选中

- **WHEN** 用户双击 graph 节点（两次点击间隔 < 300ms）
- **THEN** `onToggleDir` 被调用
- **AND** 不调用 `onNodeSelect`
- **AND** 当前选中的节点保持不变

#### Scenario: 点击不同节点切换选中

- **WHEN** 节点 A 当前被选中且用户单击节点 B
- **THEN** 选中状态切换到节点 B
- **AND** DetailPanel 更新以显示节点 B 的信息

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

系统 SHALL 使用 CSS 自定义属性定义颜色令牌，内联样式通过 `var(--xxx)` 引用：

| CSS 变量 | 用途 |
|----------|------|
| `--color-bg` | 页面背景 |
| `--color-surface` | 卡片/面板背景 |
| `--color-border` | 边框 |
| `--color-text-primary` | 主文字色 |
| `--color-text-secondary` | 辅助文字色 |
| `--color-text-muted` | 次要文字色 |
| `--color-accent` | 强调色（链接、选中态） |
| `--color-accent-bg` | 强调色背景 |
| `--color-error` | 错误色 |
| `--color-warning` | 警告色 |
| `--color-info` | 信息色 |
| `--color-btn-bg` | 按钮背景 |

深色模式 SHALL 通过 `[data-theme="dark"]` 选择器覆盖变量值。`<html>` 元素的 `data-theme` 属性由 ThemeProvider 管理。

#### Scenario: 操作按钮样式

- **WHEN** 新增 Scan 和 Generate Rules 按钮
- **THEN** 按钮复用现有 `actionBtn` 样式
- **AND** 不新增 CSS 变量

### Requirement: 项目结构

前端 SHALL 按以下结构组织：

```
packages/frontend/
├── src/
│   ├── App.tsx                  # 主应用
│   ├── main.tsx                 # React 入口（Provider 嵌套）
│   ├── types.ts                 # TypeScript 类型定义
│   ├── i18n/
│   │   ├── index.ts             # I18nProvider + useT() hook
│   │   ├── en.ts                # 英文翻译
│   │   └── zh-CN.ts             # 简体中文翻译
│   ├── theme/
│   │   ├── index.ts             # ThemeProvider + useTheme() hook
│   │   └── constants.ts         # G6 主题颜色映射
│   ├── styles/
│   │   ├── main.css             # 全局样式 + CSS reset
│   │   └── variables.css        # CSS 自定义属性
│   └── components/
│       ├── ArchitectureView.tsx  # C4 架构图组件（NEW）
│       ├── DependencyGraph.tsx  # G6 图形组件
│       ├── DetailPanel.tsx      # 节点详情面板
│       ├── buildGraphData.ts    # G6 数据转换
│       └── icons.tsx            # 内联 SVG 图标
├── index.html
├── vite.config.ts
└── package.json
```

#### Scenario: Dashboard 操作按钮修改

- **WHEN** 实现 Dashboard 操作按钮
- **THEN** 修改 `GraphViewLayout.tsx`、`ArchitectureView.tsx`、`App.tsx`
- **AND** 无新增文件

### Requirement: 命令

前端 SHALL 支持以下命令：

```bash
pnpm dev           # 启动开发服务器 (http://localhost:5173)
pnpm build         # 生产构建
pnpm lint          # Biome 代码检查
```

### Requirement: 语言切换

系统 SHALL 在 Header 中提供语言切换按钮，切换 `I18nProvider` 的当前语言。

#### Scenario: 语言切换按钮渲染

- WHEN Header 渲染
- THEN 显示 `EN` 和 `中文` 两个按钮
- AND 当前激活的语言按钮具有高亮样式（与 Nav 按钮激活态一致）
- AND 添加新语言时只需增加一个按钮并创建对应翻译文件

#### Scenario: 语言切换行为

- WHEN 用户点击非激活语言按钮
- THEN 界面所有文本立即切换为目标语言
- AND 语言偏好保存到 localStorage key `lang`
- AND 当前语言按钮变为激活态

#### Scenario: 初次加载语言检测

- WHEN 首次加载且 localStorage 无 `lang` 值
- THEN 检测 `navigator.language`
- AND 若以 `zh` 开头，设置语言为 `zh-CN`
- AND 否则设置语言为 `en`

### Requirement: 主题切换

系统 SHALL 在 Header 中提供主题循环按钮，支持浅色 → 深色 → 自动 三种模式。

#### Scenario: 主题按钮渲染

- WHEN Header 渲染
- THEN 显示主题切换按钮
- AND 按钮图标反映当前模式（☀ 浅色 / 🌙 深色 / 🖥 自动）
- AND 按钮 `title` 属性提示下次点击将切换到的模式

#### Scenario: 主题循环

- WHEN 用户点击主题按钮
- THEN 模式循环切换：light → dark → auto → light
- AND `<html>` 的 `data-theme` 属性立即更新
- AND 偏好保存到 localStorage key `theme`

#### Scenario: 自动模式

- WHEN 主题模式为 `auto`
- THEN 使用 `matchMedia('(prefers-color-scheme: dark)')` 检测系统偏好
- AND 若系统为深色则 `data-theme="dark"`，否则无 `data-theme` 属性（浅色）
- AND 监听 `matchMedia` 的 `change` 事件，系统切换时自动更新

#### Scenario: 初次加载主题检测

- WHEN 首次加载且 localStorage 无 `theme` 值
- THEN 默认模式为 `auto`

### Requirement: C4 架构模型 — Types 模块

C4 架构模型 SHALL 在 `frontend.c4` 中定义 `types` 模块，正确反映 `types.ts` 作为前端共享类型定义的真实模块间依赖关系。

#### Scenario: frontend.c4 包含 types 模块定义

- **WHEN** 查看 `.dc-reporter/architecture/frontend.c4`
- **THEN** `extend ROOT.frontend` 中包含 `types = module` 定义
- **AND** `App` 模块声明对 `ROOT.frontend.types` 的 dependency
- **AND** `components` 模块声明对 `ROOT.frontend.types` 的 dependency
- **AND** `hooks` 模块声明对 `ROOT.frontend.types` 的 dependency

#### Scenario: types 模块无外部依赖

- **WHEN** 查看 `frontend.c4` 中 `types` 模块定义
- **THEN** `types` 模块不声明任何对其他模块的 dependency 关系
- **AND** 对应 `types.ts` 为纯类型定义文件，不依赖前端其他模块

## References

- 前端源码：`packages/frontend/src/`
- 类型定义：`packages/frontend/src/types.ts`
