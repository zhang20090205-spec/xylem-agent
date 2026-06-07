# Bonzo Transaction 工具

工具用于把 HBAR、SAUCE、xSAUCE、USDC 存入 Bonzo Finance。

## 工具
- `bonzo_deposit_tool`
- `bonzo_approve_step_tool`
- `bonzo_deposit_step_tool`

## 流程
1. token association
2. token approval（HBAR 不需要）
3. deposit

## 示例
```json
{
  "token": "hbar",
  "amount": 10,
  "userAccountId": "0.0.123456",
  "associateToken": true
}
```

## 返回
`RETURN_BYTES` 模式返回 transaction bytes 和 `nextStep`，由 WebSocket handler 在用户签名确认后继续下一步。
