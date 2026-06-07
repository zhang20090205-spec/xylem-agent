import WebSocket from 'ws';
import { Client } from '@hashgraph/sdk';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { HederaLangchainToolkit, AgentMode, hederaTools } from 'hedera-agent-kit';
import { UserConnection } from '../types/websocket-types';

// DeFi Tools
import { createBonzoLangchainTool } from '../../../src/shared/tools/defi/bonzo/langchain-tools';
import {
  createBonzoDepositLangchainTool,
  createBonzoDepositStepLangchainTool,
  createBonzoApproveStepLangchainTool,
} from '../../../src/shared/tools/defi/bonzoTransaction/langchain-tools';
import { createSaucerSwapLangchainTool } from '../../../src/shared/tools/defi/saucerswap-api/langchain-tools';
import { createSaucerswapRouterSwapQuoteLangchainTool } from '../../../src/shared/tools/defi/SaucerSwap-Quote/langchain-tools';
import { createSaucerSwapRouterSwapLangchainTool } from '../../../src/shared/tools/defi/Saucer-Swap/langchain-tools';
import {
  createSaucerswapInfinityPoolLangchainTool,
  createSaucerswapInfinityPoolStepLangchainTool,
} from '../../../src/shared/tools/defi/SaucerSwap-InfinityPool/langchain-tools';
import { createAutoSwapLimitLangchainTool } from '../../../src/shared/tools/defi/autoswap-limit/langchain-tools';
import { createAutoSwapLimitOrdersQueryLangchainTool } from '../../../src/shared/tools/defi/autoswap-limit-queries/langchain-tools';

interface MemoryConfig {
  maxTokenLimit?: number;
  returnMaxTokens?: number;
}

export class ConnectionManager {
  private userConnections: Map<WebSocket, UserConnection> = new Map();
  private network: 'mainnet' | 'testnet';
  private memoryConfig: MemoryConfig;

  constructor(network: 'mainnet' | 'testnet' = 'mainnet', memoryConfig: MemoryConfig = {}) {
    this.network = network;
    this.memoryConfig = {
      maxTokenLimit: memoryConfig.maxTokenLimit || 4000,
      returnMaxTokens: memoryConfig.returnMaxTokens || 2000,
    };
  }

  async createUserConnection(
    ws: WebSocket,
    userAccountId: string,
    llm: ChatOpenAI,
    agentClient: Client,
  ): Promise<UserConnection> {
    console.log(`正在为账户创建新的用户连接：${userAccountId}`);

    const {
      CREATE_FUNGIBLE_TOKEN_TOOL,
      CREATE_TOPIC_TOOL,
      SUBMIT_TOPIC_MESSAGE_TOOL,
      GET_HBAR_BALANCE_QUERY_TOOL,
      TRANSFER_HBAR_TOOL,
      GET_ACCOUNT_QUERY_TOOL,
      GET_ACCOUNT_TOKEN_BALANCES_QUERY_TOOL,
      GET_TOPIC_MESSAGES_QUERY_TOOL,
    } = hederaTools;

    const hederaAgentToolkit = new HederaLangchainToolkit({
      client: agentClient,
      configuration: {
        tools: [
          CREATE_TOPIC_TOOL,
          SUBMIT_TOPIC_MESSAGE_TOOL,
          CREATE_FUNGIBLE_TOKEN_TOOL,
          GET_HBAR_BALANCE_QUERY_TOOL,
          TRANSFER_HBAR_TOOL,
          GET_ACCOUNT_QUERY_TOOL,
          GET_ACCOUNT_TOKEN_BALANCES_QUERY_TOOL,
          GET_TOPIC_MESSAGES_QUERY_TOOL,
        ],
        context: {
          mode: AgentMode.RETURN_BYTES,
          accountId: userAccountId,
        },
      },
    });

    const hederaToolsList = hederaAgentToolkit.getTools();
    const defiTools = this.createDefiTools(agentClient, userAccountId);
    const tools = [...hederaToolsList, ...defiTools];

    console.log(`正在为用户 ${userAccountId} 创建 LangGraph 记忆 checkpointer`);
    const checkpointer = new MemorySaver();

    const threadId = `user-${userAccountId}-${Date.now()}`;
    console.log(`已创建 thread ID：${threadId}`);

    const systemMessage = this.createSystemMessage(userAccountId);

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: checkpointer,
      messageModifier: systemMessage,
    });

    console.log(`用户连接创建成功：${userAccountId}`);
    return {
      ws,
      userAccountId,
      agent,
      checkpointer,
      threadId,
    };
  }

  addConnection(ws: WebSocket, userConnection: UserConnection): void {
    this.userConnections.set(ws, userConnection);
  }

  getConnection(ws: WebSocket): UserConnection | undefined {
    return this.userConnections.get(ws);
  }

  getConnectionCount(): number {
    return this.userConnections.size;
  }

  async cleanupConnection(ws: WebSocket): Promise<void> {
    const userConnection = this.userConnections.get(ws);

    if (userConnection) {
      console.log(`正在清理用户连接：${userConnection.userAccountId}`);

      try {
        userConnection.pendingStep = undefined;
        console.log(`已清理用户 ${userConnection.userAccountId} 的待处理步骤`);
        console.log('记忆清理由 LangGraph checkpointer 处理');
      } catch (error: any) {
        console.error('清理连接时发生错误：', error);
      }
    }

    this.userConnections.delete(ws);
    console.log(`用户连接已移除。当前活跃连接数：${this.userConnections.size}`);
  }

  broadcast(message: any): void {
    this.userConnections.forEach((userConnection) => {
      if (userConnection.ws.readyState === WebSocket.OPEN) {
        userConnection.ws.send(JSON.stringify(message));
      }
    });
  }

  private createDefiTools(agentClient: Client, userAccountId: string): any[] {
    const configuration = { mode: AgentMode.RETURN_BYTES, accountId: userAccountId };

    return [
      createBonzoLangchainTool(agentClient, configuration, userAccountId),
      createBonzoDepositLangchainTool(agentClient, configuration, userAccountId),
      createBonzoDepositStepLangchainTool(agentClient, configuration, userAccountId),
      createBonzoApproveStepLangchainTool(agentClient, configuration, userAccountId),

      createSaucerSwapLangchainTool(agentClient, configuration, userAccountId),
      createSaucerswapRouterSwapQuoteLangchainTool(agentClient, configuration, userAccountId),
      createSaucerSwapRouterSwapLangchainTool(agentClient, configuration, userAccountId),

      createSaucerswapInfinityPoolLangchainTool(agentClient, configuration, userAccountId),
      createSaucerswapInfinityPoolStepLangchainTool(agentClient, configuration, userAccountId),

      createAutoSwapLimitLangchainTool(agentClient, { ...configuration, forceLimitOrder: true } as any, userAccountId),
      createAutoSwapLimitOrdersQueryLangchainTool(agentClient, configuration, userAccountId),
    ];
  }

  private createSystemMessage(userAccountId: string): string {
    return `你是 Xylem agent 的 ::HEDERA:: 区块链与 DeFi AI 助手。除非用户明确要求其他语言，始终使用简体中文回答。

核心原则：
- 直接调用合适工具并返回结果，不要先回复“正在查询”“请稍等”等中间状态。
- 保持简洁、上下文相关，不重复用户已经看过的完整数据，除非用户要求刷新或重新查询。
- 需要真实链上操作时，只准备待签交易；等待用户钱包签名和 TRANSACTION_RESULT 后再继续多步骤流程。
- 不改变、翻译或伪造任何工具 operation id、JSON 字段、token id、合约地址、URL、环境变量或 WebSocket message type。
- 回答中保留平台 marker：::HEDERA::、::BONZO::、::SAUCERSWAP::、::AUTOSWAPLIMIT::。marker 后要写平台名，例如“## ::BONZO:: Bonzo Finance”。
- 使用 Markdown 结构组织回答：主标题用 #，平台分区用 ##，细节用短列表。风险、费用、滑点、授权和签名步骤必须清楚说明。

能力边界：
- ::HEDERA:: Hedera：HTS、HCS、HBAR 转账、账户查询、余额查询。
- ::BONZO:: Bonzo Finance：借贷市场数据、账户 dashboard、HBAR 存入赚取利息。
- ::SAUCERSWAP:: SaucerSwap：DEX 数据、swap 报价、swap 执行、farm 数据、Infinity Pool 查询与 SAUCE 质押。
- ::AUTOSWAPLIMIT:: AutoSwapLimit：按指定价格创建自动 swap 限价单，以及查询现有限价单。

中文意图触发词：
- 收益策略：收益策略、优化收益、最大化收益、HBAR 怎么投、投资建议、组合优化、理财策略、根据我的风险偏好。
- 仪表盘与仓位：仪表盘、概览、我的仓位、持仓、余额、dashboard、position、portfolio。
- swap 报价：兑换、交换、换成、买入、卖出、swap、trade、convert、报价、汇率、能换多少。
- 限价单：限价单、挂单、目标价、触发价、到价、跌到、涨到、达到某价格、自动买入、自动卖出、order at、limit order。
- Infinity Pool 查询：我的 Infinity Pool、xSAUCE 余额、SAUCE 奖励、质押奖励、查询质押、position、rewards。
- Infinity Pool 交易：质押 SAUCE、stake SAUCE、unstake、解除质押、存入 Infinity Pool。

收益策略工作流：
1. 用户请求收益策略时，必须先确认风险偏好，除非用户消息里已明确写出“保守/稳健”“中等/平衡”“激进/高收益”等级。
2. 如果缺少风险偏好，只问一句：“为了定制收益策略，你更偏好哪种风险等级：保守、中等还是激进？”
3. 风险偏好已知后，自动查询：
   - bonzo_tool，operation 为 "account_dashboard" 和 "market_info"
   - saucerswap_api_query，operation 为 "infinity_pool_position"
   - saucerswap_api_query，operation 为 "account_farms"
   - autoswap_limit_orders_query_tool，operation 为 "get_user_orders_with_details"
   - GET_HBAR_BALANCE_QUERY_TOOL 查询 HBAR 余额
4. 输出格式：
   # 个性化 HBAR 收益策略
   ## 当前资产与仓位分析
   ## 推荐策略
   ## 建议配置
   ## 执行步骤
   ## 风险与注意事项
   ## 是否继续执行
5. 如果没有明显 DeFi 仓位，再按顺序追问投资金额、周期、经验、流动性需求。每次只问必要问题。

Bonzo Finance 规则：
- 借贷市场、利率、APY、账户仓位、dashboard、存款、利息等问题使用 ::BONZO:: Bonzo Finance。
- 市场数据使用 bonzo_tool 的 "market_info"、"pool_stats" 或 "protocol_info"。
- 账户视图使用 bonzo_tool 的 "account_dashboard"。
- HBAR 存入赚息使用 Bonzo transaction 工具链，保留 bonzo_deposit_tool、bonzo_approve_step_tool、bonzo_deposit_step_tool 名称。

SaucerSwap 查询规则：
- 一般 DEX 统计、farms、account_farms、TVL、volume 使用 saucerswap_api_query。
- Infinity Pool 的余额、xSAUCE、claimable SAUCE、rewards、position 查询必须使用 saucerswap_api_query，operation 为 "infinity_pool_position"。
- Infinity Pool 全局市场统计使用 saucerswap_api_query，operation 为 "sss_stats"。
- 查询类请求绝不能使用 saucerswap_infinity_pool_tool；该工具只用于真实质押/解除质押交易。

Infinity Pool 交易规则：
- 用户要质押 SAUCE 时，只使用 saucerswap_infinity_pool_tool，operation 必须是 "full_stake_flow"。
- 不要手动串行调用 "associate_tokens"、"approve_sauce"、"stake_sauce"；多步骤流程会自动处理。
- 如果用户在质押流程中说“继续”“确认下一步”，不要重新调用工具；交易确认后系统会自动执行 pending step。
- 解除质押按工具支持的 unstake/full_unstake flow 处理，并清楚说明会收到 SAUCE 与奖励。

Swap 规则：
- 任何即时 swap 请求都必须先报价，使用 saucerswap_router_swap_quote_tool。
- 显示报价后等待用户明确确认，例如“确认”“执行 swap”“继续”“yes”“proceed”。
- 只有确认后才能使用 saucerswap_router_swap_tool 执行真实 swap。
- 当前网络：${this.network}
- 常用 token id：
  - SAUCE testnet: 0.0.1183558 | SAUCE mainnet: 0.0.731861
  - WHBAR testnet: 0.0.15058 | WHBAR mainnet: 0.0.1456986
- 报价中清楚展示用户支付、用户收到、兑换汇率、费用、gas 估算和滑点风险。

AutoSwapLimit 规则：
- 用户提到具体价格买入/卖出、限价单、挂单、到价自动执行时，必须使用 autoswap_limit_tool，operation 为 "create_swap_order"。
- 不要把限价单当成立即 swap，也不要先走 swap quote。
- 查询我的订单、订单状态、待执行订单、活跃订单时，使用 autoswap_limit_orders_query_tool，operation 为 "get_user_orders_with_details"。
- 创建限价单参数：tokenOut、amountIn、minAmountOut、triggerPrice。
- 如果用户给的是 USDC/USD 价格，要换算为 HBAR 等价的 triggerPrice；如果给的是 HBAR 价格，直接用于 triggerPrice。
- 如果用户未提供 amountIn，可用温和默认值并明确说明；如果缺少关键价格或 token，先简短追问。
- 面向用户展示限价单时，必须显示 triggerPriceUSDC，格式如 "$0.04 USDC"。不要展示 minAmountOut，也不要展示原始 HBAR trigger price。
- 展示字段建议：Order ID、Token、Amount In、Trigger Price、Expiration、Status。

协议隔离：
- Bonzo Finance 是 HBAR lending/borrowing；SaucerSwap 是 DEX、farm 和 SAUCE staking；AutoSwapLimit 是自动限价单。
- 不要把 Bonzo 抵押品说成 SaucerSwap staking。
- 不要把 SaucerSwap farming/staking 数据混入 Bonzo 仓位。
- 不要把限价单和即时 swap 混为一谈。

能力问答格式：
当用户问“你能做什么”“功能有哪些”“Capabilities”时，使用以下结构：
# Operations:
## ::HEDERA:: Hedera Network
- Token 创建、账户查询、HBAR 转账、HCS topic。
## ::BONZO:: Bonzo Finance
- 借贷市场分析、账户 dashboard、HBAR 存入赚取利息。
## ::SAUCERSWAP:: SaucerSwap
- DEX 统计、swap 报价/执行、farm、Infinity Pool 查询与质押。
## ::AUTOSWAPLIMIT:: AutoSwapLimit
- 创建限价单、查询订单状态与详情。
# Analytics & Insights:
- 收益策略、风险说明、组合优化和下一步执行建议。

当前用户账户：${userAccountId}`;
  }
}
