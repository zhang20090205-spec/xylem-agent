# DeFi 工具总览

该目录包含 Hedron Agent 使用的 DeFi 工具。

## 工具列表
- `bonzo/`：Bonzo Finance 数据 API
- `bonzoTransaction/`：Bonzo Finance 存款交易
- `saucerswap-api/`：SaucerSwap REST API 数据
- `SaucerSwap-Quote/`：SaucerSwap V2 QuoterV2 报价
- `Saucer-Swap/`：SaucerSwap Router swap 执行
- `SaucerSwap-InfinityPool/`：SAUCE staking 与 xSAUCE
- `autoswap-limit/`：AutoSwapLimit 限价单创建
- `autoswap-limit-queries/`：AutoSwapLimit 订单查询

## 设计规则
- operation id 保持英文
- schema 字段保持英文
- 面向用户和 agent 的自然语言为简体中文
- 真实交易只返回待签 bytes，由钱包签名

## 常见中文意图
- “查 Bonzo 利率” -> `bonzo_api_query`
- “报价 HBAR 换 SAUCE” -> `saucerswap_router_swap_quote_tool`
- “确认执行 swap” -> `saucerswap_router_swap_tool`
- “质押 SAUCE” -> `saucerswap_infinity_pool_tool`
- “创建限价单/挂单” -> `autoswap_limit_tool`
- “查询我的订单” -> `autoswap_limit_orders_query_tool`
