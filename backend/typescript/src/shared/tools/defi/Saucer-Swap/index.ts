// SaucerSwap Router Swap Tool - Public Exports
// Direct contract interaction for real token swaps using UniswapV2Router02

// Core functionality exports
export { default as saucerswapRouterSwapTool } from './contract-client';

export {
  getSaucerswapRouterSwap,
  saucerswapRouterSwapParameters,
  SAUCERSWAP_ROUTER_SWAP_TOOL,
  SAUCERSWAP_V2_ROUTER_CONTRACTS,
  SAUCERSWAP_ROUTER_SWAP_OPERATIONS,
  SAUCERSWAP_ROUTER_SWAP_CONFIG,
  UNISWAP_V2_ROUTER02_ABI,
  tokenIdToEvmAddress,
  toEvmAddressFromId,
} from './contract-client';

// LangChain integration exports  
export {
  createSaucerSwapRouterSwapLangchainTool,
  createSaucerSwapRouterSwapLangchainTools,
} from './langchain-tools';

// Tool metadata for easy reference
export const SAUCERSWAP_ROUTER_SWAP_TOOL_INFO = {
  name: 'SaucerSwap Router V2 Swap Tool',
  version: '1.0.0',
  description: '使用 UniswapV2Router02 合约在 SaucerSwap DEX 执行真实 token swap',
  contractId: {
    mainnet: '0.0.3045981',  // UniswapV2Router02
    testnet: '0.0.19264'     // UniswapV2Router02 (proxy)
  },
  evmAddress: {
    mainnet: '0x00000000000000000000000000000000002e7a5d',  // UniswapV2Router02
    testnet: '0x0000000000000000000000000000000000004b40'   // UniswapV2Router02 (proxy)
  },
  supportedOperations: [
    'swap_exact_hbar_for_tokens',
    'swap_exact_tokens_for_hbar', 
    'swap_exact_tokens_for_tokens',
    'swap_hbar_for_exact_tokens',
    'swap_tokens_for_exact_hbar',
    'swap_tokens_for_exact_tokens'
  ],
  networks: ['mainnet', 'testnet'],
  features: [
    '直接与 UniswapV2Router02 合约交互',
    '创建真实 token swap 交易',
    '自动将 HBAR 转为 WHBAR',
    '滑点保护（0.01% 到 50%）',
    '可配置 deadline',
    '支持 multi-hop routing',
    '支持 exact input 与 exact output swap',
    '支持 mainnet 与 testnet'
  ],
  supportedTokens: {
    mainnet: {
      HBAR: '原生 HBAR（自动转为 WHBAR）',
      SAUCE: '0.0.731861',
      WHBAR: '0.0.1456986'
    },
    testnet: {
      HBAR: '原生 HBAR（自动转为 WHBAR）',
      SAUCE: '0.0.1183558',  // Corrected from official docs
      WHBAR: '0.0.15058'     // Corrected from official docs
    }
  },
  riskWarnings: [
    '加密资产 swap 存在价格波动风险',
    '滑点可能导致最终数量与预期不同',
    '大额 swap 可能产生显著 price impact',
    'swap 前请务必确认 token 地址',
    '请确保有足够 HBAR 支付 gas 费用'
  ],
  usageGuidelines: {
    slippage: {
      stablecoins: '0.1% - 0.5%',
      major_tokens: '0.5% - 2%', 
      volatile_tokens: '2% - 5%',
      large_amounts: '5% - 15%',
      emergency: 'up to 50%'
    },
    amounts: {
      hbar_decimals: 8,
      sauce_decimals: 18,
      check_token_decimals: '务必确认 token decimal places'
    },
    best_practices: [
      '从小额测试开始',
      '大额 swap 前检查市场情况',
      '根据 token 波动性选择合适滑点',
      '确认收款地址正确',
      'swap 前确认已完成 token association'
    ]
  }
} as const;
