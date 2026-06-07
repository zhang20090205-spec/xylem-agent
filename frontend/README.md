# Xylem agent frontend

这是 Xylem agent 的 React + Vite + TypeScript 前端。它提供中文聊天界面，通过 WebSocket 连接 Hedera 后端，支持 WalletConnect/HashConnect 钱包连接、结构化 swap 报价卡片和 token 余额组件。

## 功能
- 带会话管理、Markdown 渲染和富文本样式的聊天界面
- 通过 HashConnect（WalletConnect v2）连接钱包
- 自动重连和认证流程的 WebSocket 后端连接
- 结构化 `SWAP_QUOTE` 消息渲染与执行入口
- HBAR、SAUCE、USDC、BONZO、WHBAR 等余额展示和 USD 估值
- 浅色/深色主题与响应式布局

## 技术栈
- React 18、TypeScript、Vite 5
- TailwindCSS
- HashConnect、Hedera SDK
- lucide-react、react-markdown

## 快速开始
### 前置条件
- Node.js 18+ 和 npm
- 正在运行的 Xylem agent WebSocket 后端
- WalletConnect Project ID，可在 https://cloud.walletconnect.com 获取

### 安装
```bash
npm install
```

在项目根目录创建 `.env`。

### 开发运行
```bash
npm run dev
```

Vite 默认使用 `http://localhost:5173`，端口被占用时会自动切换。

### 构建与预览
```bash
npm run build
npm run preview
```

## 环境变量
```env
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
VITE_HEDERA_NETWORK=testnet
VITE_WEBSOCKET_URL_LOCAL=ws://localhost:8080
# VITE_WEBSOCKET_URL_PRODUCTION=wss://your-hosted-agent.example.com
```

- `VITE_WALLETCONNECT_PROJECT_ID`：必填，WalletConnect Cloud Project ID
- `VITE_HEDERA_NETWORK`：可选，`mainnet`、`testnet` 或 `previewnet`，默认 `mainnet`
- `VITE_WEBSOCKET_URL_LOCAL`：可选，本地 WebSocket URL，默认 `ws://localhost:8080`
- `VITE_WEBSOCKET_URL_PRODUCTION`：可选，生产 WebSocket URL

## 主要结构
- `src/App.tsx`：主布局、连接状态和页面组合
- `src/components/ChatArea.tsx`：聊天区和示例 prompt
- `src/components/ChatMessage.tsx`：消息、Markdown、交易状态和复制按钮
- `src/components/ChatInput.tsx`：输入框和发送逻辑
- `src/components/WalletButton.tsx`：钱包连接、断开和配置提示
- `src/components/TokenBalances.tsx`：余额组件
- `src/hooks/useChat.ts`：会话、消息、报价解析和签名交接
- `src/hooks/useWebSocket.ts`：WebSocket、认证和重连
- `src/hooks/useWallet.ts`：HashConnect 单例和配对流程
- `src/hooks/useTokenBalances.ts`：Mirror Node 与价格数据

## WebSocket 与钱包
开发模式使用 `VITE_WEBSOCKET_URL_LOCAL`，生产模式使用 `VITE_WEBSOCKET_URL_PRODUCTION`。前端会在钱包连接后用账户 ID 发送 `CONNECTION_AUTH` 完成认证。

## 常见问题
- 钱包按钮提示需要配置：设置 `VITE_WALLETCONNECT_PROJECT_ID` 后重启 dev server
- WebSocket 已断开：确认后端运行在 `VITE_WEBSOCKET_URL_LOCAL`
- 余额网络不对：确认 `VITE_HEDERA_NETWORK` 与钱包账户网络一致
- 图标不显示：确认图片存在于 `public/`

## 脚本
- `npm run dev`：启动开发服务器
- `npm run build`：生产构建
- `npm run preview`：本地预览构建结果
- `npm run lint`：运行 ESLint
