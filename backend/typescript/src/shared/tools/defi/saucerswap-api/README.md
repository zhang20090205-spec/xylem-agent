# SaucerSwap API 工具

工具名：`saucerswap_api_query`

## Operation
- `general_stats`
- `sss_stats`
- `farms`
- `account_farms`
- `infinity_pool_position`

## 用途
- 查询 DEX TVL、volume 和 swap 统计
- 查询 Single-Sided Staking 统计
- 查询 farms 和账户 farm 仓位
- 查询用户 Infinity Pool xSAUCE 与可领取 SAUCE

## 示例
```json
{
  "operation": "infinity_pool_position",
  "accountId": "0.0.123456",
  "network": "mainnet"
}
```

## 注意
Infinity Pool 的余额、奖励和 position 查询必须使用本工具，不要使用 `saucerswap_infinity_pool_tool`。
