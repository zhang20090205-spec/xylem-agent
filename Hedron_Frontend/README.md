## Hedron Frontend

A modern React + Vite TypeScript frontend for the Hedron Agent. It provides a conversational UI connected to a Hedera-enabled backend via WebSocket, WalletConnect/HashConnect wallet integration, and a live token balance widget.

### Features
- Chat interface with session management, Markdown rendering, and rich message styling
- Wallet connection via HashConnect (WalletConnect v2) with robust lifecycle management
- WebSocket connectivity to the Hedron Agent backend with auto-reconnect and auth flow
- Structured swap quotes rendering (specialized quote card and execution hook)
- Token balances (HBAR and common tokens) with USD estimates, updated periodically
- Light/Dark theme toggle and responsive layout

### Tech Stack
- React 18, TypeScript, Vite 5
- TailwindCSS for styling
- HashConnect and Hedera SDK for wallet integration
- lucide-react for icons, react-markdown for message rendering

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- A running Hedron Agent backend over WebSocket (local or hosted)
- A WalletConnect Project ID (free from WalletConnect Cloud)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root (same level as `package.json`). See Environment Variables below.

### Run (Development)
```bash
npm run dev
```
The app starts on the default Vite dev server (usually `http://localhost:5173`).

### Build & Preview
```bash
npm run build
npm run preview
```

## Environment Variables
Add these to your `.env` (or `.env.local`) as needed. All variables are read with the `VITE_` prefix.

- `VITE_WALLETCONNECT_PROJECT_ID` (required): Your WalletConnect Cloud Project ID. Get one from [cloud.walletconnect.com](https://cloud.walletconnect.com).
- `VITE_HEDERA_NETWORK` (optional): One of `mainnet`, `testnet`, or `previewnet`. Defaults to `mainnet`.
- `VITE_WEBSOCKET_URL_LOCAL` (optional): Local WebSocket URL for development. Defaults to `ws://localhost:8080`.
- `VITE_WEBSOCKET_URL_PRODUCTION` (optional): Production WebSocket URL. Defaults to `wss://hedron-production.up.railway.app`.

Example `.env`:
```env
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
VITE_HEDERA_NETWORK=testnet
VITE_WEBSOCKET_URL_LOCAL=ws://localhost:8080
# VITE_WEBSOCKET_URL_PRODUCTION=wss://your-hosted-agent.example.com
```

## Project Structure (high-level)
- `src/App.tsx`: Main layout, headers, connection status, and composition
- `src/components/ChatArea.tsx`: Scrollable chat area with example prompt grid (when empty)
- `src/components/ChatMessage.tsx`: Renders messages, Markdown, inline icons, tables, copy-to-clipboard, and transaction status
- `src/components/ChatInput.tsx`: Input box with send actions
- `src/components/WalletButton.tsx`: Connect/disconnect button with error and helper UI
- `src/components/TokenBalances.tsx`: Balance widget (compact/full)
- `src/components/TokenDebugger.tsx`: Development-only helper to inspect tokens
- `src/hooks/useChat.ts`: Sessions, message handling, swap-quote detection, signing flow handoff
- `src/hooks/useWebSocket.ts`: WebSocket connection, auth, reconnect, message dispatch
- `src/hooks/useWallet.ts`: HashConnect singleton, pairing modal lifecycle, connect/disconnect helpers
- `src/hooks/useTokenBalances.ts`: Mirror Node + price fetching and formatting
- `src/config/hashconnect.ts`: HashConnect factory with network selection

## WebSocket & Auth Flow
- The URL is selected by build mode: development uses `VITE_WEBSOCKET_URL_LOCAL`, production uses `VITE_WEBSOCKET_URL_PRODUCTION` (with sensible defaults).
- The app authenticates the WebSocket connection using the connected Hedera account ID.
- Connection status is displayed in the header (connecting/disconnected/wallet required/authenticating/ready).

## Wallet Integration (HashConnect)
- Requires `VITE_WALLETCONNECT_PROJECT_ID`.
- Network is selected via `VITE_HEDERA_NETWORK` (`mainnet`, `testnet`, `previewnet`).
- The wallet pairing modal is managed defensively to avoid duplicate popups during hot reloads.

## Token Balances
- Uses Hedera Mirror Node REST API (network is selected by `VITE_HEDERA_NETWORK`).
- Prices fetched from CoinGecko (HBAR, SAUCE) with fallbacks; updated every 5 minutes.
- Known tokens (HBAR, SAUCE, USDC, BONZO, WHBAR) are preconfigured in `useTokenBalances`.

## Swap Quotes
- Structured `SWAP_QUOTE` messages render a dedicated `SwapQuoteCard` in the chat when present.
- Free-form agent messages are also parsed heuristically for quote details.
- Executing a quote triggers a message back to the agent; signing is routed to the wallet.

## Development Notes
- Token icons live in `public/` and are referenced by components and Markdown rendering.
- `TokenDebugger` is only shown in development builds.
- The signing flow in `useChat` uses HashConnect and includes a simulated success path if SDK type conflicts prevent direct result handling.

## Scripts
- `npm run dev`: Start Vite dev server
- `npm run build`: Production build
- `npm run preview`: Preview the production build locally
- `npm run lint`: Run ESLint

## Troubleshooting
- Wallet button shows “Configuration Required”: set `VITE_WALLETCONNECT_PROJECT_ID` and restart the dev server.
- WebSocket “Disconnected”: ensure your backend is running at `VITE_WEBSOCKET_URL_LOCAL` (default `ws://localhost:8080`).
- Wrong network balances: verify `VITE_HEDERA_NETWORK` matches your account and tokens.
- Icons not showing: confirm images exist in `public/` and paths match.

## License
No license specified.
