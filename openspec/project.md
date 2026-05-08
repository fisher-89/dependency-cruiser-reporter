# dependency-cruiser-reporter 项目约定

## 项目概述

dependency-cruiser-reporter 是 [dependency-cruiser](https://github.com/sverrejo/nmc-dependency-cruiser) 分析结果的可视化工具。它将 dependency-cruiser 的 JSON 输出转换为交互式图形、违规报告和指标仪表板。

### 解决的问题

dependency-cruiser 是 JavaScript/TypeScript 静态分析工具，检测：
- 循环依赖
- 未使用的依赖
- 规则违规（如架构约束）

它输出详细的 JSON 格式报告，但原生 HTML 报告功能有限。**dependency-cruiser-reporter** 填补了这一空白。

## 技术栈

| 领域 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19 |
| 图形可视化 | AntV G6 | 5 |
| 构建工具 | Vite | 5 |
| 类型系统 | TypeScript | 5 |
| 代码检查 | Biome | latest |
| CLI 框架 | Commander.js | latest |
| HTTP 服务 | Express | latest |
| 后端语言 | Rust | 1.70+ |
| Rust 序列化 | serde, serde_json | latest |
| WASM 互操作 | wasm-bindgen, tsify | latest |
| 测试运行器 | Node.js built-in (node:test) | 18+ |

## 架构概览

```
[dependency-cruiser JSON] → [Rust preprocessing] → [Lightweight JSON] → [React visualization]
```

### 三组件架构

| 组件 | 路径 | 职责 |
|------|------|------|
| CLI | `packages/cli/` | 命令行工具 (`dep-report`)：`analyze`（运行 dependency-cruiser）、`open`（启动 Web 查看器）。导出编程式 Express 服务器。 |
| Rust 后端 | `packages/rust/` | WASM 模块：解析 dependency-cruiser 输出、混合聚合、布局计算。Node.js 回退在 `convert.ts`。 |
| React 前端 | `packages/frontend/` | 交互式可视化：Graph/Report/Metrics 视图。 |

### 数据流

```
dependency-cruiser JSON → CLI (analyze) → Raw JSON 文件
Raw JSON → HTTP Server (open) → WASM/Node.js 聚合 → ProcessedGraph
ProcessedGraph → React Frontend → AntV G6 渲染
```

### 关键设计决策

1. **延迟转换 + 混合聚合**：`analyze` 保存原始 dependency-cruiser JSON，聚合在 `open` 时按需发生，支持交互式钻取
2. **WASM + tsify**：Rust 编译为 WASM，通过 tsify 自动生成 TypeScript 类型，单一类型真相来源
3. **Node.js 回退**：WASM 不可用时优雅降级

## 编码规范

### 核心原则

1. **编码前思考**：陈述假设。不清楚则停止并询问
2. **简单优先**：无推测性功能。单次使用代码不抽象
3. **手术式修改**：仅触及必要部分。匹配现有风格
4. **目标驱动**：定义成功标准。循环直到验证

### 代码风格

| 语言 | 工具 | 规则 |
|------|------|------|
| TypeScript | Biome | 严格模式、函数式组件 + hooks |
| Rust | cargo fmt, clippy | 标准 Rust 约定 |

### 提交规范

使用 conventional commits：`feat:` | `fix:` | `docs:` | `refactor:` | `test:` | `chore:`

每次提交前必须：
1. `pnpm build && pnpm demo` 构建并启动查看器
2. 在浏览器中确认页面正常渲染
3. `pnpm test` 验证测试通过
4. 仅在视觉验证后创建 git commit

### 类型契约

共享类型定义：
- TypeScript: `packages/frontend/src/types.ts`
- Rust: `packages/rust/src/types.rs`
- 自动生成: `@dcr-reporter/wasm` (via tsify)

使用 snake_case 匹配 JSON 输出：`node_type`（非 `nodeType`）、`edge_type`（非 `edgeType`）

## 目标用户

| 角色 | 使用场景 |
|------|----------|
| 开发者 | 开发期间分析项目依赖 |
| 技术主管 | 代码审查期间监控架构合规性 |
| DevOps | 集成到 CI/CD 管道进行自动检查 |

## 非目标

- 实时依赖监控
- IDE 集成（P0 范围外）
- 自定义规则定义（直接使用 dependency-cruiser）

## 功能路线图

### P0 - 必须有
- [x] Rust 预处理
- [x] 混合聚合
- [x] Combo 生成
- [x] 图形显示
- [x] 违规报告
- [x] 基础指标

### P1 - 应该有
- [ ] 钻取/汇总
- [ ] 过滤器
- [ ] 搜索
- [ ] 多扫描比较
- [ ] 导出 JSON/CSV

### P2 - 最好有
- [ ] 深色主题
- [ ] 移动端响应式
- [ ] 源码浏览器
- [ ] Pre-commit 钩子
