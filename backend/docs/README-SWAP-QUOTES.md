# Swap 报价 WebSocket 集成

当用户请求 swap 报价时，Agent 会优先调用 SaucerSwap Quote 工具，并向前端发送结构化 `SWAP_QUOTE`。

## 请求示例
```text
报价 10 HBAR 换 SAUCE
```

## 返回结构
```typescript
interface SwapQuote {
  type: 'SWAP_QUOTE';
  quote: {
    operation: 'get_amounts_out' | 'get_amounts_in';
    network: 'mainnet' | 'testnet';
    input: { token: string; tokenId: string; amount: string; formatted: string };
    output: { token: string; tokenId: string; amount: string; formatted: string };
    path: string[];
    fees: number[];
    exchangeRate: string;
    gasEstimate?: string;
  };
  originalMessage: string;
}
```

## 前端建议
- 用专门卡片展示报价，而不是只显示纯文本
- 卡片展示“你支付”“你收到”“汇率”“费用”“Gas”
- 执行按钮应向 Agent 发送确认消息，由 Agent 再准备真实 swap 交易

## 重要规则
- 任何真实 swap 都必须先展示报价
- 用户明确确认后才能调用 swap 执行工具
- 限价单请求应使用 AutoSwapLimit，不应走即时 swap 报价
