# 图文件自动发现

## Purpose

定义 `dashboard` 命令在未指定 `-f, --file` 时的图文件自动发现行为。

## Requirements

### Requirement: 图文件自动发现

`dashboard` 命令在未指定 `-f, --file` 时，SHALL 默认读取 `<cwd>/.dc-reporter/scans/<cwd-basename>-graph.json`，与 `analyze` 默认输出路径一致。

#### Scenario: 默认文件存在

- **WHEN** 用户执行 `dep-report dashboard` 不传 `-f`
- **AND** `<cwd>/.dc-reporter/scans/<cwd-basename>-graph.json` 文件存在
- **THEN** 系统使用该文件作为图文件
- **AND** 终端打印 "Using graph file: <filepath>"
- **AND** 服务器正常启动并预加载该图文件

#### Scenario: 默认文件不存在

- **WHEN** 用户执行 `dep-report dashboard` 不传 `-f`
- **AND** `<cwd>/.dc-reporter/scans/<cwd-basename>-graph.json` 文件不存在
- **THEN** 系统不报错，服务器正常启动
- **AND** 不预加载任何图文件

#### Scenario: 显式传 -f 跳过自动发现

- **WHEN** 用户执行 `dep-report dashboard -f custom.json`
- **THEN** 系统直接使用 `custom.json`，不进行自动发现
