## 1. 重构 - 提取公共防重叠函数

- [x] 1.1 在 `layout.rs` 中提取 `resolve_overlaps(combo_indices, combos)` 函数，将 Phase 2 后处理逻辑抽取出来
- [x] 1.2 修改 `apply_force_layout` 使用新 `resolve_overlaps` 函数
- [x] 1.3 运行现有测试确保行为不变

## 2. 修复 - Phase 3 添加防重叠后处理

- [x] 2.1 在 `position_children_in_combo` 网格定位后，对子 combo 调用 `resolve_overlaps`
- [x] 2.2 验证 `offset_subtree` 在重叠分离后正确更新子树位置
- [x] 2.3 运行 Rust 测试 `cargo test -p dcr-aggregate`

## 3. 测试 - 添加多级嵌套场景

- [x] 3.1 添加三层嵌套 sibling combo 测试用例（root → src → (components, utils, hooks)）
- [x] 3.2 添加四层深层嵌套 sibling combo 测试用例（root → src → components → (ui, layout)）
- [x] 3.3 添加混合节点和 combo 的嵌套测试用例
- [x] 3.4 验证所有测试通过

## 4. 集成验证

- [x] 4.1 运行 `pnpm build` 构建全部
- [x] 4.2 运行 `pnpm demo` 并在浏览器验证嵌套 combo 显示正确
- [x] 4.3 更新 `openspec/specs/backend/spec.md` 的布局保证描述
