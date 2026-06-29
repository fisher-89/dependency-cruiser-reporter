# storage-dir Specification

## Purpose
TBD - created by archiving change configurable-storage-dir. Update Purpose after archive.
## Requirements
### Requirement: 存储目录路径解析

系统 SHALL 接收 `--storage-dir` 参数并将其解析为绝对路径，用于所有文件读写操作。

#### Scenario: 默认值

- **WHEN** 用户不传 `--storage-dir`
- **THEN** 系统使用默认值 `".dc-reporter"` 作为存储目录
- **AND** 输出路径与 `<cwd>/.dc-reporter/` 一致，与现有版本完全向后兼容

#### Scenario: 相对路径解析

- **WHEN** 用户传入 `--storage-dir .data`
- **AND** `--cwd` 为默认值 `"."`
- **THEN** 系统调用 `resolve(process.cwd(), '.data')` 解析为绝对路径
- **AND** 所有输出文件写入解析后的目录

#### Scenario: 相对路径结合 --cwd

- **WHEN** 用户传入 `--storage-dir .data`
- **AND** `--cwd /workspace/my-project`
- **THEN** 系统调用 `resolve('/workspace/my-project', '.data')` 解析为 `/workspace/my-project/.data`
- **AND** 所有输出文件写入该目录

#### Scenario: 绝对路径直接使用

- **WHEN** 用户传入 `--storage-dir /tmp/dcr-output`
- **THEN** 系统直接使用 `/tmp/dcr-output` 作为存储根目录
- **AND** 不进行 `--cwd` 相关的路径拼接

#### Scenario: 路径中包含 Windows 盘符

- **WHEN** 用户传入 `--storage-dir D:\dcr-data`
- **AND** 平台为 Windows
- **THEN** 系统使用 `D:\dcr-data` 作为存储根目录（绝对路径，不结合 `--cwd`）

#### Scenario: 空字符串参数

- **WHEN** 用户传入 `--storage-dir ""`
- **THEN** Commander 将空字符串识别为参数值
- **AND** 系统使用 `resolve(absCwd, "")` 解析，结果为 `absCwd` 本身

### Requirement: 存储目录结构

系统 SHALL 在 `storageDir` 下维护与 `.dc-reporter/` 相同的子目录结构。

#### Scenario: 扫描文件存储

- **WHEN** 执行 `dep-report analyze --storage-dir .data`
- **THEN** 图文件写入 `<absStorageDir>/scans/<dirname>-graph.json`
- **AND** `scans/` 目录若不存在则自动创建

#### Scenario: 架构文件存储

- **WHEN** 执行 `dep-report archi-to-rules --storage-dir .data`
- **THEN** 系统从 `<absStorageDir>/architecture/` 读取 `.c4` 文件
- **AND** 规则文件写入 `<absStorageDir>/archi-rules.json`

#### Scenario: Dashboard 自动发现

- **WHEN** 执行 `dep-report dashboard --storage-dir .data`
- **AND** 不传 `-f`
- **THEN** 系统从 `<absStorageDir>/scans/<cwd-basename>-graph.json` 自动发现图文件

### Requirement: 路径解析函数

系统 SHALL 实现统一的路径解析逻辑，确保所有文件操作使用一致的解析规则。

#### Scenario: 路径解析规则

- **WHEN** 系统需要计算存储根目录的绝对路径
- **THEN** 使用如下逻辑：
  ```
  const absCwd = resolve(cwd);
  const absStorageDir = resolve(absCwd, storageDir);
  ```
- **AND** `storageDir` 默认值为 `".dc-reporter"`
- **AND** `cwd` 默认值为 `"."`

### Requirement: 向后兼容性

系统 SHALL 确保不传 `--storage-dir` 时行为与现有版本完全一致。

#### Scenario: 默认值向后兼容

- **WHEN** 用户执行 `dep-report analyze`（不带 `--storage-dir`）
- **THEN** 系统使用 `resolve(absCwd, '.dc-reporter')` 作为存储根
- **AND** 行为与引入 `--storage-dir` 之前的版本完全相同

#### Scenario: 默认 Dashboard 文件发现

- **WHEN** 用户执行 `dep-report dashboard`（不带 `--storage-dir`）
- **THEN** 系统从 `<cwd>/.dc-reporter/scans/` 自动发现图文件
- **AND** 行为与引入 `--storage-dir` 之前的版本完全相同

#### Scenario: 默认架构目录

- **WHEN** 用户执行 `dep-report archi-to-rules`（不带 `--storage-dir`）
- **THEN** 系统从 `<cwd>/.dc-reporter/architecture/` 读取 `.c4` 文件
- **AND** 行为与引入 `--storage-dir` 之前的版本完全相同

