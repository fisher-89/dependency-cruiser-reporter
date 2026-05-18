## Why

当前 `analyze` 和 `open` 命令分别要求 `-p` 和 `-f` 参数，但项目已有约定好的输出目录 `.dc-reporter/scans/`。每次手动指定路径是重复劳动，应利用已有的目录约定自动发现，简化标准工作流。

## What Changes

- `analyze` 命令：`-p, --path` 从必需改为可选，默认值为 `"."`（当前目录），输出仍为 `.dc-reporter/scans/<dirname>-graph.json`
- `open` 命令：`-f, --file` 未传时，自动从 `<cwd>/.dc-reporter/scans/` 目录查找可用的图文件（按修改时间取最新），无需手动指定
- `open` 命令无 `-f` 且 `.dc-reporter/scans/` 下无图文件时，仍正常启动服务器（允许上传 JSON 使用）

## Capabilities

### New Capabilities

- `graph-auto-discovery`: `open` 命令在未指定 `-f` 时自动从 `.dc-reporter/scans/` 发现图文件

### Modified Capabilities

- `cli`: `analyze` 的 `--path` 从必需改为可选（默认 `"."`）；`open` 的 `--file` 支持自动发现

## Impact

- `packages/cli/src/bin/cli.ts` — Commander 定义（去必需、加默认值）
- `packages/cli/src/commands/analyze.ts` — `path` 参数默认值
- `packages/cli/src/commands/open.ts` — `file` 参数默认值 & 自动发现逻辑
- `packages/cli/src/utils/server.ts` — 无需修改（已有 `graphFile?` 可选支持）
- `openspec/specs/cli/spec.md` — 更新命令参数表和场景
