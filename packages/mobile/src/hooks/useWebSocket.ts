import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

interface WebSocketState {
  readyState: number;
  lastMessage: MessageEvent | null;
  lastError: Event | null;
  reconnectCount: number;
}

export const useWebSocket = (config: WebSocketConfig) => {
  const {
    url,
    protocols,
    reconnectInterval = 5000,
    maxReconnectAttempts = 3,
    onOpen,
    onMessage,
    onClose,
    onError
  } = config;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectCountRef = useRef(0);

  const [state, setState] = useState<WebSocketState>({
    readyState: WebSocket.CONNECTING,
    lastMessage: null,
    lastError: null,
    reconnectCount: 0
  });

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url, protocols);

      ws.onopen = (event) => {
        setState(prev => ({ 
          ...prev, 
          readyState: WebSocket.OPEN,
          lastError: null
        }));
        reconnectCountRef.current = 0;
        onOpen?.(event);
      };

      ws.onmessage = (event) => {
        setState(prev => ({ ...prev, lastMessage: event }));
        onMessage?.(event);
      };

      ws.onclose = (event) => {
        setState(prev => ({ 
          ...prev, 
          readyState: WebSocket.CLOSED,
          reconnectCount: reconnectCountRef.current
        }));
        
        onClose?.(event);
        
        // Auto-reconnect if not manually closed
        if (!event.wasClean && reconnectCountRef.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectCountRef.current++;
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (event) => {
        setState(prev => ({ 
          ...prev, 
          readyState: WebSocket.CLOSED,
          lastError: event
        }));
        onError?.(event);
      };

      wsRef.current = ws;
      setState(prev => ({ ...prev, readyState: WebSocket.CONNECTING }));
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setState(prev => ({ 
        ...prev, 
        readyState: WebSocket.CLOSED,
        lastError: error as Event
      }));
    }
  }, [url, protocols, reconnectInterval, maxReconnectAttempts, onOpen, onMessage, onClose, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    reconnectCountRef.current = 0;
  }, []);

  const sendMessage = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
      return true;
    }
    return false;
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectCountRef.current = 0;
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    readyState: state.readyState,
    lastMessage: state.lastMessage,
    lastError: state.lastError,
    reconnectCount: state.reconnectCount,
    sendMessage,
    reconnect,
    disconnect
  };
};