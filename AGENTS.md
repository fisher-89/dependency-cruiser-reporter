# AGENTS.md - OpenCode Session Guide

## 核心原则

### docs 是唯一的真

- **docs/SPEC.md** 是项目的设计文档
- 编码前 **必须** 阅读 docs
- 任何变更 **必须** 更新 docs
- 不要猜测设计意图 → 查看 docs

## 项目结构

```
dependency-cruiser-reporter/
├── docs/
│   └── SPEC.md              # 项目设计文档（必须阅读）
├── packages/                # 源代码
│   ├── rust/                # Rust 预处理引擎
│   └── frontend/            # 前端展示
└── AGENTS.md               # 本文件
```

## 开发流程

### 开始前

1. 阅读 `docs/SPEC.md` 顶层设计
2. 确认功能范围和优先级
3. 如有疑问 → 先问用户再编码

### 编码中

- 实现前：查看 docs 相关章节
- 遇到设计决策：参考 docs
- 发现设计遗漏：提出并更新 docs

### 完成后

- 验证实现是否符合 docs
- 如有偏差 → 更新 docs 或确认修正

## 关键约束

1. **禁止** 在未阅读 docs 的情况下开始编码
2. **禁止** 实现 docs 中未定义的功能（除非必要）
3. **必须** 在 docs 变更时更新本文件
4. **必须** 在实现功能后更新 docs

## 代码风格

### Rust

- 遵循 Rust 官方 [RFC 1685](https://github.com/rust-lang-nursery/rfcs/blob/master/text/1685-doc-overrides.md) 文档规范
- 使用 `rustfmt` 格式化代码
- 使用 `cargo clippy` 进行静态检查
- 依赖声明在 `Cargo.toml` 中

### 前端 (TypeScript/React)

- 使用 Biome 进行格式化 (biome.json)
- 使用 TypeScript 严格模式
- 组件文件使用 `.tsx` 扩展名
- 样式使用 CSS Modules 或内联样式

## 开发环境

### 前置依赖

- Node.js >= 18
- Rust (stable)
- pnpm (推荐) 或 npm

### 快速开始

```bash
# 安装前端依赖
cd packages/frontend && pnpm install

# 启动前端开发服务器
pnpm dev

# 构建 Rust
cd packages/rust && cargo build

# 运行完整测试
pnpm build && cargo run --release
```

### 常用命令

```bash
# 前端
pnpm dev          # 开发服务器
pnpm build       # 构建生产包
pnpm typecheck   # 类型检查

# Rust
cargo build      # 编译
cargo test      # 运行测试
cargo clippy     # Lint
cargo fmt       # 格式化
```

## 测试/验证要求

### 功能验证

- 修改代码后必须验证功能正常
- 运行 `pnpm build` 确保构建通过
- 运行 `cargo build` 确保 Rust 编译通过
- 运行 `lsp_diagnostics` 检查类型错误

### 检查清单

- [ ] 前端构建成功 (`pnpm build`)
- [ ] Rust 编译成功 (`cargo build`)
- [ ] 无新增类型错误
- [ ] 功能符合 docs 设计

## 开始使用

```bash
# 1. 阅读顶层设计
open docs/SPEC.md

# 2. 确认你的任务范围
#    - 查看"优先级"章节
#    - 查看"技术架构"

# 3. 开始编码
```