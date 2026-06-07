# WebSocket Agent 文档

Hedron WebSocket Agent 默认运行在 `8080` 端口，同时提供 `/health` 健康检查。

## 启动
```bash
cd typescript/examples/langchain
npm install
npm run start:websocket
```

## 健康检查
```bash
curl http://localhost:8080/health
```

## 连接
```text
ws://localhost:8080
```

连接成功后服务会发送 `SYSTEM_MESSAGE`，提示使用 `CONNECTION_AUTH` 完成认证。

## 认证消息
```json
{
  "type": "CONNECTION_AUTH",
  "userAccountId": "0.0.123456"
}
```

## 用户消息
```json
{
  "type": "USER_MESSAGE",
  "message": "帮我看看 Bonzo Finance 的 HBAR 利率"
}
```

## 交易结果
```json
{
  "type": "TRANSACTION_RESULT",
  "success": true,
  "transactionId": "0.0.123@1234567890.000000000",
  "status": "SUCCESS"
}
```

## 后端返回类型
- `SYSTEM_MESSAGE`：系统通知、认证、错误
- `AGENT_RESPONSE`：Agent 文本回复
- `SWAP_QUOTE`：结构化 swap 报价
- `TRANSACTION_TO_SIGN`：需要前端钱包签名的交易 bytes

## 注意事项
- 未认证前发送 `USER_MESSAGE` 会返回错误
- Agent 不持有用户私钥
- 多步骤交易会在前一步确认后自动准备下一步
- WebSocket message type 和 JSON 字段不要改名
