export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
  hasTransaction?: boolean;
  transactionData?: TransactionData;
  swapQuote?: SwapQuoteData;
}

export interface TransactionData {
  originalQuery: string;
  transactionBytes: Uint8Array;
  transactionId?: string;
  status?: 'pending' | 'success' | 'failed';
}

export interface SwapQuoteData {
  operation: 'get_amounts_out' | 'get_amounts_in';
  network: 'mainnet' | 'testnet';
  input: {
    token: string;
    tokenId: string;
    amount: string;
    formatted: string;
  };
  output: {
    token: string;
    tokenId: string;
    amount: string;
    formatted: string;
  };
  path: string[];
  fees: number[];
  exchangeRate: string;
  gasEstimate?: string;
  originalMessage: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// WebSocket message types
export interface WSConnectionAuth {
  type: 'CONNECTION_AUTH';
  userAccountId: string;
  timestamp: number;
}

export interface WSUserMessage {
  type: 'USER_MESSAGE';
  message: string;
  userAccountId: string;
  timestamp: number;
}

export interface WSAgentResponse {
  type: 'AGENT_RESPONSE';
  message: string;
  hasTransaction?: boolean;
}

export interface WSSwapQuote {
  type: 'SWAP_QUOTE';
  quote: SwapQuoteData;
  originalMessage: string;
}

export interface WSSystemMessage {
  type: 'SYSTEM_MESSAGE';
  level: string;
  message: string;
}

export interface WSTransactionToSign {
  type: 'TRANSACTION_TO_SIGN';
  originalQuery: string;
  transactionBytes: number[];
}

export interface WSTransactionResult {
  type: 'TRANSACTION_RESULT';
  success: boolean;
  transactionId: string;
  status: string;
  timestamp: number;
}

export type WSIncomingMessage = WSAgentResponse | WSSystemMessage | WSTransactionToSign | WSSwapQuote;
export type WSOutgoingMessage = WSConnectionAuth | WSUserMessage | WSTransactionResult;