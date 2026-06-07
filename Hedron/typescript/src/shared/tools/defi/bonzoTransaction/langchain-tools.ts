import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Context } from '../../../configuration';
import { Client } from '@hashgraph/sdk';
import {
  bonzoDepositFlow,
  executeBonzoDepositOnly,
  approveTokenForLendingPool,
  BONZO_DEPOSIT_TOOL,
  BONZO_DEPOSIT_CONFIG,
  BONZO_DEPOSIT_OPERATIONS,
} from './api-client';
import { bonzoDepositParameters, BONZO_CONFIG, getTokenConfig, convertToBaseUnits } from '../../../parameter-schemas/bonzo.zod';

/**
 * Create a LangChain tool for Bonzo Finance multi-token deposits
 */
export const createBonzoDepositLangchainTool = (
  client: Client,
  context: Context,
  userAccountId: string,
) => {
  return new DynamicStructuredTool({
    name: BONZO_DEPOSIT_TOOL,
    description: `将多种 token（HBAR、SAUCE、xSAUCE、USDC）存入 Hedera ${BONZO_CONFIG.NETWORK.toUpperCase()} 上的 Bonzo Finance DeFi 协议以赚取利息。

**实时 ${BONZO_CONFIG.NETWORK.toUpperCase()} 工具 - 涉及真实资金**

该工具用于向 Bonzo Finance 存入多种 token。Bonzo Finance 是 Hedera 上类似 Aave 的借贷协议。

**支持的 Token:**
- **HBAR**（Hedera 原生 token）→ 获得 aWHBAR
- **SAUCE**（SaucerSwap governance token）→ 获得 aSAUCE
- **xSAUCE**（Staked SAUCE token）→ 获得 axSAUCE
- **USDC**（USD Coin stablecoin）→ 获得 aUSDC

**核心能力:**
- 必要时自动 token association
- 将多种 token 存入 LendingPool 合约
- 获得计息 aToken
- 管理完整交易流程

**流程:**
1. 如果账户尚未关联所选 token，先执行 token association
2. 调用 LendingPool.deposit() 存入 token
3. 用户获得会随时间增值的 aToken
4. 后续可通过 Bonzo 界面取回本金和利息

**合约信息（Hedera ${BONZO_CONFIG.NETWORK.toUpperCase()}）:**
- LendingPool: ${BONZO_CONFIG.LENDING_POOL_ADDRESS}
- LendingPool Contract ID: ${BONZO_CONFIG.LENDING_POOL_CONTRACT_ID}
- Network: Hedera ${BONZO_CONFIG.NETWORK.toUpperCase()}

**用户账户:** ${userAccountId}

**在 RETURN_BYTES 模式下返回 transaction bytes，供前端钱包签名。**`,

    schema: bonzoDepositParameters(context),

    func: async (params: any) => {
      try {
        // Auto-use user account ID if not provided
        if (!params.userAccountId) {
          params.userAccountId = userAccountId;
        }

        console.log(`Bonzo Finance 存款已发起，账户：${params.userAccountId}`);
        console.log(`金额：${params.amount} ${(params.token || 'hbar').toUpperCase()}`);
        console.log(`Token Association：${params.associateToken ? '是' : '否'}`);

        const result = await bonzoDepositFlow(client, context, params);

        return JSON.stringify({
          ...result,
          toolInfo: {
            name: BONZO_DEPOSIT_TOOL,
            version: '1.0.0',
            network: `Hedera ${BONZO_CONFIG.NETWORK.toUpperCase()}`,
            protocol: 'Bonzo Finance',
            timestamp: new Date().toISOString(),
          },
          userGuidance: {
            nextSteps: result.success ? [
              '存款已成功完成！',
              `检查账户中的 a${(params.token || 'hbar').toUpperCase()} token`,
              '可在 Bonzo Finance dashboard 监控仓位',
              `你的 a${(params.token || 'hbar').toUpperCase()} 会随着利息累积而增值`,
            ] : [
              '存款失败，请查看错误详情',
              '请检查排查建议',
              '如果问题持续，请联系支持团队',
            ],
            importantNotes: [
              `你的 ${(params.token || 'hbar').toUpperCase()} 已存入 Bonzo Finance 借贷协议`,
              `你收到的 a${(params.token || 'hbar').toUpperCase()} token 代表本金和累计利息`,
              '利息会立即开始累积',
              '可使用 Bonzo Finance 界面取款或监控仓位',
            ],
          },
        }, null, 2);
      } catch (error) {
        console.error('Bonzo LangChain 工具错误：', error);
        return JSON.stringify({
          success: false,
          error: `Bonzo Finance 存款工具错误：${error instanceof Error ? error.message : '未知错误'}`,
          operation: BONZO_DEPOSIT_OPERATIONS.FULL_DEPOSIT_FLOW,
          timestamp: new Date().toISOString(),
          troubleshooting: {
            issue: 'LangChain 工具执行失败',
            possibleCauses: [
              '参数无效',
              '网络连接异常',
              `${(params.token || 'hbar').toUpperCase()} 余额不足`,
              '账户配置不完整',
            ],
            nextSteps: [
              `确认 ${(params.token || 'hbar').toUpperCase()} 余额充足`,
              '检查网络连接',
              '确认账户权限正确',
              '使用有效参数重试',
            ],
          },
        }, null, 2);
      }
    },
  });
};

/**
 * Create multiple Bonzo LangChain tools (future expansion)
 */
export const createBonzoDepositLangchainTools = (
  client: Client,
  context: Context,
  userAccountId: string,
) => {
  return [
    createBonzoDepositLangchainTool(client, context, userAccountId),
    // Future tools can be added here:
    // createBonzoWithdrawLangchainTool(client, context, userAccountId),
    // createBonzoBorrowLangchainTool(client, context, userAccountId),
  ];
};

/**
 * Create a LangChain tool for token approval step (before deposit)
 */
const createBonzoApproveStepLangchainTool = (
  client: Client,
  context: Context,
  userAccountId: string,
) => {
  return new DynamicStructuredTool({
    name: 'bonzo_approve_step_tool',
    description: `为 Bonzo Finance LendingPool 合约授权 ERC-20 token（token association 后的第 2 步）。
    仅在 SAUCE、xSAUCE、USDC 等 ERC-20 token 已完成 token association 后使用该工具。

    该工具会准备 token approval 交易，供前端钱包签名。
    HBAR 存款不需要 approval，因为它直接使用 payable amount。

    必需参数:
    - token: 要授权的 token（'sauce'、'xsauce'、'usdc'），不要用于 'hbar'
    - amount: 要授权的 token 数量（例如 100）
    - userAccountId: Hedera 账户 ID（可选，默认使用已认证账户）`,

    schema: bonzoDepositParameters(context),

    func: async (params: z.infer<ReturnType<typeof bonzoDepositParameters>>) => {
      try {
        // Auto-use user account ID if not provided
        if (!params.userAccountId) {
          params.userAccountId = userAccountId;
        }

        console.log(`Bonzo Finance token 授权已发起，账户：${params.userAccountId}`);
        console.log(`金额：${params.amount} ${(params.token || 'hbar').toUpperCase()}`);

        // Check if token is HBAR (doesn't need approval)
        if (params.token === 'hbar') {
          return JSON.stringify({
            success: false,
            error: 'HBAR 存款不需要 approval，请直接进入 deposit 步骤',
            suggestion: 'HBAR 存款请使用 bonzo_deposit_step_tool',
            toolInfo: { name: 'bonzo_approve_step_tool' },
          });
        }

        // Get token configuration and calculate amount in base units
        const tokenConfig = getTokenConfig(params.token as any);
        const amountInBaseUnits = convertToBaseUnits(params.amount, tokenConfig.decimals);

        const result = await approveTokenForLendingPool(client, context, {
          userAccountId: params.userAccountId,
          tokenId: tokenConfig.tokenId,
          amount: amountInBaseUnits,
          tokenSymbol: tokenConfig.symbol,
          originalParams: params,
        });

        return JSON.stringify({
          ...result,
          toolInfo: {
            name: 'bonzo_approve_step_tool',
            version: '1.0.0',
            network: `Hedera ${BONZO_CONFIG.NETWORK.toUpperCase()}`,
            protocol: 'Bonzo Finance',
            step: 'token_approval',
            timestamp: new Date().toISOString(),
          },
          userGuidance: {
            nextAction: `请在钱包中签名交易，为 Bonzo Finance 授权 ${(params.token || '').toUpperCase()}`,
            postTransaction: `授权确认后，继续存入 ${(params.token || '').toUpperCase()} token`,
          },
        });
      } catch (error: any) {
        console.error('Bonzo token 授权失败：', error);
        return JSON.stringify({
          success: false,
          error: error.message,
          toolInfo: { name: 'bonzo_approve_step_tool' },
        });
      }
    },
  });
};

/**
 * Create a LangChain tool for the deposit step only (after token association)
 */
export const createBonzoDepositStepLangchainTool = (
  client: Client,
  context: Context,
  userAccountId: string,
) => {
  return new DynamicStructuredTool({
    name: 'bonzo_deposit_step_tool',
    description: `完成向 Bonzo Finance 存入 token（token association 后的第 2 步）。
    仅在 token association 已完成并确认后使用该工具。

    该工具会准备 deposit 交易，供前端钱包签名。

    必需参数:
    - token: 要存入的 token（'hbar'、'sauce'、'xsauce'、'usdc'）
    - amount: 要存入的 token 数量（例如 1.5）
    - userAccountId: Hedera 账户 ID（可选，默认使用已认证账户）
    - referralCode: 可选 referral code（0-65535，默认 0）`,

    schema: bonzoDepositParameters(context),

    func: async (params: z.infer<ReturnType<typeof bonzoDepositParameters>>) => {
      try {
        // Auto-use user account ID if not provided
        if (!params.userAccountId) {
          params.userAccountId = userAccountId;
        }

        console.log(`Bonzo Finance deposit 步骤已发起，账户：${params.userAccountId}`);
        console.log(`金额：${params.amount} ${(params.token || 'hbar').toUpperCase()}`);

        // Skip token association for this step
        const paramsWithoutAssociation = { ...params, associateToken: false };
        const result = await executeBonzoDepositOnly(client, context, paramsWithoutAssociation);

        return JSON.stringify({
          ...result,
          toolInfo: {
            name: 'bonzo_deposit_step_tool',
            version: '1.0.0',
            network: `Hedera ${BONZO_CONFIG.NETWORK.toUpperCase()}`,
            protocol: 'Bonzo Finance',
            step: 'deposit_only',
            timestamp: new Date().toISOString(),
          },
          userGuidance: {
            nextAction: `请在钱包中签名交易，完成 ${(params.token || 'hbar').toUpperCase()} 存款`,
            postTransaction: `确认后，你会收到代表本金和利息的 a${(params.token || 'hbar').toUpperCase()} token`,
          },
        });
      } catch (error: any) {
        console.error('Bonzo deposit 步骤失败：', error);
        return JSON.stringify({
          success: false,
          error: error.message,
          toolInfo: { name: 'bonzo_deposit_step_tool' },
        });
      }
    },
  });
};

// Export for easy import
export {
  BONZO_DEPOSIT_TOOL,
  BONZO_DEPOSIT_CONFIG,
  BONZO_DEPOSIT_OPERATIONS,
  createBonzoApproveStepLangchainTool,
};
