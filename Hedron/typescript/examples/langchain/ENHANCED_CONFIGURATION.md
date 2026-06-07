# LangChain 增强配置

WebSocket Agent 支持通过环境变量调整 LLM 和记忆配置。

## 环境变量
```env
LLM_MODEL=gpt-5-mini
LLM_MAX_TOKENS=12000
LLM_TEMPERATURE=0.7
MEMORY_MAX_TOKEN_LIMIT=8000
MEMORY_RETURN_MAX_TOKENS=4000
FORCE_CLEAR_MEMORY=false
```

## 说明
- `LLM_MODEL`：使用的模型
- `LLM_MAX_TOKENS`：模型最大输出 token
- `LLM_TEMPERATURE`：非 GPT-5 模型的 temperature
- `MEMORY_MAX_TOKEN_LIMIT`：会话记忆上限
- `MEMORY_RETURN_MAX_TOKENS`：返回给模型的记忆 token 上限
- `FORCE_CLEAR_MEMORY`：调试用，每条消息后清理记忆

## GPT-5 注意事项
GPT-5 系列只使用默认 temperature，因此代码会自动使用兼容参数。
