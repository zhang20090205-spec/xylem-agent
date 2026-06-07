# 前端结构化 Swap 报价

本文说明前端如何处理 Hedron WebSocket 后端发送的结构化 `SWAP_QUOTE` 消息。

## 消息类型
当用户请求 swap 报价，例如“报价 10 HBAR 换 SAUCE”，后端可能发送：

1. `SWAP_QUOTE`：结构化报价数据，用于交易卡片
2. `AGENT_RESPONSE`：普通文本回复，可继续显示在聊天流中

## `SWAP_QUOTE` 结构
```typescript
interface SwapQuote extends BaseMessage {
  type: 'SWAP_QUOTE';
  quote: {
    operation: 'get_amounts_out' | 'get_amounts_in';
    network: 'mainnet' | 'testnet';
    input: {
      token: string;
      tokenId: string;
      amount: string;
      formatted: string;
    };
    output: {
      token: string;
      tokenId: string;
      amount: string;
      formatted: string;
    };
    path: string[];
    fees: number[];
    exchangeRate: string;
    gasEstimate?: string;
  };
  originalMessage: string;
}
```

## React 处理示例
```typescript
const handleMessage = (message: WSMessage) => {
  switch (message.type) {
    case 'SWAP_QUOTE':
      setSwapQuotes(prev => [...prev, message]);
      break;
    case 'AGENT_RESPONSE':
      setMessages(prev => [...prev, message]);
      break;
  }
};
```

## 推荐 UI
- 用 `SwapQuoteCard` 展示“你支付”“你收到”“汇率”“费用”“Gas”
- 执行按钮只发送确认意图，例如：
```typescript
sendMessage(`执行 swap：${quote.input.formatted} ${quote.input.token} 到 ${quote.output.token}`);
```
- 不要直接在前端构造 swap 合约交易，后端 agent 会根据确认继续准备 `TRANSACTION_TO_SIGN`

## 验证要点
- `SWAP_QUOTE` 卡片能正确显示 token、amount、fee 和 network
- `AGENT_RESPONSE` 仍保留在聊天流中
- 点击执行后会回到 agent，由 agent 准备待签交易
- 移动端下报价卡片不溢出
