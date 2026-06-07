# AutoSwapLimit 订单查询工具

工具名：`autoswap_limit_orders_query_tool`

## Operation
- `get_user_orders`
- `get_order_details`
- `get_user_orders_with_details`

## 用途
查询用户在 AutoSwapLimit 合约上的限价单，包括订单 ID、状态、触发价、过期时间和是否可执行。

## 示例
```json
{
  "operation": "get_user_orders_with_details",
  "userAccountId": "0.0.123456"
}
```

## 注意
工具会自动把 Hedera Account ID（如 `0.0.1234`）转换为 EVM 地址用于合约查询。
