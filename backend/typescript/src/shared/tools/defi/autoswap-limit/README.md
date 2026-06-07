# AutoSwapLimit 工具

工具名：`autoswap_limit_tool`

## 用途
创建 HBAR -> Token 的自动限价单。当市场价格达到触发价时，订单可自动执行。

## Operation
- `create_swap_order`
- `get_order_details`
- `get_contract_config`
- `get_router_info`
- `get_contract_balance`
- `get_next_order_id`

## 创建订单参数
- `tokenOut`
- `amountIn`
- `minAmountOut`
- `triggerPrice`
- `expirationHours`
- `network`
- `userAccountId`

## 中文触发词
- 限价单
- 挂单
- 目标价
- 触发价
- 到价
- 跌到
- 涨到
- 自动买入

## 展示规则
面向用户展示订单时，优先显示 `triggerPriceUSDC`，不要展示内部字段 `minAmountOut`。
