# 钱包连接改进说明

前端钱包连接基于 HashConnect，并使用 WalletConnect v2 项目 ID。

## 改进点
- HashConnect 单例管理，减少热更新时的重复初始化
- 连接按钮区分“缺少配置”“连接中”“已连接”“未知网络”等状态
- 钱包配对弹窗由生命周期保护，降低重复弹窗概率
- WebSocket 认证依赖已连接账户 ID
- 错误提示已面向用户中文化

## 必需配置
```env
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
VITE_HEDERA_NETWORK=testnet
```

## 用户流程
1. 点击连接钱包
2. HashConnect 打开 WalletConnect 配对
3. 钱包确认连接
4. 前端拿到账户 ID
5. WebSocket 发送 `CONNECTION_AUTH`
6. 后端认证成功后进入可用状态

## 排障
- `VITE_WALLETCONNECT_PROJECT_ID` 缺失：按钮会显示配置错误
- 网络不匹配：检查 `VITE_HEDERA_NETWORK`
- 弹窗没有出现：刷新页面，确认浏览器没有阻止弹窗
- WebSocket 未认证：先确认钱包账户 ID 已获取
