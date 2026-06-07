import { z } from 'zod';
import type { Context } from '../../../configuration';
import { Client } from '@hashgraph/sdk';
import { PromptGenerator } from '../../../utils/prompt-generator';
import {
  approveSauceForMotherShip,
  stakeSauceTokens,
  INFINITY_POOL_CONFIG,
  INFINITY_POOL_OPERATIONS,
  infinityPoolStakeParameters,
} from './api-client';

// Tool name constant for step operations
export const SAUCERSWAP_INFINITY_POOL_STEP_TOOL = 'saucerswap_infinity_pool_step_tool';

/**
 * Parameter schema for step operations
 */
export const infinityPoolStepParameters = (context: Context = {}) => {
  return z.object({
    sauceAmount: z.number().describe('要处理的 SAUCE token 数量（例如 100.5 表示 100.5 SAUCE）'),
    
    userAccountId: z.string().optional().describe(
      PromptGenerator.getAccountParameterDescription('userAccountId', context)
    ),
    
    referralCode: z.number().optional().describe(
      'operation 的 referral code（可选）'
    ),
    
    transactionMemo: z.string().optional().describe(
      '交易可选 memo'
    ),
  });
};

/**
 * Generate step tool prompt
 */
const infinityPoolStepPrompt = (context: Context = {}) => {
  const contextSnippet = PromptGenerator.getContextSnippet(context);
  const userAccountDesc = PromptGenerator.getAccountParameterDescription(
    'userAccountId',
    context,
  );
  const usageInstructions = PromptGenerator.getParameterUsageInstructions();

  return `
${contextSnippet}

该工具用于在 token association 和 approval 完成后，完成 SAUCE staking 步骤。

**用途:**
这是 Infinity Pool staking flow 中前序步骤确认后的后续工具。

**使用时机:**
- token association 交易确认后
- SAUCE approval 交易确认后
- 需要完成真实 SAUCE token staking 时

**STAKING OPERATION:**
该工具会调用 MotherShip 合约的 enter() 函数，质押 SAUCE token 并获得 xSAUCE。

**参数:**
- sauceAmount (number, required): 要质押的 SAUCE 数量（例如 100.5 表示 100.5 SAUCE）
- ${userAccountDesc}
- referralCode (number, optional): staking operation 的 referral code
- transactionMemo (string, optional): 交易可选 memo

**前置条件:**
- SAUCE 和 xSAUCE token 必须已关联到账户
- SAUCE token 必须已授权给 MotherShip 合约
- 账户中有足够 SAUCE 余额

**执行结果:**
- 你的 SAUCE token 会质押到 Infinity Pool
- 你会收到代表质押份额和未来奖励的 xSAUCE token
- 奖励会随时间自动复利

${usageInstructions}
`;
};

/**
 * Execute the staking step only (after association and approval are complete)
 */
export const executeInfinityPoolStakingStep = async (
  client: Client,
  context: Context,
  params: z.infer<ReturnType<typeof infinityPoolStepParameters>>,
) => {
  try {
    console.log('🚀 Executing SaucerSwap Infinity Pool staking step...');
    console.log('🥩 STAKING OPERATION - Not approval!');
    console.log(`💰 Staking Amount: ${params.sauceAmount} SAUCE`);
    
    // Create params in the format expected by stakeSauceTokens
    const stakeParams = {
      operation: INFINITY_POOL_OPERATIONS.STAKE_SAUCE,
      sauceAmount: params.sauceAmount,
      userAccountId: params.userAccountId,
      transactionMemo: params.transactionMemo,
      associateTokens: false, // Required field, but we're not associating in step mode
    };
    
    // IMPORTANT: Do NOT skip allowance check here. Even en modo step debemos validar que la aprobación fue firmada.
    const stakeResult = await stakeSauceTokens(client, context, stakeParams, false);
    
    return {
      ...stakeResult,
      message: 'SAUCE staking 交易已准备好，请签名',
      instructions: '请签名该交易，完成 Infinity Pool 中的 SAUCE staking',
    };
  } catch (error: any) {
    console.error('❌ Infinity Pool staking step failed:', error);
    return {
      operation: INFINITY_POOL_OPERATIONS.STAKE_SAUCE,
      step: INFINITY_POOL_CONFIG.STEP_TYPES.STAKE,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// Export the step tool configuration
const infinityPoolStepTool = (context: Context) => ({
  method: SAUCERSWAP_INFINITY_POOL_STEP_TOOL,
  name: 'SaucerSwap Infinity Pool Staking Step',
  description: infinityPoolStepPrompt(context),
  parameters: infinityPoolStepParameters(context),
  execute: executeInfinityPoolStakingStep,
});

export default infinityPoolStepTool;
