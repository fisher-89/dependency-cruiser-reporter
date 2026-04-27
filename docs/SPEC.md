# dependency-cruiser-reporter

dependency-cruiser 扫描结果可视化工具 / Dependency Graph, Error Report & Metrics Viewer

## 项目概述

**dependency-cruiser-reporter** 是一个用于解析和可视化 [dependency-cruiser](https://github.com/sverrejo/nmc-dependency-cruiser) 扫描输出的工具。

dependency-cruiser 是一个 JavaScript/TypeScript 静态分析工具，用于检测依赖问题（循环依赖、未使用依赖、违规规则等）。它输出 JSON 格式的详细报告，但其原生 HTML 报告功能有限。

本项目的目标是将 dependency-cruiser 的 JSON 输出转换为更易理解的可视化形式。

## 核心功能

### 1. 依赖图可视化 (Dependency Graph)

- 从 dependency-cruiser 的 JSON 输出中提取模块依赖关系
- 生成交互式依赖图（支持缩放、拖拽、节点展开）
- 区分不同类型的依赖边：
  - 常规依赖 (resolvable)
  - 动态依赖 (dynamic)
  - 不合法依赖 (unresolvable)
  - 循环依赖 (circular)
- 支持按规则、路径、包名过滤

### 2. 错误报告 (Error Report)

- 提取所有 violation（违规）和 error（错误）
- 按严重程度分类：error / warn / info
- 按规则类型分组显示
- 支持跳转到具体源码位置（可选：集成 Source Explorer）
- 支持过滤和搜索

### 3. 指标仪表盘 (Metrics Dashboard)

- 依赖统计摘要：
  - 总模块数
  - 总依赖边数
  - 规则违规数（按类型细分）
  - 循环依赖数
  - 包内依赖 vs 外部依赖比例
- 关键指标趋势（多次扫描对比）
- 导出能力（JSON/CSV/PDF）

## 技术架构

### 整体架构

```
┌─────────────────────┐
│ dependency-cruiser │ ── JSON 输出
└──────────┬──────────┘
           ↓
    ┌──────────────┐
    │ Rust 预处理  │ ← 核心：高性能聚合
    │   引擎      │
    └──────┬───────┘
           ↓
    ┌──────────────┐
    │  轻量级       │
    │  Graph JSON  │
    └──────┬───────┘
           ↓
    ┌──────────────┐
    │  React/Vue  │ ← 前端展示
    │  图渲染器   │
    └─────────────┘
```

### 输入

```json
// dependency-cruiser 支持多种输出格式:
// - "json": 完整模块和依赖信息
// - "err": 仅违规和错误
// - "log": 仅日志

// 本项目主要使用 "json" 格式作为输入
```

### 处理流程

```
[dependency-cruiser JSON]
        ↓
[ Rust 预处理引擎 ] ← 核心处理
        ↓
[ 轻量级 Graph JSON ] → 前端
        ↓
[ 可视化引擎 ] → 前端展示
```

### 前端交互

```
[轻量级 Graph JSON]
        ↓
[ 前端图渲染器 ]
        ↓
[ 交互控制 ]
  - 下钻：点击聚合节点 → 展开下一级
  - 上卷：点击返回 → 回到上一层
  - 缩放/拖拽
  - 搜索定位
```

### 技术选型建议

| 功能 | 推荐方案 | 备选 |
|------|----------|------|
| 预处理 (核心) | **Rust (核心处理)** | - |
| 图渲染 | D3.js / React Flow | Cytoscape.js |
| UI 框架 | React / Vue | - |
| 静态站点 | Vite | Next.js |
| 类型定义 | TypeScript | - |

### Rust 预处理模块设计

使用 Rust 编写高性能预处理引擎，解决大型项目（10万+ 节点）的性能瓶颈。

#### 核心职责

1. **数据解析与验证**
   - 高效解析 dependency-cruiser JSON 输出
   - 数据校验与规范化

2. **图聚合 (Graph Aggregation)**
   - 按目录层级自动聚合节点
   - 保持聚合后的依赖关系可读

3. **索引构建**
   - 构建邻接表、倒排索引
   - 加速前端查询

4. **布局预计算**
   - 预计算图的坐标布局
   - 减少前端计算压力

#### 聚合策略

```rust
// 根据节点数量自动选择聚合层级
enum AggregationLevel {
    File,       // 不聚合，展示所有文件
    Directory, // 按目录聚合 (如 src/components/)
    Package,   // 按 npm 包聚合
    Root,      // 最高聚合，仅根节点
}

fn select_aggregation_level(node_count: usize) -> AggregationLevel {
    match node_count {
        0..=1000    => AggregationLevel::File,       // < 1k 节点：不聚合
        1001..=5000  => AggregationLevel::Directory,    // 1k-5k：按目录
        5001..=20000 => AggregationLevel::Package,     // 5k-20k：按包
        _           => AggregationLevel::Root,        // > 20k：最高聚合
    }
}
```

#### 聚合规则

- 目录聚合：多个文件合并为一个目录节点
- 依赖关系压缩：文件间依赖 → 目录间依赖（多数决）
- 循环依赖检测：聚合后在边界保留
- 违规继承：子节点有违规时，父节点显示警告标记

#### 输出格式

```rust
// Rust 预处理后输出为轻量级 JSON
struct ProcessedGraph {
    nodes: Vec<GraphNode>,
    edges: Vec<GraphEdge>,
    meta: GraphMeta,
}

struct GraphNode {
    id: String,
    label: String,           // 显示名称
    node_type: NodeType,      // File / Directory / Package
    path: Option<String>,   // 原始路径（用于下钻）
    violation_count: u32,   // 违规数
    children: Option<Vec<String>>, // 子节点（聚合时）
}

struct GraphEdge {
    source: String,
    target: String,
    edge_type: EdgeType,     // local / npm / core / dynamic
    weight: u32,           // 聚合边权重
}
```

### 数据结构映射

```typescript
// dependency-cruiser JSON 核心结构
interface CruiseResult {
  modules: Module[];
  dependencies: Dependency[];
  violations: Violation[];
  summary: Summary;
}

interface Module {
  source: string;  // 文件路径
  dependencies: string[];  // 直接依赖的模块
  size: number;  // 行数
  // ... 更多字段
}

interface Dependency {
  resolved: string;
  coreModule: string;
  dependencyTypes: string[];  // ["local", "npm", "core", etc.]
  // ...
}

interface Violation {
  from: string;
  to: string;
  rule: {
    severity: "error" | "warn" | "info";
    name: string;
  };
  // ...
}
```

## 使用方式

全局安装后提供命令：

```bash
# 全局安装
npm install -g dcr-reporter

# 分析依赖并生成报告
dep-report analyze --input <path> [--output <path>]

# 启动 Web 查看器
dep-report open [--file <path>] [--port <port>]
```

### CLI 命令详解

#### analyze

分析 dependency-cruiser 输出，生成聚合后的依赖图。

```bash
dep-report analyze [options]

Options:
  -i, --input <path>      输入文件或目录
  -o, --output <path>   输出文件路径 (default: "graph.json")
  -m, --max-nodes <n>   最大节点数 (default: 5000)
  -l, --level <level>   聚合层级: file|directory|package|root
  -L, --layout        计算布局坐标
  -c, --config <path>  配置文件
```

#### open

启动 Web 查看器，可在浏览器中交互式查看依赖图。

```bash
dep-report open [options]

Options:
  -f, --file <path>   预处理后的 JSON 文件
  -i, --input <path> dependency-cruiser 原生 JSON (自动预处理)
  -p, --port <port>  端口 (default: 3000)
  --host <host>      主机 (default: "localhost")
```

### 2. Web 界面

- 首页：文件上传或路径输入
- 三个主要视图：Graph / Report / Metrics
- 响应式设计，支持移动端查看

### 3. 可配置项

- 规则别名/描述映射（自定义友好名称）
- 主题定制（亮色/暗色）
- 过滤规则预设

## 使用场景

### 场景 A：本地开发使用

```bash
# 1. 运行 dependency-cruiser
npx dependency-cruiser --output-type json > cruise.json

# 2. 使用本工具查看结果
npx dcr-reporter serve cruise.json
```

### 场景 B：CI/CD 集成

```bash
# 在 CI 中生成报告
npx dependency-cruiser --output-type json --output build/cruise.json

# 上传到静态托管（如 Surge、Vercel）
npx surge build/ https://my-project-reports.surge.sh
```

### 场景 C：Pre-commit Hook

- 在 commit 前检查是否有新增违规
- 阻止高 severity 违规的 commit（可选）

## 优先级

### P0 - 必须实现

- [x] Rust 预处理引擎（高性能聚合）
- [x] 自动层级聚合（按节点数选择 File/Directory/Package/Root）
- [x] 预计算布局坐标
- [x] 解析 dependency-cruiser JSON 输出
- [x] 依赖关系图展示
- [x] 违规/错误列表显示
- [x] 基础指标统计

### P1 - 应该实现

- [ ] 下钻/上卷交互（点击聚合节点展开）
- [ ] 增量更新（缓存 + 增量处理）
- [ ] 过滤器（按规则、路径、包类型）
- [ ] 搜索功能
- [ ] 多次扫描对比
- [ ] 导出功能（JSON/CSV）

### P2 - 可以实现

- [ ] 暗色主题
- [ ] 移动端适配
- [ ] 集成 Source Explorer（点击跳转源码）
- [ ] Pre-commit hook 集成

## 潜在挑战

1. **大型项目性能**：10万+ 模块时图渲染卡顿
   - **解决**：Rust 预处理 + 自动层级聚合
   - 预计算布局坐标，减轻前端压力

2. **循环依赖可视化**：需要特殊的图布局算法
   - **解决**：聚合后在边界保留循环标记

3. **路径解析**：相对路径 vs 绝对路径的处理
   - **解决**：Rust 端统一规范化

4. **规则映射**：dependency-cruiser 规则名不够友好 → 需要别名配置
   - **解决**：提供 YAML/JSON 配置文件自定义

5. **数据更新**：大型项目重新扫描频率
   - **解决**：增量处理 + 缓存

## 竞品参考

- [dependency-cruiser report](https://github.com/sverrejo/nmc-dependency-cruiser-report): 官方 HTML 报告（功能有限）
- [dependency-cruiser actions](https://github.com/gregINAL/dependency-cruiser-actions): GitHub Actions 集成
- [FOSSA](https://fossa.com/): 商业依赖管理工具
- [Snyk](https://snyk.io/): 商业安全扫描

## 下一步

1. 确认以上功能范围是否符合预期
2. 确认技术选型偏好
3. 确定优先实现的 P0 功能

---