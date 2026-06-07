import WebSocket from 'ws';
import { Client } from '@hashgraph/sdk';
import { ChatOpenAI } from '@langchain/openai';
import { 
  WSMessage, 
  UserMessage, 
  ConnectionAuth, 
  TransactionResult, 
  UserConnection,
  PendingStep 
} from '../types/websocket-types';
import { AgentResponseUtils } from '../utils/agent-response-utils';
import { ConnectionManager } from './connection-manager';

/**
 * Handles different types of WebSocket messages
 */
export class MessageHandlers {
  private connectionManager: ConnectionManager;
  private llm: ChatOpenAI;
  private agentClient: Client;
  private forceClearMemory: boolean;

  constructor(
    connectionManager: ConnectionManager,
    llm: ChatOpenAI,
    agentClient: Client,
    forceClearMemory: boolean = false
  ) {
    this.connectionManager = connectionManager;
    this.llm = llm;
    this.agentClient = agentClient;
    this.forceClearMemory = forceClearMemory;
  }

  /**
   * Handle user authentication
   */
  async handleConnectionAuth(ws: WebSocket, message: ConnectionAuth): Promise<void> {
    try {
      console.log('用户认证：', message.userAccountId);
      
      // Create user connection with their own toolkit
      const userConnection = await this.connectionManager.createUserConnection(
        ws, 
        message.userAccountId,
        this.llm,
        this.agentClient
      );
      this.connectionManager.addConnection(ws, userConnection);
      
      this.sendSystemMessage(ws, `认证成功，当前账户为 ${message.userAccountId}。现在可以开始提问了。`, 'info');
    } catch (error: any) {
      console.error('认证过程中发生错误：', error);
      this.sendSystemMessage(ws, `认证失败：${error.message}`, 'error');
    }
  }

  /**
   * Handle user messages
   */
  async handleUserMessage(ws: WebSocket, message: UserMessage): Promise<void> {
    try {
      const userConnection = this.connectionManager.getConnection(ws);
      
      if (!userConnection) {
        this.sendSystemMessage(ws, '请先使用 CONNECTION_AUTH 消息完成认证。', 'error');
        return;
      }

      console.log(`👤 User (${userConnection.userAccountId}):`, message.message);

      // If the message includes a different userAccountId, recreate the connection
      if (message.userAccountId && message.userAccountId !== userConnection.userAccountId) {
        console.log('正在切换到账户：', message.userAccountId);
        // First cleanup the old connection
        await this.connectionManager.cleanupConnection(ws);
        // Then create new connection
        const newUserConnection = await this.connectionManager.createUserConnection(
          ws, 
          message.userAccountId,
          this.llm,
          this.agentClient
        );
        this.connectionManager.addConnection(ws, newUserConnection);
        
        this.sendSystemMessage(ws, `已切换到账户 ${message.userAccountId}`, 'info');
      }

      const currentConnection = this.connectionManager.getConnection(ws)!;
      
      // 🧠 LangGraph: Memory is handled automatically through checkpointer
      console.log(`正在处理用户 ${currentConnection.userAccountId} 的消息`);
      console.log(`使用 thread ID：${currentConnection.threadId}`);
      
      // 🧠 MVP: Force clear memory on each message if flag is set (for debugging memory issues)
      // Note: With LangGraph, we would need to clear the entire thread, which we skip for now
      if (this.forceClearMemory) {
        console.log('FORCE_CLEAR_MEMORY 已启用：完整 thread 清理暂未实现');
      }
      
      // Pre-route: detect limit order intent to avoid swap tools misuse
      const routedInput = this.applyLimitOrderRoutingHints(message.message);

      // Process message with LangGraph agent
      // Pass the thread ID for conversation continuity
      const response = await currentConnection.agent.invoke(
        { messages: [{ role: 'user', content: routedInput }] },
        { configurable: { thread_id: currentConnection.threadId } }
      );
      
      // Extract the final AI message
      const messages = (response.messages || []) as any[];
      const lastMessage = messages[messages.length - 1];
      const outputText = lastMessage?.content || JSON.stringify(response);
      
      console.log('🤖 Agent:', outputText);

      // Extract transaction bytes if they exist
      const bytes = AgentResponseUtils.extractBytesFromAgentResponse(response);
      const nextStep = AgentResponseUtils.extractNextStepFromAgentResponse(response);
      const swapQuote = AgentResponseUtils.extractSwapQuoteFromAgentResponse(response);
      const opCtx = AgentResponseUtils.extractOperationContext(response);
      const preparedTxInfo = AgentResponseUtils.extractPreparedTxInfo(response);
      
      // Check if this is a swap quote and send structured data first
      if (swapQuote) {
        console.log('正在向前端发送结构化 swap 报价');
        this.sendMessage(ws, swapQuote);
      }
      
      if (bytes !== undefined) {
        // There is a transaction to sign
        // If multiple prepared transactions exist, enforce priority: association -> approval -> others
        const selectedBytes = preparedTxInfo?.bytes || bytes;
        const realBytes = Buffer.isBuffer(selectedBytes) ? selectedBytes : Buffer.from(selectedBytes.data);
        
        // Store pending step information for multi-step flows
        if (nextStep) {
          console.log(`📝 Storing pending step: ${nextStep.step} for ${nextStep.tool}`);
          console.log(`📝 Storing pending step details:`, {
            tool: nextStep.tool,
            operation: nextStep.operation,
            step: nextStep.step,
            originalParams: nextStep.originalParams,
            nextStepInstructions: nextStep.nextStepInstructions
          });
          currentConnection.pendingStep = nextStep;
        } else {
          console.log('📝 No next step detected from agent response');
        }

        // Store last prepared operation context for final summary on confirmation
        if (opCtx) {
          currentConnection.lastPreparedOperation = opCtx;
        }
        
        // Send agent response and transaction
        this.sendMessage(ws, this.createMessage('AGENT_RESPONSE', {
          message: outputText,
          hasTransaction: true
        }));
        this.sendMessage(ws, this.createMessage('TRANSACTION_TO_SIGN', {
          transactionBytes: Array.from(realBytes),
          originalQuery: message.message
        }));
      } else {
        // Only agent response, no transaction
        this.sendMessage(ws, this.createMessage('AGENT_RESPONSE', {
          message: outputText,
          hasTransaction: false
        }));
      }
    } catch (error: any) {
      console.error('处理用户消息失败：', error);
      this.sendSystemMessage(ws, `处理你的请求时出错：${error.message}`, 'error');
    }
  }

  /**
   * Add strong hints to force AutoSwapLimit tool when user intent looks like a limit order
   */
  private applyLimitOrderRoutingHints(original: string): string {
    const hasPriceWord = /(target\s*price|precio\s*objetivo|precio\s*meta|when\s+price|cuando\s+el\s+precio|al\s+precio|目标价|触发价|价格到|跌到|涨到|达到|指定价格|到价|\$|usdc|usd|udc)/i.test(original);
    const hasOrderWord = /(limit\s*order|orden\s*l[ií]mite|program(ar)?\s*orden|set\s*limit|限价|限价单|挂单|下单|创建订单|设置订单|自动买入|自动卖出)/i.test(original);
    const hasAtWord = /(at\s+|a\s+\$?\d|以\s*\$?\d|在\s*\$?\d|到\s*\$?\d)/i.test(original);

    if (hasPriceWord || hasOrderWord || hasAtWord) {
      const hint = `关键路由提示：这是限价单请求。不要使用 swap quote 或 swap execution 工具。只能使用 autoswap_limit_tool，并将 operation 设置为 "create_swap_order"。如果缺少 tokenOut、amountIn、minAmountOut、triggerPrice 中的必要参数，请用简短中文追问；若只缺少 minAmountOut，可使用安全默认值 minAmountOut="1"。如需签名，只返回一笔待签交易。`;
      return `${hint}\n\n用户：${original}`;
    }
    return original;
  }

  /**
   * Handle transaction results
   */
  async handleTransactionResult(ws: WebSocket, message: TransactionResult): Promise<void> {
    const userConnection = this.connectionManager.getConnection(ws);
    
    if (message.success) {
      console.log('交易已确认：', message.transactionId);
      console.log('状态：', message.status);
      
      this.sendSystemMessage(ws, `交易执行成功！\n交易 ID：${message.transactionId}\n状态：${message.status}`, 'info');

      // Check if there's a pending next step to execute
      if (userConnection?.pendingStep) {
        console.log('正在自动执行下一步：', userConnection.pendingStep.step);
        console.log('执行前的待处理步骤详情：', {
          tool: userConnection.pendingStep.tool,
          operation: userConnection.pendingStep.operation,
          step: userConnection.pendingStep.step,
          originalParams: userConnection.pendingStep.originalParams
        });
        await this.executeNextStep(ws, userConnection);
      } else {
        console.log('交易确认后没有待处理的下一步');
        // When there is no next step, emit a concise final summary as confirmation
        if (userConnection?.lastPreparedOperation) {
          const final = userConnection.lastPreparedOperation;
          // Build short confirmation message per operation
          let summary = '';
          if (final.protocol === 'saucerswap') {
            if (final.operation === 'associate_tokens') {
              summary = `Token 关联成功${final.tokenIds ? `：${final.tokenIds.join(', ')}` : ''}。`;
            } else if (final.operation === 'approve_sauce') {
              summary = `SAUCE 授权已确认${final.amountLabel ? `（${final.amountLabel}）` : ''}。`;
            } else if (final.operation === 'stake_sauce') {
              summary = `质押已完成${final.amountLabel ? `：${final.amountLabel} 已质押到 Infinity Pool` : ''}。`;
            } else if (final.operation === 'unstake_xsauce') {
              summary = `解除质押已完成。`;
            }
          }

          if (summary) {
            this.sendMessage(ws, this.createMessage('AGENT_RESPONSE', {
              message: `# 操作已完成\n\n${summary}`,
              hasTransaction: false,
            }));
          }
          // Clear the stored context after summarizing
          userConnection.lastPreparedOperation = undefined;
        }
      }
    } else {
      console.log('交易失败：', message.error);
      
      // Clear pending step on failure
      if (userConnection?.pendingStep) {
        console.log('交易失败，正在清理待处理步骤');
        userConnection.pendingStep = undefined;
      }
      
      this.sendSystemMessage(ws, `交易错误：${message.error}`, 'error');
    }
  }

  /**
   * Execute the next step in a multi-step flow
   */
  private async executeNextStep(ws: WebSocket, userConnection: UserConnection): Promise<void> {
    if (!userConnection.pendingStep) {
      console.log('没有待执行的下一步');
      return;
    }

    const pendingStep = userConnection.pendingStep;
    console.log(`正在执行下一步：${pendingStep.step}，工具：${pendingStep.tool}`);
    console.log(`待处理步骤详情：`, {
      tool: pendingStep.tool,
      operation: pendingStep.operation,
      step: pendingStep.step,
      originalParams: pendingStep.originalParams,
      nextStepInstructions: pendingStep.nextStepInstructions
    });

    try {
      // Create the message for the next step based on the tool and operation
      let nextStepMessage = '';
      
      if (pendingStep.tool === 'bonzo_deposit_tool' && pendingStep.step === 'approval') {
        // For Bonzo deposit flow, trigger the approval step after token association
        const params = pendingStep.originalParams;
        const token = params.token || 'hbar';
        const amount = params.amount || params.hbarAmount || 0;
        nextStepMessage = `请调用 bonzo_approve_step_tool，为 Bonzo Finance LendingPool 授权 ${amount} ${token.toUpperCase()}。参数：token="${token}", amount=${amount}, userAccountId="${userConnection.userAccountId}"`;
      } else if (pendingStep.tool === 'bonzo_deposit_tool' && pendingStep.step === 'deposit') {
        // For Bonzo deposit flow, trigger the deposit step only (after approval or for HBAR)
        const params = pendingStep.originalParams;
        const token = params.token || 'hbar';
        const amount = params.amount || params.hbarAmount || 0; // Support both new and old format
        nextStepMessage = `请调用 bonzo_deposit_step_tool，为账户 ${userConnection.userAccountId} 存入 ${amount} ${token.toUpperCase()}。参数：token="${token}", amount=${amount}, referralCode=${params.referralCode || 0}`;
      } else if (pendingStep.tool === 'saucerswap_infinity_pool_tool' && pendingStep.step === 'approval') {
        // For Infinity Pool flow, trigger the approval step after token association
        const params = pendingStep.originalParams;
        nextStepMessage = `执行 SAUCE 质押授权：请使用 saucerswap_infinity_pool_tool，operation 为 "approve_sauce"，sauceAmount=${params.sauceAmount || 100}，userAccountId="${userConnection.userAccountId}"，originalParams 使用流程上下文中的原始参数`;
      } else if (pendingStep.tool === 'saucerswap_infinity_pool_tool' && pendingStep.step === 'stake') {
        // For Infinity Pool flow, trigger the staking step after approval
        const params = pendingStep.originalParams;
        nextStepMessage = `请调用 saucerswap_infinity_pool_step_tool，为账户 ${userConnection.userAccountId} 质押 ${params.sauceAmount} SAUCE，originalParams=${JSON.stringify(params)}`;
      } else {
        // Generic next step execution
        nextStepMessage = `请执行 ${pendingStep.tool} 的 ${pendingStep.step} 步骤`;
      }

      console.log(`使用以下消息触发下一步：${nextStepMessage}`);

      // Clear the pending step before execution to avoid loops
      userConnection.pendingStep = undefined;

      // Execute the next step through the agent with LangGraph
      const response = await userConnection.agent.invoke(
        { messages: [{ role: 'user', content: nextStepMessage }] },
        { configurable: { thread_id: userConnection.threadId } }
      );

      // Extract the final AI message
      const messages = (response.messages || []) as any[];
      const lastMessage = messages[messages.length - 1];
      const outputText = lastMessage?.content || JSON.stringify(response);
      
      console.log('🤖 Agent (Next Step):', outputText);

      // Extract transaction bytes for the next step
      const bytes = AgentResponseUtils.extractBytesFromAgentResponse(response);
      const nextStep = AgentResponseUtils.extractNextStepFromAgentResponse(response);

      if (bytes !== undefined) {
        // There is another transaction to sign
        const realBytes = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes.data);
        
        // Store any additional pending steps
        if (nextStep) {
          console.log(`记录额外待处理步骤：${nextStep.step}，工具：${nextStep.tool}`);
          userConnection.pendingStep = nextStep;
        }

        // Send agent response and transaction
        this.sendMessage(ws, this.createMessage('AGENT_RESPONSE', {
          message: outputText,
          hasTransaction: true
        }));
        this.sendMessage(ws, this.createMessage('TRANSACTION_TO_SIGN', {
          transactionBytes: Array.from(realBytes),
          originalQuery: `下一步：${pendingStep.step}`
        }));
      } else {
        // Only agent response, flow completed
        this.sendMessage(ws, this.createMessage('AGENT_RESPONSE', {
          message: outputText,
          hasTransaction: false
        }));
      }

    } catch (error: any) {
      console.error('执行下一步失败：', error);
      
      this.sendSystemMessage(ws, `执行下一步失败：${error.message}`, 'error');
      
      // Clear pending step on error
      userConnection.pendingStep = undefined;
    }
  }

  /**
   * Send a WebSocket message
   */
  private sendMessage(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Create a WebSocket message with timestamp
   */
  private createMessage(type: WSMessage['type'], content: any): WSMessage {
    return { ...content, type, timestamp: Date.now() };
  }

  /**
   * Send a system message
   */
  private sendSystemMessage(ws: WebSocket, message: string, level: 'info' | 'error' | 'warning' = 'info'): void {
    this.sendMessage(ws, this.createMessage('SYSTEM_MESSAGE', { message, level }));
  }
}
