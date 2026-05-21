## Context

当前 `analyze` 要求 `-p` 必需参数，`open` 的 `-f` 也为可选但无默认值。项目已有约定输出目录 `<cwd>/.dc-reporter/scans/`，`analyze` 的默认输出路径已经使用该目录。本设计利用此约定消除重复参数输入。

## Goals / Non-Goals

**Goals:**
- `analyze` 不传 `-p` 时默认分析当前目录（`"."`）
- `open` 不传 `-f` 时默认读取 `<cwd>/.dc-reporter/scans/<cwd-basename>-graph.json`，与 `analyze` 默认输出路径一致
- 不影响现有的显式传参行为

**Non-Goals:**
- 不支持 `.dc-reporter/scans/` 下多文件的选择交互
- 不自动调用 `analyze` 作为 `open` 的前置步骤
- 不修改 `--cwd` 的行为

## Decisions

### 1. `analyze` 的 `--path` 默认值

**决策**: 默认 `"."`，即当前进程工作目录。

`resolve(cwd, ".")` 等同于 `resolve(cwd)`。这让用户在项目根目录直接运行 `dep-report analyze` 即可。

**备选**: 默认 `cwd` 值（全局 `--cwd`）。`cwd` 默认也是 `"."`，两者等价，因此直接用 `"."` 更简洁。

### 2. `open` 的图文件自动发现策略

**决策**: 默认读取 `<cwd>/.dc-reporter/scans/<cwd-basename>-graph.json`，与 `analyze` 的默认输出路径保持一致。

`analyze` 不传 `-p` 时默认分析 `"."`，输出文件名为 `basename(resolve(cwd))-graph.json`。`open` 采用相同命名规则查找，确保 `dep-report analyze && dep-report open` 无需额外参数即可串联。

**备选**: 扫描 `.dc-reporter/scans/` 下所有 JSON 取最新。此方案在多次分析不同目录后可能取到非预期的文件，确定性不如命名匹配。

### 3. 无可用图文件时的行为

**决策**: 无图文件时正常启动服务器，不报错。

这允许用户通过前端界面上传 JSON 文件（拖放功能已存在）。`/api/graph` 端点在没有图文件时返回 404，前端已处理此情况。

**备选**: 打印警告后退出。排除原因是这会阻止上传工作流。

## Risks / Trade-offs

- [默认文件不存在时无图加载] → 静默处理，服务器正常启动，用户可通过上传或显式指定 `-f` 使用
