import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { Context } from '../../../configuration';
import { getSaucerSwapApiQuery, SAUCERSWAP_API_QUERY_TOOL, SAUCERSWAP_API_OPERATIONS } from './api-client';

/**
 * Creates a LangChain DynamicStructuredTool for SaucerSwap API queries
 * This tool can be used directly in LangChain agents
 */
export const createSaucerSwapLangchainTool = (client: any, context: Context, userAccountId: string) => {
  return new DynamicStructuredTool({
    name: SAUCERSWAP_API_QUERY_TOOL,
    description: `通过 SaucerSwap 官方 REST API 查询 DEX 协议的实时交易和流动性数据。

可用 operation:
- General Statistics: 查询整体协议统计（TVL、volume、swap 总量）
- Single-Sided Staking Stats: 查询 SSS APY、兑换比例和质押总量
- Active Farms: 查询所有活跃 farm、排放和质押信息
- Account Farms: 查询指定账户在 farm 中的 LP token 数量

该工具可访问 SaucerSwap DEX 和 yield farming 数据，包括：
- 以 USD 计价的 TVL
- 交易量和 swap 统计
- SAUCE 流通量和质押比例
- Farm 排放（SAUCE 和 HBAR 奖励）
- 账户级 farm 仓位和质押数量

支持 Hedera Mainnet 和 Testnet。

用户账户：${userAccountId}`,
    schema: z.object({
      operation: z.enum([
        SAUCERSWAP_API_OPERATIONS.GENERAL_STATS,
        SAUCERSWAP_API_OPERATIONS.SSS_STATS,
        SAUCERSWAP_API_OPERATIONS.FARMS,
        SAUCERSWAP_API_OPERATIONS.ACCOUNT_FARMS,
        SAUCERSWAP_API_OPERATIONS.INFINITY_POOL_POSITION,
      ]).describe(
        'SaucerSwap API operation：general_stats、sss_stats、farms、account_farms 或 infinity_pool_position'
      ),
      accountId: z.string().optional().describe(
        'Hedera 账户 ID，格式为 shard.realm.num（account_farms 和 infinity_pool_position 需要）'
      ),
      network: z.enum(['mainnet', 'testnet']).default(
        (process.env.HEDERA_NETWORK as 'mainnet' | 'testnet') || 'mainnet'
      ).describe(
        '要查询的 Hedera 网络（默认使用 .env 中的 HEDERA_NETWORK）'
      ),
    }),
    func: async (params: any) => {
      try {
        // Auto-use user account ID for operations that require accountId if not provided
        if ((params.operation === SAUCERSWAP_API_OPERATIONS.ACCOUNT_FARMS || 
             params.operation === SAUCERSWAP_API_OPERATIONS.INFINITY_POOL_POSITION) && 
            !params.accountId) {
          params.accountId = userAccountId;
          console.log(`${params.operation} 使用用户账户 ID：${userAccountId}`);
        }

        const result = await getSaucerSwapApiQuery(client, context, params);
        return JSON.stringify(result, null, 2);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        return JSON.stringify({
          error: `查询 SaucerSwap Finance API 时出错：${errorMessage}`,
          operation: params.operation,
          network: params.network || 'mainnet',
          timestamp: new Date().toISOString(),
          troubleshooting: {
            issue: 'API 请求失败',
            possible_causes: [
              '环境变量中 API key 无效或缺失',
              '网络连接异常',
              'SaucerSwap API 暂时不可用',
              '账户 ID 格式无效',
              '触发频率限制（请求过多）',
              '指定了错误网络'
            ],
            next_steps: [
              '检查 .env 文件中的 API key 配置',
              '确认互联网连接正常',
              '确认账户 ID 格式为 shard.realm.num',
              '尝试切换网络（mainnet/testnet）',
              '稍等片刻后重试',
              '检查 SaucerSwap API 状态'
            ],
            api_keys_location: {
              mainnet: 'SAUCERSWAP_MAINNET_API_KEY in .env',
              testnet: 'SAUCERSWAP_TESTNET_API_KEY in .env'
            }
          }
        }, null, 2);
      }
    },
  });
};

/**
 * Creates multiple SaucerSwap-related LangChain tools
 * This function can be extended to include more specialized SaucerSwap API tools
 */
export const createSaucerSwapLangchainTools = (client: any, context: Context, userAccountId: string) => {
  return [
    createSaucerSwapLangchainTool(client, context, userAccountId),
    // Future specialized tools can be added here:
    // createSaucerSwapStatsTool(client, context, userAccountId),
    // createSaucerSwapFarmsTool(client, context, userAccountId),
    // createSaucerSwapAccountTool(client, context, userAccountId),
  ];
};
