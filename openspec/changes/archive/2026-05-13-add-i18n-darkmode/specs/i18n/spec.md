## ADDED Requirements

### Requirement: 翻译系统架构

系统 SHALL 使用 React Context 实现国际化，翻译内容存储在 TypeScript 文件中，通过 `as const` 提供类型安全的键名推断。

#### Scenario: 翻译文件结构

- WHEN 定义翻译文件
- THEN 每个语言一个 `.ts` 文件（如 `en.ts`、`zh-CN.ts`）
- AND 文件导出一个默认对象，键名采用嵌套点分隔结构
- AND 所有翻译文件 SHALL 具有完全相同的键结构
- AND 使用 `as const` 确保类型字面量推断

#### Scenario: 翻译键命名

- WHEN 定义翻译键
- THEN 按功能域分组：`app.*`、`nav.*`、`upload.*`、`report.*`、`detail.*`、`metrics.*`、`severity.*`、`graph.*`、`theme.*`
- AND 每个翻译键的值为字符串

### Requirement: I18nProvider

系统 SHALL 提供 `I18nProvider` 组件，管理当前语言状态并向子树提供翻译函数。

#### Scenario: Provider 初始化

- WHEN I18nProvider 挂载
- THEN 按优先级检测语言：localStorage `lang` → `navigator.language` → 默认 `en`
- AND 将检测到的语言设为当前语言状态
- AND 加载对应语言的翻译字典

#### Scenario: 语言切换

- WHEN 调用 `setLang(newLang)` 方法
- THEN 当前语言状态更新为 `newLang`
- AND 语言偏好写入 localStorage key `lang`
- AND 所有使用 `useT()` 的组件自动重新渲染

### Requirement: useT hook

系统 SHALL 提供 `useT()` hook，返回一个类型安全的翻译函数。

#### Scenario: 翻译调用

- WHEN 组件调用 `t('nav.graph')`
- THEN 返回当前语言下对应键的翻译文本
- AND TypeScript 自动补全可用的键名路径
- AND 若键不存在，TypeScript 编译时报错

#### Scenario: 参数化翻译

- WHEN 翻译文本需要参数（如插值）
- THEN 翻译值可以为函数，接收参数返回字符串
- AND 例如 `detail.violationCount(n: number): string`

### Requirement: 支持的语言

系统 SHALL 初始支持以下语言：

| 语言 | 代码 | 文件 |
|------|------|------|
| 英文 | `en` | `i18n/en.ts` |
| 简体中文 | `zh-CN` | `i18n/zh-CN.ts` |

#### Scenario: 添加新语言

- WHEN 需要添加新语言（如日文）
- THEN 创建 `i18n/ja.ts`，导出与 `en.ts` 相同结构的翻译对象
- AND 在 `i18n/index.ts` 的语言注册表中添加 `ja` 条目
- AND 在 Header 语言切换器中添加对应按钮
- AND 无需修改任何组件代码
