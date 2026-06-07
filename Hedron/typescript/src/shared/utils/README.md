# shared utils

该目录包含共享工具函数。

## PromptGenerator
`PromptGenerator` 用于在工具 prompt 中注入上下文信息，例如账户参数说明和参数使用规则。

## 使用原则
- 不要翻译代码字段名
- 面向 agent 或用户的自然语言说明使用简体中文
- schema 字段、operation id、环境变量保持原样
