# UniswapV2Router02 / SaucerSwap Router

SaucerSwap Router 工具使用 UniswapV2Router02 风格合约在 Hedera 上准备真实 token swap。

## 支持 operation
- `swap_exact_hbar_for_tokens`
- `swap_exact_tokens_for_hbar`
- `swap_exact_tokens_for_tokens`
- `swap_hbar_for_exact_tokens`
- `swap_tokens_for_exact_hbar`
- `swap_tokens_for_exact_tokens`

## 常用合约
- Mainnet Router: `0.0.3045981`
- Testnet Router: `0.0.19264`
- Mainnet SAUCE: `0.0.731861`
- Testnet SAUCE: `0.0.1183558`

## 参数
- `operation`：swap operation
- `amountIn`：精确输入数量，最小单位
- `amountOut`：精确输出数量，最小单位
- `tokenPath`：token 路径数组，原生 HBAR 使用 `"HBAR"`
- `slippagePercent`：最大滑点百分比
- `network`：`mainnet` 或 `testnet`

## 安全规则
- 即时 swap 必须先走报价
- 用户确认后才准备真实交易
- 交易返回 bytes 后由前端钱包签名
- 用户必须有足够余额和 HBAR gas
