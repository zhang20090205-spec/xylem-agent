# Oracle Price Admin

该脚本用于管理 AutoSwapLimit 相关 oracle price。

## 入口
```bash
cd typescript/examples/langchain
npm run oracle:admin
```

## 环境变量
```env
HEDERA_NETWORK=testnet
OPERATOR_ID=0.0.x
OPERATOR_KEY=302e...
```

## 注意事项
- 该工具面向管理员
- 操作前确认网络和合约 ID
- 不要把私钥提交到仓库
