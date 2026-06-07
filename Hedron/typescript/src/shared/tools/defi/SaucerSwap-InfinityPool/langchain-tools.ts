import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Context } from '../../../configuration';
import {
  infinityPoolStakeFlow,
  infinityPoolStakeParameters,
  SAUCERSWAP_INFINITY_POOL_TOOL,
  INFINITY_POOL_OPERATIONS,
  INFINITY_POOL_CONFIG,
  getInfinityPoolConfig,
} from './api-client';
import {
  executeInfinityPoolStakingStep,
  infinityPoolStepParameters,
  SAUCERSWAP_INFINITY_POOL_STEP_TOOL,
} from './step-api-client';

/**
 * Create the main SaucerSwap Infinity Pool staking tool for LangChain
 */
export const createSaucerswapInfinityPoolLangchainTool = (
  client: any, 
  context: Context, 
  userAccountId: string
) => {
  return new DynamicStructuredTool({
    name: SAUCERSWAP_INFINITY_POOL_TOOL,
    description: `在 Hedera Mainnet 上将 SAUCE token 质押到 SaucerSwap Infinity Pool，以获得 xSAUCE。

**核心功能:**
**Staking operation:**
- 质押 SAUCE token → 获得 xSAUCE（计息 token）
- 解除质押 xSAUCE token → 获得 SAUCE + 奖励
- 为 SAUCE 和 xSAUCE 执行 token association
- 为 MotherShip 合约执行 token approval

**可用 operation:**
- associate_tokens: Associate SAUCE and xSAUCE tokens to account
- approve_sauce: Approve MotherShip contract to spend SAUCE tokens
- stake_sauce: Stake SAUCE tokens to receive xSAUCE
- unstake_xsauce: Unstake xSAUCE tokens to receive SAUCE
- full_stake_flow: Complete staking process (association + approval + stake)
- full_unstake_flow: Complete unstaking process

**质押奖励:**
- 奖励来自 SaucerSwap 交易手续费
- xSAUCE token 代表你在池中的份额
- 奖励会随时间自动复利
- 无锁定期，可随时解除质押

**安全提示:**
- 仅在 Hedera Mainnet 使用，涉及真实资金
- 所有交易确认后不可逆
- 确认前请仔细核对金额

**合约信息:**
- MotherShip: ${getInfinityPoolConfig().MOTHERSHIP_CONTRACT_ID}
- SAUCE Token: ${getInfinityPoolConfig().SAUCE_TOKEN_ID} (6 decimals)
- xSAUCE Token: ${getInfinityPoolConfig().XSAUCE_TOKEN_ID} (6 decimals)

用户账户：${userAccountId}`,
    
    schema: infinityPoolStakeParameters(context),
    
    func: async (params: any) => {
      try {
        // Auto-use user account ID if not provided
        if (!params.userAccountId) {
          params.userAccountId = userAccountId;
        }

        console.log('🚨 INFINITY POOL TOOL CALLED:');
        console.log(`📋 Operation: ${params.operation}`);
        console.log(`💰 SAUCE Amount: ${params.sauceAmount}`);
        console.log(`👤 User Account: ${params.userAccountId}`);
        console.log(`🔄 Context Mode: ${context.mode}`);
        console.log('🚨 ==========================================');

        const result = await infinityPoolStakeFlow(client, context, params);
        return JSON.stringify(result, null, 2);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return JSON.stringify({
          error: `SaucerSwap Infinity Pool operation 出错：${errorMessage}`,
          operation: params.operation,
          timestamp: new Date().toISOString(),
          troubleshooting: {
            issue: 'Infinity Pool operation 失败',
            possible_causes: [
              '网络连接异常',
              'token 余额不足',
              'token 尚未关联到账户',
              '尚未授予合约 approval',
              '超出 gas limit',
              '参数无效'
            ],
            next_steps: [
              '检查互联网连接',
              '确认 SAUCE/xSAUCE token 余额',
              '确认 token 已关联到账户',
              '检查 SAUCE 是否已授权给 MotherShip 合约',
              '确认 operation 参数',
              '降低金额后重试'
            ]
          }
        }, null, 2);
      }
    },
  });
};

/**
 * Create the step-by-step SaucerSwap Infinity Pool tool for multi-step flows
 */
export const createSaucerswapInfinityPoolStepLangchainTool = (
  client: any,
  context: Context,
  userAccountId: string
) => {
  return new DynamicStructuredTool({
    name: SAUCERSWAP_INFINITY_POOL_STEP_TOOL,
    description: `执行 SaucerSwap Infinity Pool operation 的单个步骤。用于 WebSocket 模式下的多步骤流程。

**用途:**
该工具用于在前一步已签名并确认后，继续执行后续单步操作。

**使用场景:**
- token association 交易确认后 → 用它继续 approval
- approval 交易确认后 → 用它继续 staking
- 需要对质押流程进行细粒度控制时

**step operation:**
- approval: token association 后为 MotherShip 合约授权 SAUCE
- stake: approval 确认后执行 SAUCE staking

**参数:**
- sauceAmount: 要 approval/stake 的 SAUCE 数量
- approveAmount: 指定 approval 数量（可选）
- userAccountId: 执行 operation 的账户

用户账户：${userAccountId}`,

    schema: infinityPoolStepParameters(context),

    func: async (params: any) => {
      try {
        console.log('🚨 INFINITY POOL STEP TOOL CALLED:');
        console.log(`💰 SAUCE Amount: ${params.sauceAmount}`);
        console.log(`👤 User Account: ${params.userAccountId || userAccountId}`);
        console.log('🚨 ========================================');
        
        // Auto-use user account ID if not provided
        if (!params.userAccountId) {
          params.userAccountId = userAccountId;
        }

        const result = await executeInfinityPoolStakingStep(client, context, params);
        return JSON.stringify(result, null, 2);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return JSON.stringify({
          error: `Infinity Pool step operation 出错：${errorMessage}`,
          timestamp: new Date().toISOString(),
          suggestion: '请确认前序步骤已成功完成，并且账户余额充足'
        }, null, 2);
      }
    },
  });
};

/**
 * Create both Infinity Pool tools for comprehensive coverage
 */
export const createSaucerswapInfinityPoolLangchainTools = (
  client: any,
  context: Context,
  userAccountId: string
) => {
  return [
    createSaucerswapInfinityPoolLangchainTool(client, context, userAccountId),
    createSaucerswapInfinityPoolStepLangchainTool(client, context, userAccountId),
  ];
};
