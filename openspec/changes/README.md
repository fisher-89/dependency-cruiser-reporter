# Changes

此目录存放未归档的变更提案。每个功能/缺陷/重构独立隔离为子目录。

## 变更提案结构

```
changes/
└── <变更名称>/
    ├── proposal.md      # 变更提案说明（必需）
    ├── design.md        # 技术设计文档（可选）
    ├── specs/           # 规范增量差异
    │   └── <模块名称>/
    │       └── spec.md  # 增量变更内容
    └── tasks.md         # 实现任务清单（可选）
```

## 增量格式标记

| 标记 | 变更类型 |
|------|----------|
| 🟢 ADDED Requirements | 新增 |
| 🟡 MODIFIED Requirements | 修改 |
| 🔴 REMOVED Requirements | 删除 |

## 归档流程

变更完成并验证后：
1. 将 `specs/` 下的增量规范合并到 `openspec/specs/` 正式目录
2. 删除变更提案目录
3. 更新 `openspec/specs/` 相关 spec.md

## 当前活跃变更

（无）
