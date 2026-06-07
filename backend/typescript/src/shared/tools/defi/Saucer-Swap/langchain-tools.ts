import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Context } from '../../../configuration';
import {
  getSaucerswapRouterSwap,
  saucerswapRouterSwapParameters,
  SAUCERSWAP_ROUTER_SWAP_TOOL,
  SAUCERSWAP_ROUTER_SWAP_OPERATIONS,
  SAUCERSWAP_V2_ROUTER_CONTRACTS,
} from './contract-client';

/**
 * Creates a LangChain tool for SaucerSwap Router token swaps using UniswapV2Router02 contract.
 * This tool allows AI agents to execute real token swaps on the SaucerSwap DEX.
 * 
 * @param client - Hedera client for transaction submission
 * @param context - Context configuration with account ID
 * @param userAccountId - User's account ID for transactions
 * @returns DynamicStructuredTool for LangChain integration
 */
export const createSaucerSwapRouterSwapLangchainTool = (
  client: any, 
  context: Context, 
  userAccountId: string
) => {
  return new DynamicStructuredTool({
    name: SAUCERSWAP_ROUTER_SWAP_TOOL,
    description: `在 Hedera 网络上通过 UniswapV2Router02 合约执行真实 SaucerSwap DEX token swap。

**SWAP operation:**
- **swap_exact_hbar_for_tokens**: 用精确 HBAR 数量换取 token（最常用）
- **swap_exact_tokens_for_hbar**: 用精确 token 数量换取 HBAR
- **swap_exact_tokens_for_tokens**: 用精确某 token 数量换取另一 token
- **swap_hbar_for_exact_tokens**: 用 HBAR 换取精确 token 数量
- **swap_tokens_for_exact_hbar**: 用 token 换取精确 HBAR 数量
- **swap_tokens_for_exact_tokens**: 用 token 换取精确另一 token 数量

**核心能力:**
- 直接与 UniswapV2Router02 合约交互
- 支持 HBAR 和 Hedera token swap
- 为合约兼容性自动将 HBAR 转为 WHBAR
- 内置滑点保护（mainnet 安全默认 2.0%）
- 支持配置交易有效期 deadline
- 支持 mainnet 和 testnet
- 创建可供钱包签名的真实交易

**swap 示例:**
1. **HBAR to SAUCE**: 
   - operation: "swap_exact_hbar_for_tokens"
   - amountIn: "100000000" (1 HBAR with 8 decimals)
   - tokenPath: ["HBAR", "0.0.731861"] (mainnet) or ["HBAR", "0.0.1183558"] (testnet)
   
2. **SAUCE to HBAR**:
   - operation: "swap_exact_tokens_for_hbar"  
   - amountIn: "1000000000000000000" (1 SAUCE with 18 decimals)
   - tokenPath: ["0.0.731861", "HBAR"] (mainnet) or ["0.0.1183558", "HBAR"] (testnet)

3. **Token to Token**:
   - operation: "swap_exact_tokens_for_tokens"
   - amountIn: "1000000" (depends on token decimals)
   - tokenPath: ["0.0.111111", "0.0.222222"]

**滑点与保护:**
- 默认滑点：2.0%（mainnet 保守安全值）
- 可调整范围：0.01% 到 50%
- 波动较大 token 或大额交易可能需要更高滑点
- 稳定币或小额交易可使用较低滑点

**支持网络:**
- **Mainnet**: Router Contract 0.0.3045981
- **Testnet**: Router Contract 0.0.1414040 (default)

**Token 说明:**
- HBAR: 使用 "HBAR"（swap 时自动转为 WHBAR）
- SAUCE Token: "0.0.731861" (mainnet) / "0.0.1183558" (testnet)
- 其他 token: 使用 Hedera token ID 格式 "0.0.xxxxx"
- Path 支持 multi-hop swap: ["tokenA", "tokenB", "tokenC"]

**数量格式:**
- HBAR: 8 decimals（100000000 = 1 HBAR）
- SAUCE: 18 decimals（1000000000000000000 = 1 SAUCE）
- 其他 token: 检查对应 token decimals
- 始终使用最小单位（amount 中不要写小数点）

**交易流程:**
1. 工具校验参数并构建交易
2. 返回 transaction bytes 供用户签名
3. 用户在钱包中签名
4. 交易在 SaucerSwap DEX 执行 swap
5. token 转入收款账户

**安全机制:**
- 滑点保护降低超额损失风险
- deadline 防止过期交易执行
- 最小输出计算可降低 MEV/价格偏移影响
- 所有交易都需要用户签名确认

**重要提示:**
- 需要足够 token 余额和 HBAR 支付 gas
- 接收新 token 前可能需要 token association
- 请根据市场情况选择合适滑点
- 大额 swap 可能带来更高 price impact

当前用户：${userAccountId}
网络合约：Mainnet Router ${SAUCERSWAP_V2_ROUTER_CONTRACTS.mainnet.ROUTER_ID} | Testnet Router ${SAUCERSWAP_V2_ROUTER_CONTRACTS.testnet.ROUTER_ID}`,
    
    schema: z.object({
      operation: z.enum([
        SAUCERSWAP_ROUTER_SWAP_OPERATIONS.SWAP_EXACT_HBAR_FOR_TOKENS,
        SAUCERSWAP_ROUTER_SWAP_OPERATIONS.SWAP_EXACT_TOKENS_FOR_HBAR,
        SAUCERSWAP_ROUTER_SWAP_OPERATIONS.SWAP_EXACT_TOKENS_FOR_TOKENS,
        SAUCERSWAP_ROUTER_SWAP_OPERATIONS.SWAP_HBAR_FOR_EXACT_TOKENS,
        SAUCERSWAP_ROUTER_SWAP_OPERATIONS.SWAP_TOKENS_FOR_EXACT_HBAR,
        SAUCERSWAP_ROUTER_SWAP_OPERATIONS.SWAP_TOKENS_FOR_EXACT_TOKENS,
      ]).describe('要执行的 swap operation'),
      
      amountIn: z.string().optional().describe(
        '精确输入数量，使用最小单位（exact input swap 必需）。HBAR: 8 decimals，SAUCE: 18 decimals'
      ),
      
      amountOut: z.string().optional().describe(
        '精确输出数量，使用最小单位（exact output swap 必需）。请检查 token decimals'
      ),
      
      tokenPath: z.array(z.string()).min(2).describe(
        '由 token ID 数组表示的 swap path。HBAR 使用 "HBAR"。示例：mainnet HBAR→SAUCE 用 ["HBAR", "0.0.731861"]，testnet 用 ["HBAR", "0.0.1183558"]'
      ),
      
      slippagePercent: z.number().min(0.01).max(50).default(2.0).describe(
        '最大滑点容忍度百分比（2.0 = 2.0%）。默认值偏保守，适合 mainnet 安全使用'
      ),
      
      network: z.enum(['mainnet', 'testnet']).default(
        (process.env.HEDERA_NETWORK as 'mainnet' | 'testnet') || 'mainnet'
      ).describe(
        '执行 swap 的网络（默认使用 .env 中的 HEDERA_NETWORK）'
      ),

      recipientAccountId: z.string().optional().describe(
        '接收 swap 后 token 的账户（未提供时默认使用交易签名者）'
      ),
    }),
    
    func: async (params: any) => {
      try {
        console.log(`🔄 SaucerSwap Router swap initiated by ${userAccountId}`);
        console.log(`📊 Operation: ${params.operation}`);
        console.log(`🪙 Path: ${params.tokenPath.join(' → ')}`);
        
        // Auto-use user account ID as recipient if not provided
        if (!params.recipientAccountId) {
          params.recipientAccountId = userAccountId;
          console.log(`👤 Using user account as recipient: ${userAccountId}`);
        }
        
        // Ensure network follows HEDERA_NETWORK from .env if not explicitly provided
        if (!params.network || params.network === 'mainnet') {
          const envNetwork = (process.env.HEDERA_NETWORK as 'mainnet' | 'testnet') || 'mainnet';
          if (envNetwork === 'testnet') {
            params.network = 'testnet';
            console.log(`🌐 Overriding network to testnet based on HEDERA_NETWORK=${process.env.HEDERA_NETWORK}`);
          }
        }

        // Execute swap preparation
        const result = await getSaucerswapRouterSwap(
          client, 
          { 
            ...context,
            accountId: userAccountId 
          }, 
          params
        );

        // Enhanced response formatting for LangChain using type guard
        if (result.success) {
          console.log(`✅ SaucerSwap swap prepared successfully`);
          console.log(`💱 ${result.swap.input.formatted} → ${result.swap.output.formatted}`);
          console.log(`⚙️ Slippage: ${result.swap.slippage}, Network: ${result.network}`);
          
          return JSON.stringify({
            ...result,
            user_context: {
              user_account: userAccountId,
              operation_type: 'token_swap',
              platform: 'SaucerSwap',
              ready_to_sign: true,
            },
            next_steps: [
              '1. 仔细检查 swap 详情',
              '2. 确认滑点容忍度可接受',
              '3. 确认余额充足',
              '4. 钱包提示时签名交易',
              '5. 等待交易确认'
            ],
            risk_warnings: [
              '加密资产 swap 存在价格波动风险',
              '滑点可能导致最终数量与预期不同',
              '请确保有 HBAR 支付交易手续费',
              '继续前请再次确认 token 地址'
            ]
          }, null, 2);
        } else {
          console.log(`❌ SaucerSwap swap preparation failed: ${result.error}`);
          
          return JSON.stringify({
            ...result,
            user_context: {
              user_account: userAccountId,
              operation_type: 'token_swap',
              platform: 'SaucerSwap',
              status: 'failed'
            },
            helpful_tips: [
              '确认所选网络下所有 token ID 正确',
              '确认输入数量有足够余额',
              '确认相关 token 已关联到账户',
              '如果遇到流动性问题，尝试调整滑点',
              '测试时可考虑使用更小金额'
            ]
          }, null, 2);
        }
      } catch (error: any) {
        console.error(`❌ SaucerSwap Router swap error for ${userAccountId}:`, error);
        
        return JSON.stringify({
          error: `执行 SaucerSwap Router swap 时出错：${error.message}`,
          operation: params.operation,
          user_account: userAccountId,
          timestamp: new Date().toISOString(),
          troubleshooting: {
            issue: '工具执行失败',
            possible_causes: [
              '网络连接异常',
              '参数无效',
              'SaucerSwap Router 合约不可用',
              'token 流动性不足',
              '账户配置不完整'
            ],
            next_steps: [
              '检查互联网连接后重试',
              '确认 token ID 存在于所选网络',
              '确认账户余额充足',
              '尝试使用不同滑点容忍度',
              '检查 SaucerSwap 状态页',
              '测试可优先使用 testnet'
            ]
          },
          support: {
            saucerswap_docs: 'https://docs.saucerswap.finance/',
            hedera_docs: 'https://docs.hedera.com/',
            community: 'https://discord.gg/saucerswap'
          }
        }, null, 2);
      }
    },
  });
};

/**
 * Creates multiple SaucerSwap Router LangChain tools (future expansion)
 * Currently returns single swap tool, but can be extended for specialized tools
 */
export const createSaucerSwapRouterSwapLangchainTools = (
  client: any, 
  context: Context, 
  userAccountId: string
) => {
  return [
    createSaucerSwapRouterSwapLangchainTool(client, context, userAccountId),
    // Future specialized tools:
    // createSaucerSwapLiquidityTool(client, context, userAccountId),
    // createSaucerSwapFarmingTool(client, context, userAccountId),
  ];
};
