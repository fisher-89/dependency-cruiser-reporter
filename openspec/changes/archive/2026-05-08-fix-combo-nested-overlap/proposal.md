## Why

多级 combo 嵌套时，子 combo 显示重叠。当前力导向布局（commit 780de37）只应用于顶层 combo，而嵌套子 combo 在 Phase 3 使用简单网格布局，没有重叠检测和分离逻辑。

## What Changes

- 修复 Rust `layout.rs` 中 `position_children_in_combo` 函数，为嵌套子 combo 添加重叠分离逻辑
- 增强力导向布局参数，确保深层嵌套情况下也能收敛
- 添加针对多级嵌套场景的测试用例

## Capabilities

### New Capabilities

(none - 纯 bug 修复)

### Modified Capabilities

- `backend`: 力导向布局算法需保证所有层级的 sibling combo 不重叠，不仅是顶层

## Impact

- `packages/rust/src/layout.rs` - 核心修改
- `packages/rust/src/layout_test.rs` - 新增测试
- `openspec/specs/backend/spec.md` - 更新布局保证 spec
