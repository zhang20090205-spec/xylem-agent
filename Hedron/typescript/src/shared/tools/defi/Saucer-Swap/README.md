# SaucerSwap Router Swap 工具

工具名：`saucerswap_router_swap_tool`

## Operation
- `swap_exact_hbar_for_tokens`
- `swap_exact_tokens_for_hbar`
- `swap_exact_tokens_for_tokens`
- `swap_hbar_for_exact_tokens`
- `swap_tokens_for_exact_hbar`
- `swap_tokens_for_exact_tokens`

## 参数
- `amountIn`
- `amountOut`
- `tokenPath`
- `slippagePercent`
- `deadline`
- `network`
- `recipientAccountId`

## 重要规则
- 必须先展示报价
- 只有用户确认后才执行
- 返回 `TRANSACTION_TO_SIGN`，由前端钱包签名
- 需要足够 token 余额和 HBAR gas
