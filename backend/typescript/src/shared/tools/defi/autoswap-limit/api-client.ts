// AutoSwapLimit Contract Client - Direct contract interaction for limit orders
// Based on AutoSwapLimit contract for creating and managing limit orders

import { ContractId, ContractExecuteTransaction, ContractFunctionParameters, Hbar, AccountId, Client, ContractCallQuery, Long, HbarUnit } from '@hashgraph/sdk';
import type { Context } from '../../../configuration';
import type { Tool } from '../../../tools';
import { handleTransaction } from '../../../strategies/tx-mode-strategy';
import { z } from 'zod';

// ===== Contract Configuration =====
export const AUTOSWAP_LIMIT_CONTRACTS = {
  mainnet: {
    CONTRACT_ID: "0.0.6506134",           // AutoSwapLimit mainnet
    CONTRACT_EVM: "0x0000000000000000000000000000000000634696",
    SAUCE_TOKEN_ID: "0.0.731861",         // SAUCE TOKEN mainnet
    SAUCE_EVM: "0x00000000000000000000000000000000000b2ad5",
    WHBAR_TOKEN_ID: "0.0.1456986",        // WHBAR TOKEN mainnet
    WHBAR_EVM: "0x0000000000000000000000000000000000163a5a",
  },
  testnet: {
    CONTRACT_ID: "0.0.6506134",           // AutoSwapLimit testnet (same as mainnet for now)
    CONTRACT_EVM: "0x0000000000000000000000000000000000634696",
    SAUCE_TOKEN_ID: "0.0.1183558",        // SAUCE TOKEN testnet
    SAUCE_EVM: "0x0000000000000000000000000000000000120f46",
    WHBAR_TOKEN_ID: "0.0.15058",          // WHBAR TOKEN testnet
    WHBAR_EVM: "0x0000000000000000000000000000000000003aba",
  },
} as const;

// ===== Tool Configuration =====
export const AUTOSWAP_LIMIT_TOOL = 'autoswap_limit_tool';

export const AUTOSWAP_LIMIT_OPERATIONS = {
  CREATE_SWAP_ORDER: 'create_swap_order',
  GET_ORDER_DETAILS: 'get_order_details',
  GET_CONTRACT_CONFIG: 'get_contract_config',
  GET_ROUTER_INFO: 'get_router_info',
  GET_CONTRACT_BALANCE: 'get_contract_balance',
  GET_NEXT_ORDER_ID: 'get_next_order_id',
} as const;

export const AUTOSWAP_LIMIT_CONFIG = {
  DEFAULT_GAS_LIMIT: 1_000_000,          // 1M gas for order creation
  QUERY_GAS_LIMIT: 200_000,              // 200K gas for queries
  DEFAULT_EXPIRATION_HOURS: 24,          // 24 hours default expiration
  MIN_ORDER_AMOUNT_HBAR: 0.1,            // Minimum 0.1 HBAR per order
} as const;

// ===== Token Mappings =====
export const TOKEN_MAPPINGS = {
  mainnet: {
    'SAUCE': '0.0.731861',
    'WHBAR': '0.0.1456986',
    'HBAR': 'HBAR',
  },
  testnet: {
    'SAUCE': '0.0.1183558',
    'WHBAR': '0.0.15058',
    'HBAR': 'HBAR',
  },
} as const;

// ===== Parameters Schema =====
export const autoswapLimitParameters = (context: Context = {}) => {
  return z.object({
    operation: z.enum([
      AUTOSWAP_LIMIT_OPERATIONS.CREATE_SWAP_ORDER,
      AUTOSWAP_LIMIT_OPERATIONS.GET_ORDER_DETAILS,
      AUTOSWAP_LIMIT_OPERATIONS.GET_CONTRACT_CONFIG,
      AUTOSWAP_LIMIT_OPERATIONS.GET_ROUTER_INFO,
      AUTOSWAP_LIMIT_OPERATIONS.GET_CONTRACT_BALANCE,
      AUTOSWAP_LIMIT_OPERATIONS.GET_NEXT_ORDER_ID,
    ]).describe('要执行的 AutoSwapLimit operation'),

    // Order creation parameters
    tokenOut: z.string().optional().describe(
      '目标 token ID 或 symbol（例如 "SAUCE", "0.0.731861"）。create_swap_order 必需'
    ),

    amountIn: z.number().optional().describe(
      '限价单投入的 HBAR 数量（HBAR 单位，例如 0.5 表示 0.5 HBAR）。create_swap_order 必需'
    ),

    minAmountOut: z.string().optional().describe(
      '最少接收 token 数量（wei/最小单位）。create_swap_order 必需'
    ),

    triggerPrice: z.string().optional().describe(
      '触发价格（wei/最小单位）。市场价格达到该水平时订单执行。create_swap_order 必需'
    ),

    expirationHours: z.number().min(1).max(168).default(24).describe(
      '订单过期时间，单位小时（1-168 小时，默认 24）。用于 create_swap_order'
    ),

    // Query parameters
    orderId: z.number().optional().describe(
      '要查询详情的订单 ID。get_order_details 必需'
    ),

    network: z.enum(['mainnet', 'testnet']).default(
      (process.env.HEDERA_NETWORK as 'mainnet' | 'testnet') || 'mainnet'
    ).describe(
      '执行所在网络（默认使用 .env 中的 HEDERA_NETWORK）'
    ),

    userAccountId: z.string().optional().describe(
      'operation 使用的用户账户 ID。未提供时使用 context.accountId'
    ),
  });
};

// ===== Result Interfaces =====
interface OrderCreationSuccess {
  success: true;
  operation: string;
  network: string;
  timestamp: string;
  order: {
    orderId: number;
    tokenOut: string;
    tokenOutSymbol: string;
    amountIn: string;
    minAmountOut: string;
    triggerPrice: string;
    expirationTime: number;
    owner: string;
    isActive: boolean;
    isExecuted: boolean;
  };
  contract: {
    id: string;
    evmAddress: string;
  };
  source: string;
  bytes?: any; // For WebSocket agent transaction bytes
  result?: any; // For transaction result
  message?: string; // For user feedback
}

interface QuerySuccess {
  success: true;
  operation: string;
  network: string;
  timestamp: string;
  data: any;
  contract: {
    id: string;
    evmAddress: string;
  };
  source: string;
}

interface AutoSwapLimitError {
  success: false;
  error: string;
  operation: string;
  timestamp: string;
  troubleshooting: {
    issue: string;
    possible_causes: string[];
    next_steps: string[];
  };
  contractInfo: {
    contract_id: string;
    network: string;
  };
}

type AutoSwapLimitResult = OrderCreationSuccess | QuerySuccess | AutoSwapLimitError;

/**
 * Convert token symbol to token ID based on network
 */
function getTokenIdFromSymbol(symbol: string, network: 'mainnet' | 'testnet'): string {
  const normalizedSymbol = symbol.toUpperCase();
  const networkTokens = TOKEN_MAPPINGS[network] as { [key: string]: string };

  if (networkTokens[normalizedSymbol]) {
    return networkTokens[normalizedSymbol];
  }

  // If not found in mappings, assume it's already a token ID
  return symbol;
}

/**
 * Convert token symbol/ID to correct EVM address using contract configuration
 */
function getTokenEvmAddress(tokenIdentifier: string, network: 'mainnet' | 'testnet'): string {
  const networkConfig = AUTOSWAP_LIMIT_CONTRACTS[network];

  // Handle token symbols
  const normalizedSymbol = tokenIdentifier.toUpperCase();
  switch (normalizedSymbol) {
    case 'SAUCE':
      return networkConfig.SAUCE_EVM;
    case 'WHBAR':
    case 'HBAR':
      return networkConfig.WHBAR_EVM;
    default:
      // If it's already an EVM address, return as-is
      if (tokenIdentifier.startsWith('0x')) {
        return tokenIdentifier;
      }
      // If it's a Hedera token ID, convert to EVM address
      try {
        const accountId = AccountId.fromString(tokenIdentifier);
        return `0x${accountId.toSolidityAddress()}`;
      } catch {
        // If conversion fails, assume it's already a valid address
        return tokenIdentifier;
      }
  }
}

/**
 * Get token symbol from token ID
 */
function getTokenSymbolFromId(tokenId: string, network: 'mainnet' | 'testnet'): string {
  const networkTokens = TOKEN_MAPPINGS[network] as { [key: string]: string };

  for (const [symbol, id] of Object.entries(networkTokens)) {
    if (id === tokenId) {
      return symbol;
    }
  }

  return tokenId; // Return token ID if symbol not found
}

/**
 * Main AutoSwapLimit function
 */
export async function getAutoSwapLimitQuery(
  client: Client,
  context: Context,
  params: z.infer<ReturnType<typeof autoswapLimitParameters>>
): Promise<AutoSwapLimitResult> {
  try {
    console.log(`🎯 AutoSwapLimit - ${params.operation} on ${params.network}`);
    // Hard-guard: if this function is invoked with limit-order-like user intent, prevent swap tool detours
    if (context && (context as any).forceLimitOrder === true) {
      if (params.operation !== AUTOSWAP_LIMIT_OPERATIONS.CREATE_SWAP_ORDER) {
        console.log('⚠️ Forcing create_swap_order due to limit-order intent');
        (params as any).operation = AUTOSWAP_LIMIT_OPERATIONS.CREATE_SWAP_ORDER;
      }
    }

    // Parameter validation
    const validation = validateAutoSwapLimitParameters(params);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error!,
        operation: params.operation,
        timestamp: new Date().toISOString(),
        troubleshooting: {
          issue: '参数无效',
          possible_causes: [
            '创建限价单缺少必需参数',
            'token 格式无效（使用 "SAUCE" 或 token ID）',
            '数量无效（amountIn 使用 HBAR，minAmountOut/triggerPrice 使用 wei）',
            '参数不符合已验证的测试模式'
          ],
          next_steps: [
            '提供 tokenOut（例如 SAUCE token 使用 "SAUCE"）',
            '使用 HBAR 单位设置 amountIn（例如 0.2 表示 0.2 HBAR）',
            '使用 wei 设置 minAmountOut（最小值可用 "1"）',
            '使用 wei 设置 triggerPrice（极低触发价可用 "1"）',
            '已验证测试示例：tokenOut="SAUCE", amountIn=0.2, minAmountOut="1", triggerPrice="1"'
          ]
        },
        contractInfo: {
          contract_id: AUTOSWAP_LIMIT_CONTRACTS[params.network].CONTRACT_ID,
          network: params.network,
        }
      };
    }

    // Get network configuration
    const networkConfig = AUTOSWAP_LIMIT_CONTRACTS[params.network];
    const userAccountId = params.userAccountId || context.accountId;

    if (!userAccountId) {
      throw new Error('必须在参数或上下文中提供用户账户 ID');
    }

    console.log(`📍 Contract: ${networkConfig.CONTRACT_ID}`);
    console.log(`🏦 Account: ${userAccountId}`);

    // Execute operation based on type
    switch (params.operation) {
      case AUTOSWAP_LIMIT_OPERATIONS.CREATE_SWAP_ORDER:
        return await createSwapOrder(client, context, params, networkConfig, userAccountId);

      case AUTOSWAP_LIMIT_OPERATIONS.GET_ORDER_DETAILS:
        return await getOrderDetails(client, context, params, networkConfig);

      case AUTOSWAP_LIMIT_OPERATIONS.GET_CONTRACT_CONFIG:
        return await getContractConfig(client, context, params, networkConfig);

      case AUTOSWAP_LIMIT_OPERATIONS.GET_ROUTER_INFO:
        return await getRouterInfo(client, context, params, networkConfig);

      case AUTOSWAP_LIMIT_OPERATIONS.GET_CONTRACT_BALANCE:
        return await getContractBalance(client, context, params, networkConfig);

      case AUTOSWAP_LIMIT_OPERATIONS.GET_NEXT_ORDER_ID:
        return await getNextOrderId(client, context, params, networkConfig);

      default:
        throw new Error(`不支持的 operation：${params.operation}`);
    }

  } catch (error: any) {
    console.error('❌ AutoSwapLimit error:', error);

    return {
      success: false,
      error: `AutoSwapLimit operation 出错：${error.message}`,
      operation: params.operation,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        issue: '合约交互失败',
        possible_causes: [
          '网络连接异常',
          '合约参数无效',
          'HBAR 余额不足',
          '当前网络上合约不可用',
          '账户配置不完整'
        ],
        next_steps: [
          '检查互联网连接',
          '确认合约已部署在当前网络',
          '确认账户 HBAR 余额充足',
          '确认参数值在有效范围内',
          '更换参数后重试'
        ]
      },
      contractInfo: {
        contract_id: AUTOSWAP_LIMIT_CONTRACTS[params.network].CONTRACT_ID,
        network: params.network,
      }
    };
  }
}

// ===== Helper Functions =====
function validateAutoSwapLimitParameters(params: any): { valid: boolean; error?: string } {
  // Check operation-specific parameter requirements
  if (params.operation === AUTOSWAP_LIMIT_OPERATIONS.CREATE_SWAP_ORDER) {
    if (!params.tokenOut) {
      return { valid: false, error: 'create_swap_order operation 需要 tokenOut（例如 "SAUCE", "0.0.731861"）' };
    }
    if (!params.amountIn || params.amountIn <= 0) {
      return { valid: false, error: 'create_swap_order operation 需要 amountIn，且必须大于 0（例如 0.5 表示 0.5 HBAR）' };
    }
    // Make minAmountOut and triggerPrice more flexible - allow "1" for ultra-conservative orders
    if (params.minAmountOut === undefined || params.minAmountOut === null || params.minAmountOut === '') {
      return { valid: false, error: 'create_swap_order operation 需要 minAmountOut（最小数量可用 "1"）' };
    }
    if (params.triggerPrice === undefined || params.triggerPrice === null || params.triggerPrice === '') {
      return { valid: false, error: 'create_swap_order operation 需要 triggerPrice（极低触发价可用 "1"）' };
    }
    // More flexible minimum amount check
    if (params.amountIn < 0.1) { // Reduced from 0.1 to allow smaller test amounts
      return { valid: false, error: `真实订单的 amountIn 至少需要 0.1 HBAR（当前：${params.amountIn} HBAR）` };
    }

    // Validate that numeric strings are valid
    try {
      const minAmountOutNum = BigInt(params.minAmountOut);
      const triggerPriceNum = BigInt(params.triggerPrice);
      if (minAmountOutNum < 0n || triggerPriceNum < 0n) {
        return { valid: false, error: 'minAmountOut 和 triggerPrice 必须是 wei 格式的正数' };
      }
    } catch {
      return { valid: false, error: 'minAmountOut 和 triggerPrice 必须是有效 wei 格式数字字符串（例如 "1", "1000"）' };
    }
  }

  if (params.operation === AUTOSWAP_LIMIT_OPERATIONS.GET_ORDER_DETAILS) {
    if (params.orderId === undefined || params.orderId === null) {
      return { valid: false, error: 'get_order_details operation 需要 orderId' };
    }
  }

  return { valid: true };
}

/**
 * Create a new limit order - Following the exact pattern from AutoSwapLimit.swapFlow.test.ts
 */
async function createSwapOrder(
  client: Client,
  context: Context,
  params: any,
  networkConfig: any,
  userAccountId: string
): Promise<OrderCreationSuccess> {
  try {
    // Convert token symbol to token ID and get EVM address using the correct method
    const tokenId = getTokenIdFromSymbol(params.tokenOut, params.network);
    const tokenEvmAddress = getTokenEvmAddress(params.tokenOut, params.network);
    const tokenSymbol = getTokenSymbolFromId(tokenId, params.network);

    console.log(`🎯 Creating limit order: ${params.amountIn} HBAR → ${tokenSymbol}`);
    console.log(`📍 Token ID: ${tokenId} → EVM: ${tokenEvmAddress}`);

    // Calculate expiration time (following test pattern)
    const expirationTime = Math.floor(Date.now() / 1000) + (params.expirationHours * 3600);

    // Convert HBAR amount to Hbar object (following test pattern)
    const payableAmount = Hbar.from(params.amountIn, HbarUnit.Hbar);

    console.log(`💰 HBAR Amount: ${params.amountIn} HBAR`);
    console.log(`⏰ Expiration: ${new Date(expirationTime * 1000).toISOString()}`);
    console.log(`🎯 Trigger Price: ${params.triggerPrice} wei`);
    console.log(`📊 Min Amount Out: ${params.minAmountOut} wei`);
    console.log(`🏠 Owner Account: ${userAccountId}`);

    // Get next order ID for better tracking (like the test does)
    let nextOrderId: number;
    try {
      if (context.mode !== 'returnBytes') {
        const nextOrderIdQuery = new ContractCallQuery()
          .setContractId(networkConfig.CONTRACT_ID)
          .setGas(100000)
          .setFunction("nextOrderId");

        const nextOrderIdResult = await nextOrderIdQuery.execute(client);
        nextOrderId = nextOrderIdResult.getUint256(0).toNumber();
        console.log(`📝 Next Order ID will be: ${nextOrderId}`);
      } else {
        // In RETURN_BYTES mode, estimate the order ID
        nextOrderId = Math.floor(Date.now() / 1000) % 1000000;
        console.log(`📝 Estimated Order ID: ${nextOrderId}`);
      }
    } catch {
      nextOrderId = Math.floor(Date.now() / 1000) % 1000000;
      console.log(`📝 Fallback Order ID: ${nextOrderId}`);
    }

    // Create the contract execute transaction (exactly like the test)
    const contractId = ContractId.fromString(networkConfig.CONTRACT_ID);

    const tx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(AUTOSWAP_LIMIT_CONFIG.DEFAULT_GAS_LIMIT) // Test uses 1M gas
      .setPayableAmount(payableAmount)
      .setFunction("createSwapOrder",
        new ContractFunctionParameters()
          .addAddress(tokenEvmAddress)                    // tokenOut (EVM address)
          .addUint256(Long.fromString(params.minAmountOut)) // minAmountOut
          .addUint256(Long.fromString(params.triggerPrice)) // triggerPrice
          .addUint256(expirationTime)                    // expirationTime
      );

    console.log(`🔗 Contract call: createSwapOrder on ${networkConfig.CONTRACT_ID}`);
    console.log(`⛽ Gas limit: ${AUTOSWAP_LIMIT_CONFIG.DEFAULT_GAS_LIMIT}`);
    console.log(`💰 Payable amount: ${payableAmount.toString()}`);
    console.log(`📦 Function parameters:`);
    console.log(`   tokenOut: ${tokenEvmAddress}`);
    console.log(`   minAmountOut: ${params.minAmountOut}`);
    console.log(`   triggerPrice: ${params.triggerPrice}`);
    console.log(`   expirationTime: ${expirationTime}`);

    // Execute transaction using handleTransaction (supports RETURN_BYTES mode)
    const result = await handleTransaction(tx, client, context);

    // Build successful response
    const orderResult: OrderCreationSuccess = {
      success: true,
      operation: params.operation,
      network: params.network,
      timestamp: new Date().toISOString(),
      order: {
        orderId: nextOrderId,
        tokenOut: tokenId,
        tokenOutSymbol: tokenSymbol,
        amountIn: params.amountIn.toString(),
        minAmountOut: params.minAmountOut,
        triggerPrice: params.triggerPrice,
        expirationTime,
        owner: userAccountId,
        isActive: true,
        isExecuted: false,
      },
      contract: {
        id: networkConfig.CONTRACT_ID,
        evmAddress: networkConfig.CONTRACT_EVM,
      },
      source: 'AutoSwapLimit Contract',
    };

    // If result contains bytes, add them to the response for WebSocket agent
    if (result && typeof result === 'object' && 'bytes' in result) {
      return {
        ...orderResult,
        bytes: result.bytes,
        result,
        message: context.mode === 'returnBytes'
          ? `AutoSwapLimit 订单已准备好，请签名：${params.amountIn} HBAR → ${tokenSymbol}，触发价 ${params.triggerPrice} wei`
          : `已成功创建 AutoSwapLimit 订单：${params.amountIn} HBAR → ${tokenSymbol}`,
      };
    }

    return {
      ...orderResult,
      result,
      message: `已成功创建 AutoSwapLimit 订单：${params.amountIn} HBAR → ${tokenSymbol}`,
    };

  } catch (error: any) {
    console.error('❌ Error creating swap order:', error);
    throw error;
  }
}

/**
 * Get order details
 */
async function getOrderDetails(
  client: Client,
  context: Context,
  params: any,
  networkConfig: any
): Promise<QuerySuccess> {
  try {
    console.log(`📋 Getting order details for ID: ${params.orderId}`);

    // In RETURN_BYTES mode, we can't query contract directly
    // Return a placeholder response
    if (context.mode === 'returnBytes') {
      return {
        success: true,
        operation: params.operation,
        network: params.network,
        timestamp: new Date().toISOString(),
        data: {
          orderId: params.orderId,
          message: 'RETURN_BYTES 模式下无法查询订单详情。请在支持直接查询的环境中使用。',
          note: '该 operation 需要直接访问合约，WebSocket 模式不可用'
        },
        contract: {
          id: networkConfig.CONTRACT_ID,
          evmAddress: networkConfig.CONTRACT_EVM,
        },
        source: 'AutoSwapLimit Contract',
      };
    }

    const contractId = ContractId.fromString(networkConfig.CONTRACT_ID);

    const query = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(AUTOSWAP_LIMIT_CONFIG.QUERY_GAS_LIMIT)
      .setFunction("getOrderDetails",
        new ContractFunctionParameters().addUint256(params.orderId)
      );

    const result = await query.execute(client);

    const orderData = {
      tokenOut: result.getAddress(0),
      amountIn: result.getUint256(1).toString(),
      minAmountOut: result.getUint256(2).toString(),
      triggerPrice: result.getUint256(3).toString(),
      owner: result.getAddress(4),
      isActive: result.getBool(5),
      isExecuted: result.getBool(7),
    };

    return {
      success: true,
      operation: params.operation,
      network: params.network,
      timestamp: new Date().toISOString(),
      data: {
        orderId: params.orderId,
        ...orderData,
        amountInHBAR: Hbar.fromTinybars(orderData.amountIn).toString(),
      },
      contract: {
        id: networkConfig.CONTRACT_ID,
        evmAddress: networkConfig.CONTRACT_EVM,
      },
      source: 'AutoSwapLimit Contract',
    };

  } catch (error: any) {
    console.error('❌ Error getting order details:', error);
    throw error;
  }
}

/**
 * Get contract configuration
 */
async function getContractConfig(
  client: Client,
  context: Context,
  params: any,
  networkConfig: any
): Promise<QuerySuccess> {
  try {
    console.log(`⚙️ Getting contract configuration`);

    // In RETURN_BYTES mode, we can't query contract directly
    // Return a placeholder response
    if (context.mode === 'returnBytes') {
      return {
        success: true,
        operation: params.operation,
        network: params.network,
        timestamp: new Date().toISOString(),
        data: {
          message: 'RETURN_BYTES 模式下无法查询合约配置。请在支持直接查询的环境中使用。',
          note: '该 operation 需要直接访问合约，WebSocket 模式不可用'
        },
        contract: {
          id: networkConfig.CONTRACT_ID,
          evmAddress: networkConfig.CONTRACT_EVM,
        },
        source: 'AutoSwapLimit Contract',
      };
    }

    const contractId = ContractId.fromString(networkConfig.CONTRACT_ID);

    const query = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(AUTOSWAP_LIMIT_CONFIG.QUERY_GAS_LIMIT)
      .setFunction("getContractConfig");

    const result = await query.execute(client);

    const configData = {
      executionFee: result.getUint256(0).toString(),
      minOrderAmount: result.getUint256(1).toString(),
      backendExecutor: result.getAddress(2),
      nextOrderId: result.getUint256(3).toString(),
    };

    return {
      success: true,
      operation: params.operation,
      network: params.network,
      timestamp: new Date().toISOString(),
      data: {
        ...configData,
        executionFeeHBAR: Hbar.fromTinybars(configData.executionFee).toString(),
        minOrderAmountHBAR: Hbar.fromTinybars(configData.minOrderAmount).toString(),
      },
      contract: {
        id: networkConfig.CONTRACT_ID,
        evmAddress: networkConfig.CONTRACT_EVM,
      },
      source: 'AutoSwapLimit Contract',
    };

  } catch (error: any) {
    console.error('❌ Error getting contract config:', error);
    throw error;
  }
}

/**
 * Get router information
 */
async function getRouterInfo(
  client: Client,
  context: Context,
  params: any,
  networkConfig: any
): Promise<QuerySuccess> {
  try {
    console.log(`🔗 Getting router information`);

    // In RETURN_BYTES mode, we can't query contract directly
    // Return a placeholder response
    if (context.mode === 'returnBytes') {
      return {
        success: true,
        operation: params.operation,
        network: params.network,
        timestamp: new Date().toISOString(),
        data: {
          message: 'RETURN_BYTES 模式下无法查询 Router 信息。请在支持直接查询的环境中使用。',
          note: '该 operation 需要直接访问合约，WebSocket 模式不可用'
        },
        contract: {
          id: networkConfig.CONTRACT_ID,
          evmAddress: networkConfig.CONTRACT_EVM,
        },
        source: 'AutoSwapLimit Contract',
      };
    }

    const contractId = ContractId.fromString(networkConfig.CONTRACT_ID);

    const query = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(AUTOSWAP_LIMIT_CONFIG.QUERY_GAS_LIMIT)
      .setFunction("getRouterInfo");

    const result = await query.execute(client);

    const routerData = {
      routerAddress: result.getAddress(0),
      whbarAddress: result.getAddress(1),
      factoryAddress: result.getAddress(2),
      thresholdTinybars: result.getUint256(3).toString(),
      thresholdHBAR: result.getUint256(4).toString(),
    };

    return {
      success: true,
      operation: params.operation,
      network: params.network,
      timestamp: new Date().toISOString(),
      data: {
        ...routerData,
        thresholdHBARFormatted: Hbar.fromTinybars(routerData.thresholdTinybars).toString(),
      },
      contract: {
        id: networkConfig.CONTRACT_ID,
        evmAddress: networkConfig.CONTRACT_EVM,
      },
      source: 'AutoSwapLimit Contract',
    };

  } catch (error: any) {
    console.error('❌ Error getting router info:', error);
    throw error;
  }
}

/**
 * Get contract balance
 */
async function getContractBalance(
  client: Client,
  context: Context,
  params: any,
  networkConfig: any
): Promise<QuerySuccess> {
  try {
    console.log(`💰 Getting contract balance`);

    // In RETURN_BYTES mode, we can't query contract directly
    // Return a placeholder response
    if (context.mode === 'returnBytes') {
      return {
        success: true,
        operation: params.operation,
        network: params.network,
        timestamp: new Date().toISOString(),
        data: {
          message: 'RETURN_BYTES 模式下无法查询合约余额。请在支持直接查询的环境中使用。',
          note: '该 operation 需要直接访问合约，WebSocket 模式不可用'
        },
        contract: {
          id: networkConfig.CONTRACT_ID,
          evmAddress: networkConfig.CONTRACT_EVM,
        },
        source: 'AutoSwapLimit Contract',
      };
    }

    const contractId = ContractId.fromString(networkConfig.CONTRACT_ID);

    const query = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(AUTOSWAP_LIMIT_CONFIG.QUERY_GAS_LIMIT)
      .setFunction("getContractBalance");

    const result = await query.execute(client);
    const balance = result.getUint256(0).toString();

    return {
      success: true,
      operation: params.operation,
      network: params.network,
      timestamp: new Date().toISOString(),
      data: {
        balance,
        balanceHBAR: Hbar.fromTinybars(balance).toString(),
      },
      contract: {
        id: networkConfig.CONTRACT_ID,
        evmAddress: networkConfig.CONTRACT_EVM,
      },
      source: 'AutoSwapLimit Contract',
    };

  } catch (error: any) {
    console.error('❌ Error getting contract balance:', error);
    throw error;
  }
}

/**
 * Get next order ID
 */
async function getNextOrderId(
  client: Client,
  context: Context,
  params: any,
  networkConfig: any
): Promise<QuerySuccess> {
  try {
    console.log(`📝 Getting next order ID`);

    // In RETURN_BYTES mode, we can't query contract directly
    // Return a placeholder response
    if (context.mode === 'returnBytes') {
      return {
        success: true,
        operation: params.operation,
        network: params.network,
        timestamp: new Date().toISOString(),
        data: {
          message: 'RETURN_BYTES 模式下无法查询下一个订单 ID。请在支持直接查询的环境中使用。',
          note: '该 operation 需要直接访问合约，WebSocket 模式不可用'
        },
        contract: {
          id: networkConfig.CONTRACT_ID,
          evmAddress: networkConfig.CONTRACT_EVM,
        },
        source: 'AutoSwapLimit Contract',
      };
    }

    const contractId = ContractId.fromString(networkConfig.CONTRACT_ID);

    const query = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(AUTOSWAP_LIMIT_CONFIG.QUERY_GAS_LIMIT)
      .setFunction("nextOrderId");

    const result = await query.execute(client);
    const nextOrderId = result.getUint256(0).toString();

    return {
      success: true,
      operation: params.operation,
      network: params.network,
      timestamp: new Date().toISOString(),
      data: {
        nextOrderId: parseInt(nextOrderId),
      },
      contract: {
        id: networkConfig.CONTRACT_ID,
        evmAddress: networkConfig.CONTRACT_EVM,
      },
      source: 'AutoSwapLimit Contract',
    };

  } catch (error: any) {
    console.error('❌ Error getting next order ID:', error);
    throw error;
  }
}

// Default tool function for toolkit integration
const autoswapLimitTool = (context: Context): Tool => ({
  method: AUTOSWAP_LIMIT_TOOL,
  name: 'AutoSwapLimit Contract Operations',
  description: `在 AutoSwapLimit 合约上创建和管理限价单，用于自动 token swap。

可用 operation:
- Create Swap Order: 创建按指定价格将 HBAR swap 为 token 的限价单
- Get Order Details: 按 ID 查询指定订单详情
- Get Contract Config: 查询合约配置（费用、最小金额等）
- Get Router Info: 查询合约使用的 router 和 token 地址
- Get Contract Balance: 查询合约当前 HBAR 余额
- Get Next Order ID: 查询下一个可用订单 ID

支持 token: SAUCE、WHBAR 和其他 Hedera token
网络: ${process.env.HEDERA_NETWORK || 'mainnet'}

示例：创建一个在 SAUCE 价格跌到 0.001 HBAR/SAUCE 时买入的限价单
参数：tokenOut="SAUCE", amountIn=0.5, minAmountOut="1", triggerPrice="1000"`,
  parameters: autoswapLimitParameters(context),
  execute: getAutoSwapLimitQuery,
});

export default autoswapLimitTool;
