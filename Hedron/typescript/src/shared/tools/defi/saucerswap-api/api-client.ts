import { z } from 'zod';
import type { Context } from '../../../configuration';
import type { Tool } from '../../../tools';
import { PromptGenerator } from '../../../utils/prompt-generator';

// SaucerSwap API configuration
export const SAUCERSWAP_API_CONFIG = {
  BASE_URL: {
    MAINNET: 'https://api.saucerswap.finance',
    TESTNET: 'https://test-api.saucerswap.finance'
  },
  ENDPOINTS: {
    GENERAL_STATS: '/stats',
    SSS_STATS: '/stats/sss',
    FARMS: '/farms',
    ACCOUNT_FARMS: '/farms/totals',
  },
  API_KEYS: {
    MAINNET: process.env.SAUCERSWAP_MAINNET_API_KEY || 'apif0ec8f54a5ebb087fb6e5fa922ba5',
    TESTNET: process.env.SAUCERSWAP_TESTNET_API_KEY || 'apidf6f836709a742d3f83b91f4375d5'
  },
  // Rate limiting configuration
  RATE_LIMIT: {
    DELAY_MS: 1000,     // 1 second between requests
    MAX_RETRIES: 3,     // Maximum retry attempts
    BACKOFF_MS: 2000,   // Initial backoff delay
    CACHE_TTL_MS: 30000 // Cache responses for 30 seconds
  }
} as const;

// Simple cache to avoid duplicate requests
const apiCache = new Map<string, { data: any; timestamp: number }>();

// Track last request time for rate limiting
let lastRequestTime = 0;

// Sleep utility function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Clear expired cache entries
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of apiCache.entries()) {
    if (now - value.timestamp > SAUCERSWAP_API_CONFIG.RATE_LIMIT.CACHE_TTL_MS) {
      apiCache.delete(key);
    }
  }
};

// Generate cache key
const getCacheKey = (operation: string, accountId?: string, network?: string) => {
  const parts = [operation];
  if (network) parts.push(network);
  if (accountId) parts.push(accountId);
  return parts.join('_');
};

// Enhanced fetch with rate limiting and retry logic
const fetchWithRetry = async (url: string, apiKey: string, maxRetries = SAUCERSWAP_API_CONFIG.RATE_LIMIT.MAX_RETRIES): Promise<Response> => {
  // Rate limiting: ensure minimum delay between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minDelay = SAUCERSWAP_API_CONFIG.RATE_LIMIT.DELAY_MS;
  
  if (timeSinceLastRequest < minDelay) {
    const sleepTime = minDelay - timeSinceLastRequest;
    console.log(`⏱️ Rate limiting: waiting ${sleepTime}ms before request`);
    await sleep(sleepTime);
  }
  
  lastRequestTime = Date.now();

  // Headers for SaucerSwap API
  const headers = {
    'Accept': 'application/json',
    'x-api-key': apiKey,
    'User-Agent': 'Hedera-Agent-Kit/1.0',
    'Cache-Control': 'no-cache'
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌐 SaucerSwap API request (attempt ${attempt + 1}/${maxRetries + 1}): ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      // If successful, return response
      if (response.ok) {
        console.log(`✅ SaucerSwap API request successful on attempt ${attempt + 1}`);
        return response;
      }

      // Handle specific error codes
      if (response.status === 403) {
        console.log(`🚫 403 Forbidden (attempt ${attempt + 1}). Invalid API key or rate limited.`);
        if (attempt < maxRetries) {
          const backoffDelay = SAUCERSWAP_API_CONFIG.RATE_LIMIT.BACKOFF_MS * Math.pow(2, attempt);
          console.log(`⏰ Backing off for ${backoffDelay}ms before retry...`);
          await sleep(backoffDelay);
          continue;
        }
      }

      if (response.status === 429) {
        console.log(`⏳ 429 Too Many Requests (attempt ${attempt + 1})`);
        if (attempt < maxRetries) {
          const backoffDelay = SAUCERSWAP_API_CONFIG.RATE_LIMIT.BACKOFF_MS * Math.pow(2, attempt);
          console.log(`⏰ Backing off for ${backoffDelay}ms before retry...`);
          await sleep(backoffDelay);
          continue;
        }
      }

      // For other errors, throw immediately
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    } catch (error) {
      console.log(`❌ Request failed (attempt ${attempt + 1}):`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      const backoffDelay = SAUCERSWAP_API_CONFIG.RATE_LIMIT.BACKOFF_MS * Math.pow(2, attempt);
      console.log(`⏰ Retrying in ${backoffDelay}ms...`);
      await sleep(backoffDelay);
    }
  }

  throw new Error('Max retries exceeded');
};

// Fetch xSAUCE balance from Hedera Mirror Node
const fetchXSauceBalance = async (accountId: string, network: string): Promise<any> => {
  const isMainnet = network === 'mainnet';
  const mirrorNodeUrl = isMainnet ? HEDERA_MIRROR_NODE_CONFIG.BASE_URL.MAINNET : HEDERA_MIRROR_NODE_CONFIG.BASE_URL.TESTNET;
  const xSauceTokenId = isMainnet ? XSAUCE_TOKEN_CONFIG.MAINNET.TOKEN_ID : XSAUCE_TOKEN_CONFIG.TESTNET.TOKEN_ID;
  
  const url = `${mirrorNodeUrl}${HEDERA_MIRROR_NODE_CONFIG.ENDPOINTS.ACCOUNT_TOKENS}/${accountId}/tokens?token.id=${xSauceTokenId}`;
  
  console.log(`🔍 Querying Mirror Node for xSAUCE balance: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Hedera-Agent-Kit/1.0'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Mirror Node HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Mirror Node response received for xSAUCE balance`);
    
    return data;
    
  } catch (error) {
    console.error('❌ Mirror Node query failed:', error);
    throw error;
  }
};

// Available API operations
export const SAUCERSWAP_API_OPERATIONS = {
  GENERAL_STATS: 'general_stats',
  SSS_STATS: 'sss_stats',
  FARMS: 'farms',
  ACCOUNT_FARMS: 'account_farms',
  INFINITY_POOL_POSITION: 'infinity_pool_position',
} as const;

// Hedera Mirror Node configuration
export const HEDERA_MIRROR_NODE_CONFIG = {
  BASE_URL: {
    MAINNET: 'https://mainnet-public.mirrornode.hedera.com',
    TESTNET: 'https://testnet.mirrornode.hedera.com'
  },
  ENDPOINTS: {
    ACCOUNT_TOKENS: '/api/v1/accounts'
  }
} as const;

// xSAUCE Token configuration
export const XSAUCE_TOKEN_CONFIG = {
  MAINNET: {
    TOKEN_ID: '0.0.1460200',
    MOTHERSHIP_CONTRACT: '0.0.1460199'
  },
  TESTNET: {
    TOKEN_ID: '0.0.1418651', // From .env file
    MOTHERSHIP_CONTRACT: '0.0.1418650' // Assuming similar pattern
  }
} as const;

export const saucerswapApiQueryParameters = (context: Context = {}) => {
  return z.object({
    operation: z.enum([
      SAUCERSWAP_API_OPERATIONS.GENERAL_STATS,
      SAUCERSWAP_API_OPERATIONS.SSS_STATS,
      SAUCERSWAP_API_OPERATIONS.FARMS,
      SAUCERSWAP_API_OPERATIONS.ACCOUNT_FARMS,
      SAUCERSWAP_API_OPERATIONS.INFINITY_POOL_POSITION,
    ]).describe(
      '要执行的 SaucerSwap API operation：general_stats、sss_stats、farms、account_farms 或 infinity_pool_position'
    ),
    accountId: z.string().optional().describe(
      'Hedera 账户 ID，格式为 shard.realm.num（account_farms 和 infinity_pool_position operation 需要）'
    ),
    network: z.enum(['mainnet', 'testnet']).default(
      (process.env.HEDERA_NETWORK as 'mainnet' | 'testnet') || 'mainnet'
    ).describe(
      '要查询的 Hedera 网络（默认使用 .env 中的 HEDERA_NETWORK）'
    ),
  }) as any;
};

const getSaucerSwapApiQueryPrompt = (context: Context = {}) => {
  const contextSnippet = PromptGenerator.getContextSnippet(context);
  const usageInstructions = PromptGenerator.getParameterUsageInstructions();

  return `
${contextSnippet}

该工具通过 SaucerSwap 官方 REST API 查询实时交易数据、流动性统计和 farm 信息。

可用 operation:

1. **General Statistics** (general_stats):
   - 查询整体协议统计
   - 返回 SAUCE 流通量、swap 总量、TVL（USD）、volume（USD）
   - 不需要额外参数

2. **Single-Sided Staking Statistics** (sss_stats):
   - 查询 Single-Sided Staking (SSS) 统计
   - 返回 5 日平均 APY、SAUCE/xSAUCE 比例、质押数量
   - 不需要额外参数

3. **Active Farms** (farms):
   - 查询所有活跃 farm 列表
   - 返回 farm ID、pool ID、SAUCE/HBAR 排放、总质押数量
   - 不需要额外参数

4. **Account Farms** (account_farms):
   - 按账户 ID 查询 farm 中的 LP token 数量
   - 需要 accountId 参数
   - 返回指定账户的 farm 详情和质押数量

5. **Infinity Pool Position** (infinity_pool_position):
   - 查询用户真实 Infinity Pool 质押仓位
   - 结合 Mirror Node 的 xSAUCE 余额和 API 的 SAUCE/xSAUCE 比例
   - 需要 accountId 参数
   - 返回 xSAUCE 余额、可领取 SAUCE、当前比例和仓位价值

参数:
- operation (required): 要执行的 API operation
- accountId (optional): account_farms 和 infinity_pool_position operation 需要
- network (optional): mainnet 或 testnet（默认 mainnet）

${usageInstructions}

示例:
- 查询 general stats: operation="general_stats"
- 查询 SSS stats: operation="sss_stats", network="mainnet"
- 查询 active farms: operation="farms"
- 查询 account farms: operation="account_farms", accountId="0.0.123456"
- 查询 Infinity Pool position: operation="infinity_pool_position", accountId="0.0.123456"
`;
};

export const getSaucerSwapApiQuery = async (
  client: any, // Not used for API calls
  context: Context,
  params: z.infer<ReturnType<typeof saucerswapApiQueryParameters>>,
) => {
  try {
    console.log('🔍 SaucerSwap API query started:', params);

    // Clean expired cache entries
    clearExpiredCache();

    // Check cache first
    const cacheKey = getCacheKey(params.operation, params.accountId, params.network);
    const cached = apiCache.get(cacheKey);
    
    if (cached) {
      console.log('💾 Returning cached result for:', cacheKey);
      return {
        ...cached.data,
        cached: true,
        cache_age_ms: Date.now() - cached.timestamp
      };
    }

    // Validate account ID for operations that require it
    if ((params.operation === SAUCERSWAP_API_OPERATIONS.ACCOUNT_FARMS || 
         params.operation === SAUCERSWAP_API_OPERATIONS.INFINITY_POOL_POSITION) && 
        !params.accountId) {
      return {
        error: `${params.operation} operation 需要 accountId`,
        suggestion: '请提供格式为 shard.realm.num 的 Hedera 账户 ID（例如 "0.0.123456"）'
      };
    }

    // Determine network configuration
    const network = params.network || 'mainnet';
    const isMainnet = network === 'mainnet';
    const baseUrl = isMainnet ? SAUCERSWAP_API_CONFIG.BASE_URL.MAINNET : SAUCERSWAP_API_CONFIG.BASE_URL.TESTNET;
    const apiKey = isMainnet ? SAUCERSWAP_API_CONFIG.API_KEYS.MAINNET : SAUCERSWAP_API_CONFIG.API_KEYS.TESTNET;

    console.log(`🌐 SaucerSwap API Network Config:`);
    console.log(`   ENV HEDERA_NETWORK: ${process.env.HEDERA_NETWORK}`);
    console.log(`   Params Network: ${params.network}`);
    console.log(`   Final Network: ${network}`);
    console.log(`   Is Mainnet: ${isMainnet}`);
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   API Key (last 4): ...${apiKey.slice(-4)}`);

    // Handle special case: Infinity Pool Position (combines Mirror Node + SaucerSwap API)
    if (params.operation === SAUCERSWAP_API_OPERATIONS.INFINITY_POOL_POSITION) {
      console.log('🥩 Processing Infinity Pool position query...');
      
      try {
        // 1. Get xSAUCE balance from Mirror Node
        const xSauceBalanceData = await fetchXSauceBalance(params.accountId!, network);
        
        // 2. Get SAUCE/xSAUCE ratio from SaucerSwap API
        const sssStatsUrl = baseUrl + SAUCERSWAP_API_CONFIG.ENDPOINTS.SSS_STATS;
        const sssResponse = await fetchWithRetry(sssStatsUrl, apiKey);
        const sssData = await sssResponse.json();
        
        // 3. Extract xSAUCE balance (with decimals handling)
        let xSauceBalance = 0;
        let xSauceDecimals = 8; // Default xSAUCE decimals
        
        if (xSauceBalanceData.tokens && xSauceBalanceData.tokens.length > 0) {
          const xSauceToken = xSauceBalanceData.tokens[0];
          xSauceBalance = parseInt(xSauceToken.balance) || 0;
          xSauceDecimals = xSauceToken.decimals || 8;
        }
        
        // 4. Calculate claimable SAUCE
        const xSauceFormatted = xSauceBalance / Math.pow(10, xSauceDecimals);
        const ratio = parseFloat(sssData.ratio) || 0;
        const claimableSauce = xSauceFormatted * ratio;
        
        // 5. Get current SAUCE price for USD calculations (from SSS stats)
        const totalSauceStaked = parseInt(sssData.sauce) || 0;
        const totalXSauceSupply = parseInt(sssData.xsauce) || 0;
        const avg5dayAPY = parseFloat(sssData.avg5day) || 0;
        
        console.log(`✅ Infinity Pool position calculated:`);
        console.log(`   xSAUCE Balance: ${xSauceFormatted.toFixed(6)}`);
        console.log(`   SAUCE/xSAUCE Ratio: ${ratio}`);
        console.log(`   Claimable SAUCE: ${claimableSauce.toFixed(6)}`);
        
        const result = {
          operation: params.operation,
          network: network,
          timestamp: new Date().toISOString(),
          data: {
            account_id: params.accountId,
            xsauce_balance: {
              raw: xSauceBalance.toString(),
              formatted: xSauceFormatted,
              decimals: xSauceDecimals
            },
            sauce_claimable: {
              amount: claimableSauce,
              formatted: `${claimableSauce.toFixed(6)} SAUCE`
            },
            ratio: {
              sauce_per_xsauce: ratio,
              description: `1 xSAUCE = ${ratio.toFixed(6)} SAUCE`
            },
            market_context: {
              total_sauce_staked: totalSauceStaked,
              total_xsauce_supply: totalXSauceSupply,
              avg_5day_apy: avg5dayAPY,
              apy_percentage: `${(avg5dayAPY * 100).toFixed(2)}%`
            },
            has_position: xSauceBalance > 0,
            position_value_sauce: claimableSauce
          },
          source: 'Mirror Node + SaucerSwap Finance API',
          mirror_node_url: `${isMainnet ? HEDERA_MIRROR_NODE_CONFIG.BASE_URL.MAINNET : HEDERA_MIRROR_NODE_CONFIG.BASE_URL.TESTNET}${HEDERA_MIRROR_NODE_CONFIG.ENDPOINTS.ACCOUNT_TOKENS}/${params.accountId}/tokens`,
          saucerswap_api_url: sssStatsUrl,
          cached: false
        };

        // Cache the result
        apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
        
        return result;
        
      } catch (error) {
        console.error('❌ Infinity Pool position query failed:', error);
        
        return {
          error: `查询 Infinity Pool 仓位时出错：${error instanceof Error ? error.message : '未知错误'}`,
          operation: params.operation,
          network: network,
          timestamp: new Date().toISOString(),
          suggestion: '请检查账户 ID 和网络配置，并确认 Mirror Node 与 SaucerSwap API 均可访问。',
          troubleshooting: {
            common_causes: [
              '账户 ID 格式无效',
              '账户没有 xSAUCE token',
              'Mirror Node 连接异常',
              'SaucerSwap API 触发频率限制',
              '网络不匹配（mainnet/testnet）'
            ],
            next_steps: [
              '确认账户 ID 格式为 shard.realm.num',
              '检查账户是否持有 xSAUCE token',
              '稍等片刻后重试',
              '确认网络设置与账户所在网络一致'
            ]
          }
        };
      }
    }

    // Build API URL
    let apiUrl = baseUrl;
    
    switch (params.operation) {
      case SAUCERSWAP_API_OPERATIONS.GENERAL_STATS:
        apiUrl += SAUCERSWAP_API_CONFIG.ENDPOINTS.GENERAL_STATS;
        break;
      case SAUCERSWAP_API_OPERATIONS.SSS_STATS:
        apiUrl += SAUCERSWAP_API_CONFIG.ENDPOINTS.SSS_STATS;
        break;
      case SAUCERSWAP_API_OPERATIONS.FARMS:
        apiUrl += SAUCERSWAP_API_CONFIG.ENDPOINTS.FARMS;
        break;
      case SAUCERSWAP_API_OPERATIONS.ACCOUNT_FARMS:
        apiUrl += `${SAUCERSWAP_API_CONFIG.ENDPOINTS.ACCOUNT_FARMS}/${params.accountId}`;
        break;
      default:
        throw new Error(`不支持的 operation：${params.operation}`);
    }

    // Make API request with retry logic
    const response = await fetchWithRetry(apiUrl, apiKey);

    // Parse JSON response
    const data = await response.json();

    console.log('✅ SaucerSwap API response received and cached');

    // Format response with operation context
    const result = {
      operation: params.operation,
      network: network,
      timestamp: new Date().toISOString(),
      data: data,
      source: 'SaucerSwap Finance API',
      api_url: apiUrl,
      cached: false
    };

    // Cache the result
    apiCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;

  } catch (error) {
    console.error('❌ SaucerSwap API query failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    return {
      error: `查询 SaucerSwap Finance API 时出错：${errorMessage}`,
      operation: params.operation,
      network: params.network || 'mainnet',
      timestamp: new Date().toISOString(),
      suggestion: '请检查 API key 和网络配置，并确认 SaucerSwap API 可用。',
      troubleshooting: {
        common_causes: [
          'API key 无效或缺失',
          '触发频率限制（请求过多）',
          '网络连接异常',
          '账户 ID 格式无效',
          'API 暂时不可用'
        ],
        solutions: [
          '确认 .env 文件中的 API key 正确',
          '等待 30-60 秒后再请求',
          '检查账户 ID 格式是否为 shard.realm.num',
          '尝试切换网络（mainnet/testnet）',
          '确认互联网连接正常'
        ]
      },
      api_documentation: 'https://docs.saucerswap.finance/v/developer/rest-api'
    };
  }
};

export const SAUCERSWAP_API_QUERY_TOOL = 'saucerswap_api_query';

const saucerswapApiQueryTool = (context: Context): Tool => ({
  method: SAUCERSWAP_API_QUERY_TOOL,
  name: 'Query SaucerSwap Finance API',
  description: getSaucerSwapApiQueryPrompt(context),
  parameters: saucerswapApiQueryParameters(context),
  execute: getSaucerSwapApiQuery,
});

export default saucerswapApiQueryTool;
