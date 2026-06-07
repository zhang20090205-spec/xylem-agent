# SaucerSwap Quote 工具

工具名：`saucerswap_router_swap_quote_tool`

## Operation
- `get_amounts_out`
- `get_amounts_in`

## 参数
- `amount`：最小单位数量
- `tokenPath`：token 路径，原生 HBAR 用 `"HBAR"`
- `fees`：pool fee，例如 `[3000]`
- `network`：`mainnet` 或 `testnet`

## 示例
```json
{
  "operation": "get_amounts_out",
  "amount": "100000000",
  "tokenPath": ["HBAR", "0.0.1183558"],
  "fees": [3000],
  "network": "testnet"
}
```

## 规则
即时 swap 必须先报价。用户确认后，才调用 SaucerSwap Router swap 工具准备真实交易。
