# Xylem agent backend

This backend powers the Xylem agent WebSocket AI layer. It connects a Hedera-aware LangChain agent to DeFi tools for SaucerSwap, Bonzo Finance, AutoSwapLimit, account queries, token operations, and transaction preparation.

The backend is designed to keep private credentials on the server side while the frontend authenticates users by wallet account ID and signs transactions client-side.

## Capabilities

- WebSocket server for real-time agent conversations.
- `CONNECTION_AUTH` based user session initialization.
- Natural-language DeFi analysis through an LLM.
- SaucerSwap quotes, liquidity, and farming research.
- Bonzo Finance lending and borrowing data.
- AutoSwapLimit order preparation and analysis.
- Hedera account, token, HBAR, and consensus tools.
- Structured responses for quotes, transaction requests, and system messages.

## Quick Access

| Area | Path | Purpose |
| --- | --- | --- |
| WebSocket agent | [typescript/examples/langchain/websocket-agent.ts](typescript/examples/langchain/websocket-agent.ts) | Main backend entrypoint |
| Message handlers | [typescript/examples/langchain/handlers](typescript/examples/langchain/handlers) | WebSocket message processing |
| DeFi tools | [typescript/src/shared/tools/defi](typescript/src/shared/tools/defi) | Protocol integrations |

## Run Locally

```bash
cd typescript/examples/langchain
npm install
cp .env.example .env
npm run start:websocket
```

The default WebSocket endpoint is `ws://localhost:8080`.

## Required Environment

```env
OPENAI_API_KEY=your-openai-compatible-api-key
OPENAI_BASE_URL=https://modcon.top
LLM_MODEL=gpt-4o-mini
ACCOUNT_ID=your-hedera-account-id
PRIVATE_KEY=your-hedera-private-key
HEDERA_NETWORK=testnet
PORT=8080
```

Keep real `.env` files local. Only `.env.example` belongs in the public repository.

## Message Types

| Message Type | Direction | Purpose |
| --- | --- | --- |
| `CONNECTION_AUTH` | Client to agent | Authenticate a wallet account ID |
| `USER_MESSAGE` | Client to agent | Send a prompt or instruction |
| `AGENT_RESPONSE` | Agent to client | Return AI-generated text |
| `SWAP_QUOTE` | Agent to client | Return structured swap data |
| `TRANSACTION_TO_SIGN` | Agent to client | Return transaction bytes for wallet signing |
| `TRANSACTION_RESULT` | Client to agent | Confirm wallet signing results |
| `SYSTEM_MESSAGE` | Agent to client | Return status or errors |

## Deployed Testnet Contracts

- MockPriceOracle: [0.0.6506125](https://hashscan.io/testnet/contract/0.0.6506125)
- AutoSwapLimit: [0.0.6506134](https://hashscan.io/testnet/contract/0.0.6506134)

## Security Notes

- Never commit API keys, Hedera private keys, logs, `node_modules`, or generated builds.
- Use testnet credentials for demos.
- Rotate temporary credentials after public demos.
