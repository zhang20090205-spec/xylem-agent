import { useState, useEffect, useCallback, useRef } from 'react';
import { WSIncomingMessage, WSUserMessage, WSTransactionResult, WSConnectionAuth } from '../types/chat';

export interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isAuthenticated: boolean;
  error: string | null;
  sendMessage: (message: string, userAccountId: string) => void;
  sendTransactionResult: (result: Omit<WSTransactionResult, 'type'>) => void;
  authenticate: (userAccountId: string) => void;
  lastMessage: WSIncomingMessage | null;
}

// Function to get WebSocket URL based on environment
function getWebSocketUrl(): string {
  // Vite automatically sets import.meta.env.MODE:
  // - 'development' when running npm run dev
  // - 'production' when running npm run build
  const isProduction = import.meta.env.PROD; // boolean: true in production
  
  const localUrl = import.meta.env.VITE_WEBSOCKET_URL_LOCAL || 'ws://localhost:8080';
  const productionUrl = import.meta.env.VITE_WEBSOCKET_URL_PRODUCTION || 'wss://hedron-production.up.railway.app';
  
  const selectedUrl = isProduction ? productionUrl : localUrl;
  console.log(`🌍 Environment: ${import.meta.env.MODE}, WebSocket URL: ${selectedUrl}`);
  
  return selectedUrl;
}

export function useWebSocket(url?: string): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WSIncomingMessage | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);
    
    const wsUrl = url || getWebSocketUrl();
    console.log(`🔗 Connecting to WebSocket: ${wsUrl}`);

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('🔗 Connected to Hedera WebSocket Agent');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WSIncomingMessage = JSON.parse(event.data);
          console.log('📨 Received message:', message);
          setLastMessage(message);

          // Check for authentication success
          if (message.type === 'SYSTEM_MESSAGE' && message.message.includes('Authenticated successfully')) {
            setIsAuthenticated(true);
            console.log('✅ Authentication completed!');
          }
        } catch (err) {
          console.error('❌ Failed to parse WebSocket message:', err);
          setError('Failed to parse message from server');
        }
      };

      ws.current.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        setIsAuthenticated(false);

        // Auto-reconnect after 3 seconds unless it was a clean close
        if (event.code !== 1000) {
          setError('Connection lost. Attempting to reconnect...');
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.current.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setError('Connection error. Check if the backend is running on port 8080.');
        setIsConnecting(false);
      };

    } catch (err) {
      console.error('❌ Failed to create WebSocket connection:', err);
      setError('Failed to connect to backend');
      setIsConnecting(false);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (ws.current) {
      ws.current.close(1000, 'Client disconnect');
      ws.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setIsAuthenticated(false);
  }, []);

  const authenticate = useCallback((userAccountId: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to backend');
      return;
    }

    console.log(`🔐 Authenticating with account: ${userAccountId}`);
    
    const authMessage: WSConnectionAuth = {
      type: 'CONNECTION_AUTH',
      userAccountId,
      timestamp: Date.now()
    };

    try {
      ws.current.send(JSON.stringify(authMessage));
      console.log('📤 Sent authentication:', authMessage);
    } catch (err) {
      console.error('❌ Failed to send authentication:', err);
      setError('Failed to authenticate');
    }
  }, []);

  const sendMessage = useCallback((message: string, userAccountId: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to backend');
      return;
    }

    if (!isAuthenticated) {
      setError('Not authenticated. Please authenticate first.');
      return;
    }

    const userMessage: WSUserMessage = {
      type: 'USER_MESSAGE',
      message,
      userAccountId,
      timestamp: Date.now()
    };

    try {
      ws.current.send(JSON.stringify(userMessage));
      console.log('📤 Sent message:', userMessage);
    } catch (err) {
      console.error('❌ Failed to send message:', err);
      setError('Failed to send message');
    }
  }, [isAuthenticated]);

  const sendTransactionResult = useCallback((result: Omit<WSTransactionResult, 'type'>) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to backend');
      return;
    }

    const transactionResult: WSTransactionResult = {
      type: 'TRANSACTION_RESULT',
      ...result
    };

    try {
      ws.current.send(JSON.stringify(transactionResult));
      console.log('📤 Sent transaction result:', transactionResult);
    } catch (err) {
      console.error('❌ Failed to send transaction result:', err);
      setError('Failed to send transaction result');
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    isAuthenticated,
    error,
    sendMessage,
    sendTransactionResult,
    authenticate,
    lastMessage
  };
} 