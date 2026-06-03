# 前端规范 — 代码结构对齐

## Purpose

定义前端包在架构模型对齐后的模块变更：将 `types` 模块显式建模到 C4 架构模型中。

## ADDED Requirements

### Requirement: 架构模型 Types 模块

C4 架构模型 SHALL 在 `frontend.c4` 中定义 `types` 模块，正确反映 `types.ts` 作为前端共享类型定义的真实模块间依赖关系。

`types.ts` 当前被以下模块引用：

| 引用方 | 引用内容 |
|--------|----------|
| `App.tsx` | `ProcessedGraph`、`ViewMode`、`GraphNode`、`GraphEdge` 等类型 |
| `components/*` | `ProcessedGraph`、模块内部类型 |
| `hooks/*` | `ProcessedGraph`、数据加载相关类型 |
| `theme/*` | 类型常量和接口 |

`types` 模块 SHALL 定义在 `frontend.c4` 的 `ROOT.frontend` 扩展中，添加合适的依赖边以反映上述引用关系。

#### Scenario: frontend.c4 包含 types 模块定义

- **WHEN** 查看 `.dc-reporter/architecture/frontend.c4`
- **THEN** `extend ROOT.frontend` 中包含 `types = module` 定义
- **AND** `main` 模块声明 `-[dependency]-> ROOT.frontend.types` 依赖
- **AND** `App` 模块声明 `-[dependency]-> ROOT.frontend.types` 依赖
- **AND** `components` 模块声明 `-[dependency]-> ROOT.frontend.types` 依赖
- **AND** `hooks` 模块声明 `-[dependency]-> ROOT.frontend.types` 依赖
- **AND** `theme` 模块声明 `-[dependency]-> ROOT.frontend.types` 依赖

#### Scenario: types 模块无外部依赖

- **WHEN** 查看 `frontend.c4` 中 `types` 模块定义
- **THEN** `types` 模块不声明任何对其他模块的 dependency 关系
- **AND** 对应 `types.ts` 为纯类型定义文件，不依赖前端其他模块

#### Scenario: archi-rules 验证通过

- **WHEN** 执行 `dep-report archi-to-rules`
- **THEN** 生成的 `archi-rules.json` 包含 `archi-frontend-types` 规则
- **AND** 规则中 `path` 指向 `packages/frontend/src/types.ts` 或 `packages/frontend/src/types`
- **AND** `to.pathNot` 包含其他前端模块路径作为允许依赖

## Module Contract

| Module | Function/Component | Change |
|--------|-------------------|--------|
| `.dc-reporter/architecture/frontend.c4` | 架构模型文件 | 修改：新增 `types` 模块定义，App/components/hooks/theme 添加依赖边 |
| `packages/frontend/src/types.ts` | 类型定义 | 无变化（代码不变，仅架构模型新增） |
