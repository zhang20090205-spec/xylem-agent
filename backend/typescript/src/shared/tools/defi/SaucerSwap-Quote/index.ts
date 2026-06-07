// SaucerSwap Router Swap Quote Tool - Public Exports
// Direct contract interaction for real-time swap quotes

// Core functionality exports
export { default as saucerswapRouterSwapQuoteTool } from './contract-client';

export {
  getSaucerswapRouterSwapQuote,
  saucerswapRouterSwapQuoteParameters,
  SAUCERSWAP_ROUTER_SWAP_QUOTE_TOOL,
  SAUCERSWAP_ROUTER_CONFIG,
  SAUCERSWAP_ROUTER_OPERATIONS,
} from './contract-client';

// LangChain integration exports  
export {
  createSaucerswapRouterSwapQuoteLangchainTool,
  createSaucerswapRouterSwapQuoteLangchainTools,
} from './langchain-tools';

// Tool metadata for easy reference
export const SAUCERSWAP_ROUTER_TOOL_INFO = {
  name: 'SaucerSwap Router V2 Swap Quote Tool',
  version: '1.0.0',
  description: '从 SaucerSwap V2 Router 合约获取实时 swap 报价，支持 Uniswap v3 风格路径',
  contractId: {
    mainnet: '0.0.3949424',  // QuoterV2
    testnet: '0.0.1390002'   // QuoterV2
  },
  evmAddress: {
    mainnet: '0x000000000000000000000000000000000003c5618',  // QuoterV2
    testnet: '0x0000000000000000000000000000000000153392'   // QuoterV2
  },
  supportedOperations: [
    'get_amounts_out',
    'get_amounts_in'
  ],
  networks: ['mainnet', 'testnet'],
  features: [
    'JSON-RPC QuoterV2 集成（不需要 operator）',
    '包含 fee 的实时报价',
    '支持 multi-hop routing',
    '自动将 HBAR 转为 WHBAR',
    'Uniswap v3 风格 path encoding',
    '支持多个 fee tier',
    '通过 Hashio RPC 提供稳定连接'
  ]
} as const;
