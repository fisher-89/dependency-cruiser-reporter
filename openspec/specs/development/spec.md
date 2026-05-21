# 开发规范

## Purpose

定义开发环境配置、测试执行流程和贡献流程规范。

## Requirements

### Requirement: 环境先决条件

开发环境 SHALL 具备以下工具：

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | CLI 和前端运行时 |
| pnpm | 8+ | 包管理器（工作区） |
| Rust | 1.70+ | 原生二进制编译 |

### Requirement: 快速开始

系统 SHALL 支持以下启动流程：

```bash
git clone <repo-url>
cd dependency-cruiser-reporter
pnpm install
cd packages/rust && cargo build --release && cd ../..
pnpm build:ts
cd packages/cli && pnpm link --global
dep-report --help
```

### Requirement: 项目结构

项目 SHALL 按以下结构组织：

```
dependency-cruiser-reporter/
├── packages/
│   ├── cli/               # CLI 命令和 HTTP 服务器
│   ├── rust/              # Rust 原生二进制
│   ├── frontend/          # React + Vite 应用
│   └── e2e/               # 集成测试
├── openspec/              # OpenSpec 规范
├── openspec/              # OpenSpec 规范
├── CLAUDE.md              # Claude Code 指令
└── package.json           # 工作区根
```

### Requirement: 包开发命令

#### Rust 包

```bash
cd packages/rust
cargo build              # Debug 构建
cargo build --release    # Release 构建（优化）
cargo test               # 运行测试
cargo clippy             # 代码检查
cargo fmt --check        # 格式检查
```

#### 前端包

```bash
cd packages/frontend
pnpm dev                 # 启动开发服务器 (http://localhost:5173)
pnpm typecheck           # 类型检查
pnpm lint                # 代码检查
pnpm build               # 生产构建
pnpm preview             # 预览生产构建
```

#### CLI 包

```bash
cd packages/cli
pnpm build               # 构建
pnpm link --global       # 全局链接
dep-report --help        # 运行
```

### Requirement: 工作区命令

根目录 SHALL 提供以下命令：

```bash
pnpm build           # 构建所有包 (TS + Rust)
pnpm build:ts        # 仅构建 TypeScript 包
pnpm build:rust      # 构建 Rust 二进制
pnpm test            # 运行所有测试
pnpm lint            # 检查所有包
pnpm demo            # 扫描演示项目 + 打开查看器
```

### Requirement: 测试框架

系统 SHALL 使用以下测试框架：

| 包 | 框架 | 位置 |
|------|------|------|
| Rust | cargo test | `packages/rust/src/lib_test.rs` |
| CLI/E2E | Node.js test runner | `packages/e2e/cli.test.js` |

### Requirement: Rust 测试

Rust 测试 SHALL 使用 `#[cfg(test)]` 模块内联编写：

#### Scenario: 运行 Rust 测试

```bash
cd packages/rust
cargo test              # 运行所有测试
cargo test -- --nocapture  # 显示输出
cargo test test_name    # 运行特定测试
```

#### Scenario: 编写 Rust 测试

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_my_feature() {
        let input = ...;
        let result = process(input);
        assert_eq!(result, expected);
    }
}
```

### Requirement: CLI 集成测试

CLI 集成测试 SHALL 使用 Node.js 内置测试运行器：

#### Scenario: 运行 CLI 测试

```bash
cd packages/e2e
pnpm test
node --test cli.test.js  # 详细输出
```

#### Scenario: 测试结构

```
packages/e2e/
├── package.json
├── cli.test.js         # CLI 集成测试
└── fixtures/
    └── sample-cruise.json
```

#### Scenario: CLI 测试用例

| 测试 | 描述 |
|------|------|
| `--help shows usage` | 验证帮助输出包含命令名 |
| `analyze --help shows options` | 验证 analyze 选项列出 |
| `open --help shows options` | 验证 open 选项列出 |
| `analyze requires --input` | 验证缺少输入退出错误 |
| `dcr-aggregate processes sample input` | 运行 Rust 二进制验证输出结构 |

### Requirement: 调试测试

#### Scenario: 调试 Rust 测试

```bash
cargo test -- --nocapture      # 打印调试输出
cargo test test_name           # 运行特定测试
```

#### Scenario: 调试 CLI 测试

```bash
node --test cli.test.js        # 详细输出
node --test --test-name-pattern "analyze" cli.test.js  # 按名运行
```

### Requirement: 开发哲学

贡献者 SHALL 遵循以下原则：

1. **编码前思考** — 陈述假设，不清楚则询问
2. **简单优先** — 无推测性功能
3. **手术式修改** — 仅触及必要部分
4. **验证** — 每次修改追溯至请求

### Requirement: 工作流

贡献者 SHALL 遵循以下工作流：

#### Scenario: 开始前

1. 检查现有 issues
2. 在 issue 评论中讨论方法

#### Scenario: 做修改

1. 遵循现有代码风格
2. 运行代码检查：`pnpm lint` / `cargo clippy`
3. 编写/更新测试
4. 更新文档（如需要）

#### Scenario: 提交前验证

```bash
pnpm build:ts
cd packages/frontend && pnpm typecheck && pnpm lint && cd ../..
cd packages/rust && cargo test && cargo clippy && cargo fmt --check && cd ../..
cd packages/e2e && pnpm test && cd ../..
```

#### Scenario: 提交 PR

1. 清晰标题和描述
2. 链接到 issue
3. 描述已执行的测试

### Requirement: 代码风格

#### TypeScript

- 使用 Biome 格式化/检查
- 优先函数式组件 + hooks
- 使用 TypeScript 严格模式

```bash
cd packages/frontend
pnpm lint          # 检查
pnpm format        # 自动修复
```

#### Rust

- 遵循标准 Rust 约定
- 提交前运行 `cargo fmt`
- 运行 `cargo clippy` 修复警告

```bash
cd packages/rust
cargo fmt          # 格式化
cargo clippy       # 检查
```

### Requirement: 提交消息

提交消息 SHALL 使用 conventional commits：

```
<type>: <description>

[optional body]
```

类型：`feat` | `fix` | `docs` | `refactor` | `test` | `chore`

示例：
```
feat: add analyze command for running dependency-cruiser
fix: correct edge type detection for dynamic imports
docs: update API reference with new options
```

### Requirement: PR 检查清单

PR 提交前 SHALL 满足：

- [ ] 代码编译无错误
- [ ] 代码检查通过（Biome, Clippy）
- [ ] 测试通过
- [ ] 文档更新
- [ ] 提交消息遵循约定
- [ ] PR 链接到 issue

### Requirement: 故障排除

#### Scenario: node_modules 问题

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### Scenario: Rust 构建错误

```bash
rustup update
cd packages/rust && cargo build --release
```

#### Scenario: CLI 未找到

```bash
cd packages/cli && pnpm link --global
```

## References

- OpenSpec 开发规范：`openspec/specs/development/spec.md`
- Claude 指令：`CLAUDE.md`
