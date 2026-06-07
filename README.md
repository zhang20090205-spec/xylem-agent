# Xylem agent

Xylem agent is a Hedera DeFi AI demo with a React/Vite frontend and a TypeScript WebSocket backend.

## Project Structure

- `frontend/` - React + Vite frontend for the Xylem agent chat and DeFi data views.
- `backend/` - Hedera agent backend and TypeScript examples, including the LangChain WebSocket agent.

## Local Demo

Start the backend:

```bash
cd backend/typescript/examples/langchain
npm install
npm run websocket
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

Open:

```text
http://127.0.0.1:5174/
```

The Vite dev server proxies:

- `/health` to `http://127.0.0.1:8080/health`
- `/ws` to `ws://127.0.0.1:8080`

For a hackathon demo, expose `http://127.0.0.1:5174` with a tunnel such as Cloudflare Tunnel. The frontend will use the public origin's `/ws` endpoint automatically.

## Environment

Copy example files before running locally:

```bash
cp frontend/.env.example frontend/.env
cp backend/typescript/examples/langchain/.env.example backend/typescript/examples/langchain/.env
```

Do not commit real `.env` files. This public repository only keeps safe `.env.example` placeholders.
