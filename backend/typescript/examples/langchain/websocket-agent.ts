import * as dotenv from 'dotenv';
dotenv.config();

import { ChatOpenAI } from '@langchain/openai';
import { Client } from '@hashgraph/sdk';
import WebSocket, { WebSocketServer } from 'ws';
import * as http from 'http';

// Import new modular components
import { WSMessage } from './types/websocket-types';
import { AgentResponseUtils } from './utils/agent-response-utils';
import { MessageHandlers } from './handlers/message-handlers';
import { ConnectionManager } from './handlers/connection-manager';

// Constants
const NETWORK = (process.env.HEDERA_NETWORK as 'mainnet' | 'testnet') || 'testnet';
const FORCE_CLEAR_MEMORY = process.env.FORCE_CLEAR_MEMORY === 'true';

// Enhanced LLM Configuration Constants
const MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS || '12000');
const MODEL_NAME = process.env.LLM_MODEL || 'gpt-5-mini';
// GPT-5 models only support temperature=1 (default), so we use 1 for GPT-5 models
const TEMPERATURE = MODEL_NAME.startsWith('gpt-5') ? 1 : parseFloat(process.env.LLM_TEMPERATURE || '0.7');

// Memory Configuration Constants
const MEMORY_MAX_TOKEN_LIMIT = parseInt(process.env.MEMORY_MAX_TOKEN_LIMIT || '8000');
const MEMORY_RETURN_MAX_TOKENS = parseInt(process.env.MEMORY_RETURN_MAX_TOKENS || '4000');

class HederaWebSocketAgent {
  private wss: WebSocketServer;
  private httpServer: http.Server;
  private llm!: ChatOpenAI;
  private agentClient!: Client;
  private connectionManager!: ConnectionManager;
  private messageHandlers!: MessageHandlers;

  constructor(port: number = 8080) {
    // Create HTTP server for health checks
    this.httpServer = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          service: 'hedera-websocket-agent',
          timestamp: new Date().toISOString(),
          connections: this.connectionManager?.getConnectionCount() || 0
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Hedron WebSocket Agent - 请通过端口 ' + port + ' 建立 WebSocket 连接');
      }
    });

    // Create WebSocket server on the same HTTP server
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.httpServer.listen(port);
    this.setupWebSocketServer();
  }

  async initialize(): Promise<void> {
    console.log('正在初始化 Hedera WebSocket Agent...');
    console.log(`MVP 记忆调试模式：${FORCE_CLEAR_MEMORY ? '已启用' : '已关闭'}`);
    console.log(`记忆清理策略：${FORCE_CLEAR_MEMORY ? '每条消息后清理' : '仅新连接时清理'}`);

    // Log enhanced configuration
    console.log(`LLM 配置：`);
    console.log(`   - Model: ${MODEL_NAME}`);
    console.log(`   - Max Tokens: ${MAX_TOKENS}`);
    console.log(`   - Temperature: ${TEMPERATURE}${MODEL_NAME.startsWith('gpt-5') ? '（已为 GPT-5 自动调整）' : ''}`);
    if (MODEL_NAME.startsWith('gpt-5')) {
      console.log(`   检测到 GPT-5：使用简化参数（不传 top_p、frequency_penalty、presence_penalty）`);
    }
    console.log(`记忆配置：`);
    console.log(`   - Max Token Limit: ${MEMORY_MAX_TOKEN_LIMIT}`);
    console.log(`   - Return Max Tokens: ${MEMORY_RETURN_MAX_TOKENS}`);

    // Enhanced OpenAI Configuration with increased context
    // GPT-5 models have stricter parameter requirements
    const isGPT5 = MODEL_NAME.startsWith('gpt-5');

    this.llm = new ChatOpenAI({
      model: MODEL_NAME,
      temperature: TEMPERATURE,
      maxTokens: MAX_TOKENS,
      streaming: false, // Disable streaming for better token management
      // GPT-5 models don't support these additional parameters
      ...(isGPT5 ? {} : {
        modelKwargs: {
          // Additional model parameters for better context handling (not supported in GPT-5)
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1,
        },
      }),
    });

    // Hedera client for testnet (without operator, will be configured by user)
    this.agentClient = Client.forTestnet();

    // Initialize modular components with enhanced memory configuration
    this.connectionManager = new ConnectionManager(NETWORK, {
      maxTokenLimit: MEMORY_MAX_TOKEN_LIMIT,
      returnMaxTokens: MEMORY_RETURN_MAX_TOKENS,
    });
    this.messageHandlers = new MessageHandlers(
      this.connectionManager,
      this.llm,
      this.agentClient,
      FORCE_CLEAR_MEMORY
    );

    // Set network for agent response utils
    AgentResponseUtils.setNetwork(NETWORK);

    console.log('Hedera WebSocket Agent 初始化成功');
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log(`新的 WebSocket 连接已建立（总数：${this.connectionManager?.getConnectionCount() + 1 || 1}）`);

      // Send welcome message
      this.sendSystemMessage(ws, `已连接到 Hedera Agent。请先使用 CONNECTION_AUTH 消息提交账户 ID 完成认证。${FORCE_CLEAR_MEMORY ? ' [调试：每条消息后都会清理记忆]' : ''}`, 'info');

      // Handle incoming messages
        ws.on('message', async (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error: any) {
          console.error('处理消息失败：', error);
          this.sendSystemMessage(ws, '处理消息失败：消息格式无效。', 'error');
        }
      });

      // Handle disconnection
      ws.on('close', async () => {
        console.log('WebSocket 连接已关闭');
        await this.connectionManager.cleanupConnection(ws);
      });

      // Handle errors
      ws.on('error', async (error: any) => {
        console.error('WebSocket 错误：', error);
        await this.connectionManager.cleanupConnection(ws);
      });
    });

    console.log(`WebSocket Server 已启动，端口：${this.wss.options.port}`);
  }

  private async handleMessage(ws: WebSocket, message: WSMessage): Promise<void> {
    switch (message.type) {
      case 'CONNECTION_AUTH':
        await this.messageHandlers.handleConnectionAuth(ws, message);
        break;

      case 'USER_MESSAGE':
        await this.messageHandlers.handleUserMessage(ws, message);
        break;

      case 'TRANSACTION_RESULT':
        await this.messageHandlers.handleTransactionResult(ws, message);
        break;

      default:
        console.log('未识别的消息类型：', message.type);
    }
  }

  private sendMessage(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private createMessage(type: WSMessage['type'], content: any): WSMessage {
    return { ...content, type, timestamp: Date.now() };
  }

  private sendSystemMessage(ws: WebSocket, message: string, level: 'info' | 'error' | 'warning' = 'info'): void {
    this.sendMessage(ws, this.createMessage('SYSTEM_MESSAGE', { message, level }));
  }

  public start(): void {
    const port = (this.httpServer.address() as any)?.port || 8080;
    console.log(`
::HEDERA:: Hedera WebSocket Agent 正在运行：
HTTP 健康检查: http://localhost:${port}/health
WebSocket 服务: ws://localhost:${port}

增强 LLM 配置:
   - Model: ${MODEL_NAME}
   - Max Tokens: ${MAX_TOKENS}
   - Temperature: ${TEMPERATURE}

增强记忆配置:
   - 每个连接独立记忆: 已启用
   - 断开连接自动清理: 已启用
   - 每条消息后强制清理: ${FORCE_CLEAR_MEMORY ? '已启用' : '已关闭'}
   - Max Token Limit: ${MEMORY_MAX_TOKEN_LIMIT}
   - Return Max Tokens: ${MEMORY_RETURN_MAX_TOKENS}

启用调试模式: 设置环境变量 FORCE_CLEAR_MEMORY=true
自定义 token 限制: 设置 LLM_MAX_TOKENS 和 MEMORY_MAX_TOKEN_LIMIT

支持的消息类型:
   - CONNECTION_AUTH: 使用账户 ID 认证
   - USER_MESSAGE: 向 agent 发送问题
   - TRANSACTION_RESULT: 确认已签名交易结果

Agent 会返回:
   - AGENT_RESPONSE: Agent 文本回复
   - SWAP_QUOTE: 结构化 swap 报价数据
   - TRANSACTION_TO_SIGN: 需要钱包签名的交易
   - SYSTEM_MESSAGE: 系统消息

SWAP_QUOTE 结构:


按 Ctrl+C 退出
    `);
  }

  public stop(): void {
    this.wss.close();
    this.httpServer.close();
    console.log('WebSocket Server 和 HTTP Server 已停止');
  }
}

// Initialize and run the agent
async function main(): Promise<void> {
  const agent = new HederaWebSocketAgent(8080);

  try {
    await agent.initialize();
    agent.start();

    // Handle process shutdown
    process.on('SIGINT', () => {
      console.log('\n正在停止 WebSocket Agent...');
      agent.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n正在停止 WebSocket Agent...');
      agent.stop();
      process.exit(0);
    });

  } catch (error: any) {
    console.error('初始化 agent 时发生致命错误：', error);
    process.exit(1);
  }
}

main().catch(console.error);
