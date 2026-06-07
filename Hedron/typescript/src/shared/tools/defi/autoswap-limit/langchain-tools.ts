// AutoSwapLimit LangChain Tools - LangChain-specific wrappers for AutoSwapLimit contract
// Based on the Bonzo Finance LangChain tool integration pattern

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { Client } from '@hashgraph/sdk';
import type { Context } from '../../../configuration';
import {
  getAutoSwapLimitQuery,
  autoswapLimitParameters,
  AUTOSWAP_LIMIT_TOOL,
  AUTOSWAP_LIMIT_OPERATIONS,
  AUTOSWAP_LIMIT_CONTRACTS,
  AUTOSWAP_LIMIT_CONFIG,
} from './api-client';

/**
 * Create AutoSwapLimit LangChain tool for creating and managing limit orders
 */
export const createAutoSwapLimitLangchainTool = (
  client: Client,
  context: Context,
  userAccountId: string
) => {
  return new DynamicStructuredTool({
    name: AUTOSWAP_LIMIT_TOOL,
    description: `在 AutoSwapLimit 合约上创建和管理限价单，用于自动执行 HBAR→Token swap。

可用 operation:
- create_swap_order: 创建自动限价单（在指定价格 HBAR→Token）
- get_order_details: 按 ID 查询订单状态
- get_contract_config: 查看合约设置和费用
- get_router_info: 获取 SaucerSwap router 信息
- get_contract_balance: 查询合约 HBAR 余额
- get_next_order_id: 获取下一个可用订单 ID

支持 token: SAUCE、WHBAR 和其他 Hedera token
网络: ${process.env.HEDERA_NETWORK || 'mainnet'}
用户账户: ${userAccountId}

可用示例（基于成功测试）:
用保守参数买入 SAUCE:
  - tokenOut: "SAUCE"（目标买入 token）
  - amountIn: 0.2（投入的 HBAR 数量）
  - minAmountOut: "1"（最小 SAUCE 输出，wei 格式，极保守）
  - triggerPrice: "1"（触发价，wei 格式，极低）
  - expirationHours: 24（24 小时后过期）

参数说明:
- tokenOut: token symbol（"SAUCE"）或 ID（"0.0.731861"）
- amountIn: HBAR 数量，小数格式（例如 0.2 表示 0.2 HBAR）
- minAmountOut: 最小 token 输出，wei 格式（"1" 表示几乎任意数量）
- triggerPrice: 价格触发条件，wei 格式
- expirationHours: 1-168 小时（默认 24）

中文触发词：限价单、挂单、目标价、触发价、到价、跌到、涨到、自动买入、自动卖出、指定价格买入。

注意：testnet 流动性有限，请使用保守参数。`,

    schema: z.object({
      operation: z.enum([
        AUTOSWAP_LIMIT_OPERATIONS.CREATE_SWAP_ORDER,
        AUTOSWAP_LIMIT_OPERATIONS.GET_ORDER_DETAILS,
        AUTOSWAP_LIMIT_OPERATIONS.GET_CONTRACT_CONFIG,
        AUTOSWAP_LIMIT_OPERATIONS.GET_ROUTER_INFO,
        AUTOSWAP_LIMIT_OPERATIONS.GET_CONTRACT_BALANCE,
        AUTOSWAP_LIMIT_OPERATIONS.GET_NEXT_ORDER_ID,
      ]),

      // Order creation parameters
      tokenOut: z.string().optional(),
      amountIn: z.number().optional(),
      minAmountOut: z.string().optional(),
      triggerPrice: z.string().optional(),
      expirationHours: z.number().optional(),

      // Query parameters
      orderId: z.number().optional(),

      // Network and user parameters
      network: z.enum(['mainnet', 'testnet']).optional(),
      userAccountId: z.string().optional(),
    }),

    func: async (params: any) => {
      try {
        // Auto-use user account ID if not provided
        if (!params.userAccountId) {
          params.userAccountId = userAccountId;
        }

        // Auto-use current network if not provided
        if (!params.network) {
          params.network = (process.env.HEDERA_NETWORK as 'mainnet' | 'testnet') || 'mainnet';
        }

        console.log(`🎯 AutoSwapLimit LangChain Tool - ${params.operation}`);
        console.log(`📋 Parameters:`, {
          operation: params.operation,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn,
          minAmountOut: params.minAmountOut,
          triggerPrice: params.triggerPrice,
          expirationHours: params.expirationHours,
          orderId: params.orderId,
          network: params.network,
          userAccountId: params.userAccountId,
        });

        const result = await getAutoSwapLimitQuery(client, context, params);

        console.log(`✅ AutoSwapLimit operation completed: ${params.operation}`);
        return JSON.stringify(result, null, 2);

      } catch (error: any) {
        console.error(`❌ AutoSwapLimit LangChain Tool error:`, error);

        // Fix the type safety issue by properly typing the network access
        const network = (params.network || 'mainnet') as 'mainnet' | 'testnet';

        return JSON.stringify({
          success: false,
          error: `AutoSwapLimit operation 出错：${error.message}`,
          operation: params.operation,
          timestamp: new Date().toISOString(),
          troubleshooting: {
            issue: 'LangChain 工具执行失败',
            possible_causes: [
              '参数无效',
              '网络连接异常',
              '指定网络上合约不可用',
              '账户余额不足',
              'token symbol 或 ID 无效'
            ],
            next_steps: [
              '检查参数值和格式',
              '确认网络连接正常',
              '确认账户有足够 HBAR 余额',
              '使用有效 token symbol（SAUCE、WHBAR）或 token ID',
              '检查合约部署状态'
            ]
          },
          contractInfo: {
            contract_id: AUTOSWAP_LIMIT_CONTRACTS[network].CONTRACT_ID,
            network: network,
          }
        }, null, 2);
      }
    },
  });
};

/**
 * Create multiple AutoSwapLimit LangChain tools (for future expansion)
 */
export const createAutoSwapLimitLangchainTools = (
  client: Client,
  context: Context,
  userAccountId: string
) => {
  return [
    createAutoSwapLimitLangchainTool(client, context, userAccountId),
    // Future specialized tools can be added here:
    // createAutoSwapLimitOrderQueryTool(client, context, userAccountId),
    // createAutoSwapLimitConfigQueryTool(client, context, userAccountId),
  ];
};

/**
 * Helper function to create a specialized order creation tool
 */
export const createAutoSwapLimitOrderCreationTool = (
  client: Client,
  context: Context,
  userAccountId: string
) => {
  return new DynamicStructuredTool({
    name: 'autoswap_limit_order_creation_tool',
    description: `在 AutoSwapLimit 合约上创建限价单，用于自动 token swap。

创建在市场价格达到指定触发价时自动执行的限价单。
订单会通过 SaucerSwap 流动性池将 HBAR swap 为指定 token。

支持 token: SAUCE、WHBAR 和其他 Hedera token
最小订单金额: ${AUTOSWAP_LIMIT_CONFIG.MIN_ORDER_AMOUNT_HBAR} HBAR
默认过期时间: 24 小时

用户账户: ${userAccountId}`,

    schema: z.object({
      tokenOut: z.string().describe(
        '目标 token symbol 或 ID（例如 "SAUCE", "0.0.731861"）'
      ),
      amountIn: z.number().min(AUTOSWAP_LIMIT_CONFIG.MIN_ORDER_AMOUNT_HBAR).describe(
        `限价单投入的 HBAR 数量（最小 ${AUTOSWAP_LIMIT_CONFIG.MIN_ORDER_AMOUNT_HBAR} HBAR）`
      ),
      minAmountOut: z.string().describe(
        '最少接收 token 数量（wei/最小单位）'
      ),
      triggerPrice: z.string().describe(
        '触发价格，wei/最小单位。市场价格达到该水平时订单执行'
      ),
      expirationHours: z.number().min(1).max(168).default(24).describe(
        '订单过期时间，单位小时（1-168 小时，默认 24）'
      ),
      network: z.enum(['mainnet', 'testnet']).default(
        (process.env.HEDERA_NETWORK as 'mainnet' | 'testnet') || 'mainnet'
      ).describe('执行所在网络'),
    }),

    func: async (params: any) => {
      try {
        // Add user account ID and operation
        const fullParams = {
          ...params,
          operation: AUTOSWAP_LIMIT_OPERATIONS.CREATE_SWAP_ORDER,
          userAccountId,
        };

        console.log(`🎯 Creating AutoSwapLimit order: ${params.amountIn} HBAR → ${params.tokenOut}`);
        console.log(`🎯 Trigger price: ${params.triggerPrice} wei`);
        console.log(`⏰ Expiration: ${params.expirationHours} hours`);

        const result = await getAutoSwapLimitQuery(client, context, fullParams);

        console.log(`✅ AutoSwapLimit order creation completed`);
        return JSON.stringify(result, null, 2);

      } catch (error: any) {
        console.error(`❌ AutoSwapLimit order creation error:`, error);

        // Fix the type safety issue by properly typing the network access
        const network = (params.network || 'mainnet') as 'mainnet' | 'testnet';

        return JSON.stringify({
          success: false,
          error: `创建 AutoSwapLimit 订单时出错：${error.message}`,
          operation: 'create_swap_order',
          timestamp: new Date().toISOString(),
          troubleshooting: {
            issue: '订单创建失败',
            possible_causes: [
              'HBAR 余额不足',
              'token symbol 或 ID 无效',
              '价格参数无效',
              '该网络上合约不可用',
              '网络连接异常'
            ],
            next_steps: [
              '检查 HBAR 余额是否充足',
              '使用有效 token symbol（SAUCE、WHBAR）',
              '确认价格参数合理',
              '检查网络连接',
              '更换参数后重试'
            ]
          },
          contractInfo: {
            contract_id: AUTOSWAP_LIMIT_CONTRACTS[network].CONTRACT_ID,
            network: network,
          }
        }, null, 2);
      }
    },
  });
};

/**
 * Helper function to create a specialized order query tool
 */
export const createAutoSwapLimitOrderQueryTool = (
  client: Client,
  context: Context,
  userAccountId: string
) => {
  return new DynamicStructuredTool({
    name: 'autoswap_limit_order_query_tool',
    description: `查询 AutoSwapLimit 合约的订单详情和配置。

获取指定订单、合约配置、router 设置和余额的详细信息。
适合用于监控订单状态和理解合约参数。

用户账户: ${userAccountId}`,

    schema: z.object({
      operation: z.enum([
        AUTOSWAP_LIMIT_OPERATIONS.GET_ORDER_DETAILS,
        AUTOSWAP_LIMIT_OPERATIONS.GET_CONTRACT_CONFIG,
        AUTOSWAP_LIMIT_OPERATIONS.GET_ROUTER_INFO,
        AUTOSWAP_LIMIT_OPERATIONS.GET_CONTRACT_BALANCE,
        AUTOSWAP_LIMIT_OPERATIONS.GET_NEXT_ORDER_ID,
      ]).describe('要执行的查询 operation'),

      orderId: z.number().optional().describe(
        '要查询详情的订单 ID（get_order_details operation 需要）'
      ),

      network: z.enum(['mainnet', 'testnet']).default(
        (process.env.HEDERA_NETWORK as 'mainnet' | 'testnet') || 'mainnet'
      ).describe('要查询的网络'),
    }),

    func: async (params: any) => {
      try {
        // Add user account ID
        const fullParams = {
          ...params,
          userAccountId,
        };

        console.log(`📋 Querying AutoSwapLimit: ${params.operation}`);
        if (params.orderId !== undefined) {
          console.log(`📝 Order ID: ${params.orderId}`);
        }

        const result = await getAutoSwapLimitQuery(client, context, fullParams);

        console.log(`✅ AutoSwapLimit query completed: ${params.operation}`);
        return JSON.stringify(result, null, 2);

      } catch (error: any) {
        console.error(`❌ AutoSwapLimit query error:`, error);

        // Fix the type safety issue by properly typing the network access
        const network = (params.network || 'mainnet') as 'mainnet' | 'testnet';

        return JSON.stringify({
          success: false,
          error: `查询 AutoSwapLimit 时出错：${error.message}`,
          operation: params.operation,
          timestamp: new Date().toISOString(),
          troubleshooting: {
            issue: '查询 operation 失败',
            possible_causes: [
              '订单 ID 无效',
              '该网络上合约不可用',
              '网络连接异常',
              '查询参数无效'
            ],
            next_steps: [
              '检查订单 ID 是否有效',
              '确认网络连接正常',
              '检查合约部署状态',
              '更换参数后重试'
            ]
          },
          contractInfo: {
            contract_id: AUTOSWAP_LIMIT_CONTRACTS[network].CONTRACT_ID,
            network: network,
          }
        }, null, 2);
      }
    },
  });
};
