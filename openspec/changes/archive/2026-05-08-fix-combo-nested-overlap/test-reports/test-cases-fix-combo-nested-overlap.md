# Test Cases: fix-combo-nested-overlap

> Framework: jest
> Generated: auto

## Test Cases by Task

### Task 1: 1.1 在 `layout.rs` 中提取 `resolve_overlaps(combo_indices, combos)` 函数，将 Phase 2 后处理逻辑抽取出来

**Test file**: `1.1_`layout.rs`_中提取.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 1.1
- [ ] Test 2: Should correctly handle `layout.rs`
- [ ] Test 3: Should correctly handle 中提取
- [ ] Test 4: Should return error for invalid 1.1

#### Integration Tests
- [ ] Test 1: End-to-end flow for 1.1 在 `layout.rs` 中提取 `resolve_overlaps(combo_indices, combos)` 函数，将 Phase 2 后处理逻辑抽取出来

#### Edge Cases
- [ ] Test 1: Empty or null 1.1
- [ ] Test 2: Concurrent access to 1.1

### Task 2: 1.2 修改 `apply_force_layout` 使用新 `resolve_overlaps` 函数

**Test file**: `1.2_修改_`apply_force_layout`.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 1.2
- [ ] Test 2: Should correctly handle `apply_force_layout`
- [ ] Test 3: Should correctly handle 使用新
- [ ] Test 4: Should return error for invalid 1.2

#### Integration Tests
- [ ] Test 1: End-to-end flow for 1.2 修改 `apply_force_layout` 使用新 `resolve_overlaps` 函数

#### Edge Cases
- [ ] Test 1: Empty or null 1.2
- [ ] Test 2: Concurrent access to 1.2

### Task 3: 1.3 运行现有测试确保行为不变

**Test file**: `1.3_运行现有测试确保行为不变.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 1.3
- [ ] Test 2: Should correctly handle 运行现有测试确保行为不变
- [ ] Test 3: Should return error for invalid 1.3

#### Integration Tests
- [ ] Test 1: End-to-end flow for 1.3 运行现有测试确保行为不变

#### Edge Cases
- [ ] Test 1: Empty or null 1.3
- [ ] Test 2: Concurrent access to 1.3

### Task 4: 2.1 在 `position_children_in_combo` 网格定位后，对子 combo 调用 `resolve_overlaps`

**Test file**: `2.1_`position_children_in_combo`_网格定位后，对子.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 2.1
- [ ] Test 2: Should correctly handle `position_children_in_combo`
- [ ] Test 3: Should correctly handle 网格定位后，对子
- [ ] Test 4: Should return error for invalid 2.1

#### Integration Tests
- [ ] Test 1: End-to-end flow for 2.1 在 `position_children_in_combo` 网格定位后，对子 combo 调用 `resolve_overlaps`

#### Edge Cases
- [ ] Test 1: Empty or null 2.1
- [ ] Test 2: Concurrent access to 2.1

### Task 5: 2.2 验证 `offset_subtree` 在重叠分离后正确更新子树位置

**Test file**: `2.2_验证_`offset_subtree`.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 2.2
- [ ] Test 2: Should correctly handle `offset_subtree`
- [ ] Test 3: Should correctly handle 在重叠分离后正确更新子树位置
- [ ] Test 4: Should return error for invalid 2.2

#### Integration Tests
- [ ] Test 1: End-to-end flow for 2.2 验证 `offset_subtree` 在重叠分离后正确更新子树位置

#### Edge Cases
- [ ] Test 1: Empty or null 2.2
- [ ] Test 2: Concurrent access to 2.2

### Task 6: 2.3 运行 Rust 测试 `cargo test -p dcr-aggregate`

**Test file**: `2.3_运行_rust.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 2.3
- [ ] Test 2: Should correctly handle rust
- [ ] Test 3: Should correctly handle `cargo
- [ ] Test 4: Should return error for invalid 2.3

#### Integration Tests
- [ ] Test 1: End-to-end flow for 2.3 运行 Rust 测试 `cargo test -p dcr-aggregate`

#### Edge Cases
- [ ] Test 1: Empty or null 2.3
- [ ] Test 2: Concurrent access to 2.3

### Task 7: 3.1 添加三层嵌套 sibling combo 测试用例（root → src → (components, utils, hooks)）

**Test file**: `3.1_添加三层嵌套_sibling.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 3.1
- [ ] Test 2: Should correctly handle 添加三层嵌套
- [ ] Test 3: Should correctly handle sibling
- [ ] Test 4: Should return error for invalid 3.1

#### Integration Tests
- [ ] Test 1: End-to-end flow for 3.1 添加三层嵌套 sibling combo 测试用例（root → src → (components, utils, hooks)）

#### Edge Cases
- [ ] Test 1: Empty or null 3.1
- [ ] Test 2: Concurrent access to 3.1

### Task 8: 3.2 添加四层深层嵌套 sibling combo 测试用例（root → src → components → (ui, layout)）

**Test file**: `3.2_添加四层深层嵌套_sibling.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 3.2
- [ ] Test 2: Should correctly handle 添加四层深层嵌套
- [ ] Test 3: Should correctly handle sibling
- [ ] Test 4: Should return error for invalid 3.2

#### Integration Tests
- [ ] Test 1: End-to-end flow for 3.2 添加四层深层嵌套 sibling combo 测试用例（root → src → components → (ui, layout)）

#### Edge Cases
- [ ] Test 1: Empty or null 3.2
- [ ] Test 2: Concurrent access to 3.2

### Task 9: 3.3 添加混合节点和 combo 的嵌套测试用例

**Test file**: `3.3_添加混合节点和_combo.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 3.3
- [ ] Test 2: Should correctly handle 添加混合节点和
- [ ] Test 3: Should correctly handle combo
- [ ] Test 4: Should return error for invalid 3.3

#### Integration Tests
- [ ] Test 1: End-to-end flow for 3.3 添加混合节点和 combo 的嵌套测试用例

#### Edge Cases
- [ ] Test 1: Empty or null 3.3
- [ ] Test 2: Concurrent access to 3.3

### Task 10: 3.4 验证所有测试通过

**Test file**: `3.4_验证所有测试通过.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 3.4
- [ ] Test 2: Should correctly handle 验证所有测试通过
- [ ] Test 3: Should return error for invalid 3.4

#### Integration Tests
- [ ] Test 1: End-to-end flow for 3.4 验证所有测试通过

#### Edge Cases
- [ ] Test 1: Empty or null 3.4
- [ ] Test 2: Concurrent access to 3.4

### Task 11: 4.1 运行 `pnpm build` 构建全部

**Test file**: `4.1_运行_`pnpm.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 4.1
- [ ] Test 2: Should correctly handle `pnpm
- [ ] Test 3: Should correctly handle build`
- [ ] Test 4: Should return error for invalid 4.1

#### Integration Tests
- [ ] Test 1: End-to-end flow for 4.1 运行 `pnpm build` 构建全部

#### Edge Cases
- [ ] Test 1: Empty or null 4.1
- [ ] Test 2: Concurrent access to 4.1

### Task 12: 4.2 运行 `pnpm demo` 并在浏览器验证嵌套 combo 显示正确

**Test file**: `4.2_运行_`pnpm.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 4.2
- [ ] Test 2: Should correctly handle `pnpm
- [ ] Test 3: Should correctly handle demo`
- [ ] Test 4: Should return error for invalid 4.2

#### Integration Tests
- [ ] Test 1: End-to-end flow for 4.2 运行 `pnpm demo` 并在浏览器验证嵌套 combo 显示正确

#### Edge Cases
- [ ] Test 1: Empty or null 4.2
- [ ] Test 2: Concurrent access to 4.2

### Task 13: 4.3 更新 `openspec/specs/backend/spec.md` 的布局保证描述

**Test file**: `4.3_更新_`openspec.test.js`

#### Unit Tests
- [ ] Test 1: Should correctly handle 4.3
- [ ] Test 2: Should correctly handle `openspec
- [ ] Test 3: Should correctly handle specs
- [ ] Test 4: Should return error for invalid 4.3

#### Integration Tests
- [ ] Test 1: End-to-end flow for 4.3 更新 `openspec/specs/backend/spec.md` 的布局保证描述

#### Edge Cases
- [ ] Test 1: Empty or null 4.3
- [ ] Test 2: Concurrent access to 4.3

---

*This report was auto-generated by the OpenSpec PreToolUse hook.*