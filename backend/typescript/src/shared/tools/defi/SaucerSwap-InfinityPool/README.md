# SaucerSwap Infinity Pool 工具

工具名：
- `saucerswap_infinity_pool_tool`
- `saucerswap_infinity_pool_step_tool`

## Operation
- `associate_tokens`
- `approve_sauce`
- `stake_sauce`
- `unstake_xsauce`
- `full_stake_flow`
- `full_unstake_flow`

## 查询与交易分离
- 查询 xSAUCE、rewards、position：使用 `saucerswap_api_query` 的 `infinity_pool_position`
- 真实质押/解除质押：使用 `saucerswap_infinity_pool_tool`

## Staking 流程
1. associate SAUCE 和 xSAUCE
2. approve SAUCE 给 MotherShip
3. stake SAUCE 获得 xSAUCE

## WebSocket 模式
`full_stake_flow` 一次只准备一笔交易。用户签名确认后，后端自动准备下一步。
