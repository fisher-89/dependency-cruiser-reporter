## MODIFIED Requirements

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
- THEN 调用 `GET /api/config` 检查服务器配置
- AND 响应包含 `{ cwd, hasArchitectureDir, hasGraphFile }`
- IF `hasArchitectureDir` 或 `hasGraphFile` 为 true THEN 显示导航栏和对应视图
- IF 两者均为 false THEN 显示目录选择器
- AND 所有文本通过 `useT()` hook 获取翻译

#### Scenario: 视图切换

- WHEN 用户点击导航标签
- THEN 切换 `viewMode` 状态（`'architecture'` | `'graph'` | `'report'` | `'metrics'`）
- AND 条件渲染对应视图组件
- AND Architecture 视图使用 `React.lazy` 动态加载

### Requirement: 状态管理

系统 SHALL 使用 React `useState` 管理状态（无外部状态管理库）：

| 状态 | 类型 | 所有者 |
|------|------|--------|
| `data` | `ProcessedGraph \| null` | App |
| `viewMode` | `'architecture' \| 'graph' \| 'report' \| 'metrics'` | App |
| `loading` | `boolean` | App |
| `error` | `string \| null` | App |
| `selectedNodeId` | `string \| null` | App |
| `config` | `AppConfig \| null` | App |

其中 `AppConfig` 包含：
```typescript
interface AppConfig {
  cwd: string;
  hasArchitectureDir: boolean;
  hasGraphFile: boolean;
}
```

主题和语言状态 SHALL 由各自 Provider 管理（非 App 本地状态）。

#### Scenario: 状态转换

```
Idle → Loading (配置加载)
Loading → WorkspaceReady (hasArchitectureDir || hasGraphFile)
Loading → NoWorkspace (两者均为 false)
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

- WHEN `GET /api/config` 返回 `hasArchitectureDir: false` 且 `hasGraphFile: false`
- THEN 显示目录选择器界面
- AND 用户可选择项目目录或上传 JSON 文件

## ADDED Requirements

### Requirement: Architecture 视图路由

系统 SHALL 在导航栏中添加 Architecture 视图标签，位于现有三个标签之前。

#### Scenario: Architecture nav tab rendering

- **WHEN** Header 渲染且 `hasArchitectureDir` 为 true
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

- **WHEN** `GET /api/config` 返回 `hasArchitectureDir: false` 且 `hasGraphFile: false`
- **THEN** 显示目录选择器，提示用户选择项目目录
- **AND** 同时保留文件上传区域作为备选

#### Scenario: 选择目录后

- **WHEN** 用户在目录选择器中选择或输入项目路径
- **THEN** 系统重新调用 `GET /api/config?cwd=<path>` 检查新路径
- **AND** 若找到 `.dc-reporter/` 则显示对应视图

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
