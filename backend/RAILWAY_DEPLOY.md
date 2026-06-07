# Railway 部署

本文说明如何把 Hedron WebSocket Agent 部署到 Railway。

## 准备
- Railway 账号
- GitHub 仓库
- `OPENAI_API_KEY`
- 需要的 Hedera 与 SaucerSwap 环境变量

## 环境变量
```env
OPENAI_API_KEY=your-openai-key
HEDERA_NETWORK=mainnet
LLM_MODEL=gpt-5-mini
LLM_MAX_TOKENS=12000
MEMORY_MAX_TOKEN_LIMIT=8000
SAUCERSWAP_MAINNET_API_KEY=your-key
SAUCERSWAP_TESTNET_API_KEY=your-key
```

## 启动命令
在 Railway 中将服务根目录指向 `typescript`，启动命令可使用：

```bash
npm run start:prod
```

或直接：

```bash
cd examples/langchain && npx ts-node websocket-agent.ts
```

## 健康检查
部署后访问：

```text
https://your-service.up.railway.app/health
```

返回 `status: healthy` 表示服务可用。

## 前端连接
在前端生产环境配置：

```env
VITE_WEBSOCKET_URL_PRODUCTION=wss://your-service.up.railway.app
```

## 排障
- 构建失败：确认 `typescript/package.json` 依赖已安装
- WebSocket 无法连接：确认 Railway 暴露了正确端口，并使用 `wss://`
- Agent 无响应：确认 `OPENAI_API_KEY` 有效
- API 数据为空：确认 SaucerSwap API key 和 `HEDERA_NETWORK`
