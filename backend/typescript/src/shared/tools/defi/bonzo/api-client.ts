import { z } from 'zod';
import type { Context } from '../../../configuration';
import type { Tool } from '../../../tools';
import { PromptGenerator } from '../../../utils/prompt-generator';

// Bonzo Finance API configuration
// NOTE: Bonzo API only provides MAINNET data. It works regardless of network,
// but always returns mainnet market information and contract addresses.
const resolveBaseUrl = () => {
  const envOverride = process.env.BONZO_API_BASE_URL?.trim();
  if (envOverride) {
    return envOverride.replace(/\/$/, ''); // ensure no trailing slash
  }
  // Temporary staging endpoint per Bonzo docs (Nov 2025)
  return 'https://mainnet-data-staging.bonzo.finance';
};

export const BONZO_API_CONFIG = {
  // Bonzo Finance temporary staging API (mainnet data only)
  BASE_URL: resolveBaseUrl(),
  // Original production URL (keep note for future revert): https://data.bonzo.finance
  ENDPOINTS: {
    ACCOUNT_DASHBOARD: '/dashboard',
    MARKET_INFO: '/market',
    POOL_STATS: '/stats',
    PROTOCOL_INFO: '/info',
    BONZO_TOKEN: '/bonzo',
    BONZO_CIRCULATION: '/bonzo/circulation',
  },
  // Rate limiting configuration - tuned to be more conservative to avoid IP blocks
  RATE_LIMIT: {
    DELAY_MS: 2000,     // 2 seconds between requests (increase to reduce burstiness)
    MAX_RETRIES: 2,     // Fewer retry attempts to avoid rapid retries
    BACKOFF_MS: 5000,   // Initial backoff delay (5s)
    CACHE_TTL_MS: 300000 // Cache responses for 5 minutes
  }
} as const;

// Simple cache to avoid duplicate requests
const apiCache = new Map<string, { data: any; timestamp: number }>();

// Track inflight requests to deduplicate parallel calls to the same URL
const inflightRequests = new Map<string, Promise<Response>>();

// Track last request time for rate limiting
let lastRequestTime = 0;

// Sleep utility function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Clear expired cache entries
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of apiCache.entries()) {
    if (now - value.timestamp > BONZO_API_CONFIG.RATE_LIMIT.CACHE_TTL_MS) {
      apiCache.delete(key);
    }
  }
};

// Generate cache key
const getCacheKey = (operation: string, accountId?: string) => {
  return accountId ? `${operation}_${accountId}` : operation;
};

// Enhanced fetch with rate limiting and retry logic
const fetchWithRetry = async (url: string, maxRetries = BONZO_API_CONFIG.RATE_LIMIT.MAX_RETRIES): Promise<Response> => {
  // Rate limiting: ensure minimum delay between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minDelay = BONZO_API_CONFIG.RATE_LIMIT.DELAY_MS;

  if (timeSinceLastRequest < minDelay) {
    const sleepTime = minDelay - timeSinceLastRequest;
    console.log(`⏱️ Rate limiting: waiting ${sleepTime}ms before request`);
    await sleep(sleepTime);
  }

  lastRequestTime = Date.now();

  // Enhanced headers to appear more legitimate
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://app.bonzo.finance/',
    'Origin': 'https://app.bonzo.finance',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site'
  };

  // Deduplicate parallel requests to the same URL
  if (inflightRequests.has(url)) {
    console.log(`🔁 Waiting for in-flight request for ${url}`);
    return inflightRequests.get(url)!;
  }

  // Wrapper promise so we can register it in inflightRequests and remove it later
  const fetchPromise = (async () => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌐 Bonzo API request (attempt ${attempt + 1}/${maxRetries + 1}): ${url}`);

        const response = await fetch(url, {
          method: 'GET',
          headers,
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        // If successful, return response
        if (response.ok) {
          console.log(`✅ Bonzo API request successful on attempt ${attempt + 1}`);
          return response;
        }

        // Handle specific error codes
        if (response.status === 403) {
          console.log(`🚫 403 Forbidden (attempt ${attempt + 1}). Rate limited.`);
          if (attempt < maxRetries) {
            const backoffDelay = BONZO_API_CONFIG.RATE_LIMIT.BACKOFF_MS * Math.pow(2, attempt);
            console.log(`⏰ Backing off for ${backoffDelay}ms before retry...`);
            await sleep(backoffDelay);
            continue;
          }
        }

        if (response.status === 429) {
          console.log(`⏳ 429 Too Many Requests (attempt ${attempt + 1})`);
          if (attempt < maxRetries) {
            const backoffDelay = BONZO_API_CONFIG.RATE_LIMIT.BACKOFF_MS * Math.pow(2, attempt);
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

        // Wait before retry with exponential backoff + jitter
        const baseDelay = BONZO_API_CONFIG.RATE_LIMIT.BACKOFF_MS * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 1000); // up to 1s jitter
        const backoffDelay = baseDelay + jitter;
        console.log(`⏰ Retrying in ${backoffDelay}ms...`);
        await sleep(backoffDelay);
      }
    }

    throw new Error('Max retries exceeded');
  })();

  inflightRequests.set(url, fetchPromise);

  try {
    const resp = await fetchPromise;
    return resp;
  } finally {
    // Always remove the inflight marker so subsequent requests can proceed
    inflightRequests.delete(url);
  }
};

// Available API operations
export const BONZO_API_OPERATIONS = {
  ACCOUNT_DASHBOARD: 'account_dashboard',
  MARKET_INFO: 'market_info',
  POOL_STATS: 'pool_stats',
  PROTOCOL_INFO: 'protocol_info',
  BONZO_TOKEN: 'bonzo_token',
  BONZO_CIRCULATION: 'bonzo_circulation',
} as const;

export const bonzoApiQueryParameters = (context: Context = {}) => {
  return z.object({
    operation: z.enum([
      BONZO_API_OPERATIONS.ACCOUNT_DASHBOARD,
      BONZO_API_OPERATIONS.MARKET_INFO,
      BONZO_API_OPERATIONS.POOL_STATS,
      BONZO_API_OPERATIONS.PROTOCOL_INFO,
      BONZO_API_OPERATIONS.BONZO_TOKEN,
      BONZO_API_OPERATIONS.BONZO_CIRCULATION,
    ]).describe(
      '要执行的 Bonzo API operation：account_dashboard、market_info、pool_stats、protocol_info、bonzo_token 或 bonzo_circulation'
    ),
    accountId: z.string().optional().describe(
      'Hedera 账户 ID，格式为 shard.realm.num（仅 account_dashboard operation 需要）'
    ),
  }) as any;
};

const getBonzoApiQueryPrompt = (context: Context = {}) => {
  const contextSnippet = PromptGenerator.getContextSnippet(context);
  const usageInstructions = PromptGenerator.getParameterUsageInstructions();

  return `
${contextSnippet}

该工具通过 Bonzo Finance 官方 REST API 查询实时借贷池数据、账户信息和协议统计。

重要提示：Bonzo API 仅提供 MAINNET 数据。即使使用 testnet 账户，API 也会返回 mainnet 市场信息和合约地址。

可用 operation:

1. **Account Dashboard** (account_dashboard):
   - 查询账户借贷仓位详情
   - 需要 accountId 参数
   - 返回 supply/borrow 余额、APY、抵押品信息

2. **Market Information** (market_info):
   - 查询所有支持 token 的当前市场数据
   - 返回 supply/borrow APY、利用率、可用流动性
   - 不需要额外参数

3. **Pool Statistics** (pool_stats):
   - 查询 24 小时协议统计
   - 返回交易数量、费用、清算数据
   - 不需要额外参数

4. **Protocol Information** (protocol_info):
   - 查询协议配置和合约地址
   - 返回 lending pool、oracle 和 configurator 地址
   - 不需要额外参数

5. **BONZO Token Information** (bonzo_token):
   - 查询 BONZO token 详情和 treasury 信息
   - 返回总供应量、流通量、treasury 余额
   - 不需要额外参数

6. **BONZO Circulation Supply** (bonzo_circulation):
   - 查询当前流通供应量，返回纯数字
   - 不需要额外参数

参数:
- operation (required): 要执行的 API operation
- accountId (optional): 仅 account_dashboard operation 需要

${usageInstructions}

示例:
- 查询市场数据: operation="market_info"
- 查询账户信息: operation="account_dashboard", accountId="0.0.123456"
- 查询协议信息: operation="protocol_info"
`;
};

export const getBonzoApiQuery = async (
  client: any, // Not used for API calls
  context: Context,
  params: z.infer<ReturnType<typeof bonzoApiQueryParameters>>,
) => {
  try {
    console.log('🔍 Bonzo API query started:', params);

    // Log warning about mainnet-only API
    const network = process.env.HEDERA_NETWORK || 'mainnet';
    if (network === 'testnet') {
      console.warn('提示：Bonzo API 仅提供 MAINNET 数据。当前为 testnet 查询，但会收到 mainnet 市场信息。');
    }

    // Clean expired cache entries
    clearExpiredCache();

    // Check cache first
    const cacheKey = getCacheKey(params.operation, params.accountId);
    const cached = apiCache.get(cacheKey);

    if (cached) {
      console.log('💾 Returning cached result for:', cacheKey);
      return {
        ...cached.data,
        cached: true,
        cache_age_ms: Date.now() - cached.timestamp
      };
    }

    // Validate account ID for dashboard operation
    if (params.operation === BONZO_API_OPERATIONS.ACCOUNT_DASHBOARD && !params.accountId) {
      return {
        error: 'account_dashboard operation 需要 accountId',
        suggestion: '请提供格式为 shard.realm.num 的 Hedera 账户 ID（例如 "0.0.123456"）'
      };
    }

    // Build API URL
    let apiUrl = BONZO_API_CONFIG.BASE_URL;

    switch (params.operation) {
      case BONZO_API_OPERATIONS.ACCOUNT_DASHBOARD:
        apiUrl += `${BONZO_API_CONFIG.ENDPOINTS.ACCOUNT_DASHBOARD}/${params.accountId}`;
        break;
      case BONZO_API_OPERATIONS.MARKET_INFO:
        apiUrl += BONZO_API_CONFIG.ENDPOINTS.MARKET_INFO;
        break;
      case BONZO_API_OPERATIONS.POOL_STATS:
        apiUrl += BONZO_API_CONFIG.ENDPOINTS.POOL_STATS;
        break;
      case BONZO_API_OPERATIONS.PROTOCOL_INFO:
        apiUrl += BONZO_API_CONFIG.ENDPOINTS.PROTOCOL_INFO;
        break;
      case BONZO_API_OPERATIONS.BONZO_TOKEN:
        apiUrl += BONZO_API_CONFIG.ENDPOINTS.BONZO_TOKEN;
        break;
      case BONZO_API_OPERATIONS.BONZO_CIRCULATION:
        apiUrl += BONZO_API_CONFIG.ENDPOINTS.BONZO_CIRCULATION;
        break;
      default:
        throw new Error(`不支持的 operation：${params.operation}`);
    }

    // Make API request with retry logic
    const response = await fetchWithRetry(apiUrl);

    // Handle different response types
    let data;
    const contentType = response.headers.get('content-type');

    if (params.operation === BONZO_API_OPERATIONS.BONZO_CIRCULATION) {
      // This endpoint returns plain text
      data = await response.text();
    } else if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    console.log('✅ Bonzo API response received and cached');

    // Format response with operation context
    const result = {
      operation: params.operation,
      timestamp: new Date().toISOString(),
      data: data,
      source: 'Bonzo Finance API',
      api_url: apiUrl,
      cached: false
    };

    // Cache the result
    apiCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;

  } catch (error) {
    console.error('❌ Bonzo API query failed:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return {
      error: `查询 Bonzo Finance API 时出错：${errorMessage}`,
      operation: params.operation,
      timestamp: new Date().toISOString(),
      suggestion: 'API 可能正在限流。请等待几秒后再请求。',
      troubleshooting: {
        common_causes: [
          '触发频率限制（初次请求后出现 403 Forbidden）',
          '短时间请求过多',
          '网络连接异常',
          'API 暂时不可用'
        ],
        solutions: [
          '等待 30-60 秒后再请求',
          '通过缓存结果减少请求次数',
          '检查账户 ID 格式是否正确',
          '确认互联网连接正常'
        ]
      },
      api_documentation: 'https://docs.bonzo.finance/hub/developer/bonzo-v1-data-api'
    };
  }
};

export const BONZO_API_QUERY_TOOL = 'bonzo_api_query';

const bonzoApiQueryTool = (context: Context): Tool => ({
  method: BONZO_API_QUERY_TOOL,
  name: 'Query Bonzo Finance API',
  description: getBonzoApiQueryPrompt(context),
  parameters: bonzoApiQueryParameters(context),
  execute: getBonzoApiQuery,
});

export default bonzoApiQueryTool;
