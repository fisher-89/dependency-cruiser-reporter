# 使用规范

## Purpose

定义用户使用场景、Web UI 行为和 CI/CD 集成方式。

## Requirements

### Requirement: 快速本地分析

系统 SHALL 支持最简单的两命令工作流：

#### Scenario: 本地分析

- WHEN 用户执行 `dep-report analyze --path ./project`
- THEN 系统运行 dependency-cruiser 并保存原始输出
- WHEN 用户执行 `dep-report open -f project-graph.json`
- THEN 系统启动服务器并在浏览器中显示可视化

### Requirement: CI/CD 集成

系统 SHALL 支持在 CI 管道中生成报告并存储为工件。

#### Scenario: GitHub Actions

```yaml
- name: Analyze dependencies
  run: |
    dep-report analyze --path src -o artifacts/raw-graph.json

- name: Upload artifact
  uses: actions/upload-artifact@v4
  with:
    name: dependency-graph
    path: artifacts/raw-graph.json
```

- WHEN CI 管道执行
- THEN 生成 dependency-cruiser 报告
- AND 转换为 ProcessedGraph
- AND 上传为工件

#### Scenario: NPM 脚本集成

```json
{
  "scripts": {
    "scan": "dep-report analyze --path src",
    "view": "dep-report open -f src-graph.json"
  }
}
```

### Requirement: Monorepo 分析

系统 SHALL 支持分析多包仓库：

#### Scenario: 包级概览

- WHEN 分析整个 monorepo
- THEN 系统自动选择包级聚合（大仓库）
- AND 显示包依赖概览

#### Scenario: 包钻取

- WHEN 用户需要深入特定包
- THEN 分析该包目录
- AND 使用目录级聚合

```bash
# 整体概览
dep-report analyze --path ./packages -o overview-graph.json
dep-report open -f overview-graph.json

# 钻取特定包
dep-report analyze --path ./packages/core -o core-graph.json
dep-report open -f core-graph.json
```

### Requirement: Pre-commit 钩子

系统 SHALL 支持作为 pre-commit 钩子阻止新违规提交：

#### Scenario: Husky 集成

```bash
# .husky/pre-commit
#!/bin/sh

dep-report analyze -p ./src -o .tmp/graph.json

if [ $? -ne 0 ]; then
  echo "dependency-cruiser analysis failed"
  exit 1
fi
```

- WHEN 提交代码
- THEN 运行 dependency-cruiser 分析
- IF 分析失败 THEN 阻止提交

### Requirement: Web UI 服务器启动

系统 SHALL 提供 Web UI 用于交互式浏览：

#### Scenario: 启动服务器

```bash
dep-report open -f graph.json
dep-report open -f graph.json -p 8080  # 自定义端口
```

- WHEN 服务器启动
- THEN 服务前端静态文件
- AND 服务 `/api/config` 和 `/api/graph` 端点
- AND 自动加载图文件（若提供 `-f`）

### Requirement: 上传界面

系统 SHALL 提供文件上传界面：

#### Scenario: 拖放上传

- WHEN 用户拖放 `.json` 文件到上传区域
- THEN 系统解析文件并显示可视化

#### Scenario: 点击上传

- WHEN 用户点击上传区域并选择文件
- THEN 系统解析文件并显示可视化

#### Scenario: 文件格式

- WHEN 上传文件
- THEN 系统接受 ProcessedGraph 或原始 dependency-cruiser JSON
- AND 使用 `JSON.parse` 直接解析

### Requirement: 图形视图

系统 SHALL 在 Graph 视图中显示依赖图形：

#### Scenario: 显示

- WHEN 图形加载
- THEN 节点使用 5 列网格定位
- AND 边渲染为线条
- AND 边宽度由 `weight` 决定（最大 3px）
- AND 显示节点数、边数、聚合级别信息栏

### Requirement: 报告视图

系统 SHALL 在 Report 视图中显示违规列表：

#### Scenario: 汇总卡片

| 卡片 | 过滤条件 |
|------|----------|
| Errors | `severity === 'error'` |
| Warnings | `severity === 'warn'` |
| Info | `severity === 'info'` |

#### Scenario: 违规项

- WHEN 显示违规项
- THEN 显示规则名称、`from → to` 路径、消息（若有）

### Requirement: 指标视图

系统 SHALL 在 Metrics 视图中显示统计仪表板：

#### Scenario: 指标网格

| 指标 | 描述 |
|------|------|
| 原始节点数 | 聚合前计数 |
| 聚合节点数 | 聚合后计数 |
| 依赖数 | 总边数 |
| 违规数 | 总违规数 |

#### Scenario: 边类型分布

- WHEN 显示边类型分布
- THEN 显示 local、npm、core、dynamic 各类计数

### Requirement: 用户角色工作流

| 角色 | 工作 |
|------|------|
| 开发者 | 提交前 `dep-report analyze` + `dep-report open` |
| 技术主管 | PR 审查时检查架构合规性 |
| DevOps | CI/CD 管道中 `dep-report analyze` + 工件上传 |
| 架构师 | 生成包级概览用于文档 |

## Tips

1. **从 analyze 开始**：使用 `dep-report analyze` 获得最简工作流
2. **关注错误**：检查 Report 视图 `error` 严重级别违规
3. **使用显式级别**：用 `-l` 覆盖聚合级别
4. **早期集成**：在问题累积前加入 CI

## References

- OpenSpec 使用规范：`openspec/specs/usage/spec.md`
