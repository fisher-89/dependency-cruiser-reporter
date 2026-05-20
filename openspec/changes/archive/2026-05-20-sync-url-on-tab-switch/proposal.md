# 提案: sync-url-on-tab-switch

> **变更**: sync-url-on-tab-switch
> **日期**: 2026-05-20
> **状态**: 提案中

---

## 用户故事

作为一个使用 dependency-cruiser-reporter 的前端用户，我切换页签时希望浏览器的 URL 同步更新，这样我可以将当前视图的链接分享给他人，或者通过浏览器前进/后退按钮在视图间导航。

### 背景

当前前端应用在 `packages/frontend/src/App.tsx` 中通过 `viewMode` 状态（类型 `ViewMode = 'architecture' | 'graph' | 'report' | 'metrics'`）控制四个视图的切换：

- 用户在 `<nav>` 中的四个按钮间切换
- `setViewMode()` 更新 React 状态，条件渲染对应视图组件
- **URL 完全不参与视图切换流程**

当前行为的问题：

1. **无法分享特定视图**：用户处于 Report 或 Metrics 视图时复制 URL，其他人打开看到的永远是默认视图（graph）
2. **浏览器导航失效**：浏览器后退/前进按钮无法在视图间切换，因为 URL 从未变化，浏览器认为始终在同一个页面
3. **刷新丢失状态**：页面刷新后总是回到默认 graph 视图，用户需要重新点击目标页签
4. **没有深层链接能力**：无法通过 URL 参数直接跳转到特定视图

### 分析

**当前视图切换流程：**

```
用户点击 nav 按钮
  → onClick={() => setViewMode('report')}
  → React 重新渲染
  → 条件渲染 <ReportView> 组件（viewMode === 'report'）
  → URL 无变化
```

**目标视图切换流程：**

```
用户点击 NavLink(/report)
  → BrowserRouter 更新 URL 为 /report
  → <Routes> 匹配 /report，渲染 <ReportView>
  → NavLink isActive 自动高亮当前按钮
  → 浏览器历史记录增加条目，前进/后退可用
```

**技术细节分析：**

- 项目当前**没有**使用 `react-router-dom` 或任何路由库（package.json 中无相关依赖）
- 前端使用 Vite + React 19，构建工具为 `vite-plus`
- 应用是单页应用（SPA），由 Express 服务器（`packages/cli/`）提供服务
- 当前 URL 结构：访问路径为 `/`，无 hash、无 query params
- `main.tsx` 中无 Router Provider 包裹

**URL 策略选择：**

| 方案 | 格式示例 | 优点 | 缺点 |
|------|---------|------|------|
| **URL Path + React Router** | `/report` | URL 最标准，浏览器前进/后退免费获得，社区标准方案 | 需引入新依赖，App.tsx 重构幅度较大 |
| **URL Search Params** | `/?view=report` | 无需新依赖 | 手动处理 popstate，存在循环更新风险 |
| **URL Hash** | `#/report` | 兼容性好 | 对服务端不可见，风格过时 |

推荐方案为 **URL Path + React Router** (`/report`)：
- Express 服务端已有 SPA fallback（`server.ts:166` `app.get('*', ...)`），无需服务端改动
- Vite 开发服务器默认支持 SPA fallback
- BrowserRouter 自动处理浏览器前进/后退，无需手动监听 popstate
- `<Link>` 和 `useLocation` 提供声明式的导航和高亮判断
- `react-router-dom` 仅约 7KB gzip，轻量无负担

**具体实现路径：**

1. 添加 `react-router-dom` 依赖到 `packages/frontend/package.json`
2. 在 `main.tsx` 中用 `<BrowserRouter>` 包裹 `<App />`
3. 重构 `App.tsx`：
   - 移除 `viewMode` 状态（`useState<ViewMode>`）
   - 将条件渲染替换为 `<Routes>` + `<Route>` 配置
   - 导航按钮改用 `<Link>`（或 `<NavLink>` 自动处理高亮）
   - 根路径 `/` 重定向到默认视图 `/graph`
4. 子视图组件（ReportView、MetricsView）保持组件内部逻辑不变，仅改为通过路由渲染

### 解决方向

**实现方式：React Router v7（react-router-dom）**

```tsx
// main.tsx — 新增 BrowserRouter 包裹
import { BrowserRouter } from 'react-router-dom';

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
```

```tsx
// App.tsx — 路由配置替代 useState 条件渲染
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';

// 导航按钮使用 NavLink，自动根据当前 URL 高亮
<NavLink to="/graph" style={({ isActive }) => ({ ...styles.navBtn, ...(isActive ? styles.navBtnActive : {}) })}>
  {t('nav.graph')}
</NavLink>

// 视图区域用 Routes 替代条件渲染
<Routes>
  <Route path="/" element={<Navigate to="/graph" replace />} />
  <Route path="/graph" element={<GraphView />} />
  <Route path="/report" element={<ReportView />} />
  <Route path="/metrics" element={<MetricsView />} />
  <Route path="/architecture" element={<ArchitectureView />} />
  <Route path="*" element={<Navigate to="/graph" replace />} />
</Routes>
```

**URL 路由映射：**

| 路径 | 视图组件 | 说明 |
|------|---------|------|
| `/` | 重定向到 `/graph` | 默认视图 |
| `/architecture` | `ArchitectureView` | C4 架构视图 |
| `/graph` | `DependencyGraph` + `DetailPanel` | 依赖图视图（默认） |
| `/report` | `ReportView` | 违规报告视图 |
| `/metrics` | `MetricsView` | 指标统计视图 |
| `/*` | 重定向到 `/graph` | 未知路径回退 |

**导航行为：**
- `<NavLink>` 自动基于 `isActive` 应用高亮样式，无需手动管理 `viewMode` state
- 浏览器前进/后退按钮由 BrowserRouter 自动处理，无需额外代码
- 切换页签产生新的 history entry（push），用户可通过后退按钮按序返回

---

## 目标

### 范围内

- 引入 `react-router-dom` 依赖到 `packages/frontend`
- 在 `main.tsx` 中用 `<BrowserRouter>` 包裹应用根组件
- 重构 `App.tsx`：用 `<Routes>` + `<Route>` 替代 `useState<ViewMode>` 条件渲染
- 导航按钮改用 `<NavLink>`，自动根据当前路径高亮
- 根路径 `/` 重定向到默认视图 `/graph`
- 未知路径 `/*` 回退到 `/graph`

### 不在范围内

- Architecture 视图内部的 diagram navigation（通过 LikeC4 的 `viewId` 状态在不同架构图之间导航）不在本次范围内。仅同步顶层的 architecture/graph/report/metrics 视图切换
- 节点选中状态（`selectedNodeId`）的 URL 同步不在本次范围内
- 目录展开状态（`expandedDirs`）的 URL 同步不在本次范围内
- 语言偏好（lang）和主题偏好（theme）的 URL 同步不在本次范围内
- 服务端路由配置变更不在本次范围内（现有 SPA fallback 已满足需求）
- 文件上传状态（data 状态）的 URL 持久化不在本次范围内
- 深层链接到具体文件上传的视图不在本次范围内

---

## 验收标准

| ID | 验收条件 | 验证方法 | 优先级 |
|----|---------|----------|--------|
| AC-1 | 用户点击 Report 页签时，URL 变为 `/report`，视图切换为 Report | 点击 Report 导航按钮后检查浏览器地址栏路径为 `/report`，Report 视图处于激活状态 | P0 |
| AC-2 | 用户直接访问 `/metrics` 时，页面加载后自动显示 Metrics 视图 | 在浏览器地址栏输入 `/metrics` 并回车，确认 Metrics 视图渲染且对应 nav 按钮高亮 | P0 |
| AC-3 | 用户直接访问 `/architecture` 时，页面加载后自动显示 Architecture 视图 | 在浏览器地址栏输入 `/architecture` 并回车，确认 Architecture 视图渲染 | P0 |
| AC-4 | 访问根路径 `/` 时，自动重定向到 `/graph` | 访问 `/` 确认 URL 变为 `/graph`，Graph 视图渲染且 nav 的 Graph 按钮为激活态 | P0 |
| AC-5 | 访问无效路径（如 `/invalid`）时，重定向到 `/graph` | 访问 `/invalid` 确认显示 Graph 视图，URL 变为 `/graph` | P1 |
| AC-6 | 用户依次切换页签 Graph -> Report -> Metrics 后，点击浏览器后退按钮，依次回到 Report 和 Graph 视图 | 执行页签切换序列，然后点击两次浏览器后退按钮，确认视图按逆序切换 | P1 |
| AC-7 | 页签切换后复制 URL 并发送给他人，对方打开后看到相同的视图 | 复制切换后的 URL（如 `/metrics`）在新标签页中打开，确认显示相同的视图 | P0 |
| AC-8 | URL 路由切换不会导致额外页面刷新（客户端路由） | 切换页签时检查浏览器开发者工具的 Network 面板，确认无额外 HTTP 请求 | P1 |

---

## 风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| React Router 引入后，现有 E2E 测试中依赖 `data-testid` 的断言可能因 DOM 结构变化而失败 | 中：测试失败需同步更新 | 中 | 保持所有现有 `data-testid` 属性不变；用 `NavLink` 替代 `<button>` 时保留 `data-testid`；实现后运行 `pnpm test:e2e` 验证 |
| 未来视图路径变更（如 `/report` 改为 `/violations`）会导致旧链接失效 | 中：用户分享的旧链接跳转到 404 回退页 | 中 | 如需变更路径，使用 `<Navigate>` 或 `NavigateFunction` 添加旧路径重定向（如 `/report` → `/violations`），保持向后兼容 |
| 现有 `AppConfig` 类型中的 `hasGraphFile` 和 `hasArchitectureDir` 可能不再通过 prop 传递，影响初始化逻辑 | 低：运行时配置缺失 | 低 | React Router 方案不改变数据获取和状态管理逻辑，`useState`/`useEffect` 仍留在 `App.tsx` 中，仅视图切换部分改用路由 |
| `BrowserRouter` 依赖 History API，极少数旧浏览器不支持 | 低：功能完全不可用 | 极低 | History API 在 96%+ 浏览器中支持；在 `main.tsx` 中可用 `React.lazy` + fallback 做降级兜底 |
| `fetchGraph` 调用时机与路由之间可能产生竞态（组件挂载后无数据） | 低：路由切换后视图无数据 | 低 | `fetchGraph` 逻辑保持在 `App.tsx` 中并在 `useEffect` 中调用，不依赖路由参数；数据加载完成后通过 props 传递给各视图路由组件 |
