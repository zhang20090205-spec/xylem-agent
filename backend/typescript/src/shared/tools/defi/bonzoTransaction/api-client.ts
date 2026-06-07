import { z } from 'zod';
import type { Context } from '../../../configuration';
import { Client, TokenAssociateTransaction, ContractExecuteTransaction, ContractFunctionParameters, Hbar, AccountId, ContractId, AccountInfoQuery, AccountAllowanceApproveTransaction, TokenId } from '@hashgraph/sdk';
import { handleTransaction } from '../../../strategies/tx-mode-strategy';
import Long from 'long';
import { bonzoDepositParameters, BONZO_CONFIG, getTokenConfig, convertToBaseUnits, BonzoSupportedToken } from '../../../parameter-schemas/bonzo.zod';
import { PromptGenerator } from '../../../utils/prompt-generator';

// Tool name constant
export const BONZO_DEPOSIT_TOOL = 'bonzo_deposit_tool';

// Configuration constants
export const BONZO_DEPOSIT_CONFIG = {
  ...BONZO_CONFIG,
  STEP_TYPES: {
    TOKEN_ASSOCIATION: 'token_association',
    DEPOSIT: 'deposit',
  },
} as const;

// Available operations enum
export const BONZO_DEPOSIT_OPERATIONS = {
  ASSOCIATE_TOKEN: 'associate_token',
  APPROVE_TOKEN: 'approve_token',
  DEPOSIT_TOKEN: 'deposit_token',
  FULL_DEPOSIT_FLOW: 'full_deposit_flow',
} as const;

/**
 * Get the real EVM address for a Hedera account using Mirror Node API
 * Returns the EVM Address Alias if available, otherwise falls back to Account Number Alias
 */
const getUserEvmAddress = async (
  client: Client,
  accountId: string,
): Promise<string> => {
  try {
    console.log(`🔍 Querying Mirror Node for account ${accountId}...`);

    // Use Mirror Node API to get the real EVM address
    const mirrorNodeUrl = process.env.HEDERA_NETWORK === 'mainnet'
      ? 'https://mainnet-public.mirrornode.hedera.com'
      : 'https://testnet.mirrornode.hedera.com';

    const response = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId}`);

    if (!response.ok) {
      throw new Error(`Mirror Node API error: ${response.status} ${response.statusText}`);
    }

    const accountData = await response.json();

    // Check if the account has a real EVM address
    if (accountData.evm_address && accountData.evm_address !== '0x0000000000000000000000000000000000000000') {
      const evmAddress = accountData.evm_address;
      console.log(`✅ Found real EVM Address from Mirror Node: ${evmAddress}`);
      return evmAddress;
    }

    // Check if there's an alias field that contains the EVM address
    if (accountData.alias && accountData.alias.length > 0) {
      // Try to convert alias bytes to EVM address format
      const aliasHex = accountData.alias;
      if (aliasHex.length === 42 && aliasHex.startsWith('0x')) {
        console.log(`✅ Found EVM Address from alias: ${aliasHex}`);
        return aliasHex;
      }
    }

    console.log(`🔄 Mirror Node response:`, {
      account: accountData.account,
      evm_address: accountData.evm_address,
      alias: accountData.alias
    });

  } catch (error) {
    console.error(`❌ Error querying Mirror Node for ${accountId}:`, error);
  }

  // Fallback to account number alias
  const fallbackAddress = AccountId.fromString(accountId).toSolidityAddress();
  console.log(`⚠️ Fallback to Account Number Alias: 0x${fallbackAddress}`);

  return `0x${fallbackAddress}`;
};

/**
 * Comprehensive parameter normalizer for Bonzo deposits with multi-token support
 */
const normalizeBonzoDepositParams = (
  params: z.infer<ReturnType<typeof bonzoDepositParameters>>,
  context: Context,
) => {
  const userAccountId = params.userAccountId || context.accountId;
  if (!userAccountId) {
    throw new Error('必须在参数或上下文中提供用户账户 ID');
  }

  // Get token configuration based on token type
  const tokenConfig = getTokenConfig(params.token as BonzoSupportedToken);

  // Convert amount to base units (tinybars for HBAR, smallest unit for other tokens)
  const amountInBaseUnits = convertToBaseUnits(params.amount, tokenConfig.decimals);

  return {
    ...params,
    userAccountId,
    amountInBaseUnits,
    tokenId: tokenConfig.tokenId,
    tokenAddress: tokenConfig.tokenAddress,
    lendingPoolAddress: BONZO_CONFIG.LENDING_POOL_ADDRESS,
    isNativeHbar: tokenConfig.isNativeHbar,
    symbol: tokenConfig.symbol,
    wrappedSymbol: tokenConfig.wrappedSymbol,
    decimals: tokenConfig.decimals,
  };
};

/**
 * Generate tool prompt with context information
 */
const bonzoDepositPrompt = (context: Context = {}) => {
  const contextSnippet = PromptGenerator.getContextSnippet(context);
  const userAccountDesc = PromptGenerator.getAccountParameterDescription(
    'userAccountId',
    context,
  );
  const usageInstructions = PromptGenerator.getParameterUsageInstructions();

  return `
${contextSnippet}

该工具支持在 Hedera (${BONZO_CONFIG.NETWORK.toUpperCase()}) 上向 Bonzo Finance DeFi 协议存入多种 token。

**重要安全提示:**
- 该工具运行在 HEDERA ${BONZO_CONFIG.NETWORK.toUpperCase()}，涉及真实资金
- 交易一旦确认不可逆
- 确认交易前请仔细核对 token 类型和数量
- 仅对你控制的钱包账户使用

**支持的 Token:**
- **HBAR**（Hedera 原生 token）→ 获得 aWHBAR
- **SAUCE**（SaucerSwap governance token）→ 获得 aSAUCE
- **xSAUCE**（Staked SAUCE token）→ 获得 axSAUCE
- **USDC**（USD Coin stablecoin）→ 获得 aUSDC

**存款流程:**
1. Token Association（如需要）- 将所选 token 关联到你的账户
2. Token Approval（ERC-20 token 需要）- 授权 LendingPool 合约转移你的 token
3. Token Deposit - 调用 LendingPool.deposit() 存入 token，并获得计息 aToken

**注意:** HBAR 存款只需要第 1 和第 3 步，因为 HBAR 通过 payable amount 直接转入。ERC-20 token（SAUCE、xSAUCE、USDC）需要包含 approval 的完整 3 步。

**参数:**
- token (string, required): 要存入的 token - 'hbar'、'sauce'、'xsauce' 或 'usdc'（默认 'hbar'）
- amount (number, required): 要存入的 token 数量（例如 10.5 HBAR、100 SAUCE）
- ${userAccountDesc}
- associateToken (boolean, optional): 如果尚未关联，是否执行 token association（默认 true）
- referralCode (number, optional): 存款 referral code（默认 0）
- transactionMemo (string, optional): 可选交易 memo

**合约地址 (${BONZO_CONFIG.NETWORK.toUpperCase()}):**
- LendingPool: ${BONZO_CONFIG.LENDING_POOL_ADDRESS}
- LendingPool Contract ID: ${BONZO_CONFIG.LENDING_POOL_CONTRACT_ID}

**你会收到:**
- aToken（计息 token），代表本金和累计利息
- 后续可以取回本金和利息
- 参与 Bonzo Finance 借贷协议的收益

**示例:**
- 存入 HBAR: token="hbar", amount=10.5
- 存入 SAUCE: token="sauce", amount=1000
- 存入 USDC: token="usdc", amount=50

${usageInstructions}
`;
};

/**
 * Execute token association transaction for any supported token
 */
export const associateToken = async (
  client: Client,
  context: Context,
  params: { userAccountId: string; tokenIds: string[]; tokenSymbol: string },
) => {
  try {
    console.log(`🔗 Associating ${params.tokenSymbol} token for account ${params.userAccountId}...`);

    const tx = new TokenAssociateTransaction()
      .setAccountId(params.userAccountId)
      .setTokenIds(params.tokenIds);

    const result = await handleTransaction(tx, client, context);

    // In RETURN_BYTES mode, log preparation instead of completion
    if (context.mode === 'returnBytes') {
      console.log(`🔗 ${params.tokenSymbol} token association transaction prepared for signature`);
    } else {
      console.log(`✅ ${params.tokenSymbol} token association completed`);
    }

    // If result contains bytes, return them at the top level for the websocket agent
    if (result && typeof result === 'object' && 'bytes' in result) {
      return {
        step: BONZO_DEPOSIT_CONFIG.STEP_TYPES.TOKEN_ASSOCIATION,
        operation: BONZO_DEPOSIT_OPERATIONS.ASSOCIATE_TOKEN,
        success: true,
        tokenIds: params.tokenIds,
        tokenSymbol: params.tokenSymbol,
        message: context.mode === 'returnBytes'
          ? `${params.tokenSymbol} token association 交易已准备好，请签名`
          : `${params.tokenSymbol} token association 已成功完成`,
        bytes: result.bytes, // Put bytes at top level
        result,
      };
    }

    return {
      step: BONZO_DEPOSIT_CONFIG.STEP_TYPES.TOKEN_ASSOCIATION,
      operation: BONZO_DEPOSIT_OPERATIONS.ASSOCIATE_TOKEN,
      success: true,
      tokenIds: params.tokenIds,
      tokenSymbol: params.tokenSymbol,
      message: `${params.tokenSymbol} token association 已成功完成`,
      result,
    };
  } catch (error) {
    console.error(`❌ ${params.tokenSymbol} token association failed:`, error);
    return {
      step: BONZO_DEPOSIT_CONFIG.STEP_TYPES.TOKEN_ASSOCIATION,
      operation: BONZO_DEPOSIT_OPERATIONS.ASSOCIATE_TOKEN,
      success: false,
      error: error instanceof Error ? error.message : 'token association 过程中发生未知错误',
      suggestion: '请确认账户有足够 HBAR 支付手续费，并且账户 key 有效',
    };
  }
};

/**
 * Execute token approval for Bonzo Finance LendingPool contract
 */
export const approveTokenForLendingPool = async (
  client: Client,
  context: Context,
  params: {
    userAccountId: string;
    tokenId: string;
    amount: string;
    tokenSymbol: string;
    originalParams?: any;
  },
) => {
  try {
    console.log(`💰 Approving ${params.tokenSymbol} token for Bonzo LendingPool...`);
    console.log(`👤 Account: ${params.userAccountId}`);
    console.log(`🪙 Token: ${params.tokenSymbol} (${params.tokenId})`);
    console.log(`💰 Amount: ${params.amount} smallest units`);
    console.log(`📍 LendingPool Contract: ${BONZO_CONFIG.LENDING_POOL_CONTRACT_ID}`);

    const tx = new AccountAllowanceApproveTransaction()
      .approveTokenAllowance(
        TokenId.fromString(params.tokenId),
        params.userAccountId,
        BONZO_CONFIG.LENDING_POOL_CONTRACT_ID,
        Long.fromString(params.amount)
      );

    const result = await handleTransaction(tx, client, context);

    // In RETURN_BYTES mode, log preparation instead of completion
    if (context.mode === 'returnBytes') {
      console.log(`🔗 ${params.tokenSymbol} approval transaction prepared for signature`);
    } else {
      console.log(`✅ ${params.tokenSymbol} approval completed`);
    }

    // If result contains bytes, return them at the top level for the websocket agent
    if (result && typeof result === 'object' && 'bytes' in result) {
      return {
        step: 'token_approval',
        operation: BONZO_DEPOSIT_OPERATIONS.APPROVE_TOKEN,
        success: true,
        tokenId: params.tokenId,
        tokenSymbol: params.tokenSymbol,
        approvedAmount: params.amount,
        spender: BONZO_CONFIG.LENDING_POOL_CONTRACT_ID,
        message: context.mode === 'returnBytes'
          ? `${params.tokenSymbol} approval 交易已准备好，请签名`
          : `${params.tokenSymbol} approval 已成功完成`,
        bytes: result.bytes, // Put bytes at top level
        nextStep: 'deposit', // Next step after approval
        originalParams: params.originalParams, // Include original parameters for next step
        result,
      };
    }

    return {
      step: 'token_approval',
      operation: BONZO_DEPOSIT_OPERATIONS.APPROVE_TOKEN,
      success: true,
      tokenId: params.tokenId,
      tokenSymbol: params.tokenSymbol,
      approvedAmount: params.amount,
      spender: BONZO_CONFIG.LENDING_POOL_CONTRACT_ID,
      message: `${params.tokenSymbol} approval 已成功完成`,
      result,
    };
  } catch (error) {
    console.error(`❌ ${params.tokenSymbol} approval failed:`, error);
    return {
      step: 'token_approval',
      operation: BONZO_DEPOSIT_OPERATIONS.APPROVE_TOKEN,
      success: false,
      error: error instanceof Error ? error.message : 'token approval 过程中发生未知错误',
      suggestion: `请确认账户有足够 HBAR 支付手续费，并且已关联 ${params.tokenSymbol} token`,
    };
  }
};

/**
 * Execute multi-token deposit to Bonzo Finance
 */
export const executeBonzoDeposit = async (
  client: Client,
  context: Context,
  params: z.infer<ReturnType<typeof bonzoDepositParameters>>,
) => {
  try {
    const normalisedParams = normalizeBonzoDepositParams(params, context);

    console.log(`💰 Depositing ${params.amount} ${normalisedParams.symbol} to Bonzo Finance...`);
    console.log(`📍 LendingPool: ${normalisedParams.lendingPoolAddress}`);
    console.log(`🏢 LendingPool Contract ID: ${BONZO_CONFIG.LENDING_POOL_CONTRACT_ID}`);
    console.log(`🏦 Account: ${normalisedParams.userAccountId}`);
    console.log(`🪙 Token: ${normalisedParams.symbol} (${normalisedParams.tokenId})`);

    // Get the real EVM address for the user (not just account number alias)
    const onBehalfOfAddress = await getUserEvmAddress(client, normalisedParams.userAccountId);
    console.log(`🔄 User EVM Address (onBehalfOf): ${onBehalfOfAddress}`);

    const functionParameters = new ContractFunctionParameters()
      .addAddress(normalisedParams.tokenAddress)
      .addUint256(Long.fromString(normalisedParams.amountInBaseUnits))
      .addAddress(onBehalfOfAddress)
      .addUint16(params.referralCode || 0);

    // Use the Contract ID directly from configuration
    const contractId = ContractId.fromString(BONZO_CONFIG.LENDING_POOL_CONTRACT_ID);

    const tx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(BONZO_CONFIG.GAS_LIMIT)
      .setFunction('deposit', functionParameters);

    // Only set payable amount for native HBAR (wrapped to WHBAR)
    if (normalisedParams.isNativeHbar) {
      tx.setPayableAmount(Hbar.fromTinybars(Long.fromString(normalisedParams.amountInBaseUnits)));
      console.log(`💸 Setting payable amount: ${params.amount} HBAR (native token)`);
    } else {
      console.log(`🔗 ERC-20 token transfer: ${params.amount} ${normalisedParams.symbol}`);
    }

    const result = await handleTransaction(tx, client, context);

    // In RETURN_BYTES mode, log preparation instead of completion
    if (context.mode === 'returnBytes') {
      console.log(`🔗 ${normalisedParams.symbol} deposit transaction prepared for signature`);
    } else {
      console.log(`✅ Bonzo ${normalisedParams.symbol} deposit completed successfully`);
    }

    // If result contains bytes, return them at the top level for the websocket agent
    if (result && typeof result === 'object' && 'bytes' in result) {
      return {
        step: BONZO_DEPOSIT_CONFIG.STEP_TYPES.DEPOSIT,
        operation: BONZO_DEPOSIT_OPERATIONS.DEPOSIT_TOKEN,
        success: true,
        depositAmount: params.amount,
        depositAmountBaseUnits: normalisedParams.amountInBaseUnits,
        token: normalisedParams.symbol,
        tokenId: normalisedParams.tokenId,
        userAccount: normalisedParams.userAccountId,
        lendingPool: normalisedParams.lendingPoolAddress,
        isNativeHbar: normalisedParams.isNativeHbar,
        message: context.mode === 'returnBytes'
          ? `${normalisedParams.symbol} deposit 交易已准备好，请签名（${params.amount} ${normalisedParams.symbol}）`
          : `已成功向 Bonzo Finance 存入 ${params.amount} ${normalisedParams.symbol}`,
        bytes: result.bytes, // Put bytes at top level
        result,
      };
    }

    return {
      step: BONZO_DEPOSIT_CONFIG.STEP_TYPES.DEPOSIT,
      operation: BONZO_DEPOSIT_OPERATIONS.DEPOSIT_TOKEN,
      success: true,
      depositAmount: params.amount,
      depositAmountBaseUnits: normalisedParams.amountInBaseUnits,
      token: normalisedParams.symbol,
      tokenId: normalisedParams.tokenId,
      userAccount: normalisedParams.userAccountId,
      lendingPool: normalisedParams.lendingPoolAddress,
      isNativeHbar: normalisedParams.isNativeHbar,
      message: `已成功向 Bonzo Finance 存入 ${params.amount} ${normalisedParams.symbol}`,
      nextSteps: [
        `你的 ${normalisedParams.symbol} 已存入 Bonzo Finance`,
        `你会收到代表本金和利息的 a${normalisedParams.wrappedSymbol} token`,
        `检查账户余额，确认 a${normalisedParams.wrappedSymbol} token 已到账`,
        '使用 Bonzo Finance 界面跟踪借贷仓位',
      ],
      result,
    };
  } catch (error) {
    console.error(`❌ Bonzo ${params.token} deposit failed:`, error);
    return {
      step: BONZO_DEPOSIT_CONFIG.STEP_TYPES.DEPOSIT,
      operation: BONZO_DEPOSIT_OPERATIONS.DEPOSIT_TOKEN,
      success: false,
      error: error instanceof Error ? error.message : 'deposit 过程中发生未知错误',
      suggestion: `请确认 ${params.token.toUpperCase()} 余额充足，并且 ${params.token.toUpperCase()} token 已关联到账户`,
      troubleshooting: {
        commonIssues: [
          `${params.token.toUpperCase()} 余额不足，无法覆盖存款和 gas 费用`,
          `${params.token.toUpperCase()} token 尚未关联到账户`,
          '合约地址无效或网络不匹配',
          'gas limit 太低，无法执行合约',
        ],
        solutions: [
          `检查 ${params.token.toUpperCase()} 余额，并确保有 HBAR 支付 gas 费用`,
          `请先执行 ${params.token.toUpperCase()} token association`,
          `确认已连接到 Hedera ${BONZO_CONFIG.NETWORK.toUpperCase()}`,
          '使用默认 gas limit 重试',
        ],
      },
    };
  }
};

/**
 * Main function that handles the full deposit flow
 */
export const bonzoDepositFlow = async (
  client: Client,
  context: Context,
  params: z.infer<ReturnType<typeof bonzoDepositParameters>>,
) => {
  try {


    const normalisedParams = normalizeBonzoDepositParams(params, context);

    // If in RETURN_BYTES mode, only process one transaction at a time
    if (context.mode === 'returnBytes') {
      // Step 1: Associate token if requested
      if (params.associateToken) {
        console.log('🚀 Starting Bonzo Finance deposit flow (RETURN_BYTES mode)...');
        console.log(`Step 1: ${normalisedParams.symbol} Token Association - Preparing transaction for signature...`);

        const associationResult = await associateToken(client, context, {
          userAccountId: params.userAccountId || context.accountId || '',
          tokenIds: [normalisedParams.tokenId],
          tokenSymbol: normalisedParams.symbol,
        });

        // In RETURN_BYTES mode, return immediately after first transaction
        // Next step depends on token type: approval for ERC-20, direct deposit for HBAR
        const nextStep = normalisedParams.isNativeHbar ? 'deposit' : 'approval';
        return {
          ...associationResult,
          nextStep,
          originalParams: params, // Include original parameters for next step
          message: `${normalisedParams.symbol} token association 交易已准备好，请签名`,
          instructions: `请签名该交易以关联 ${normalisedParams.symbol} token，然后继续 ${nextStep} 步骤`,
        };
      } else if (!normalisedParams.isNativeHbar) {
        // Skip association but need approval for ERC-20 tokens
        console.log('🚀 Starting Bonzo Finance deposit flow (RETURN_BYTES mode)...');
        console.log(`Step 1: ${normalisedParams.symbol} Token Approval - Preparing transaction for signature...`);

        const approvalResult = await approveTokenForLendingPool(client, context, {
          userAccountId: params.userAccountId || context.accountId || '',
          tokenId: normalisedParams.tokenId,
          amount: normalisedParams.amountInBaseUnits,
          tokenSymbol: normalisedParams.symbol,
          originalParams: params,
        });

        return {
          ...approvalResult,
          message: `${normalisedParams.symbol} approval 交易已准备好，请签名`,
          instructions: `请签名该交易，为 Bonzo Finance 授权 ${normalisedParams.symbol}，然后继续 deposit 步骤`,
        };
      } else {
        // Skip association and approval for HBAR, go directly to deposit
        console.log('🚀 Starting Bonzo Finance deposit flow (RETURN_BYTES mode)...');
        console.log(`Step 1: ${normalisedParams.symbol} Deposit - Preparing transaction for signature...`);

        const depositResult = await executeBonzoDeposit(client, context, params);

        return {
          ...depositResult,
          originalParams: params, // Include original parameters for context
          message: `${normalisedParams.symbol} deposit 交易已准备好，请签名`,
          instructions: `请签名该交易，将 ${normalisedParams.symbol} 存入 Bonzo Finance`,
        };
      }
    }

    // Legacy mode: Execute transactions sequentially (for direct execution)
    const results = [];
    let stepNumber = 1;

    // Step 1: Associate token if requested
    if (params.associateToken) {
      console.log('🚀 Starting Bonzo Finance deposit flow...');
      console.log(`Step ${stepNumber}: ${normalisedParams.symbol} Token Association`);

      const associationResult = await associateToken(client, context, {
        userAccountId: params.userAccountId || context.accountId || '',
        tokenIds: [normalisedParams.tokenId],
        tokenSymbol: normalisedParams.symbol,
      });

      results.push(associationResult);

      if (!associationResult.success) {
        return {
          operation: BONZO_DEPOSIT_OPERATIONS.FULL_DEPOSIT_FLOW,
          success: false,
          error: 'Token association 失败',
          steps: results,
        };
      }

      console.log(`✅ Step ${stepNumber} completed: ${normalisedParams.symbol} token associated`);
      stepNumber++;
    }

    // Step 2: Approve token for ERC-20 tokens (skip for HBAR)
    if (!normalisedParams.isNativeHbar) {
      console.log(`Step ${stepNumber}: ${normalisedParams.symbol} Token Approval`);

      const approvalResult = await approveTokenForLendingPool(client, context, {
        userAccountId: params.userAccountId || context.accountId || '',
        tokenId: normalisedParams.tokenId,
        amount: normalisedParams.amountInBaseUnits,
        tokenSymbol: normalisedParams.symbol,
        originalParams: params,
      });

      results.push(approvalResult);

      if (!approvalResult.success) {
        return {
          operation: BONZO_DEPOSIT_OPERATIONS.FULL_DEPOSIT_FLOW,
          success: false,
          error: 'Token approval 失败',
          steps: results,
        };
      }

      console.log(`✅ Step ${stepNumber} completed: ${normalisedParams.symbol} token approved`);
      stepNumber++;
    }

    // Final Step: Execute deposit
    console.log(`Step ${stepNumber}: ${normalisedParams.symbol} Deposit to Bonzo Finance`);
    const depositResult = await executeBonzoDeposit(client, context, params);
    results.push(depositResult);

    if (!depositResult.success) {
      return {
        operation: BONZO_DEPOSIT_OPERATIONS.FULL_DEPOSIT_FLOW,
        success: false,
        error: 'Deposit 失败',
        steps: results,
      };
    }

    console.log(`✅ Step 2 completed: ${normalisedParams.symbol} deposited to Bonzo Finance`);
    console.log('🎉 Bonzo Finance deposit flow completed successfully!');

    return {
      operation: BONZO_DEPOSIT_OPERATIONS.FULL_DEPOSIT_FLOW,
      success: true,
      steps: results,
      summary: {
        totalSteps: results.length,
        depositAmount: params.amount,
        token: normalisedParams.symbol,
        userAccount: params.userAccountId || context.accountId,
        timestamp: new Date().toISOString(),
      },
      message: `已成功完成 Bonzo Finance 存款：${params.amount} ${normalisedParams.symbol}`,
    };
  } catch (error) {
    console.error('❌ Bonzo deposit flow failed:', error);
    return {
      operation: BONZO_DEPOSIT_OPERATIONS.FULL_DEPOSIT_FLOW,
      success: false,
      error: error instanceof Error ? error.message : 'deposit 流程中发生未知错误',
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Execute only the deposit step (for use after token association is completed)
 */
export const executeBonzoDepositOnly = async (
  client: Client,
  context: Context,
  params: z.infer<ReturnType<typeof bonzoDepositParameters>>,
) => {
  try {
    const normalisedParams = normalizeBonzoDepositParams(params, context);
    console.log(`🚀 Executing Bonzo Finance ${normalisedParams.symbol} deposit step only...`);

    const depositResult = await executeBonzoDeposit(client, context, params);

    return {
      ...depositResult,
      message: `${normalisedParams.symbol} deposit 交易已准备好，请签名`,
      instructions: `请签名该交易，完成向 Bonzo Finance 存入 ${normalisedParams.symbol}`,
    };
  } catch (error: any) {
    console.error('❌ Bonzo deposit step failed:', error);
    return {
      operation: BONZO_DEPOSIT_OPERATIONS.DEPOSIT_TOKEN,
      step: BONZO_DEPOSIT_CONFIG.STEP_TYPES.DEPOSIT,
      success: false,
      error: error.message,
    };
  }
};

// Export the tool configuration
const bonzoDepositTool = (context: Context) => ({
  method: BONZO_DEPOSIT_TOOL,
  name: 'Bonzo Finance Multi-Token Deposit',
  description: bonzoDepositPrompt(context),
  parameters: bonzoDepositParameters(context),
  execute: bonzoDepositFlow,
});

export default bonzoDepositTool;
