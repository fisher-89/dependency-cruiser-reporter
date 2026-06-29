# 测试设计: configurable-storage-dir

> **变更**: configurable-storage-dir
> **日期**: 2026-06-29

---

## 测试策略

### 分层策略

| 层级 | 覆盖范围 | 运行方式 | 断言风格 |
|------|----------|----------|----------|
| CLI 单元测试 | `parseStorageDir` 工具函数路径解析逻辑 | `vp test` (vitest) | expect.toBe, vi.spyOn |
| CLI 单元测试 | `actions/analyze.ts` 使用 storageDir 构造输出路径 | `vp test` (vitest) | expect.toBe, vi.spyOn |
| CLI 单元测试 | `actions/archi-to-rules.ts` 使用 storageDir 构造 archDir 和 output | `vp test` (vitest) | expect.toBe, vi.spyOn |
| CLI 单元测试 | `commands/*/index.ts` storageDir 参数透传 | `vp test` (vitest) | vi.spyOn, expect.toBe |
| CLI 单元测试 | `commands/dashboard/index.ts` storageDir 影响文件发现路径 | `vp test` (vitest) | expect.toBe, vi.spyOn |
| CLI 单元测试 | `server/server.ts` storageDir 参数传递至路由 | `vp test` (vitest) | vi.spyOn, expect.toBe |
| CLI 单元测试 | `server/architecture/architecture.ts` storageDir 构建 archDir | `vp test` (vitest) | expect.toBe, vi.spyOn |
| CLI 单元测试 | `server/dep/analyze.ts` storageDir 参数传递至 analyze() | `vp test` (vitest) | vi.spyOn, expect.toBe |
| CLI 单元测试 | `bin/cli.ts` 全局 --storage-dir 选项定义 | `vp test` (vitest) | expect.toBe, vi.spyOn |
| CLI 集成测试 | analyze 命令全流程（默认值/自定义相对路径/绝对路径/cwd 组合） | `vp test` (vitest) | expect.toBe, vi.spyOn |
| CLI 集成测试 | dashboard 命令全流程（默认/自定义 storageDir 文件发现） | `vp test` (vitest) | expect.toBe, vi.spyOn |
| CLI 集成测试 | archi-to-rules 命令全流程（默认/自定义 storageDir 路径构建） | `vp test` (vitest) | expect.toBe, vi.spyOn |
| CLI 集成测试 | createServer 编程式 API 传递 storageDir | `vp test` (vitest) | expect.toBe, vi.spyOn |
| CLI 集成测试 | 向后兼容性：不传 --storage-dir 行为与现有版本一致 | `vp test` (vitest) | expect.toBe, vi.spyOn |
| CLI 集成测试 | 幂等性：analyze() 两次调用输出文件一致 | `vp test` (vitest) | expect.toEqual, deepStrictEqual |
| CLI 集成测试 | 幂等性：archiToRules() 两次调用输出文件一致 | `vp test` (vitest) | expect.toEqual, deepStrictEqual |
| CLI 集成测试 | 幂等性：POST /api/architecture/generate 两次调用输出一致 | `vp test` (vitest) | expect.toEqual |
| CLI 集成测试 | 幂等性：dashboard() 文件发现结果稳定 | `vp test` (vitest) | expect.toEqual |
| E2E 测试 | CLI 二进制实际执行，验证 `--storage-dir` 选项行为 | `node --test` | assert.strictEqual, assert.ok |

### 文件组织

```
packages/cli/src/
  utils/
    storage.test.ts              -- parseStorageDir() 路径解析单元测试
  actions/
    analyze.test.ts              -- analyze() storageDir 路径构建单元测试
    archi-to-rules.test.ts       -- archiToRules() storageDir 路径构建单元测试
  commands/
    analyze/
      index.test.ts              -- analyze 命令 storageDir 参数透传单元测试
    archi-to-rules/
      index.test.ts              -- archi-to-rules 命令 storageDir 参数透传单元测试
    dashboard/
      index.test.ts              -- dashboard 命令 storageDir 路径构建单元测试
  server/
    server.test.ts               -- DcrServer storageDir 参数传递单元测试
    architecture/
      architecture.test.ts       -- setupArchitectureRoutes storageDir 路径单元测试
    dep/
      analyze.test.ts            -- setupAnalyzeDepRoute storageDir 参数传递单元测试
  bin/
    cli.test.ts                  -- CLI 全局 --storage-dir 选项定义单元测试

packages/cli/__tests__/
  analyze-default-storage-dir/
    analyze-default-storage-dir.test.ts       -- analyze 默认值集成测试
  analyze-custom-relative/
    analyze-custom-relative.test.ts           -- analyze 自定义相对路径集成测试
  analyze-absolute-path/
    analyze-absolute-path.test.ts             -- analyze 绝对路径集成测试
  dashboard-default/
    dashboard-default.test.ts                 -- dashboard 默认值集成测试
  dashboard-custom/
    dashboard-custom.test.ts                  -- dashboard 自定义路径集成测试
  archi-to-rules-default/
    archi-to-rules-default.test.ts            -- archi-to-rules 默认值集成测试
  archi-to-rules-custom/
    archi-to-rules-custom.test.ts             -- archi-to-rules 自定义路径集成测试
  storage-dir-with-cwd/
    storage-dir-with-cwd.test.ts              -- --cwd 与 --storage-dir 交互集成测试
  createserver-custom/
    createserver-custom.test.ts               -- createServer storageDir 集成测试
  backward-compatibility/
    backward-compatibility.test.ts            -- 向后兼容性集成测试
  analyze-idempotency/
    analyze-idempotency.test.ts               -- analyze() 幂等性集成测试
  archi-to-rules-idempotency/
    archi-to-rules-idempotency.test.ts        -- archiToRules() 幂等性集成测试
  architecture-generate-idempotency/
    architecture-generate-idempotency.test.ts -- POST /api/architecture/generate 幂等性集成测试
  dashboard-discovery-idempotency/
    dashboard-discovery-idempotency.test.ts   -- dashboard() 文件发现幂等性集成测试
  graph-source-meta/
    graph-source-meta.test.ts                 -- 已有，更新 .dc-reporter 路径断言

packages/e2e/
  cli.test.ts                    -- E2E 测试（已有，新增 storage-dir 用例）
```

### 命名约定

- **F-N**: Forward acceptance criteria（正向验收路径）
- **R-N**: Reverse acceptance criteria（反向/错误处理路径）
- **B-N**: Boundary case（边界条件）
- **I-N**: Idempotency test（幂等性测试）
- **F-N (E2E-s)**: 通过集成测试验证的正向验收路径
- **F-N (E2E)**: 通过 E2E 测试验证的正向验收路径

---

## 验收范围

| # | 验收标准 | 对应测试 | 层级 | 测试文件 |
|---|----------|----------|------|----------|
| 1 | `dep-report analyze` 默认仍写入 `<cwd>/.dc-reporter/scans/` | F-1, F-1 (E2E-s), F-1 (E2E) | 单元 + 集成 + E2E | `storage.test.ts`, `analyze.test.ts`, `analyze-default-storage-dir.test.ts`, `cli.test.ts` |
| 2 | `dep-report analyze --storage-dir .my-dir` 写入 `.my-dir/scans/` | F-2, F-2 (E2E-s), F-2 (E2E) | 单元 + 集成 + E2E | `analyze.test.ts`, `analyze-custom-relative.test.ts`, `cli.test.ts` |
| 3 | `dep-report analyze --storage-dir /abs/path` 直接使用绝对路径 | F-3, F-3 (E2E-s) | 单元 + 集成 | `analyze.test.ts`, `analyze-absolute-path.test.ts`, `storage.test.ts` |
| 4 | `dep-report dashboard` 默认从 `<cwd>/.dc-reporter/scans/` 自动发现 | F-9, F-9 (E2E-s) | 单元 + 集成 | `dashboard/index.test.ts`, `dashboard-default.test.ts` |
| 5 | `dep-report dashboard --storage-dir .my-dir` 从 `.my-dir/scans/` 自动发现 | F-10, F-10 (E2E-s) | 单元 + 集成 | `dashboard/index.test.ts`, `dashboard-custom.test.ts` |
| 6 | `dep-report archi-to-rules` 默认从 `.dc-reporter/architecture/` 读取 | F-5, F-7, F-5 (E2E-s) | 单元 + 集成 | `archi-to-rules.test.ts`, `archi-to-rules-default.test.ts` |
| 7 | `dep-report archi-to-rules --storage-dir .arch` 从 `.arch/architecture/` 读取 | F-6, F-8, F-6 (E2E-s) | 单元 + 集成 | `archi-to-rules.test.ts`, `archi-to-rules-custom.test.ts` |
| 8 | `--storage-dir` 与 `--cwd` 交互正确：相对路径基于 `--cwd` 解析 | F-4, F-4 (E2E-s), F-4 (E2E) | 单元 + 集成 + E2E | `analyze.test.ts`, `storage-dir-with-cwd.test.ts`, `cli.test.ts` |
| 9 | `createServer({ storageDir: '.data' })` 使用自定义存储目录 | F-12, F-13, F-15, F-18, F-12 (E2E-s) | 单元 + 集成 | `server.test.ts`, `architecture.test.ts`, `dep/analyze.test.ts`, `createserver-custom.test.ts` |
| 10 | 不传 `--storage-dir` 时行为与现有版本完全一致 | F-1, F-5, F-7, F-9, F-1 (E2E-s) | 单元 + 集成 | `analyze.test.ts`, `dashboard/index.test.ts`, `archi-to-rules.test.ts`, `backward-compatibility.test.ts` |
| -- | analyze() 两次调用输出文件字节一致，无重复积累 | I-1, I-2 | 集成 | `analyze-idempotency.test.ts` |
| -- | archiToRules() 两次调用输出 archi-rules.json 一致 | I-3, I-4 | 集成 | `archi-to-rules-idempotency.test.ts` |
| -- | POST /api/architecture/generate 两次调用生成相同 main.c4 | I-5, I-6 | 集成 | `architecture-generate-idempotency.test.ts` |
| -- | dashboard() 重复调用发现相同文件列表 | I-7, I-8 | 集成 | `dashboard-discovery-idempotency.test.ts` |

> `#` 列中的编号对应 proposal.md 验收标准编号。`--` 表示该测试属于质量保障范围。

---

## 单元测试清单

### 1. parseStorageDir() 路径解析 (utils/storage.test.ts)

**实现状态**: 待实现。新增文件，直接测试 `parseStorageDir` 工具的路径解析行为，无需 mock。

**技术**: 导入 `parseStorageDir` 函数，传入参数组合验证返回值。

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-1 | undefined storageDir defaults to .dc-reporter | 默认值 | `storageDir` 为 `undefined`，`absCwd` 为 `/project` | 返回 `/project/.dc-reporter` |

#### 反向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| R-1 | undefined absCwd throws or resolves to cwd | absCwd 未定义 | `storageDir: '.data'`, `absCwd: undefined` | 函数应有合理的错误处理或默认值 |

#### 边界情况

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| B-1 | empty storageDir resolves to cwd | 空字符串 | `storageDir: ''`, `absCwd: '/project'` | `resolve('/project', '')` 返回 `/project` |
| B-2 | storageDir with special characters | 特殊字符 | `storageDir: './my data (v1)'` | 路径正确拼接，`resolve` 正常处理 |
| B-3 | storageDir with trailing slash | 尾部斜杠 | `storageDir: '.my-dir/'` | `resolve` 正确处理尾部斜杠 |

### 2. analyze() storageDir 路径构建 (actions/analyze.test.ts)

**实现状态**: 待实现。mock `dependency-cruiser` 调用和文件系统操作，验证输出路径构建逻辑。

**Mock 策略**: `vi.mock('dependency-cruiser')` 返回成功结果；`vi.mock('dependency-cruiser/config-utl/extract-depcruise-options')` 和 `vi.mock('dependency-cruiser/config-utl/extract-ts-config')` 返回空配置；`vi.spyOn(fs, 'writeFileSync')` 追踪调用参数。

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-1 | default storageDir constructs .dc-reporter/scans/ path | 默认值 | `path: '.'`, `cwd: '/project'`, `storageDir` 未指定 | `outputPath` 为 `/project/.dc-reporter/scans/<name>-graph.json` |
| F-2 | custom relative storageDir constructs correct path | 自定义相对路径 | `path: '.'`, `storageDir: '.my-dir'`, `cwd: '/project'` | `outputPath` 为 `/project/.my-dir/scans/<name>-graph.json` |
| F-3 | absolute storageDir is used directly | 绝对路径 | `path: '.'`, `storageDir: '/tmp/data'`, `cwd: '/project'` | `outputPath` 为 `/tmp/data/scans/<name>-graph.json` |
| F-4 | storageDir resolves relative to cwd | --cwd 交互 | `path: '.'`, `storageDir: '.data'`, `cwd: '/workspace/packages/core'` | `outputPath` 为 `/workspace/packages/core/.data/scans/<name>-graph.json` |

#### 反向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| R-2 | explicit output overrides storageDir default | 显式 output | `output: '/custom/output.json'`, `storageDir: '.my-dir'` | `writeFileSync` 使用 `/custom/output.json`，不受 storageDir 影响 |

### 3. archiToRules() storageDir 路径构建 (actions/archi-to-rules.test.ts)

**实现状态**: 待实现。mock `loadC4Model` 和文件系统操作，验证 archDir 和 output 路径构建。

**Mock 策略**: `vi.mock('@likec4/language-services/node')` 返回 mock C4 模型；`vi.spyOn(fs, 'existsSync')`, `vi.spyOn(fs, 'readdirSync')` 返回 mock 文件列表。

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-5 | default storageDir constructs .dc-reporter/architecture/ archDir | 默认值 | `cwd: '/project'`, `storageDir` 未指定 | archDir 为 `/project/.dc-reporter/architecture/` |
| F-6 | custom storageDir constructs custom archDir | 自定义相对路径 | `cwd: '/project'`, `storageDir: '.arch'` | archDir 为 `/project/.arch/architecture/` |
| F-7 | default storageDir constructs .dc-reporter/archi-rules.json output | 默认值 | `cwd: '/project'`, `storageDir` 未指定, `output` 未指定 | `outputPath` 为 `/project/.dc-reporter/archi-rules.json` |
| F-8 | custom storageDir constructs custom output path | 自定义路径 | `cwd: '/project'`, `storageDir: '.arch'` | `outputPath` 为 `/project/.arch/archi-rules.json` |

#### 反向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| R-3 | explicit output overrides storageDir-based default | 显式 output | `output: '/rules/custom.json'`, `storageDir: '.arch'` | `outputPath` 为 `/rules/custom.json` |

### 4. dashboard() storageDir 路径构建 (commands/dashboard/index.test.ts)

**实现状态**: 待实现。mock `createServer` 调用，验证默认文件发现路径和 serverOptions 传递。

**Mock 策略**: `vi.mock('../../server/server.js')` 替换 `createServer` 为 stub，通过模块级变量追踪参数。

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-9 | default storageDir constructs .dc-reporter/scans/ default file | 默认值 | `cwd: '/project'`, `storageDir` 未指定 | 默认文件路径为 `/project/.dc-reporter/scans/<basename>-graph.json` |
| F-10 | custom storageDir constructs custom default file | 自定义相对路径 | `cwd: '/project'`, `storageDir: '.my-dir'` | 默认文件路径为 `/project/.my-dir/scans/<basename>-graph.json` |
| F-11 | explicit file option overrides storageDir-based default | 显式 file | `file: '/custom/graph.json'`, `storageDir: '.my-dir'` | `createServer` 收到 `graphFile: '/custom/graph.json'` |

#### 边界情况

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| B-4 | default file does not exist falls back to no file | 默认文件不存在 | `existsSync` 返回 false | `createServer` 的 `graphFile` 为 `undefined` |
| B-5 | absolute storageDir used directly | 绝对路径 | `cwd: '/project'`, `storageDir: '/data'` | 默认文件路径为 `/data/scans/<basename>-graph.json` |

### 5. server.ts storageDir 参数传递 (server/server.test.ts)

**实现状态**: 待实现。构造 `DcrServer` 或调用 `createServer`，验证参数传递给各路由设置函数。

**Mock 策略**: `vi.mock('../architecture/architecture.js')` 和 `vi.mock('../dep/analyze.js')` 追踪 `storageDir` 参数。

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-12 | custom storageDir passed to setupArchitectureRoutes | 自定义值 | `storageDir: '.data'` | `setupArchitectureRoutes` 接收 `storageDir: '.data'` |
| F-13 | custom storageDir passed to setupAnalyzeDepRoute | 自定义值 | `storageDir: '.data'` | `setupAnalyzeDepRoute` 接收 `{ cwd: '.', storageDir: '.data' }` |
| F-14 | default storageDir resolved when undefined | 默认值 | `storageDir` 未指定 | 路由函数接收 `storageDir: '.dc-reporter'` |

### 6. setupArchitectureRoutes storageDir 路径 (server/architecture/architecture.test.ts)

**实现状态**: 待实现。直接调用 `setupArchitectureRoutes` 并验证路径构建。

**Mock 策略**: `vi.spyOn(fs, 'existsSync')`, `vi.spyOn(fs, 'readdirSync')`, `vi.spyOn(fs, 'writeFileSync')` mock 文件系统。

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-15 | GET /api/architecture/model uses storageDir-based archDir | storageDir 影响读取路径 | `storageDir: '/custom/data'`, `cwd: '/project'` | `readdirSync` 调用路径为 `/custom/data/architecture/` |
| F-16 | POST /api/architecture/generate uses storageDir-based archDir | storageDir 影响写入路径 | `storageDir: '/custom/data'`, `cwd: '/project'` | `writeFileSync` 调用路径为 `/custom/data/architecture/main.c4` |
| F-17 | POST /api/archi-to-rules passes storageDir to archiToRules | storageDir 传递 | `storageDir: '.data'`, `cwd: '/project'` | `archiToRules` 收到 `{ cwd: '/project', storageDir: '.data' }` |

### 7. setupAnalyzeDepRoute storageDir 参数传递 (server/dep/analyze.test.ts)

**实现状态**: 待实现。调用 `setupAnalyzeDepRoute` 并验证 `analyze()` 调用参数。

**Mock 策略**: `vi.mock('../../actions/analyze.js')` 追踪 `storageDir` 参数。

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-18 | POST /api/analyze passes storageDir to analyze() | storageDir 传递 | `storageDir: '.data'`, `cwd: '/project'` | `analyze` 收到 `{ path: '.', cwd: '/project', storageDir: '.data' }` |

### 8. commands/analyze/index.test.ts storageDir 参数透传

**实现状态**: 待实现。验证 `analyze()` 入口函数将 `storageDir` 透传到 action。

**Mock 策略**: `vi.mock('../../actions/analyze.js')` 追踪参数。

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-19 | analyze command passes storageDir through | 透传 | `{ path: '.', storageDir: '.data', cwd: '.' }` | action `analyze` 被调用且 storageDir 值一致 |

### 9. commands/archi-to-rules/index.test.ts storageDir 参数透传

**实现状态**: 待实现。验证 `archiToRules()` 入口函数将 `storageDir` 透传到 action。

**Mock 策略**: `vi.mock('../../actions/archi-to-rules.js')` 追踪参数。

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-20 | archiToRules command passes storageDir through | 透传 | `{ storageDir: '.data', cwd: '.' }` | action `archiToRules` 被调用且 storageDir 值一致 |

### 10. bin/cli.test.ts 全局 --storage-dir 选项定义

**实现状态**: 待实现。通过 `program.parse()` 测试 `--storage-dir` 选项注册和默认值。

**Mock 策略**: `vi.mock('commander')` 或直接调用 `program.parse()` 读取选项值。

#### 正向路径

| ID | 测试名 | 场景 | 输入 | 预期 |
|----|--------|------|------|------|
| F-21 | CLI defines --storage-dir global option | 选项定义 | 解析 `--help` | 输出包含 `--storage-dir` |
| F-22 | --storage-dir default is .dc-reporter | 默认值 | `program.parse([])` | `program.opts().storageDir` 为 `.dc-reporter` |
| F-23 | --storage-dir custom value is parsed | 自定义值 | 传入 `--storage-dir .my-dir` | `program.opts().storageDir` 为 `.my-dir` |

### 11. graph-source-meta 已有测试更新

**实现状态**: 已有测试（`packages/cli/__tests__/graph-source-meta/graph-source-meta.test.ts`）需更新硬编码的 `.dc-reporter` 路径断言为 storageDir 值。

**变更说明**: 该测试构造 Express app 时传入 `graphFile: '/abs/path/to/.dc-reporter/graph.json'`。无需修改——该测试验证 `meta.source` 字段值等于传入的 `graphFile` 绝对路径，传入路径本身包含 `.dc-reporter` 是 fixture 数据而非路径构建逻辑。若测试中的路径断言从 `.dc-reporter` 改为 storageDir 相关变量，则需同步更新。

---

## 集成测试清单

### 12. analyze 默认值集成测试 (analyze-default-storage-dir.test.ts)

**实现状态**: 待实现。通过 `analyze()` 编程式 API 调用，mock `dependency-cruiser` 避免实际扫描，验证默认路径。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-1 (E2E-s) | `analyze({ path: '.', cwd: '/tmp' })` 默认使用 `.dc-reporter` | `writeFileSync` 写入路径包含 `.dc-reporter/scans/` |

### 13. analyze 自定义相对路径集成测试 (analyze-custom-relative.test.ts)

**实现状态**: 待实现。mock `dependency-cruiser`，验证相对路径解析。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-2 (E2E-s) | `analyze({ path: '.', storageDir: '.custom', cwd: '/tmp' })` 使用自定义目录 | `writeFileSync` 写入路径包含 `.custom/scans/` |

### 14. analyze 绝对路径集成测试 (analyze-absolute-path.test.ts)

**实现状态**: 待实现。验证绝对路径直接使用。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-3 (E2E-s) | `analyze({ path: '.', storageDir: '/tmp/data', cwd: '/project' })` 使用绝对路径 | `writeFileSync` 写入路径包含 `/tmp/data/scans/` |

### 15. dashboard 默认值集成测试 (dashboard-default.test.ts)

**实现状态**: 待实现。mock `createServer`，验证默认文件发现路径。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-9 (E2E-s) | `dashboard({ cwd: '/tmp' })` 默认 file 路径包含 `.dc-reporter` | `createServer` 的 `graphFile` 包含 `.dc-reporter/scans/` |

### 16. dashboard 自定义路径集成测试 (dashboard-custom.test.ts)

**实现状态**: 待实现。mock `createServer`，验证自定义路径。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-10 (E2E-s) | `dashboard({ storageDir: '.my-dir', cwd: '/tmp' })` 使用自定义目录 | `createServer` 的 `graphFile` 包含 `.my-dir/scans/` |

### 17. archi-to-rules 默认值集成测试 (archi-to-rules-default.test.ts)

**实现状态**: 待实现。mock `loadC4Model`，验证默认路径。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-5 (E2E-s) | `archiToRules({ cwd: '/tmp' })` 默认读取 `.dc-reporter/architecture/` | `readdirSync` 调用路径包含 `.dc-reporter/architecture` |
| F-7 (E2E-s) | `archiToRules({ cwd: '/tmp' })` 默认输出到 `.dc-reporter/archi-rules.json` | `writeFileSync` 写入路径包含 `.dc-reporter/archi-rules.json` |

### 18. archi-to-rules 自定义路径集成测试 (archi-to-rules-custom.test.ts)

**实现状态**: 待实现。mock `loadC4Model`，验证自定义路径。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-6 (E2E-s) | `archiToRules({ storageDir: '.arch', cwd: '/tmp' })` 读取 `.arch/architecture/` | `readdirSync` 调用路径包含 `.arch/architecture` |
| F-8 (E2E-s) | `archiToRules({ storageDir: '.arch', cwd: '/tmp' })` 输出到 `.arch/archi-rules.json` | `writeFileSync` 写入路径包含 `.arch/archi-rules.json` |

### 19. --cwd 与 --storage-dir 交互集成测试 (storage-dir-with-cwd.test.ts)

**实现状态**: 待实现。验证 `--cwd` 与 `--storage-dir` 组合使用时路径解析正确性。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-4 (E2E-s) | `analyze({ path: '.', storageDir: '.data', cwd: '/workspace/packages/core' })` 基于 cwd 解析 | `writeFileSync` 写入路径为 `/workspace/packages/core/.data/scans/` |

### 20. createServer 自定义 storageDir 集成测试 (createserver-custom.test.ts)

**实现状态**: 待实现。构造 `DcrServer` 并验证路由正确传递 storageDir。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-12 (E2E-s) | `createServer({ storageDir: '.data', cwd: '/tmp' })` 架构路由使用自定义存储目录 | `setupArchitectureRoutes` 收到 `storageDir: '.data'` |
| F-15 (E2E-s) | `createServer({ storageDir: '/abs/data', cwd: '/tmp' })` 绝对路径 | `setupArchitectureRoutes` 收到 `storageDir: '/abs/data'` |

### 21. 向后兼容性集成测试 (backward-compatibility.test.ts)

**实现状态**: 待实现。验证不传 `--storage-dir` 时行为与现有版本完全一致。

| ID | 场景 | 验证点 |
|----|------|--------|
| F-1 (E2E-s) | `analyze({ path: '.' })` 不传 storageDir | 路径构建为 `<cwd>/.dc-reporter/scans/...` |

---

## 幂等性测试清单

### 22. analyze() 幂等性集成测试 (analyze-idempotency.test.ts)

**实现状态**: 待实现。mock `dependency-cruiser`，调用 `analyze()` 两次，对比输出文件内容。

**Mock 策略**: `vi.mock('dependency-cruiser')` 返回固定结果，`vi.spyOn(fs, 'writeFileSync')` 或使用真实临时目录写入，对比两次写入的文件内容。

| ID | 测试名 | 场景 | 步骤 | 预期 |
|----|--------|------|------|------|
| I-1 | analyze() produces identical output on second call | 第二次调用输出与第一次相同 | 1) 以 `{ path: '.', storageDir: '/tmp/test-idem', cwd: '.' }` 调用 analyze()<br>2) 以相同参数再次调用 analyze() | 第二次输出的 JSON 内容与第一次字节相同 |
| I-2 | analyze() does not duplicate entries on second call | 第二次调用无重复条目 | 以相同 storageDir 调用两次，检查 scans 目录 | scans 目录下文件数不变（覆盖写入），文件内无重复条目 |

**验证方法**:
1. 使用临时目录（如 `os.tmpdir()`）作为 storageDir
2. 第一次调用后捕获输出文件路径并通过 `readFileSync` 读取内容
3. 第二次调用后使用相同路径读取内容
4. `expect(Buffer.from(content1).equals(Buffer.from(content2))).toBe(true)` 或 `expect(content1).toEqual(content2)`
5. 同时验证 scans 目录中文件数没有增长（确保是覆盖写入而非追加）

### 23. archiToRules() 幂等性集成测试 (archi-to-rules-idempotency.test.ts)

**实现状态**: 待实现。mock C4 模型解析，调用 `archiToRules()` 两次，对比输出文件。

**Mock 策略**: `vi.mock('@likec4/language-services/node')` 返回固定 C4 模型；目录和文件系统使用真实临时目录。

| ID | 测试名 | 场景 | 步骤 | 预期 |
|----|--------|------|------|------|
| I-3 | archiToRules() produces identical archi-rules.json on second call | 第二次调用输出与第一次相同 | 1) 以 `{ storageDir: '/tmp/test-arch-idem', cwd: '.' }` 调用<br>2) 以相同参数再次调用 | 两次 `archi-rules.json` 内容字节相同 |
| I-4 | archiToRules() does not modify .dependency-cruiser.js extends twice | extends 字段不重复追加 | 检查 `.dependency-cruiser.js` 的 `extends` 数组 | `extends` 数组中同一路径只出现一次 |

**验证方法**:
1. 使用临时目录作为 storageDir，在其中创建 `architecture/main.c4`
2. mock `.dependency-cruiser.js` 文件使其包含空 `extends` 字段
3. 第一次调用后记录 `archi-rules.json` 内容
4. 第二次调用后读取并比较
5. 同时验证 `.dependency-cruiser.js` 的 `extends` 字段没有被重复追加

### 24. POST /api/architecture/generate 幂等性集成测试 (architecture-generate-idempotency.test.ts)

**实现状态**: 待实现。使用 Express app + supertest，两次 POST 请求生成 main.c4，对比内容。

**Mock 策略**: 使用 `supertest` 构造 Express 应用调用 `setupArchitectureRoutes`，mock 文件系统或使用临时目录。

| ID | 测试名 | 场景 | 步骤 | 预期 |
|----|--------|------|------|------|
| I-5 | POST /api/architecture/generate produces identical main.c4 on second call | 第二次调用生成相同 main.c4 | 1) POST /api/architecture/generate 使用 storageDir<br>2) 再次 POST 相同请求 | 两次 `main.c4` 文件内容字节相同 |
| I-6 | POST /api/architecture/generate does not create duplicate files | 不生成重复文件 | POST 两次，检查 architecture 目录 | 目录中只有 `main.c4` 一个文件，无冗余副本 |

**验证方法**:
1. 使用临时目录作为 storageDir
2. 第一次 POST 后记录 `main.c4` 路径和内容
3. 第二次 POST 后读取同一路径内容
4. 使用 `deepStrictEqual` 对比内容
5. 使用 `readdirSync` 确认目录中文件数量无增长

### 25. dashboard() 文件发现幂等性集成测试 (dashboard-discovery-idempotency.test.ts)

**实现状态**: 待实现。调用 `dashboard()` 两次，验证扫描文件发现结果相同。

**Mock 策略**: `vi.mock('../../server/server.js')` 替换 `createServer` 为 stub，通过模块级变量追踪；`vi.spyOn(fs, 'existsSync')` 和 `vi.spyOn(fs, 'readdirSync')` 返回固定扫描文件列表。

| ID | 测试名 | 场景 | 步骤 | 预期 |
|----|--------|------|------|------|
| I-7 | dashboard() discovers same files on repeated call | 重复调用发现相同文件列表 | 1) `dashboard({ storageDir: '/tmp/data', cwd: '/project' })`<br>2) 相同参数再次调用 | 两次 `createServer` 的 `graphFile` 值相同 |
| I-8 | dashboard() does not accumulate duplicate file entries | 重复调用不重复发现文件 | storageDir 中有 3 个 scan 文件，调用两次 | 两次 `graphFile` 相同，文件列表不发生重复或扩容 |

**验证方法**:
1. mock `readdirSync` 返回固定文件列表（如 `['src-graph.json', 'lib-graph.json', 'test-graph.json']`）
2. mock `existsSync` 对其中第一个文件返回 true
3. 第一次调用 `dashboard()` 记录 `createServer` 收到的 `graphFile`
4. 第二次调用 `dashboard()` 记录 `graphFile`
5. 使用 `expect(graphFile1).toEqual(graphFile2)` 验证一致性
6. 验证 `readdirSync` 被调用的次数（应为每次调用一次，而非每次调用多次）

---

## E2E 测试清单

### 26. CLI 二进制 --storage-dir 选项 E2E 测试 (cli.test.ts)

**实现状态**: 现有 `packages/e2e/cli.test.ts` 新增用例。

**运行方式**: `node --test`（Node.js 内置测试框架），通过 `spawnSync`/`spawn` 执行 CLI 二进制。

| ID | 测试名 | 场景 | 预期 |
|----|--------|------|------|
| F-1 (E2E) | analyze --help shows --storage-dir option | `--help` 输出 | 输出包含 `--storage-dir` |
| F-2 (E2E) | analyze with --storage-dir creates output in custom dir | 自定义存储目录 | `analyze --storage-dir .test-out` 后 `.test-out/scans/` 目录存在 |
| F-4 (E2E) | analyze with --cwd and --storage-dir combination | cwd 与 storage-dir 组合 | `--cwd packages/cli --storage-dir .data` 输出在 `packages/cli/.data/scans/` |

**注意**: E2E 测试依赖完整的 Rust/WASM 构建，若 WASM 不可用则需跳过（参考现有 `tryLoadWasm` 模式）。

---

## 测试数据策略

### 路径解析测试数据

```typescript
// storage.test.ts 中使用的路径 fixture

const testCases = [
  // [storageDir, absCwd, expected]
  [undefined,            '/project',                  '/project/.dc-reporter'],
  ['.my-dir',            '/project',                  '/project/.my-dir'],
  ['/abs/data',          '/project',                  '/abs/data'],
  ['.data',              '/workspace/packages/core',   '/workspace/packages/core/.data'],
  ['',                   '/project',                  '/project'],
  ['./my data (v1)',     '/project',                  '/project/my data (v1)'],
  ['.my-dir/',           '/project',                  '/project/.my-dir'],
];
```

### 路径解析预期结果表

| 输入 storageDir | 输入 cwd | 预期 absStorageDir | 预期 scans 路径 |
|----------------|----------|---------------------|-----------------|
| `undefined` | `/project` | `/project/.dc-reporter` | `/project/.dc-reporter/scans/<name>-graph.json` |
| `'.my-dir'` | `/project` | `/project/.my-dir` | `/project/.my-dir/scans/<name>-graph.json` |
| `'/abs/data'` | `/project` | `/abs/data` | `/abs/data/scans/<name>-graph.json` |
| `'.data'` | `/workspace/packages/core` | `/workspace/packages/core/.data` | `/workspace/packages/core/.data/scans/<name>-graph.json` |
| `''` | `/project` | `/project` | `/project/scans/<name>-graph.json` |

### archi-to-rules 路径预期表

| 输入 storageDir | 输入 cwd | 预期 archDir | 预期 outputPath |
|----------------|----------|-------------|-----------------|
| `undefined` | `/project` | `/project/.dc-reporter/architecture/` | `/project/.dc-reporter/archi-rules.json` |
| `'.arch'` | `/project` | `/project/.arch/architecture/` | `/project/.arch/archi-rules.json` |
| `'/data'` | `/project` | `/data/architecture/` | `/data/archi-rules.json` |

### 幂等性测试数据模式

```typescript
// 幂等性测试通用模式：使用临时目录作为 storageDir

import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// 创建临时目录作为测试隔离的 storageDir
function createIsolatedStorageDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dcr-idem-test-'));
  // 预创建 architecture 子目录（供 archi-to-rules 测试使用）
  mkdirSync(join(dir, 'architecture'), { recursive: true });
  return dir;
}

function cleanupIsolatedStorageDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}
```

---

## 测试环境与 Mock 策略

### CLI Mock 一览

| Mock 目标 | 被测试文件 | 策略 |
|-----------|-----------|------|
| `node:path` (resolve, isAbsolute) | `storage.test.ts` | 无需 mock，直接测试纯函数 |
| `fs.existsSync` / `fs.mkdirSync` / `fs.writeFileSync` / `fs.readdirSync` / `fs.readFileSync` | `analyze.test.ts`, `archi-to-rules.test.ts`, `dashboard/index.test.ts`, `architecture.test.ts`, `bin/cli.test.ts` | `vi.mock('node:fs', ...)` 或 `vi.spyOn` 返回可控值 |
| `dependency-cruiser` (cruise) | `analyze.test.ts` | `vi.mock('dependency-cruiser')` 返回 mock 结果 |
| `dependency-cruiser/config-utl/extract-depcruise-options` | `analyze.test.ts` | `vi.mock` 返回空配置 |
| `dependency-cruiser/config-utl/extract-ts-config` | `analyze.test.ts` | `vi.mock` 返回空配置 |
| `@likec4/language-services/node` (fromSources) | `archi-to-rules.test.ts` | `vi.mock` 返回 mock C4 模型 |
| `../../server/server.js` (createServer) | `dashboard/index.test.ts` | `vi.mock` 替换为 stub，追踪调用参数 |
| `../architecture/architecture.js` (setupArchitectureRoutes) | `server.test.ts` | `vi.mock` 追踪 storageDir 参数 |
| `../dep/analyze.js` (setupAnalyzeDepRoute) | `server.test.ts` | `vi.mock` 追踪 storageDir 参数 |
| `../../actions/analyze.js` (analyze) | `dep/analyze.test.ts`, `commands/analyze/index.test.ts` | `vi.mock` 追踪 storageDir 参数 |
| `../../actions/archi-to-rules.js` (archiToRules) | `commands/archi-to-rules/index.test.ts` | `vi.mock` 追踪 storageDir 参数 |
| `commander` (program) | `bin/cli.test.ts` | `vi.mock` 或直接调用 `parse` |

### Mock 生命周期管理

| 钩子 | 操作 |
|------|------|
| `beforeEach` | `vi.clearAllMocks()` |
| `afterEach` | `vi.restoreAllMocks()` |

### 幂等性测试 Mock 策略补充

| 幂等性测试文件 | Mock 策略 |
|---------------|-----------|
| `analyze-idempotency.test.ts` | 使用真实临时目录（`mkdtempSync`）避免 mock 文件系统；mock `dependency-cruiser` 返回固定结果；测试结束后 cleanup |
| `archi-to-rules-idempotency.test.ts` | 使用真实临时目录；mock `@likec4/language-services/node`；在临时目录中预创建 `architecture/main.c4` 和 `.dependency-cruiser.js` |
| `architecture-generate-idempotency.test.ts` | 使用真实临时目录；`supertest` 构造 Express app；mock 文件系统或使用真实 I/O |
| `dashboard-discovery-idempotency.test.ts` | mock `createServer` 追踪参数；mock `readdirSync` 和 `existsSync` 控制文件发现结果 |

**选择真实临时目录而非 mock 的原因**: 幂等性测试的核心验证是"写同一路径→内容不变"，如果完全 mock 文件系统则无法可靠验证写操作的覆盖行为（mock 的 writeFileSync 不产生真实文件）。使用临时目录可以：
1. 在两次调用间保留文件状态
2. 验证文件内容字节一致性
3. 验证目录中文件数量无增长
4. 验证覆盖写入而非追加写入

### E2E 测试策略

E2E 测试使用 `node:test`（Node.js 内置测试框架），通过 `spawnSync` 执行 CLI 二进制，验证：

1. `--help` 输出包含 `--storage-dir` 选项描述
2. `analyze --storage-dir <dir>` 实际创建自定义目录下的扫描文件
3. `analyze --cwd <dir> --storage-dir <dir>` 组合使用时路径正确

E2E 测试不 mock 任何内容，依赖真实文件系统和 WASM/Rust 构建产物。若 WASM 模块不可用，测试应跳过。

---

## 类型参数边界映射

### `string` (storageDir)

| 边界值 | 预期 | 覆盖测试 |
|--------|------|----------|
| `undefined` | 默认 `.dc-reporter` | F-1, F-5, F-7, F-9 |
| `'.dc-reporter'` | 显式传入默认值 | F-1 (显式断言) |
| `'.my-dir'` | 相对路径，基于 cwd 解析 | F-2, F-6, F-8, F-10 |
| `'/abs/path'` | 绝对路径，直接使用 | F-3, B-5 |
| `''` | 空字符串，`resolve(cwd, '')` 返回 cwd | B-1 |
| `'./my data (v1)'` | 含空格的路径 | B-2 |
| `'.my-dir/'` | 尾部斜杠 | B-3 |
| `'.data'` | 基于 cwd 的相对路径 | F-4 |

### `string` (cwd / absCwd)

| 边界值 | 预期 | 覆盖测试 |
|--------|------|----------|
| `'.'` | 当前目录 | 默认值 |
| `'/project'` | 绝对路径 | F-2, F-3 |
| `'/workspace/packages/core'` | 深层目录 | F-4 |

### `string | undefined` (output 选项)

| 边界值 | 预期 | 覆盖测试 |
|--------|------|----------|
| `undefined` | 基于 storageDir 构造默认输出路径 | F-1, F-7 |
| `'/custom/output.json'` | 使用指定路径，不受 storageDir 影响 | R-2, R-3 |

---

## 风险与缓解验证

| 风险 | 验证方式 | 对应测试 |
|------|----------|----------|
| R1: 默认值向后兼容中断 | 验证 `storageDir` 未指定时行为与当前版本一致 | F-1, F-5, F-7, F-9, backward-compatibility.test.ts |
| R2: --storage-dir 与 --cwd 交互错误 | 验证相对路径基于 `cwd` 而非 `process.cwd()` 解析 | F-4, storage-dir-with-cwd.test.ts |
| R3: 绝对路径被错误拼接 cwd | 验证 `path.isAbsolute(storageDir)` 分支正确返回原始路径 | F-3, B-5, storage.test.ts (abs path case) |
| R4: HTTP API 内部路径不一致 | 验证 server 路由的路径构建与 action 层一致 | F-12, F-13, F-15, F-18 |
| R5: storageDir 空字符串导致路径异常 | 验证空字符串时 `resolve(cwd, '')` 的行为 | B-1 |
| R6: 现有 graph-source-meta 测试因路径变更而失败 | 该测试验证 `meta.source` 等于传入 `graphFile` 参数，不涉及 storageDir 路径构建 | 该测试无需修改 |
| R7: 非幂等写入导致重复文件积累 | 验证重复调用时覆盖写入而非追加 | I-1, I-2, I-3, I-4, I-5, I-6, I-7, I-8 |
| R8: .dependency-cruiser.js extends 反复追加 | 验证 `updateDependencyCruiserConfig` 的幂等性 | I-4 |
| R9: 多次 generate 创建多个 main.c4 副本 | 验证 generate 端点的幂等性覆盖 | I-5, I-6 |

---

## 不可测试项

无。所有变更模块均可通过单元测试、集成测试或 E2E 测试覆盖。

---

## 测试执行说明

### 单元测试执行

```bash
# CLI 单元测试（vitest include: src/**/*.test.ts 和 __tests__/**/*.test.ts 自动覆盖）
cd packages/cli
vp test --include "src/utils/storage.test.ts"
vp test --include "src/actions/analyze.test.ts"
vp test --include "src/actions/archi-to-rules.test.ts"
vp test --include "src/commands/analyze/index.test.ts"
vp test --include "src/commands/archi-to-rules/index.test.ts"
vp test --include "src/commands/dashboard/index.test.ts"
vp test --include "src/server/server.test.ts"
vp test --include "src/server/architecture/architecture.test.ts"
vp test --include "src/server/dep/analyze.test.ts"
vp test --include "src/bin/cli.test.ts"
```

### 集成测试执行

```bash
# CLI 集成测试（__tests__/ 目录）
cd packages/cli
vp test --include "__tests__/analyze-default-storage-dir/*.test.ts"
vp test --include "__tests__/analyze-custom-relative/*.test.ts"
vp test --include "__tests__/analyze-absolute-path/*.test.ts"
vp test --include "__tests__/dashboard-default/*.test.ts"
vp test --include "__tests__/dashboard-custom/*.test.ts"
vp test --include "__tests__/archi-to-rules-default/*.test.ts"
vp test --include "__tests__/archi-to-rules-custom/*.test.ts"
vp test --include "__tests__/storage-dir-with-cwd/*.test.ts"
vp test --include "__tests__/createserver-custom/*.test.ts"
vp test --include "__tests__/backward-compatibility/*.test.ts"

# 幂等性集成测试
vp test --include "__tests__/analyze-idempotency/*.test.ts"
vp test --include "__tests__/archi-to-rules-idempotency/*.test.ts"
vp test --include "__tests__/architecture-generate-idempotency/*.test.ts"
vp test --include "__tests__/dashboard-discovery-idempotency/*.test.ts"
```

### 全部 CLI 测试一次执行

```bash
cd packages/cli
vp test
```

> 当前 `packages/cli/vite.config.ts` 的 `test.include` 为 `['src/**/*.test.{ts,tsx}', '__tests__/**/*.test.{ts,tsx}']`，所有 colocated 和集成测试都会被自动发现。

### E2E 测试执行

```bash
# E2E 测试（需要先构建）
pnpm build
cd packages/e2e
node --test cli.test.js
```

### 重要执行说明

1. **vitest 配置**：当前 `packages/cli/vite.config.ts` 的 test.include 模式为 `['src/**/*.test.{ts,tsx}', '__tests__/**/*.test.{ts,tsx}']`。colocated 单元测试（如 `src/actions/analyze.test.ts`）和 `__tests__/` 目录下的集成测试均会被自动发现。

2. **mock 顺序**：`vi.mock` 在 `describe` 外（模块作用域）调用，`vi.spyOn` 在 `beforeEach`/`it` 内调用。确保 `vi.mock` 在所有 `import` 之前生效（vitest 会自动 hoist `vi.mock` 调用）。

3. **路径解析测试策略**：核心路径解析逻辑 `parseStorageDir()` 是纯函数，单元测试直接验证返回值，无需 mock。业务层的路径构造（如 `resolve(absStorageDir, 'scans', ...)`）通过 mock 文件系统调用来验证参数。

4. **幂等性测试策略**：幂等性测试优先使用真实临时目录（`mkdtempSync`）而非 mock 文件系统，以可靠验证文件覆盖写入行为。测试前后需要 create/cleanup 临时目录。`before`/`after` 钩子管理临时目录生命周期。

5. **E2E 测试依赖**：E2E 测试需要 Rust WASM 构建产物（`@dcr-reporter/wasm`）可用。若 WASM 模块不可用，测试应跳过（参考现有 `cli.test.ts` 中的 `tryLoadWasm` 模式）。

6. **graph-source-meta 测试**：该测试验证 `meta.source` 字段值等于传入的 `graphFile` 绝对路径，不涉及 storageDir 路径构建逻辑。若 fixture 中的 `graphFile` 路径包含 `.dc-reporter`，该硬编码属于测试数据而非逻辑断言，可选更新但非必需。
