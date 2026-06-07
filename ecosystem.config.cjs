module.exports = {
  apps: [
    {
      name: 'xylem-agent-backend',
      cwd: '/opt/xylem-agent/backend/typescript/examples/langchain',
      script: 'npm',
      args: 'run start:websocket',
      env: {
        NODE_ENV: 'production',
        PORT: '8080',
        HEDERA_NETWORK: 'testnet',
      },
    },
  ],
}
