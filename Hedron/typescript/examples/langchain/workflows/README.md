# Agent Workflows

该目录记录 Hedron Agent 的工作流意图。

## 收益策略
触发词：
- 收益策略
- 优化收益
- HBAR 怎么投
- 最大化收益
- 投资建议

流程：
1. 如用户未提供风险偏好，先询问“保守、中等、激进”
2. 风险已知后查询 Bonzo、SaucerSwap、Infinity Pool、AutoSwapLimit 和 HBAR 余额
3. 输出当前仓位、推荐策略、配置比例、执行步骤与风险

## Swap
1. 先用 `saucerswap_router_swap_quote_tool` 报价
2. 等待用户明确确认
3. 再用 `saucerswap_router_swap_tool` 准备交易

## 限价单
中文触发词：
- 限价单
- 挂单
- 目标价
- 到价
- 跌到
- 涨到
- 自动买入

创建订单使用 `autoswap_limit_tool`，operation 为 `create_swap_order`。

查询订单使用 `autoswap_limit_orders_query_tool`，operation 为 `get_user_orders_with_details`。
