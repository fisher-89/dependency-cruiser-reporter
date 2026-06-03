# 后端规范 — 代码结构对齐

## Purpose

定义 Rust 后端在架构模型对齐后的模块变更：将 `types` 和 `lib` 模块显式建模到 C4 架构模型中。

## ADDED Requirements

### Requirement: 架构模型 Rust Types 模块

C4 架构模型 SHALL 在 `rust.c4` 中定义 `types` 模块，正确反映 `types.rs` 作为 Rust 后端核心数据结构的真实模块位置。

`types.rs` 当前定义并导出了以下关键类型（被其他模块引用）：

| 模块 | 引用 |
|------|------|
| `aggregate/` | `ProcessedGraph`、`GraphNode`、`GraphEdge`、`NodeType`、`EdgeType` 等 |
| `layout.rs` | `ProcessedGraph`、`GraphNode`、`GraphEdge`、`GraphCombo` 等 |
| `violations/` | `ViolationInfo` 等 |
| `lib.rs` | 所有类型（作为 crate 根重新导出） |

`types` 模块 SHALL 定义在 `rust.c4` 的 `ROOT.rust` 扩展中，添加合适的依赖边。

#### Scenario: rust.c4 包含 types 模块定义

- **WHEN** 查看 `.dc-reporter/architecture/rust.c4`
- **THEN** `extend ROOT.rust` 中包含 `types = module` 定义
- **AND** `aggregate` 模块声明 `-[dependency]-> ROOT.rust.types` 依赖
- **AND** `layout` 模块声明 `-[dependency]-> ROOT.rust.types` 依赖
- **AND** `violations` 模块声明 `-[dependency]-> ROOT.rust.types` 依赖

### Requirement: 架构模型 Rust Lib 模块

C4 架构模型 SHALL 在 `rust.c4` 中定义 `lib` 模块，反映 `lib.rs` 作为 crate 根入口和 WASM 导出点的角色。

`lib.rs` 当前职责：
- WASM 绑定和导出函数（`aggregate`、`aggregate_from_str`）
- 模块声明和重导出
- 与 JavaScript 交互的入口点

`lib` 模块 SHALL 依赖所有参与 WASM 导出的子模块。

#### Scenario: rust.c4 包含 lib 模块定义

- **WHEN** 查看 `.dc-reporter/architecture/rust.c4`
- **THEN** `extend ROOT.rust` 中包含 `lib = module` 定义
- **AND** `lib` 模块声明 `-[dependency]-> ROOT.rust.aggregate` 依赖
- **AND** `lib` 模块声明 `-[dependency]-> ROOT.rust.layout` 依赖
- **AND** `lib` 模块声明 `-[dependency]-> ROOT.rust.types` 依赖
- **AND** `lib` 模块声明 `-[dependency]-> ROOT.rust.violations` 依赖

#### Scenario: lib 和 aggregate 不互相声明依赖

- **WHEN** 查看 `rust.c4` 中模块定义
- **THEN** `lib` 模块不声明对 `ROOT.rust` 之外的依赖（lib 为 crate 根入口）
- **AND** `aggregate` 等模块不声明对 `lib` 的依赖（单向：lib 引用子模块）

#### Scenario: archi-rules 验证通过

- **WHEN** 执行 `dep-report archi-to-rules`
- **THEN** 生成的 `archi-rules.json` 包含 `archi-rust-types` 规则
- **AND** 规则中 `path` 指向 `packages/rust/src/types`（可匹配 `types.rs`）
- **AND** 包含 `archi-rust-lib` 规则
- **AND** 规则中 `path` 指向 `packages/rust/src/lib`（可匹配 `lib.rs`）

## Module Contract

| Module | Function/Component | Change |
|--------|-------------------|--------|
| `.dc-reporter/architecture/rust.c4` | 架构模型文件 | 修改：新增 `types` 和 `lib` 模块定义，添加子模块依赖边 |
| `packages/rust/src/types.rs` | 数据结构 | 无变化（代码不变，仅架构模型新增） |
| `packages/rust/src/lib.rs` | 库入口/WASM 导出 | 无变化（代码不变，仅架构模型新增） |
