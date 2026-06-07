# Bonzo Finance 交易工具

该工具集为 Bonzo Finance 存款准备链上交易，适用于 WebSocket Agent 的钱包签名流程。

## 工具
- `bonzo_deposit_tool`：完整存款流程
- `bonzo_approve_step_tool`：token approval
- `bonzo_deposit_step_tool`：执行 deposit

## Operation
- `associate_token`
- `approve_token`
- `deposit_token`
- `full_deposit_flow`

## 网络与合约
合约地址和 token ID 来自 `typescript/src/shared/parameter-schemas/bonzo.zod`。

## 用户流程
1. 用户说“把 10 HBAR 存入 Bonzo”
2. Agent 准备待签交易
3. 前端发送 `TRANSACTION_TO_SIGN`
4. 用户签名后前端发送 `TRANSACTION_RESULT`
5. 如有下一步，后端自动准备

## 注意事项
- 真实交易不可逆
- 需要足够 HBAR 支付手续费
- ERC-20 token 需要先 association 和 approval
