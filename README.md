# Xylem agent

Xylem agent is a monorepo that tracks the upstream Hedera DeFi agent projects:

- Backend: [rofergon/Hedron](https://github.com/rofergon/Hedron)
- Frontend: [rofergon/Hedron_Frontend](https://github.com/rofergon/Hedron_Frontend)

The source code keeps upstream behavior, with only Xylem branding and an OpenAI-compatible `OPENAI_BASE_URL` backend option added for demo configuration.

## Project Structure

| Path | Purpose |
| --- | --- |
| `Hedron/` | Hedera DeFi AI agent backend and WebSocket server |
| `Hedron_Frontend/` | React + Vite frontend with HashConnect wallet support |

## Local Setup

Use real local `.env` files for secrets. Do not commit `.env`, `.env.production`, private keys, API keys, `node_modules`, `dist`, logs, or local tool caches.

### Backend

```bash
cd Hedron/typescript/examples/langchain
npm install
npm run start:websocket
```

The WebSocket agent listens on `ws://localhost:8080` by default.

Create `Hedron/typescript/examples/langchain/.env` from `.env.example` and set:

```env
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://modcon.top
LLM_MODEL=gpt-4o-mini
ACCOUNT_ID=your-hedera-account
PRIVATE_KEY=your-hedera-private-key
HEDERA_NETWORK=testnet
PORT=8080
```

### Frontend

```bash
cd Hedron_Frontend
npm install
npm run dev
```

Create `Hedron_Frontend/.env` from `.env.example` and set:

```env
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
VITE_HEDERA_NETWORK=testnet
VITE_WEBSOCKET_URL_LOCAL=ws://localhost:8080
```

The frontend requires a real HashConnect/WalletConnect wallet connection. Demo auto-login is intentionally not included.

## Verification

```bash
cd Hedron_Frontend
npm run build
```

Optional backend health check after starting the agent:

```bash
curl http://localhost:8080/health
```

## Notes

- Public repository config files are examples only.
- Real keys should stay in local or deployment environment variables.
- WebSocket message types remain compatible with upstream: `CONNECTION_AUTH`, `USER_MESSAGE`, `AGENT_RESPONSE`, `SWAP_QUOTE`, `TRANSACTION_TO_SIGN`, `TRANSACTION_RESULT`, and `SYSTEM_MESSAGE`.
