## 1. analyze 命令默认路径

- [x] 1.1 `cli.ts`: 将 `analyze` 命令的 `.requiredOption('-p, --path <dir>', ...)` 改为 `.option('-p, --path <dir>', ...)` 并设默认值 `"."`
- [x] 1.2 `analyze.ts`: 确保 `path` 参数为 `undefined` 时使用默认值 `"."`（Commander 默认值已覆盖，此处作为防御）

## 2. open 命令默认图文件

- [x] 2.1 `open.ts`: 当 `file` 参数为 `undefined` 时，构造默认路径 `<cwd>/.dc-reporter/scans/<basename(resolve(cwd))>-graph.json`
- [x] 2.2 `open.ts`: 若默认文件存在，使用它并打印 "Using graph file: <path>"；若不存在，静默处理，服务器正常启动

## 3. 验收

- [x] 3.1 运行 `dep-report analyze` 不带 `-p`，确认默认分析当前目录且输出到 `.dc-reporter/scans/`
- [x] 3.2 运行 `dep-report open` 不带 `-f`，确认自动发现 `.dc-reporter/scans/` 下的图文件
- [x] 3.3 运行 `dep-report open` 在无 `.dc-reporter/scans/` 目录时，确认服务器正常启动
- [x] 3.4 运行 `dep-report analyze -p ./src` 和 `dep-report open -f custom.json`，确认显式传参仍正常
