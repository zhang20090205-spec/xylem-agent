## Xylem agent frontend

The Xylem agent frontend is a React, Vite, and TypeScript interface for the Hedera DeFi AI agent. It provides wallet connection, chat sessions, WebSocket authentication, token balances, structured swap quote rendering, and transaction signing handoff.

### Features

- Chat interface with session management and Markdown rendering.
- Wallet connection through HashConnect and WalletConnect v2.
- WebSocket connectivity to the Xylem agent backend with reconnect and auth flow.
- Structured swap quote cards and transaction signing handoff.
- HBAR and token balance display with USD estimates.
- Light and dark theme support.

### Tech Stack

- React 18, TypeScript, Vite 5.
- TailwindCSS for styling.
- HashConnect and Hedera SDK for wallet integration.
- lucide-react for icons and react-markdown for message rendering.

## Getting Started

### Prerequisites

- Node.js 18+ and npm.
- A running Xylem agent backend over WebSocket.
- A WalletConnect Project ID from WalletConnect Cloud.

### Installation

```bash
npm install
cp .env.example .env
npm run dev
```

The app starts on the default Vite dev server, usually `http://localhost:5173`.

### Build And Preview

```bash
npm run build
npm run preview
```

## Environment Variables

```env
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
VITE_HEDERA_NETWORK=testnet
VITE_WEBSOCKET_URL_LOCAL=ws://localhost:8080
# VITE_WEBSOCKET_URL_PRODUCTION=wss://your-public-demo-host/ws
```

`VITE_WALLETCONNECT_PROJECT_ID` is required for wallet connection. The app uses `VITE_WEBSOCKET_URL_LOCAL` during development and `VITE_WEBSOCKET_URL_PRODUCTION` for production builds.

## Project Structure

- `src/App.tsx`: Main layout, status, and product composition.
- `src/components/ChatArea.tsx`: Scrollable chat area with example prompts.
- `src/components/ChatMessage.tsx`: Rich message rendering and transaction status.
- `src/components/ChatInput.tsx`: Prompt input and send controls.
- `src/components/WalletButton.tsx`: Connect and disconnect wallet actions.
- `src/components/TokenBalances.tsx`: Token balance display.
- `src/hooks/useChat.ts`: Sessions, message handling, quote detection, and signing handoff.
- `src/hooks/useWebSocket.ts`: WebSocket connection, auth, reconnect, and message dispatch.
- `src/hooks/useWallet.ts`: HashConnect lifecycle and wallet helpers.
- `src/hooks/useTokenBalances.ts`: Mirror Node and price fetching.
- `src/config/hashconnect.ts`: Wallet metadata and network selection.

## Wallet Flow

Xylem agent requires a real wallet connection. After the wallet connects, the frontend sends `CONNECTION_AUTH` with the Hedera account ID and unlocks chat interaction when the backend confirms authentication.

## Security Notes

- Do not commit real `.env` files.
- Do not put API keys in frontend code.
- Use testnet accounts for demos and rotate temporary credentials after the event.
