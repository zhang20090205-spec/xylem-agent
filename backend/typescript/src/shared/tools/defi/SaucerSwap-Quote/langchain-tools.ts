import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Context } from '../../../configuration';
import {
  getSaucerswapRouterSwapQuote,
  saucerswapRouterSwapQuoteParameters,
  SAUCERSWAP_ROUTER_SWAP_QUOTE_TOOL,
  SAUCERSWAP_ROUTER_OPERATIONS,
} from './contract-client';

/**
 * Creates a LangChain tool for SaucerSwap Router swap quotes using direct contract interaction.
 * This tool allows AI agents to get real-time swap quotes from the SaucerSwap V1 Router contract.
 * 
 * @param client - Hedera client (not used for contract calls but kept for consistency)
 * @param context - Context configuration
 * @param userAccountId - User's account ID for context (not used in quotes but helpful for logging)
 * @returns DynamicStructuredTool for LangChain integration
 */
export const createSaucerswapRouterSwapQuoteLangchainTool = (
  client: any, 
  context: Context, 
  userAccountId: string
) => {
  return new DynamicStructuredTool({
    name: SAUCERSWAP_ROUTER_SWAP_QUOTE_TOOL,
    description: `通过 JSON-RPC 从 Hedera 网络上的 SaucerSwap V2 QuoterV2 合约获取实时 token swap 报价（不需要 operator）。

**SWAP QUOTE operation:**
- **get_amounts_out**: 根据精确输入数量获取输出报价
- **get_amounts_in**: 根据精确输出数量获取所需输入报价

**核心能力:**
- 通过 JSON-RPC 集成 SaucerSwap V2 QuoterV2（不需要 operator/key）
- 实时报价，路径中包含 fee（Uniswap v3 风格）
- 通过 Hashio RPC 支持 mainnet 和 testnet
- 路径中自动将 HBAR 转为 WHBAR
- 支持自定义 fee tier 的 multi-hop routing
- 返回详细错误和排查信息

**tokenPath 与 fees 格式:**
- Hedera token 使用 ID，例如 "0.0.123456"
- 原生 HBAR 使用 "HBAR"（会自动转换为 WHBAR）
- Path array: ["source_token", "destination_token"] 或 multi-hop routes
- Fees array: 单跳用 [3000]，多跳例如 [500, 3000]
- fee 值单位为 hundredths of a bip：500=0.05%，3000=0.30%，10000=1.00%

**使用示例:**
- HBAR 到 SAUCE: tokenPath: ["HBAR", "0.0.731861"] (mainnet) 或 ["HBAR", "0.0.1183558"] (testnet), fees: [3000]
- Token 到 Token: tokenPath: ["0.0.111111", "0.0.222222"], fees: [3000]
- Multi-hop: tokenPath: ["HBAR", "0.0.111111", "0.0.222222"], fees: [500, 3000]

**网络:**
- testnet (default)
- mainnet

**合约信息 (V2 QuoterV2):**
- Mainnet Contract ID: 0.0.3949424 (QuoterV2)
- Testnet Contract ID: 0.0.1390002 (QuoterV2)  
- 通过 JSON-RPC 使用官方 SaucerSwap V2 QuoterV2（不需要 operator）

**可用 Pool Fees:**
- 100 (0.01%) - Stablecoin pairs
- 500 (0.05%) - 低波动交易对
- 3000 (0.30%) - 标准交易对（默认）
- 10000 (1.00%) - 高波动交易对

当前用户：${userAccountId}`,
    
    schema: z.object({
      operation: z.enum([
        SAUCERSWAP_ROUTER_OPERATIONS.GET_AMOUNTS_OUT,
        SAUCERSWAP_ROUTER_OPERATIONS.GET_AMOUNTS_IN,
      ]).describe('报价 operation：get_amounts_out 表示由输入计算输出，get_amounts_in 表示由输出计算输入'),
      
      amount: z.string().describe('Token 数量，使用最小单位（例如 8 decimals 的 1 HBAR 为 "100000000"）'),
      
      tokenPath: z.array(z.string()).min(2).describe('表示 swap path 的 token ID 数组。原生 HBAR 使用 "HBAR"。'),
      
      fees: z.array(z.number()).optional().describe('pool fee 数组，单位为 hundredths of a bip（例如 [3000] 表示 0.30%）。长度必须为 tokenPath.length - 1；未提供时所有 hop 默认 [3000]。'),
      
      network: z.enum(['mainnet', 'testnet']).optional().default(
        (process.env.HEDERA_NETWORK as 'mainnet' | 'testnet') || 'mainnet'
      ).describe('要查询的网络（默认使用 .env 中的 HEDERA_NETWORK）'),
    }),
    
    func: async (params: any) => {
      try {
        // Ensure network follows HEDERA_NETWORK from .env if not explicitly provided
        if (!params.network || params.network === 'mainnet') {
          const envNetwork = (process.env.HEDERA_NETWORK as 'mainnet' | 'testnet') || 'mainnet';
          if (envNetwork === 'testnet') {
            params.network = 'testnet';
            console.log(`🌐 Overriding network to testnet based on HEDERA_NETWORK=${process.env.HEDERA_NETWORK}`);
          }
        }

        console.log(`🎯 SaucerSwap Router Quote Request:`, {
          operation: params.operation,
          amount: params.amount,
          path: params.tokenPath,
          fees: params.fees,
          network: params.network,
          user: userAccountId
        });

        const result = await getSaucerswapRouterSwapQuote(client, context, params);
        
        // Format response for LangChain with enhanced readability
        if ('error' in result && result.error) {
          return JSON.stringify({
            success: false,
            error: result.error,
            operation: result.operation,
            timestamp: result.timestamp,
            troubleshooting: result.troubleshooting,
            contractInfo: result.contractInfo,
            user: userAccountId,
            helpfulTips: {
              tokenFormat: "使用 Hedera token ID，例如 '0.0.123456'；原生 HBAR 使用 'HBAR'",
              amountFormat: "数量需使用 token 最小单位（例如 HBAR 使用 tinybars）",
              pathValidation: "确认 token path 是 SaucerSwap 上有效的交易对",
              networkCheck: "确认网络（testnet/mainnet）支持要查询的 token"
            }
          }, null, 2);
        }

        // Success response with enhanced formatting
        if ('quote' in result && result.quote) {
          return JSON.stringify({
            success: true,
            operation: result.operation,
            network: result.network,
            timestamp: result.timestamp,
            quote: {
              ...result.quote,
              summary: `${result.quote.input.formatted} ${result.quote.input.token} → ${result.quote.output.formatted} ${result.quote.output.token}`,
              exchangeRate: result.quote.output.token !== result.quote.input.token ? 
                `1 ${result.quote.input.token} = ${(Number(result.quote.output.amount) / Number(result.quote.input.amount)).toFixed(6)} ${result.quote.output.token}` : 
                '相同 token',
            },
            contract: result.contract,
            source: result.source,
            user: userAccountId,
            metadata: {
              toolVersion: '1.0.0',
              quoteMethod: 'contract_direct',
              gasEstimate: '只读 operation（无 gas 成本）',
              dataFreshness: '链上实时数据'
            }
          }, null, 2);
        }

        // Fallback for unexpected response format
        return JSON.stringify({
          success: false,
          error: 'swap quote 函数返回了非预期格式',
          timestamp: new Date().toISOString(),
          user: userAccountId,
          rawResult: result
        }, null, 2);

      } catch (error: any) {
        console.error('❌ LangChain tool error:', error);
        
        return JSON.stringify({
          success: false,
          error: `SaucerSwap Router 报价工具错误：${error.message}`,
          operation: params.operation || 'unknown',
          timestamp: new Date().toISOString(),
          user: userAccountId,
          troubleshooting: {
            issue: '工具执行失败',
            possibleCauses: [
              '参数无效',
              '网络连接异常',
              '合约暂时不可用',
              'token path 校验失败',
              '数量格式不正确'
            ],
            nextSteps: [
              '确认所有参数正确',
              '确认 token ID 是有效 Hedera token',
              '确认数量格式正确',
              '换一个 token 交易对重试',
              '检查网络连接'
            ],
            documentation: '请参考 SaucerSwap 文档确认有效交易对和交易要求'
          }
        }, null, 2);
      }
    },
  });
};

/**
 * Helper function to create multiple SaucerSwap Router tools
 * Currently returns a single tool but can be extended for specialized tools
 */
export const createSaucerswapRouterSwapQuoteLangchainTools = (
  client: any, 
  context: Context, 
  userAccountId: string
) => {
  return [
    createSaucerswapRouterSwapQuoteLangchainTool(client, context, userAccountId),
    // Future specialized tools can be added here:
    // createSaucerswapRouterInputQuoteTool(client, context, userAccountId),
    // createSaucerswapRouterOutputQuoteTool(client, context, userAccountId),
  ];
};
