// AutoSwapLimit Orders Query LangChain Integration
// LangChain wrapper for AutoSwapLimit orders query functionality

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Context } from '../../../configuration';
import { 
  getAutoSwapLimitOrdersQuery,
  autoswapLimitOrdersQueryParameters,
  AUTOSWAP_LIMIT_ORDERS_QUERY_TOOL,
  AUTOSWAP_LIMIT_ORDERS_OPERATIONS 
} from './api-client';

/**
 * Create AutoSwapLimit Orders Query LangChain tool
 * Provides comprehensive querying of user's limit orders on the AutoSwapLimit contract
 */
export const createAutoSwapLimitOrdersQueryLangchainTool = (
  client: any, 
  context: Context, 
  userAccountId: string
) => {
  return new DynamicStructuredTool({
    name: AUTOSWAP_LIMIT_ORDERS_QUERY_TOOL,
    description: `查询 AutoSwapLimit 合约，获取用户限价单及其详细信息。

**关键使用场景:**
- 用户询问“我的订单”“我的限价单”“我的 autoswap 订单”
- 用户要查询“订单状态”“待执行订单”“活跃订单”
- 用户询问“我有哪些订单”“展示我的订单”“检查我的限价单”

**可用 operation:**
- **get_user_orders**: 获取用户订单 ID 基础列表
- **get_order_details**: 获取指定订单 ID 的详细信息
- **get_user_orders_with_details**: 获取用户所有订单及完整详情（推荐）

**返回信息:**
- **订单信息**: Order ID、token pair、amount、price、status
- **时间信息**: 创建时间、过期时间、剩余时间
- **资金数据**: HBAR amount、target token、trigger price、min amount out
- **状态追踪**: active/inactive、executed/pending、可执行原因
- **智能分析**: 哪些订单可执行、已过期或仍在等待

**用户账户**: ${userAccountId}

**重要**: 该工具会自动将 Account ID（0.0.1234）转换为 EVM 地址用于合约查询。
如需完整结果，请使用 "get_user_orders_with_details" operation。`,
    
    schema: z.object({
      operation: z.enum([
        AUTOSWAP_LIMIT_ORDERS_OPERATIONS.GET_USER_ORDERS,
        AUTOSWAP_LIMIT_ORDERS_OPERATIONS.GET_ORDER_DETAILS,
        AUTOSWAP_LIMIT_ORDERS_OPERATIONS.GET_USER_ORDERS_WITH_DETAILS,
      ]).describe('查询 operation；如需完整结果请使用 get_user_orders_with_details'),
      
      userAccountId: z.string().optional().describe(
        '用户账户 ID，格式 0.0.1234（可选；未提供时使用当前用户）'
      ),
      
      orderId: z.number().optional().describe(
        '要查询详情的指定订单 ID（仅 get_order_details operation 需要）'
      ),
    }),
    
    func: async (params: any) => {
      try {
        // Auto-use user account ID if not provided
        if (!params.userAccountId) {
          params.userAccountId = userAccountId;
        }

        console.log(`🔍 AutoSwapLimit Orders Query: ${params.operation} for user: ${params.userAccountId}`);
        
        const result = await getAutoSwapLimitOrdersQuery(client, context, params, userAccountId);
        return JSON.stringify(result, null, 2);
        
      } catch (error: any) {
        console.error('❌ Error in AutoSwapLimit orders query tool:', error);
        
        return JSON.stringify({
          success: false,
          error: `查询 AutoSwapLimit 订单时出错：${error.message}`,
          operation: params.operation,
          timestamp: new Date().toISOString(),
          troubleshooting: {
            issue: 'LangChain 工具执行失败',
            possible_causes: [
              '网络连接异常',
              '账户 ID 格式无效',
              '当前网络上合约不可用',
              '合约查询 gas 不足',
              '用户在系统中没有订单'
            ],
            next_steps: [
              '检查互联网连接',
              '确认账户 ID 格式为 0.0.1234',
              '确认使用正确网络（mainnet/testnet）',
              '稍等片刻后重试',
              '检查用户是否创建过限价单'
            ],
            user_guidance: [
              '该工具用于查询你在 AutoSwapLimit 上已有的限价单',
              '如果没有订单，结果会为空',
              '如需创建订单，请使用 autoswap_limit_tool，并将 operation 设置为 create_swap_order'
            ]
          }
        }, null, 2);
      }
    },
  });
};

/**
 * Create multiple AutoSwapLimit Orders Query tools (for future expansion)
 */
export const createAutoSwapLimitOrdersQueryLangchainTools = (
  client: any, 
  context: Context, 
  userAccountId: string
) => {
  return [
    createAutoSwapLimitOrdersQueryLangchainTool(client, context, userAccountId),
    // Future: Could add specialized tools for specific query types
    // createAutoSwapLimitActiveOrdersTool(client, context, userAccountId),
    // createAutoSwapLimitExpiredOrdersTool(client, context, userAccountId),
  ];
};

export default createAutoSwapLimitOrdersQueryLangchainTool;
