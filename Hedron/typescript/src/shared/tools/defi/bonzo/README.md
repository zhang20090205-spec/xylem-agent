# Bonzo Finance API 工具

工具名：`bonzo_api_query`

## Operation
- `account_dashboard`
- `market_info`
- `pool_stats`
- `protocol_info`
- `bonzo_token`
- `bonzo_circulation`

## 用途
- 查询借贷 APY
- 查询账户 supply/borrow 仓位
- 查询协议统计和合约地址
- 为收益策略提供 Bonzo 数据

## 示例
```json
{
  "operation": "market_info"
}
```

```json
{
  "operation": "account_dashboard",
  "accountId": "0.0.123456"
}
```

## 注意
Bonzo API 主要提供 mainnet 市场数据。即使当前 `HEDERA_NETWORK=testnet`，市场数据也可能来自 mainnet。
