# Xylem agent

Xylem agent is a Hedera DeFi AI assistant with a React/Vite frontend and a WebSocket backend.

## Live Server

- Frontend: http://162.211.181.13/
- Backend health: http://162.211.181.13/health
- WebSocket: ws://162.211.181.13/ws

## Project Structure

- `frontend/` - React, Vite, TypeScript UI
- `backend/` - Hedera WebSocket agent backend
- `deploy/` - Rainyun/Nginx deployment assets
- `ecosystem.config.cjs` - PM2 process config

## Local Development

Backend:

```bash
cd backend/typescript
npm install
cd examples/langchain
npm install
PORT=8080 HEDERA_NETWORK=testnet npm run start:websocket
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Production Build

Create real `.env` files on the server only. Do not commit secrets.

Frontend production values:

```env
VITE_HEDERA_NETWORK=testnet
VITE_WEBSOCKET_URL_PRODUCTION=ws://162.211.181.13/ws
```

Backend production values:

```env
PORT=8080
NODE_ENV=production
HEDERA_NETWORK=testnet
OPENAI_API_KEY=your_openai_key
```

## Rainyun Deployment

The intended server path is `/opt/xylem-agent`.

```bash
git clone https://github.com/zhang20090205-spec/xylem-agent.git /opt/xylem-agent
cd /opt/xylem-agent/backend/typescript
npm install
cd /opt/xylem-agent/backend/typescript/examples/langchain
npm install
cd /opt/xylem-agent/frontend
npm install
npm run build
cd /opt/xylem-agent
pm2 start ecosystem.config.cjs
pm2 save
cp deploy/nginx-xylem-agent.conf /etc/nginx/sites-available/xylem-agent
ln -sf /etc/nginx/sites-available/xylem-agent /etc/nginx/sites-enabled/xylem-agent
nginx -t
systemctl reload nginx
```

After deployment, rotate any temporary root password and prefer SSH key login.
