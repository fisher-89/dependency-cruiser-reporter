# 可配置存储目录 (configurable-storage-dir) — 实施任务

## 阶段一：路径解析工具函数

- [x] 新增 `packages/cli/src/utils/storage.ts`，导出 `parseStorageDir(storageDir: string, absCwd: string): string` 函数，封装相对路径基于 `absCwd` 解析、绝对路径直接返回的逻辑

## 阶段二：Action 层接口与路径替换

- [x] `packages/cli/src/actions/analyze.ts` — `AnalyzeOptions` 新增 `storageDir?: string` 字段；`analyze()` 函数读取 `options.storageDir || '.dc-reporter'`，调用 `parseStorageDir` 得到 `absStorageDir`；默认输出路径从 `resolve(absCwd, '.dc-reporter', 'scans', ...)` 替换为 `resolve(absStorageDir, 'scans', ...)`
- [x] `packages/cli/src/actions/archi-to-rules.ts` — `ArchiToRulesOptions` 新增 `storageDir?: string` 字段
- [x] `packages/cli/src/actions/archi-to-rules.ts` — `loadC4Model()` 函数签名新增 `storageDir: string` 参数；`archDir` 从 `join(resolve(cwd), '.dc-reporter', 'architecture')` 替换为 `join(resolve(cwd), storageDir, 'architecture')`
- [x] `packages/cli/src/actions/archi-to-rules.ts` — `archiToRules()` 函数读取 `options.storageDir || '.dc-reporter'`，调用 `parseStorageDir` 得到 `absStorageDir`；调用 `loadC4Model` 时传入 `storageDir` 参数；默认 `outputPath` 从 `resolve(absCwd, '.dc-reporter', 'archi-rules.json')` 替换为 `resolve(absStorageDir, 'archi-rules.json')`

## 阶段三：命令转发层接口透传

- [x] `packages/cli/src/commands/analyze/index.ts` — `analyze()` 函数将 `options.storageDir` 透传给 `doAnalyze()`
- [x] `packages/cli/src/commands/dashboard/index.ts` — `DashboardOptions` 新增 `storageDir?: string` 字段；默认文件发现路径从 `resolve(absCwd, '.dc-reporter', 'scans', ...)` 替换为 `resolve(parseStorageDir(storageDir, absCwd), 'scans', ...)`；`createServer` 调用时传入 `storageDir`
- [x] `packages/cli/src/commands/archi-to-rules/index.ts` — `archiToRules()` 函数将 `options.storageDir` 透传给 `doArchiToRules()`

## 阶段四：服务层接口透传

- [x] `packages/cli/src/server/server.ts` — `ServerOptions` 新增 `storageDir?: string` 字段；`DcrServer` 构造函数存储 `this.storageDir`（默认 `'.dc-reporter'`）；`setupArchitectureRoutes` 调用时新增 `this.storageDir` 参数；`setupAnalyzeDepRoute` 调用时 options 中新增 `storageDir: this.storageDir`
- [x] `packages/cli/src/server/architecture/architecture.ts` — `setupArchitectureRoutes` 函数签名新增 `storageDir: string` 参数；两处 `archDir` 构建从 `.dc-reporter/architecture` 替换为 `resolve(cwd, storageDir, 'architecture')`（`GET /api/architecture/model` 和 `POST /api/architecture/generate`）
- [x] `packages/cli/src/server/dep/analyze.ts` — `setupAnalyzeDepRoute` 函数签名新增 `storageDir: string` 参数；调用 `analyze()` 时传入 `storageDir`

## 阶段五：CLI 入口全局选项

- [x] `packages/cli/src/bin/cli.ts` — 在 `--cwd` 选项后新增全局 `--storage-dir <path>` 选项，默认值 `.dc-reporter`；每个命令的 action 中从 `program.opts().storageDir` 读取值并传入各命令函数
