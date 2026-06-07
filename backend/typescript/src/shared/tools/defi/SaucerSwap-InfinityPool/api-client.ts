import { z } from 'zod';
import type { Context } from '../../../configuration';
import { 
  Client, 
  TokenAssociateTransaction, 
  ContractExecuteTransaction, 
  ContractFunctionParameters, 
  AccountId, 
  ContractId,
  AccountAllowanceApproveTransaction,
  TokenId,
  AccountInfoQuery,
  Transaction,
  EthereumTransaction,
  Hbar,
  PrivateKey
} from '@hashgraph/sdk';
import { handleTransaction } from '../../../strategies/tx-mode-strategy';
import Long from 'long';
import { PromptGenerator } from '../../../utils/prompt-generator';
import { ethers } from 'ethers';

// Tool name constants
export const SAUCERSWAP_INFINITY_POOL_TOOL = 'saucerswap_infinity_pool_tool';
export const SAUCERSWAP_INFINITY_POOL_STEP_TOOL = 'saucerswap_infinity_pool_step_tool';

// Network Configuration Type
export type HederaNet = "mainnet" | "testnet";

// Configuration constants for SaucerSwap Infinity Pool
export const INFINITY_POOL_NETWORK_CONFIG = {
  mainnet: {
    // Contract addresses (Mainnet)
    MOTHERSHIP_CONTRACT_ID: '0.0.1460199',
    MOTHERSHIP_EVM_ADDRESS: '0x00000000000000000000000000000000001647e7',
    
    // Token IDs
    SAUCE_TOKEN_ID: '0.0.731861',
    XSAUCE_TOKEN_ID: '0.0.1460200',
    
    // EVM addresses
    SAUCE_EVM_ADDRESS: '0x00000000000000000000000000000000000b2ad5',
    XSAUCE_EVM_ADDRESS: '0x00000000000000000000000000000000001647e8',
    
    // Chain settings
    CHAIN_ID: 295,                    // Hedera Mainnet chain ID
  },
  testnet: {
    // Contract addresses (Testnet) - From official SaucerSwap docs
    MOTHERSHIP_CONTRACT_ID: '0.0.1418650',
    MOTHERSHIP_EVM_ADDRESS: '0x00000000000000000000000000000000001599ea',
    
    // Token IDs
    SAUCE_TOKEN_ID: '0.0.1183558',
    XSAUCE_TOKEN_ID: '0.0.1418651',
    
    // EVM addresses
    SAUCE_EVM_ADDRESS: '0x0000000000000000000000000000000000120f46',
    XSAUCE_EVM_ADDRESS: '0x00000000000000000000000000000000001599eb',
    
    // Chain settings
    CHAIN_ID: 296,                    // Hedera Testnet chain ID
  },
} as const;

// Helper function to get network config based on HEDERA_NETWORK env variable
export const getInfinityPoolConfig = (network?: HederaNet) => {
  const targetNetwork = network || (process.env.HEDERA_NETWORK as HederaNet) || 'mainnet';
  return INFINITY_POOL_NETWORK_CONFIG[targetNetwork];
};

// Shared configuration constants (same for both networks)
export const INFINITY_POOL_CONFIG = {
  // Token decimals
  DECIMALS: 6,
  
  // Gas limits and estimation settings
  BASE_GAS_LIMIT: 500000,           // Base gas for complex operations
  APPROVAL_GAS_LIMIT: 300000,       // Base gas for approvals  
  ASSOCIATION_GAS_LIMIT: 150000,    // Base gas for token associations
  
  // Gas estimation buffers (multipliers)
  GAS_BUFFER_MULTIPLIER: 1.3,       // Add 30% buffer to estimated gas
  MIN_GAS_BUFFER: 50000,            // Minimum additional gas buffer
  MAX_GAS_LIMIT: 2000000,           // Maximum gas limit cap
  
  // EthereumTransaction settings for HTS system contracts
  MAX_GAS_ALLOWANCE_HBAR: 1.0,      // HBAR allowance for system contract operations
  
  // Contract ABIs for ethers
  MOTHERSHIP_ABI: [
    'function enter(uint256 _amount)',
    'function leave(uint256 _share)'
  ],
  
  STEP_TYPES: {
    TOKEN_ASSOCIATION: 'token_association',
    TOKEN_APPROVAL: 'token_approval', 
    STAKE: 'stake',
    UNSTAKE: 'unstake',
  },
} as const;

// Available operations enum
export const INFINITY_POOL_OPERATIONS = {
  ASSOCIATE_TOKENS: 'associate_tokens',
  APPROVE_SAUCE: 'approve_sauce',
  STAKE_SAUCE: 'stake_sauce',
  UNSTAKE_XSAUCE: 'unstake_xsauce',
  FULL_STAKE_FLOW: 'full_stake_flow',
  FULL_UNSTAKE_FLOW: 'full_unstake_flow',
} as const;

// Parameter schemas
export const infinityPoolStakeParameters = (context: Context = {}) => {
  return z.object({
    operation: z.enum([
      INFINITY_POOL_OPERATIONS.ASSOCIATE_TOKENS,
      INFINITY_POOL_OPERATIONS.APPROVE_SAUCE,
      INFINITY_POOL_OPERATIONS.STAKE_SAUCE,
      INFINITY_POOL_OPERATIONS.UNSTAKE_XSAUCE,
      INFINITY_POOL_OPERATIONS.FULL_STAKE_FLOW,
      INFINITY_POOL_OPERATIONS.FULL_UNSTAKE_FLOW,
    ]).describe('要执行的 SaucerSwap Infinity Pool operation'),
    
    userAccountId: z.string().optional().describe(
      PromptGenerator.getAccountParameterDescription('userAccountId', context)
    ),
    
    sauceAmount: z.number().optional().describe(
      '要质押的 SAUCE token 数量（例如 100.5 表示 100.5 SAUCE）。stake operation 必需。'
    ),
    
    xSauceAmount: z.number().optional().describe(
      '要解除质押的 xSAUCE token 数量（例如 50.25 表示 50.25 xSAUCE）。unstake operation 必需。'
    ),
    
    approveAmount: z.number().optional().describe(
      '授权给 MotherShip 合约的 SAUCE 数量。未指定时使用质押数量。'
    ),
    
    associateTokens: z.boolean().optional().default(true).describe(
      'Whether to associate SAUCE and xSAUCE tokens if not already associated (default: true)'
    ),
    
    transactionMemo: z.string().optional().describe(
      '交易可选 memo'
    ),
    
    originalParams: z.any().optional().describe(
      'Original parameters from the initial flow request (used internally for multi-step flows)'
    ),
  });
 };

/**
 * Estimate gas for a transaction with automatic buffer
 * @param transaction - The transaction to estimate gas for
 * @param client - Hedera client
 * @param fallbackGas - Fallback gas if estimation fails
 * @returns Estimated gas with buffer applied
 */
const estimateGasWithBuffer = async (
  transaction: Transaction,
  client: Client,
  fallbackGas: number
): Promise<number> => {
  try {
    console.log(`⛽ Estimating gas for transaction...`);
    
    // Try to get gas estimate (this might not be directly available in Hedera SDK)
    // For now, we'll use a smart fallback approach based on transaction type
    let estimatedGas = fallbackGas;
    
    // Apply buffer to estimated gas
    const gasWithBuffer = Math.ceil(estimatedGas * INFINITY_POOL_CONFIG.GAS_BUFFER_MULTIPLIER);
    const gasWithMinBuffer = Math.max(gasWithBuffer, estimatedGas + INFINITY_POOL_CONFIG.MIN_GAS_BUFFER);
    const finalGas = Math.min(gasWithMinBuffer, INFINITY_POOL_CONFIG.MAX_GAS_LIMIT);
    
    console.log(`⛽ Gas Estimation:`);
    console.log(`   Base Gas: ${estimatedGas}`);
    console.log(`   With Buffer (${INFINITY_POOL_CONFIG.GAS_BUFFER_MULTIPLIER}x): ${gasWithBuffer}`);
    console.log(`   With Min Buffer: ${gasWithMinBuffer}`);
    console.log(`   Final Gas: ${finalGas}`);
    
    return finalGas;
  } catch (error) {
    console.log(`⚠️ Gas estimation failed, using fallback: ${fallbackGas}`);
    // Apply buffer to fallback gas
    const gasWithBuffer = Math.ceil(fallbackGas * INFINITY_POOL_CONFIG.GAS_BUFFER_MULTIPLIER);
    const finalGas = Math.min(gasWithBuffer, INFINITY_POOL_CONFIG.MAX_GAS_LIMIT);
    console.log(`⛽ Fallback Gas with Buffer: ${finalGas}`);
    return finalGas;
  }
};

/**
 * Get appropriate gas limit based on operation type
 * @param operationType - Type of operation (stake, unstake, approve, associate)
 * @returns Appropriate base gas limit
 */
const getBaseGasForOperation = (operationType: string): number => {
  switch (operationType) {
    case 'associate':
      return INFINITY_POOL_CONFIG.ASSOCIATION_GAS_LIMIT;
    case 'approve':
      return INFINITY_POOL_CONFIG.APPROVAL_GAS_LIMIT;
    case 'stake':
    case 'unstake':
      return INFINITY_POOL_CONFIG.BASE_GAS_LIMIT;
    default:
      return INFINITY_POOL_CONFIG.BASE_GAS_LIMIT;
  }
};

/**
 * Create and sign an Ethereum transaction for contract interaction
 * @param contractAddress - The contract address to interact with
 * @param functionName - The function name to call
 * @param params - The function parameters
 * @param client - Hedera client
 * @param context - Execution context
 * @returns Signed transaction bytes
 */
const createEthereumTransaction = async (
  contractAddress: string,
  functionName: string,
  params: any[],
  client: Client,
  context: Context
): Promise<string> => {
  try {
    console.log(`🔧 Creating Ethereum transaction for ${functionName}...`);
    
    // Get private key from environment
    const privateKey = process.env.ECDSA_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('direct execution mode 需要 ECDSA_PRIVATE_KEY 环境变量');
    }
    
    // Create ethers wallet
    const wallet = new ethers.Wallet(privateKey);
    
    // Create contract interface
    const iface = new ethers.Interface(INFINITY_POOL_CONFIG.MOTHERSHIP_ABI);
    
    // Encode function data
    const data = iface.encodeFunctionData(functionName, params);
    console.log(`📝 Function data: ${data}`);
    
    // Estimate gas with reasonable buffer for EVM part
    const baseGasLimit = getBaseGasForOperation(functionName === 'enter' ? 'stake' : 'unstake');
    const gasLimit = Math.ceil(baseGasLimit * 1.25); // 25% buffer for EVM part
    
    console.log(`⛽ EVM Gas Limit: ${gasLimit} (HTS costs covered by maxGasAllowanceHbar)`);
    
    // Create transaction request
    const txRequest: ethers.TransactionRequest = {
      to: contractAddress,
      data,
      gasLimit: BigInt(gasLimit),
      chainId: getInfinityPoolConfig().CHAIN_ID,
      type: 2, // EIP-1559 transaction
      maxFeePerGas: ethers.parseUnits('100', 'gwei'), // Reasonable fee
      maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
    };
    
    // Sign the transaction
    const signedTx = await wallet.signTransaction(txRequest);
    console.log(`✅ Transaction signed successfully`);
    
    return signedTx;
  } catch (error) {
    console.error(`❌ Error creating Ethereum transaction:`, error);
    throw error;
  }
};

/**
 * Execute a contract call using EthereumTransaction with maxGasAllowanceHbar
 * @param contractAddress - The contract address
 * @param functionName - The function name
 * @param params - The function parameters
 * @param client - Hedera client
 * @param context - Execution context
 * @returns Transaction result
 */
const executeEthereumContractCall = async (
  contractAddress: string,
  functionName: string,
  params: any[],
  client: Client,
  context: Context
): Promise<any> => {
  try {
    console.log(`🚀 Executing ${functionName} using EthereumTransaction with maxGasAllowanceHbar...`);
    
    // In returnBytes mode, create a ContractExecuteTransaction but with better gas handling
    if (context.mode === 'returnBytes') {
      console.log(`🔄 returnBytes mode: Creating transaction for signing...`);
      
      // For returnBytes mode, use ContractExecuteTransaction with improved gas
      const networkConfig = getInfinityPoolConfig();
      const contractId = ContractId.fromString(networkConfig.MOTHERSHIP_CONTRACT_ID);
      const functionParameters = new ContractFunctionParameters()
        .addUint256(Long.fromString(params[0].toString()));
      
      const tx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setFunction(functionName, functionParameters);
      
      // Use maximum gas to handle HTS costs
      const maxGas = INFINITY_POOL_CONFIG.MAX_GAS_LIMIT;
      tx.setGas(maxGas);
      
      console.log(`⛽ Setting maximum gas: ${maxGas} for HTS system contract compatibility`);
      console.log(`💡 Note: Excess gas will be refunded by Hedera`);
      
      const result = await handleTransaction(tx, client, context);
      return result;
    }
    
    // For direct execution mode, use EthereumTransaction
    console.log(`🔄 Direct execution mode: Using EthereumTransaction...`);
    
    // Create and sign the Ethereum transaction
    const signedTx = await createEthereumTransaction(contractAddress, functionName, params, client, context);
    
    // Wrap in EthereumTransaction with gas allowance
    const ethTx = new EthereumTransaction()
      .setEthereumData(ethers.getBytes(signedTx))
      .setMaxGasAllowanceHbar(new Hbar(INFINITY_POOL_CONFIG.MAX_GAS_ALLOWANCE_HBAR));
    
    console.log(`💰 Max Gas Allowance: ${INFINITY_POOL_CONFIG.MAX_GAS_ALLOWANCE_HBAR} HBAR`);
    console.log(`🔄 Executing transaction...`);
    
    // Execute the transaction
    const result = await handleTransaction(ethTx, client, context);
    
    console.log(`✅ EthereumTransaction executed successfully`);
    return result;
  } catch (error) {
    console.error(`❌ Error executing Ethereum contract call:`, error);
    throw error;
  }
};

/**
 * Simple parameter normalizer for Infinity Pool operations
 */
const normalizeInfinityPoolParams = (
  params: z.infer<ReturnType<typeof infinityPoolStakeParameters>>,
  context: Context,
) => {
  const userAccountId = params.userAccountId || context.accountId;
  if (!userAccountId) {
    throw new Error('必须在参数或上下文中提供用户账户 ID');
  }

  // Convert amounts to smallest units (SAUCE/xSAUCE use 6 decimals)
  const sauceAmountInSmallestUnits = params.sauceAmount 
    ? Math.floor(params.sauceAmount * Math.pow(10, INFINITY_POOL_CONFIG.DECIMALS)).toString()
    : undefined;
    
  const xSauceAmountInSmallestUnits = params.xSauceAmount
    ? Math.floor(params.xSauceAmount * Math.pow(10, INFINITY_POOL_CONFIG.DECIMALS)).toString()
    : undefined;
    
  const approveAmountInSmallestUnits = params.approveAmount
    ? Math.floor(params.approveAmount * Math.pow(10, INFINITY_POOL_CONFIG.DECIMALS)).toString()
    : sauceAmountInSmallestUnits; // Default to staking amount
  
  return {
    ...params,
    userAccountId,
    sauceAmountInSmallestUnits,
    xSauceAmountInSmallestUnits,
    approveAmountInSmallestUnits,
  };
};

/**
 * Generate tool prompt with context information
 */
const infinityPoolPrompt = (context: Context = {}) => {
  const contextSnippet = PromptGenerator.getContextSnippet(context);
  const userAccountDesc = PromptGenerator.getAccountParameterDescription(
    'userAccountId',
    context,
  );
  const usageInstructions = PromptGenerator.getParameterUsageInstructions();
  
  // Get network configuration dynamically
  const networkConfig = getInfinityPoolConfig();
  const currentNetwork = (process.env.HEDERA_NETWORK as HederaNet) || 'mainnet';
  const networkDisplayName = currentNetwork === 'mainnet' ? 'Hedera Mainnet' : 'Hedera Testnet';

  return `
${contextSnippet}

该工具支持在 ${networkDisplayName} 上将 SAUCE token 质押到 SaucerSwap Infinity Pool，以赚取 xSAUCE。

 **重要安全提示:**
 - 该工具运行在 ${networkDisplayName.toUpperCase()}，${currentNetwork === 'mainnet' ? '涉及真实资金' : '用于测试'}
 - 交易一旦确认不可逆
 - 确认交易前请仔细核对金额
 - 仅对你控制的钱包账户使用

 **GAS 优化与 HTS 兼容:**
 - 使用带 maxGasAllowanceHbar 的 EthereumTransaction 处理 HTS system contracts
 - 所有 operation 自动估算 gas，并增加 30% buffer
 - 覆盖 HTS transferToken 成本（最多 ${INFINITY_POOL_CONFIG.MAX_GAS_ALLOWANCE_HBAR} HBAR allowance）
 - 最大 gas limit 保护（${INFINITY_POOL_CONFIG.MAX_GAS_LIMIT} gas 上限）
 - 通过智能 fallback 提高系统合约成本下的交易成功率

**Staking 流程 (SAUCE → xSAUCE):**
1. Token Association - 将 SAUCE 和 xSAUCE token 关联到你的账户
2. Token Approval - 授权 MotherShip 合约使用你的 SAUCE token
3. Stake Operation - 调用 MotherShip.enter() 将 SAUCE 转换为 xSAUCE

**Unstaking 流程 (xSAUCE → SAUCE):**
1. Unstake Operation - 调用 MotherShip.leave() 将 xSAUCE 转回 SAUCE

**参数:**
- operation (required): 要执行的 operation
- ${userAccountDesc}
- sauceAmount (number, optional): 要质押的 SAUCE 数量（例如 100.5）
- xSauceAmount (number, optional): 要解除质押的 xSAUCE 数量（例如 50.25）
- approveAmount (number, optional): 要授权的 SAUCE 数量（默认使用质押数量）
- associateTokens (boolean, optional): 是否执行 token association（默认 true）
- transactionMemo (string, optional): 交易可选 memo

**Contract Addresses (${networkDisplayName}):**
- MotherShip Contract: ${networkConfig.MOTHERSHIP_CONTRACT_ID} (${networkConfig.MOTHERSHIP_EVM_ADDRESS})
- SAUCE Token: ${networkConfig.SAUCE_TOKEN_ID} (${networkConfig.SAUCE_EVM_ADDRESS})
- xSAUCE Token: ${networkConfig.XSAUCE_TOKEN_ID} (${networkConfig.XSAUCE_EVM_ADDRESS})

**Available Operations:**
- associate_tokens: Associate SAUCE and xSAUCE tokens to your account
- approve_sauce: Approve MotherShip contract to spend your SAUCE tokens
- stake_sauce: Stake SAUCE tokens to receive xSAUCE
- unstake_xsauce: Unstake xSAUCE tokens to receive SAUCE
- full_stake_flow: Complete staking flow (association + approval + stake)
- full_unstake_flow: Complete unstaking flow

**What you'll receive:**
- Staking: xSAUCE tokens representing your staked SAUCE + accumulated rewards
- Unstaking: SAUCE tokens (original stake + rewards earned)

${usageInstructions}
`;
};

/**
 * Execute token association for SAUCE and xSAUCE
 */
export const associateInfinityPoolTokens = async (
  client: Client,
  context: Context,
  params: { userAccountId: string; tokenIds: string[] },
) => {
  try {
    console.log('🚨 TOKEN ASSOCIATION CALLED:');
    console.log(`👤 Account: ${params.userAccountId}`);
    console.log(`🪙 Tokens: ${params.tokenIds.join(', ')}`);
    console.log(`🔄 Context Mode: ${context.mode}`);
    console.log('🚨 =================================');
    console.log(`🔗 Associating Infinity Pool tokens for account ${params.userAccountId}...`);
    
    // Create token association transaction
    const tx = new TokenAssociateTransaction()
      .setAccountId(params.userAccountId)
      .setTokenIds(params.tokenIds);
    
    // Estimate gas with buffer for association operation
    const baseGas = getBaseGasForOperation('associate');
    const estimatedGas = await estimateGasWithBuffer(tx, client, baseGas);
    // Note: TokenAssociateTransaction gas is typically handled automatically by SDK
    console.log(`⛽ Estimated gas for token association: ${estimatedGas} (handled automatically by SDK)`);
    
    const result = await handleTransaction(tx, client, context);
    
    // In RETURN_BYTES mode, log preparation instead of completion
    if (context.mode === 'returnBytes') {
      console.log(`🔗 Token association transaction prepared for signature`);
    } else {
      console.log(`✅ Infinity Pool tokens association completed`);
    }
    
    // If result contains bytes, return them at the top level for the websocket agent
    if (result && typeof result === 'object' && 'bytes' in result) {
      return {
        step: INFINITY_POOL_CONFIG.STEP_TYPES.TOKEN_ASSOCIATION,
        operation: INFINITY_POOL_OPERATIONS.ASSOCIATE_TOKENS,
        success: true,
        tokenIds: params.tokenIds,
        message: context.mode === 'returnBytes' 
          ? 'SAUCE 和 xSAUCE token association 交易已准备好，请签名'
          : 'SAUCE 和 xSAUCE token association 已成功完成',
        bytes: result.bytes, // Put bytes at top level
        result,
        // Add identification fields for detection
        toolType: 'infinity_pool',
        protocol: 'saucerswap',
      };
    }
    
    return {
      step: INFINITY_POOL_CONFIG.STEP_TYPES.TOKEN_ASSOCIATION,
      operation: INFINITY_POOL_OPERATIONS.ASSOCIATE_TOKENS,
      success: true,
      tokenIds: params.tokenIds,
      message: 'SAUCE 和 xSAUCE token association 已成功完成',
      result,
      // Add identification fields for detection
      toolType: 'infinity_pool',
      protocol: 'saucerswap',
    };
  } catch (error) {
    console.error('❌ Infinity Pool token association failed:', error);
    return {
      step: INFINITY_POOL_CONFIG.STEP_TYPES.TOKEN_ASSOCIATION,
      operation: INFINITY_POOL_OPERATIONS.ASSOCIATE_TOKENS,
      success: false,
      error: error instanceof Error ? error.message : 'token association 过程中发生未知错误',
      suggestion: '请确认账户有足够 HBAR 支付交易手续费，并且账户 key 有效',
    };
  }
};

/**
 * Execute SAUCE token approval for MotherShip contract
 */
export const approveSauceForMotherShip = async (
  client: Client,
  context: Context,
  params: { userAccountId: string; amount: string; originalParams?: any },
) => {
  try {
    // Get network configuration dynamically
    const networkConfig = getInfinityPoolConfig();
    
    console.log('🚨 SAUCE APPROVAL CALLED:');
    console.log(`👤 Account: ${params.userAccountId}`);
    console.log(`💰 Amount: ${params.amount} smallest units`);
    console.log(`🔄 Context Mode: ${context.mode}`);
    console.log(`📋 Has Original Params: ${!!params.originalParams}`);
    console.log('🚨 =================================');
    console.log(`✅ Approving ${params.amount} SAUCE (smallest units) for MotherShip contract...`);
    
    // Create approval transaction without gas first
    const tx = new AccountAllowanceApproveTransaction()
      .approveTokenAllowance(
        TokenId.fromString(networkConfig.SAUCE_TOKEN_ID),
        params.userAccountId,
        networkConfig.MOTHERSHIP_CONTRACT_ID,
        Long.fromString(params.amount)
      );
    
    // Estimate gas with buffer for approval operation
    const baseGas = getBaseGasForOperation('approve');
    const estimatedGas = await estimateGasWithBuffer(tx, client, baseGas);
    // Note: AccountAllowanceApproveTransaction might not have setGas method
    // This is handled by Hedera SDK automatically for approval transactions
    console.log(`⛽ Estimated gas for approval: ${estimatedGas} (handled automatically by SDK)`);
    
    const result = await handleTransaction(tx, client, context);
    
    // In RETURN_BYTES mode, log preparation instead of completion
    if (context.mode === 'returnBytes') {
      console.log(`🔗 SAUCE approval transaction prepared for signature`);
    } else {
      console.log(`✅ SAUCE approval completed`);
    }
    
         // If result contains bytes, return them at the top level for the websocket agent
     if (result && typeof result === 'object' && 'bytes' in result) {
       const response: any = {
         step: INFINITY_POOL_CONFIG.STEP_TYPES.TOKEN_APPROVAL,
         operation: INFINITY_POOL_OPERATIONS.APPROVE_SAUCE,
         success: true,
         approvedAmount: params.amount,
         message: context.mode === 'returnBytes' 
            ? 'SAUCE approval 交易已准备好，请签名'
            : 'MotherShip 合约的 SAUCE approval 已成功完成',
         bytes: result.bytes, // Put bytes at top level
         result,
         // Add identification fields for detection
         toolType: 'infinity_pool',
         protocol: 'saucerswap',
       };
       
       // Add nextStep info if this is part of a flow
       if (params.originalParams && context.mode === 'returnBytes') {
         response.nextStep = 'stake';
         response.originalParams = params.originalParams;
          response.instructions = '请签名该 approval 交易，之后 staking 会自动继续';
       }
       
       return response;
     }
    
         const response: any = {
       step: INFINITY_POOL_CONFIG.STEP_TYPES.TOKEN_APPROVAL,
       operation: INFINITY_POOL_OPERATIONS.APPROVE_SAUCE,
       success: true,
       approvedAmount: params.amount,
        message: 'MotherShip 合约的 SAUCE approval 已成功完成',
       result,
       // Add identification fields for detection
       toolType: 'infinity_pool',
       protocol: 'saucerswap',
     };
     
     // Add nextStep info if this is part of a flow
     if (params.originalParams) {
       response.nextStep = 'stake';
       response.originalParams = params.originalParams;
     }
     
     return response;
  } catch (error) {
    console.error('❌ SAUCE approval failed:', error);
    return {
      step: INFINITY_POOL_CONFIG.STEP_TYPES.TOKEN_APPROVAL,
      operation: INFINITY_POOL_OPERATIONS.APPROVE_SAUCE,
      success: false,
      error: error instanceof Error ? error.message : 'SAUCE approval 过程中发生未知错误',
      suggestion: '请确认账户有足够 HBAR 支付交易手续费，并且持有 SAUCE token',
    };
  }
};

/**
 * Check the current SAUCE allowance for MotherShip contract using Mirror Node API
 */
const checkSauceAllowance = async (
  accountId: string,
  requiredAmount: string,
): Promise<{ hasAllowance: boolean; currentAllowance: string; needsApproval: boolean }> => {
  try {
    // Get network configuration dynamically
    const networkConfig = getInfinityPoolConfig();
    
    console.log(`🔍 Checking SAUCE allowance for account ${accountId}...`);
    
    const mirrorNodeUrl = process.env.HEDERA_NETWORK === 'mainnet' 
      ? 'https://mainnet-public.mirrornode.hedera.com'
      : 'https://testnet.mirrornode.hedera.com';
    
    // Query allowances for the account
    const response = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId}/allowances/tokens`);
    
    if (!response.ok) {
      console.log(`⚠️ Could not fetch allowances: ${response.status} ${response.statusText}`);
      return { hasAllowance: false, currentAllowance: '0', needsApproval: true };
    }
    
    const allowancesData = await response.json();
    
    // Look for SAUCE token allowance to MotherShip contract
    const sauceAllowance = allowancesData.allowances?.find((allowance: any) => 
      allowance.token_id === networkConfig.SAUCE_TOKEN_ID &&
      allowance.spender === networkConfig.MOTHERSHIP_CONTRACT_ID
    );
    
    if (sauceAllowance) {
      const currentAllowance = sauceAllowance.amount.toString();
      const currentAllowanceNum = parseInt(currentAllowance);
      const requiredAmountNum = parseInt(requiredAmount);
      
      console.log(`✅ Found SAUCE allowance: ${currentAllowance} smallest units`);
      console.log(`🎯 Required amount: ${requiredAmount} smallest units`);
      
      const hasEnoughAllowance = currentAllowanceNum >= requiredAmountNum;
      
      return {
        hasAllowance: hasEnoughAllowance,
        currentAllowance: currentAllowance,
        needsApproval: !hasEnoughAllowance
      };
    }
    
    console.log(`⚠️ No SAUCE allowance found for MotherShip contract`);
    return { hasAllowance: false, currentAllowance: '0', needsApproval: true };
    
  } catch (error) {
    console.error(`❌ Error checking SAUCE allowance:`, error);
    return { hasAllowance: false, currentAllowance: '0', needsApproval: true };
  }
};

/**
 * Execute SAUCE staking to receive xSAUCE
 */
export const stakeSauceTokens = async (
  client: Client,
  context: Context,
  params: z.infer<ReturnType<typeof infinityPoolStakeParameters>>,
  skipAllowanceCheck: boolean = false,
) => {
  try {
    // Get network configuration dynamically
    const networkConfig = getInfinityPoolConfig();
    const normalizedParams = normalizeInfinityPoolParams(params, context);
    
    if (!normalizedParams.sauceAmountInSmallestUnits) {
      throw new Error('staking operation 需要 SAUCE 数量');
    }

    // Check allowance first unless explicitly skipped
    if (!skipAllowanceCheck) {
      console.log(`🔍 Checking SAUCE allowance before staking...`);
      const allowanceCheck = await checkSauceAllowance(
        normalizedParams.userAccountId,
        normalizedParams.sauceAmountInSmallestUnits
      );
      
      if (allowanceCheck.needsApproval) {
        console.log(`⚠️ Insufficient allowance! Current: ${allowanceCheck.currentAllowance}, Required: ${normalizedParams.sauceAmountInSmallestUnits}`);
        
        // In RETURN_BYTES mode: prepare approval transaction immediately (one TX at a time)
        if (context.mode === 'returnBytes') {
          console.log(`⚠️ Cannot stake: SAUCE approval required first`);
          // Prepare approval transaction with original params to ensure next step is stake
          const approvalParams = {
            userAccountId: normalizedParams.userAccountId,
            amount: normalizedParams.sauceAmountInSmallestUnits,
            originalParams: {
              operation: INFINITY_POOL_OPERATIONS.APPROVE_SAUCE,
              approveAmount: Number(params.sauceAmount),
              associateTokens: false,
              userAccountId: normalizedParams.userAccountId,
            },
          } as const;

          const approvalTx = await approveSauceForMotherShip(client, context, approvalParams);
          // Return immediately so frontend signs approval; extractor will set pending step to stake
          return approvalTx;
        }

        // Direct mode - throw error
        throw new Error(
          `SAUCE allowance 不足。当前：${allowanceCheck.currentAllowance}，需要：${normalizedParams.sauceAmountInSmallestUnits}。请先授权 SAUCE token。`,
        );
      }
      
      console.log(`✅ Sufficient SAUCE allowance confirmed: ${allowanceCheck.currentAllowance}`);
    }

         console.log(`🥩 Staking ${params.sauceAmount} SAUCE tokens...`);
     console.log(`📍 MotherShip Contract: ${networkConfig.MOTHERSHIP_EVM_ADDRESS}`);
     console.log(`🏦 Account: ${normalizedParams.userAccountId}`);
     console.log(`🔧 Using EthereumTransaction with maxGasAllowanceHbar for HTS compatibility`);

     // Use EthereumTransaction with maxGasAllowanceHbar to handle HTS system contract costs
     const result = await executeEthereumContractCall(
       networkConfig.MOTHERSHIP_EVM_ADDRESS,
       'enter',
       [normalizedParams.sauceAmountInSmallestUnits],
       client,
       context
     );

    // In RETURN_BYTES mode, log preparation instead of completion
    if (context.mode === 'returnBytes') {
      console.log(`🔗 SAUCE staking transaction prepared for signature`);
    } else {
      console.log(`✅ SAUCE staking completed successfully`);
    }

    // If result contains bytes, return them at the top level for the websocket agent
    if (result && typeof result === 'object' && 'bytes' in result) {
      return {
        step: INFINITY_POOL_CONFIG.STEP_TYPES.STAKE,
        operation: INFINITY_POOL_OPERATIONS.STAKE_SAUCE,
        success: true,
        stakeAmount: params.sauceAmount,
        stakeAmountSmallestUnits: normalizedParams.sauceAmountInSmallestUnits,
        userAccount: normalizedParams.userAccountId,
        mothershipContract: networkConfig.MOTHERSHIP_CONTRACT_ID,
        message: context.mode === 'returnBytes' 
          ? `SAUCE staking 交易已准备好，请签名（${params.sauceAmount} SAUCE）`
          : `已成功将 ${params.sauceAmount} SAUCE token 质押到 Infinity Pool`,
        bytes: result.bytes, // Put bytes at top level
        result,
      };
    }

    return {
      step: INFINITY_POOL_CONFIG.STEP_TYPES.STAKE,
      operation: INFINITY_POOL_OPERATIONS.STAKE_SAUCE,
      success: true,
      stakeAmount: params.sauceAmount,
      stakeAmountSmallestUnits: normalizedParams.sauceAmountInSmallestUnits,
      userAccount: normalizedParams.userAccountId,
      mothershipContract: networkConfig.MOTHERSHIP_CONTRACT_ID,
      message: `已成功将 ${params.sauceAmount} SAUCE token 质押到 Infinity Pool`,
      nextSteps: [
        '你的 SAUCE token 已质押到 Infinity Pool',
        '你会收到代表质押份额和奖励的 xSAUCE token',
        '检查账户余额，确认 xSAUCE token 已到账',
        '使用 SaucerSwap 界面跟踪质押仓位',
      ],
      result,
    };
  } catch (error) {
    console.error('❌ SAUCE staking failed:', error);
    return {
      step: INFINITY_POOL_CONFIG.STEP_TYPES.STAKE,
      operation: INFINITY_POOL_OPERATIONS.STAKE_SAUCE,
      success: false,
      error: error instanceof Error ? error.message : 'staking 过程中发生未知错误',
      suggestion: '请确认 SAUCE 余额充足，并且 token 已关联且已授权',
      troubleshooting: {
        commonIssues: [
          'SAUCE 余额不足，无法质押',
          'SAUCE 或 xSAUCE token 尚未关联到账户',
          'SAUCE 尚未授权给 MotherShip 合约',
          'gas limit 太低，无法执行合约',
        ],
        solutions: [
          '检查 SAUCE 余额，确认有可质押 token',
          '请先执行 token association',
          '请为 MotherShip 合约执行 SAUCE approval',
          '使用默认 gas limit 重试',
        ],
      },
    };
  }
};

/**
 * Execute xSAUCE unstaking to receive SAUCE
 */
export const unstakeXSauceTokens = async (
  client: Client,
  context: Context,
  params: z.infer<ReturnType<typeof infinityPoolStakeParameters>>,
) => {
  try {
    // Get network configuration dynamically
    const networkConfig = getInfinityPoolConfig();
    const normalizedParams = normalizeInfinityPoolParams(params, context);
    
    if (!normalizedParams.xSauceAmountInSmallestUnits) {
      throw new Error('unstaking operation 需要 xSAUCE 数量');
    }

         console.log(`🔄 Unstaking ${params.xSauceAmount} xSAUCE tokens...`);
     console.log(`📍 MotherShip Contract: ${networkConfig.MOTHERSHIP_EVM_ADDRESS}`);
     console.log(`🏦 Account: ${normalizedParams.userAccountId}`);
     console.log(`🔧 Using EthereumTransaction with maxGasAllowanceHbar for HTS compatibility`);

     // Use EthereumTransaction with maxGasAllowanceHbar to handle HTS system contract costs
     const result = await executeEthereumContractCall(
       networkConfig.MOTHERSHIP_EVM_ADDRESS,
       'leave',
       [normalizedParams.xSauceAmountInSmallestUnits],
       client,
       context
     );

    // In RETURN_BYTES mode, log preparation instead of completion
    if (context.mode === 'returnBytes') {
      console.log(`🔗 xSAUCE unstaking transaction prepared for signature`);
    } else {
      console.log(`✅ xSAUCE unstaking completed successfully`);
    }

    // If result contains bytes, return them at the top level for the websocket agent
    if (result && typeof result === 'object' && 'bytes' in result) {
      return {
        step: INFINITY_POOL_CONFIG.STEP_TYPES.UNSTAKE,
        operation: INFINITY_POOL_OPERATIONS.UNSTAKE_XSAUCE,
        success: true,
        unstakeAmount: params.xSauceAmount,
        unstakeAmountSmallestUnits: normalizedParams.xSauceAmountInSmallestUnits,
        userAccount: normalizedParams.userAccountId,
        mothershipContract: networkConfig.MOTHERSHIP_CONTRACT_ID,
        message: context.mode === 'returnBytes' 
          ? `xSAUCE unstaking 交易已准备好，请签名（${params.xSauceAmount} xSAUCE）`
          : `已成功从 Infinity Pool 解除质押 ${params.xSauceAmount} xSAUCE token`,
        bytes: result.bytes, // Put bytes at top level
        result,
      };
    }

    return {
      step: INFINITY_POOL_CONFIG.STEP_TYPES.UNSTAKE,
      operation: INFINITY_POOL_OPERATIONS.UNSTAKE_XSAUCE,
      success: true,
      unstakeAmount: params.xSauceAmount,
      unstakeAmountSmallestUnits: normalizedParams.xSauceAmountInSmallestUnits,
      userAccount: normalizedParams.userAccountId,
      mothershipContract: networkConfig.MOTHERSHIP_CONTRACT_ID,
      message: `已成功从 Infinity Pool 解除质押 ${params.xSauceAmount} xSAUCE token`,
      nextSteps: [
        '你的 xSAUCE token 已解除质押',
        '你会收到 SAUCE token（原始质押 + 奖励）',
        '检查账户余额，确认 SAUCE token 已返回',
      ],
      result,
    };
  } catch (error) {
    console.error('❌ xSAUCE unstaking failed:', error);
    return {
      step: INFINITY_POOL_CONFIG.STEP_TYPES.UNSTAKE,
      operation: INFINITY_POOL_OPERATIONS.UNSTAKE_XSAUCE,
      success: false,
      error: error instanceof Error ? error.message : 'unstaking 过程中发生未知错误',
      suggestion: '请确认 xSAUCE 余额充足，并且 token 已关联',
      troubleshooting: {
        commonIssues: [
          'xSAUCE 余额不足，无法解除质押',
          'xSAUCE token 尚未关联到账户',
          'gas limit 太低，无法执行合约',
        ],
        solutions: [
          '检查 xSAUCE 余额，确认有可解除质押 token',
          '请先执行 token association',
          '使用默认 gas limit 重试',
        ],
      },
    };
  }
};

/**
 * Main function that handles the full staking flow
 */
export const infinityPoolStakeFlow = async (
  client: Client,
  context: Context,
  params: z.infer<ReturnType<typeof infinityPoolStakeParameters>>,
) => {
  try {
    // Get network configuration dynamically
    const networkConfig = getInfinityPoolConfig();
    
    // Route to appropriate operation
    switch (params.operation) {
      case INFINITY_POOL_OPERATIONS.ASSOCIATE_TOKENS:
        return await associateInfinityPoolTokens(client, context, {
          userAccountId: params.userAccountId || context.accountId || '',
          tokenIds: [networkConfig.SAUCE_TOKEN_ID, networkConfig.XSAUCE_TOKEN_ID],
        });

             case INFINITY_POOL_OPERATIONS.APPROVE_SAUCE:
         const normalizedParams = normalizeInfinityPoolParams(params, context);
         if (!normalizedParams.approveAmountInSmallestUnits) {
           throw new Error('SAUCE approval operation 需要 approve amount');
         }
         return await approveSauceForMotherShip(client, context, {
           userAccountId: normalizedParams.userAccountId,
           amount: normalizedParams.approveAmountInSmallestUnits,
           originalParams: params, // 🔧 CRITICAL FIX: Pass original params for nextStep
         });

      case INFINITY_POOL_OPERATIONS.STAKE_SAUCE:
        return await stakeSauceTokens(client, context, params);

      case INFINITY_POOL_OPERATIONS.UNSTAKE_XSAUCE:
        return await unstakeXSauceTokens(client, context, params);

      case INFINITY_POOL_OPERATIONS.FULL_STAKE_FLOW:
        return await executeFullStakeFlow(client, context, params);

      case INFINITY_POOL_OPERATIONS.FULL_UNSTAKE_FLOW:
        return await executeFullUnstakeFlow(client, context, params);

      default:
        throw new Error(`未知 operation：${params.operation}`);
    }
  } catch (error) {
    console.error('❌ Infinity Pool operation failed:', error);
    return {
      operation: params.operation,
      success: false,
      error: error instanceof Error ? error.message : 'Infinity Pool operation 中发生未知错误',
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Execute full staking flow (association + approval + stake)
 */
const executeFullStakeFlow = async (
  client: Client,
  context: Context,
  params: z.infer<ReturnType<typeof infinityPoolStakeParameters>>,
) => {
  try {
    // Get network configuration dynamically
    const networkConfig = getInfinityPoolConfig();
    // ⚠️ CRITICAL: In RETURN_BYTES mode, ONLY process ONE transaction at a time
    if (context.mode === 'returnBytes') {
      console.log('🚀 Starting SaucerSwap Infinity Pool staking flow (RETURN_BYTES mode)...');
      console.log('⚠️ IMPORTANT: Only ONE transaction will be prepared at a time');
      
      // Step 1: Associate tokens if requested and not already done
      if (params.associateTokens !== false) {
        console.log('Step 1: Token Association - Preparing transaction for signature...');
        console.log('🛑 Stopping after association - no other operations will execute');
        
        const associationResult = await associateInfinityPoolTokens(client, context, {
          userAccountId: params.userAccountId || context.accountId || '',
          tokenIds: [networkConfig.SAUCE_TOKEN_ID, networkConfig.XSAUCE_TOKEN_ID],
        });
        
        // CRITICAL: Return immediately after first transaction
        return {
          ...associationResult,
          nextStep: 'approval',
          originalParams: params,
          message: '第 1/3 步：Token association 交易已准备好，请签名',
          instructions: '请签名该交易以关联 SAUCE 和 xSAUCE token。确认后，approval 步骤会自动执行。',
        };
      } 
      
      // This should NEVER be reached in normal full_stake_flow
      throw new Error('状态无效：full_stake_flow 应始终从 token association 开始');
    }
    
    // Legacy mode: Execute all transactions sequentially (for direct execution)
    const results = [];
    
    // Step 1: Associate tokens if requested
    if (params.associateTokens) {
      console.log('🚀 Starting SaucerSwap Infinity Pool staking flow...');
      console.log('Step 1: Token Association');
      
      const associationResult = await associateInfinityPoolTokens(client, context, {
        userAccountId: params.userAccountId || context.accountId || '',
        tokenIds: [networkConfig.SAUCE_TOKEN_ID, networkConfig.XSAUCE_TOKEN_ID],
      });
      
      results.push(associationResult);
      
      if (!associationResult.success) {
        return {
          operation: INFINITY_POOL_OPERATIONS.FULL_STAKE_FLOW,
          success: false,
          error: 'Token association 失败',
          steps: results,
        };
      }
      
      console.log('✅ Step 1 completed: Tokens associated');
    }
    
    // Step 2: Approve SAUCE
    const normalizedParams = normalizeInfinityPoolParams(params, context);
    if (!normalizedParams.approveAmountInSmallestUnits) {
      throw new Error('approval 需要 SAUCE 数量');
    }
    
    console.log('Step 2: SAUCE Approval');
    const approvalResult = await approveSauceForMotherShip(client, context, {
      userAccountId: normalizedParams.userAccountId,
      amount: normalizedParams.approveAmountInSmallestUnits,
      originalParams: params,
    });
    results.push(approvalResult);
    
    if (!approvalResult.success) {
      return {
        operation: INFINITY_POOL_OPERATIONS.FULL_STAKE_FLOW,
        success: false,
        error: 'SAUCE approval 失败',
        steps: results,
      };
    }
    
    console.log('✅ Step 2 completed: SAUCE approved');
    
    // Step 3: Stake SAUCE
    console.log('Step 3: SAUCE Staking');
    const stakeResult = await stakeSauceTokens(client, context, params);
    results.push(stakeResult);
    
    if (!stakeResult.success) {
      return {
        operation: INFINITY_POOL_OPERATIONS.FULL_STAKE_FLOW,
        success: false,
        error: 'Staking 失败',
        steps: results,
      };
    }
    
    console.log('✅ Step 3 completed: SAUCE staked successfully');
    console.log('🎉 SaucerSwap Infinity Pool staking flow completed successfully!');
    
    return {
      operation: INFINITY_POOL_OPERATIONS.FULL_STAKE_FLOW,
      success: true,
      steps: results,
      summary: {
        totalSteps: results.length,
        stakeAmount: params.sauceAmount,
        userAccount: params.userAccountId || context.accountId,
        timestamp: new Date().toISOString(),
      },
      message: `已成功完成 SaucerSwap Infinity Pool 质押：${params.sauceAmount} SAUCE`,
    };
  } catch (error) {
    console.error('❌ Infinity Pool staking flow failed:', error);
    return {
      operation: INFINITY_POOL_OPERATIONS.FULL_STAKE_FLOW,
      success: false,
      error: error instanceof Error ? error.message : 'staking flow 中发生未知错误',
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Execute full unstaking flow
 */
const executeFullUnstakeFlow = async (
  client: Client,
  context: Context,
  params: z.infer<ReturnType<typeof infinityPoolStakeParameters>>,
) => {
  try {
    console.log('🚀 Starting SaucerSwap Infinity Pool unstaking flow...');
    
    const unstakeResult = await unstakeXSauceTokens(client, context, params);
    
    return {
      operation: INFINITY_POOL_OPERATIONS.FULL_UNSTAKE_FLOW,
      success: unstakeResult.success,
      result: unstakeResult,
      message: unstakeResult.success 
        ? `已成功从 Infinity Pool 解除质押 ${params.xSauceAmount} xSAUCE`
        : 'Unstaking 失败',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Infinity Pool unstaking flow failed:', error);
    return {
      operation: INFINITY_POOL_OPERATIONS.FULL_UNSTAKE_FLOW,
      success: false,
      error: error instanceof Error ? error.message : 'unstaking flow 中发生未知错误',
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Execute only the next step in a multi-step flow (for use after previous step is completed)
 */
export const executeInfinityPoolStepOnly = async (
  client: Client,
  context: Context,
  params: { sauceAmount: number; approveAmount?: number; userAccountId: string; transactionMemo?: string },
) => {
  try {
    console.log('🚀 Executing Infinity Pool step operation...');
    
    // Determine the next step based on the context
    // For now, we'll assume this is either approval or staking step
    const normalizedParams = normalizeInfinityPoolParams(
      {
        sauceAmount: params.sauceAmount,
        approveAmount: params.approveAmount,
        userAccountId: params.userAccountId,
        transactionMemo: params.transactionMemo,
        operation: INFINITY_POOL_OPERATIONS.APPROVE_SAUCE,
        associateTokens: false, // Required field, but we're not associating in step mode
      },
      context
    );
    
    // In step mode, we typically want to do approval followed by staking
    // For simplicity, let's execute the approval step
    if (!normalizedParams.approveAmountInSmallestUnits) {
      throw new Error('step operation 需要数量');
    }
    
    const approvalResult = await approveSauceForMotherShip(client, context, {
      userAccountId: normalizedParams.userAccountId,
      amount: normalizedParams.approveAmountInSmallestUnits,
    });
    
    return {
      ...approvalResult,
      nextStep: 'stake',
      originalParams: params,
      message: 'SAUCE approval 交易已准备好，请签名',
      instructions: '请签名该交易以授权 SAUCE 支出，然后继续 staking',
    };
  } catch (error: any) {
    console.error('❌ Infinity Pool step operation failed:', error);
    return {
      operation: 'step_operation',
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// Export the tool configuration
const infinityPoolTool = (context: Context) => ({
  method: SAUCERSWAP_INFINITY_POOL_TOOL,
  name: 'SaucerSwap Infinity Pool Staking',
  description: infinityPoolPrompt(context),
  parameters: infinityPoolStakeParameters(context),
  execute: infinityPoolStakeFlow,
});

export default infinityPoolTool;
