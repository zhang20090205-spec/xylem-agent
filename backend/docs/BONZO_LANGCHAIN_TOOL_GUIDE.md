# Bonzo LangChain 工具指南

Bonzo 工具分为数据查询和交易准备两类。

## 数据查询
工具：`bonzo_api_query`

可用 operation：
- `account_dashboard`
- `market_info`
- `pool_stats`
- `protocol_info`
- `bonzo_token`
- `bonzo_circulation`

示例：
```json
{
  "operation": "market_info"
}
```

账户 dashboard：
```json
{
  "operation": "account_dashboard",
  "accountId": "0.0.123456"
}
```

## 交易准备
工具：
- `bonzo_deposit_tool`
- `bonzo_approve_step_tool`
- `bonzo_deposit_step_tool`

示例：
```json
{
  "token": "hbar",
  "amount": 5,
  "userAccountId": "0.0.123456",
  "associateToken": true
}
```

## Agent 行为
- 借贷利率、APY、市场数据直接调用 `market_info`
- 用户账户仓位调用 `account_dashboard`
- 存款请求准备待签交易，不直接替用户签名
- HBAR 可跳过 approval；SAUCE、xSAUCE、USDC 需要 approval

## 排障
- API 失败：检查网络连接和 Bonzo API 状态
- account dashboard 报错：确认 `accountId` 格式为 `shard.realm.num`
- 存款失败：检查余额、token association 和 HBAR 手续费
