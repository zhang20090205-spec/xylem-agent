# Xylem agent

Xylem agent is an AI-powered Hedera DeFi assistant for real-time market insight, wallet-aware chat, and transaction preparation across SaucerSwap, Bonzo Finance, and AutoSwapLimit strategies.

The product is built for users who want to understand Hedera DeFi activity quickly, compare opportunities, and prepare on-chain actions through a natural-language interface while keeping transaction signing inside their own wallet.

## Project Description

Xylem agent combines a conversational AI backend with a wallet-connected web interface. The backend streams agent responses over WebSocket, loads Hedera and DeFi tools, and returns structured messages for quotes, transaction requests, system status, and normal chat responses.

The frontend provides the product interface: chat sessions, wallet connection through HashConnect and WalletConnect, token balances, structured swap quote cards, theme controls, and WebSocket connection status.

## What It Solves

For new users, Hedera DeFi can feel fragmented across many protocols, dashboards, and contract interactions. Xylem agent turns common research and action flows into natural questions and guided responses.

For experienced users, Xylem agent reduces manual monitoring by combining live protocol data, portfolio context, and transaction preparation in one interface.

## Core Capabilities

- AI DeFi chat for Hedera market and portfolio questions.
- Real-time WebSocket agent responses.
- Wallet authentication with a real Hedera account.
- SaucerSwap token quotes and swap preparation.
- Bonzo Finance lending and borrowing analysis.
- AutoSwapLimit order analysis and transaction preparation.
- Token balance display for HBAR and supported assets.
- Session memory for ongoing conversations.

## DeFi Integrations

### SaucerSwap

- Token swap quotes and execution preparation.
- Price discovery and liquidity analysis.
- Infinity Pool and farming opportunity research.
- Advanced trading flows through AutoSwapLimit.

### Bonzo Finance

- Lending and borrowing market data.
- Interest rate and reserve analysis.
- Portfolio-oriented recommendations.
- Risk and opportunity comparison.

### AutoSwapLimit

- Limit order preparation.
- Order monitoring concepts.
- Strategy-oriented trading workflows.

## Deployed Testnet Contracts

- MockPriceOracle: [0.0.6506125](https://hashscan.io/testnet/contract/0.0.6506125)
- AutoSwapLimit: [0.0.6506134](https://hashscan.io/testnet/contract/0.0.6506134)

## Repository Layout

| Area | Path | Purpose |
| --- | --- | --- |
| Agent backend | [Hedron/typescript/examples/langchain](Hedron/typescript/examples/langchain) | WebSocket AI server and message handlers |
| DeFi tools | [Hedron/typescript/src/shared/tools/defi](Hedron/typescript/src/shared/tools/defi) | SaucerSwap, Bonzo Finance, and AutoSwapLimit tools |
| Frontend app | [Hedron_Frontend](Hedron_Frontend) | React, Vite, wallet connection, chat, and DeFi UI |

## WebSocket Message Types

| Message Type | Direction | Purpose |
| --- | --- | --- |
| `CONNECTION_AUTH` | Client to agent | Authenticate with the connected Hedera account ID |
| `USER_MESSAGE` | Client to agent | Send a user prompt or DeFi instruction |
| `AGENT_RESPONSE` | Agent to client | Stream or return AI-generated text |
| `SWAP_QUOTE` | Agent to client | Return structured swap quote data |
| `TRANSACTION_TO_SIGN` | Agent to client | Return transaction bytes for wallet signing |
| `TRANSACTION_RESULT` | Client to agent | Report the signed transaction result |
| `SYSTEM_MESSAGE` | Agent to client | Return status, authentication, or error information |

## Quick Start

### Backend

```bash
cd Hedron/typescript/examples/langchain
npm install
cp .env.example .env
npm run start:websocket
```

The backend listens on `ws://localhost:8080` by default.

### Frontend

```bash
cd Hedron_Frontend
npm install
cp .env.example .env
npm run dev
```

The frontend starts on the Vite development URL printed in the terminal, usually `http://localhost:5173`.

## Environment Variables

Backend `.env`:

```env
OPENAI_API_KEY=your-openai-compatible-api-key
OPENAI_BASE_URL=https://modcon.top
LLM_MODEL=gpt-4o-mini
ACCOUNT_ID=your-hedera-account-id
PRIVATE_KEY=your-hedera-private-key
HEDERA_NETWORK=testnet
PORT=8080
```

Frontend `.env`:

```env
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
VITE_HEDERA_NETWORK=testnet
VITE_WEBSOCKET_URL_LOCAL=ws://localhost:8080
# VITE_WEBSOCKET_URL_PRODUCTION=wss://your-public-demo-host/ws
```

Xylem agent requires a real wallet connection for authenticated chat and transaction signing. The public repository only includes `.env.example` files. Real API keys, wallet keys, and deployment secrets must stay in local `.env` files.

## Local Demo Checklist

1. Start the backend and confirm the WebSocket server is listening on port `8080`.
2. Start the frontend with `npm run dev`.
3. Open the Vite URL in a browser.
4. Connect a Hedera wallet through HashConnect.
5. Send a prompt such as `Show me SaucerSwap farming opportunities`.
6. Confirm the frontend receives `AGENT_RESPONSE`, `SWAP_QUOTE`, or `TRANSACTION_TO_SIGN` messages as appropriate.

## Security Notes

- Do not commit `.env`, `.env.production`, private keys, API keys, logs, `node_modules`, or `dist`.
- The agent prepares transactions, but users sign transactions from their wallet.
- For public demos, use testnet accounts and rotate temporary keys after the event.

## License And Credits

Xylem agent uses open-source Hedera ecosystem tooling and third-party packages. Package-level licenses are preserved in the relevant package metadata.
