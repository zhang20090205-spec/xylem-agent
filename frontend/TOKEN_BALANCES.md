# Token 余额组件

前端通过 `useTokenBalances` 和 `TokenBalances` 展示 Hedera 账户余额，包括 HBAR 与常见 token。

## 数据来源
- Hedera Mirror Node REST API
- CoinGecko 价格数据，HBAR 和 SAUCE 有回退值
- `VITE_HEDERA_NETWORK` 决定查询 `mainnet`、`testnet` 或 `previewnet`

## 已知 Token
- HBAR
- SAUCE
- USDC
- BONZO
- WHBAR

## 组件模式
- compact：用于侧边栏或头部的小型展示
- full：用于完整余额面板

## 刷新策略
余额和价格会定期刷新，也可以通过刷新按钮手动触发。

## 常见问题
- 余额为空：确认钱包已连接，并且账户位于当前 `VITE_HEDERA_NETWORK`
- USD 估值为空：价格 API 可能不可用，组件会使用回退值
- 某个 token 未显示：需要在 `useTokenBalances` 的 token 配置中补充 token ID、symbol 和 decimals
