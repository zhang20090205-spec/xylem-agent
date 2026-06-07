import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { Context } from '../../../configuration';
import { getBonzoApiQuery, BONZO_API_QUERY_TOOL, BONZO_API_OPERATIONS } from './api-client';

/**
 * Creates a LangChain DynamicStructuredTool for Bonzo API queries
 * This tool can be used directly in LangChain agents
 */
export const createBonzoLangchainTool = (client: any, context: Context, userAccountId: string) => {
  return new DynamicStructuredTool({
    name: BONZO_API_QUERY_TOOL,
    description: `通过 Bonzo Finance 官方 REST API 查询 DeFi 协议实时数据。

可用 operation:
- Account Dashboard: 查询账户借贷仓位详情
- Market Information: 查询所有支持 token 的当前市场数据
- Pool Statistics: 查询 24 小时协议统计
- Protocol Information: 查询协议配置和合约地址
- BONZO Token: 查询 BONZO token 详情和 treasury 信息
- BONZO Circulation: 查询当前流通供应量

该工具提供 Bonzo 借贷协议数据，包括 APY、利用率、流动性信息和账户仓位。

用户账户：${userAccountId}`,
    schema: z.object({
      operation: z.enum([
        BONZO_API_OPERATIONS.ACCOUNT_DASHBOARD,
        BONZO_API_OPERATIONS.MARKET_INFO,
        BONZO_API_OPERATIONS.POOL_STATS,
        BONZO_API_OPERATIONS.PROTOCOL_INFO,
        BONZO_API_OPERATIONS.BONZO_TOKEN,
        BONZO_API_OPERATIONS.BONZO_CIRCULATION,
      ]).describe(
        'Bonzo API operation：account_dashboard、market_info、pool_stats、protocol_info、bonzo_token 或 bonzo_circulation'
      ),
      accountId: z.string().optional().describe(
        'Hedera 账户 ID，格式为 shard.realm.num（仅 account_dashboard 需要）'
      ),
    }),
    func: async (params: any) => {
      try {
        console.log('Bonzo API 查询参数：', params);
        console.log('用户账户 ID：', userAccountId);

        // If no accountId provided for dashboard and we have user account, use it
        if (params.operation === BONZO_API_OPERATIONS.ACCOUNT_DASHBOARD && !params.accountId) {
          params.accountId = userAccountId;
          console.log(`dashboard 使用用户账户 ID：${userAccountId}`);
        }

        const result = await getBonzoApiQuery(client, context, params);
        return JSON.stringify(result, null, 2);
      } catch (error) {
        console.error('Bonzo API 查询失败：', error);

        const errorMessage = error instanceof Error ? error.message : '未知错误';

        return JSON.stringify({
          error: `查询 Bonzo Finance API 时出错：${errorMessage}`,
          operation: params.operation,
          timestamp: new Date().toISOString(),
          troubleshooting: {
            issue: 'API 请求失败',
            possible_causes: [
              '网络连接异常',
              'Bonzo Finance API 暂时不可用',
              '账户 ID 格式无效',
              '触发 API 频率限制'
            ],
            next_steps: [
              '检查互联网连接',
              '确认账户 ID 格式为 shard.realm.num',
              '稍后重试',
              '检查 Bonzo Finance 状态页'
            ]
          },
          api_documentation: 'https://docs.bonzo.finance/hub/developer/bonzo-v1-data-api'
        }, null, 2);
      }
    },
  });
};

/**
 * Creates multiple Bonzo-related LangChain tools
 * This function can be extended to include more specialized Bonzo API tools
 */
export const createBonzoLangchainTools = (client: any, context: Context, userAccountId: string) => {
  return [
    createBonzoLangchainTool(client, context, userAccountId),
    // Future specialized tools can be added here:
    // createBonzoAccountTool(client, context, userAccountId),
    // createBonzoMarketTool(client, context, userAccountId),
    // createBonzoProtocolTool(client, context, userAccountId),
  ];
};
