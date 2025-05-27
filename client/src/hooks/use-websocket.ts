import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage } from '@/types';

export function useWebSocket(stationId: number, userId: number, sessionId?: number) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStats, setConnectionStats] = useState({
    latency: 0,
    packetsReceived: 0,
    dataRate: 0,
    lastHeartbeat: new Date(),
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingRef = useRef<number>(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setIsConnected(true);
      
      // Join the station room
      wsRef.current?.send(JSON.stringify({
        type: 'join',
        stationId,
        userId
      }));

      // Start ping interval for latency measurement
      pingIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          lastPingRef.current = Date.now();
          wsRef.current.send(JSON.stringify({
            type: 'ping',
            timestamp: lastPingRef.current
          }));
        }
      }, 1000);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);
        
        // Handle pong for latency calculation
        if (message.type === 'pong' && message.timestamp) {
          const latency = Date.now() - message.timestamp;
          setConnectionStats(prev => ({
            ...prev,
            latency,
            packetsReceived: prev.packetsReceived + 1,
            lastHeartbeat: new Date(),
          }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      
      // Attempt to reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  }, [stationId, userId]);

  const sendCommand = useCallback((command: string, parameters?: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
      wsRef.current.send(JSON.stringify({
        type: 'command',
        command,
        parameters,
        sessionId,
        stationId,
        userId
      }));
    }
  }, [sessionId, stationId, userId]);

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    wsRef.current?.close();
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    connectionStats,
    sendCommand,
    connect,
    disconnect
  };
}
