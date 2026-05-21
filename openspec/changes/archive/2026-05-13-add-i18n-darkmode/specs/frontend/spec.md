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
            │   └── Navigation (Graph / Report / Metrics tabs)
            ├── UploadArea (drag-and-drop + file input)
            ├── GraphView (flex container: canvas + detail panel)
            │   ├── DependencyGraph (G6 comboCombined layout)
            │   └── DetailPanel (node metadata, stability, deps, violations)
            ├── ReportView (violations by severity)
            └── MetricsView (summary stats)
```

#### Scenario: App 根组件

- WHEN App 挂载
- THEN 调用 `GET /api/config` 检查服务器数据
- IF `hasGraphFile: true` THEN 调用 `POST /api/graph` 加载数据
- IF `hasGraphFile: false` THEN 显示上传区域
- AND 所有文本通过 `useT()` hook 获取翻译

#### Scenario: 视图切换

- WHEN 用户点击导航标签
- THEN 切换 `viewMode` 状态（`'graph'` | `'report'` | `'metrics'`）
- AND 条件渲染对应视图组件

### Requirement: 状态管理

系统 SHALL 使用 React `useState` 管理状态（无外部状态管理库）：

| 状态 | 类型 | 所有者 |
|------|------|--------|
| `data` | `ProcessedGraph \| null` | App |
| `viewMode` | `'graph' \| 'report' \| 'metrics'` | App |
| `loading` | `boolean` | App |
| `error` | `string \| null` | App |
| `selectedNodeId` | `string \| null` | App |

主题和语言状态 SHALL 由各自 Provider 管理（非 App 本地状态）：

| Provider 状态 | 类型 | 来源 |
|---------------|------|------|
| `theme` | `'light' \| 'dark' \| 'auto'` | ThemeProvider |
| `resolvedTheme` | `'light' \| 'dark'` | ThemeProvider（解析后） |
| `lang` | `string` | I18nProvider |

#### Scenario: selectedNodeId 生命周期

- WHEN 用户单击 graph 节点
- THEN `selectedNodeId` 设置为被点击的节点 ID
- WHEN 用户双击 graph 节点
- THEN `selectedNodeId` 不变更
- WHEN graph 数据刷新（fetchGraph 或文件上传）
- THEN `selectedNodeId` 重置为 null

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
│       ├── DependencyGraph.tsx  # G6 图形组件
│       ├── DetailPanel.tsx      # 节点详情面板
│       ├── buildGraphData.ts    # G6 数据转换
│       └── icons.tsx            # 内联 SVG 图标
├── index.html
├── vite.config.ts
└── package.json
```

## ADDED Requirements

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
