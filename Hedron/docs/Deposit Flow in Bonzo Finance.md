# Bonzo Finance 存款流程

Bonzo Finance 存款工具用于把 HBAR、SAUCE、xSAUCE 或 USDC 存入 LendingPool，并获得对应 aToken。

## 支持 Token
- `hbar` -> aWHBAR
- `sauce` -> aSAUCE
- `xsauce` -> axSAUCE
- `usdc` -> aUSDC

## 流程
1. Token association：如账户未关联 token，先准备关联交易
2. Token approval：ERC-20 token 需要授权 LendingPool
3. Deposit：调用 LendingPool.deposit()

HBAR 不需要 approval，因为它通过 payable amount 直接转入。

## 主要工具
- `bonzo_deposit_tool`
- `bonzo_approve_step_tool`
- `bonzo_deposit_step_tool`

## 参数示例
```json
{
  "token": "hbar",
  "amount": 10.5,
  "userAccountId": "0.0.123456",
  "associateToken": true,
  "referralCode": 0
}
```

## 返回
在 `RETURN_BYTES` 模式下，工具返回 transaction bytes，前端负责钱包签名。多步骤流程会通过 `nextStep` 继续 approval 或 deposit。
