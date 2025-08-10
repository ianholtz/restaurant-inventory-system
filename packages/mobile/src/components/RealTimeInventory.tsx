import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Card, Title, Paragraph, Chip, ActivityIndicator, Button, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { InventoryItem } from '@restaurant-inventory/shared';

interface WebSocketMessage {
  type: 'inventory_update' | 'inventory_alert' | 'connection_status';
  data: any;
}

interface RealTimeInventoryProps {
  restaurantId: string;
  wsUrl: string;
  authToken: string;
}

interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  wsConnected: boolean;
}

const STORAGE_KEY = 'cached_inventory';
const RETRY_INTERVAL = 5000;
const MAX_RETRIES = 3;

export const RealTimeInventory: React.FC<RealTimeInventoryProps> = ({
  restaurantId,
  wsUrl,
  authToken
}) => {
  const [state, setState] = useState<InventoryState>({
    items: [],
    loading: true,
    error: null,
    isOnline: true,
    wsConnected: false
  });

  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Load cached data from storage
  const loadCachedData = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const cachedItems = JSON.parse(cached);
        setState(prev => ({ ...prev, items: cachedItems, loading: false }));
      }
    } catch (error) {
      console.warn('Failed to load cached data:', error);
    }
  }, []);

  // Save data to cache
  const saveToCache = useCallback(async (items: InventoryItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }, []);

  // WebSocket connection handler
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(`${wsUrl}?token=${authToken}&restaurantId=${restaurantId}`);
      
      ws.onopen = () => {
        setState(prev => ({ ...prev, wsConnected: true, error: null }));
        retryCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setState(prev => ({ ...prev, wsConnected: false }));
        scheduleReconnect();
      };

      ws.onerror = (error) => {
        setState(prev => ({ 
          ...prev, 
          wsConnected: false, 
          error: 'WebSocket connection failed' 
        }));
        scheduleReconnect();
      };

      wsRef.current = ws;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        wsConnected: false, 
        error: 'Failed to create WebSocket connection' 
      }));
      scheduleReconnect();
    }
  }, [wsUrl, authToken, restaurantId]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'inventory_update':
        setState(prev => {
          const updatedItems = prev.items.map(item => 
            item.id === message.data.id ? { ...item, ...message.data } : item
          );
          saveToCache(updatedItems);
          return { ...prev, items: updatedItems };
        });
        break;

      case 'inventory_alert':
        Alert.alert(
          'Inventory Alert',
          message.data.message,
          [{ text: 'OK' }]
        );
        break;

      case 'connection_status':
        setState(prev => ({ ...prev, wsConnected: message.data.connected }));
        break;
    }
  }, [saveToCache]);

  // Schedule WebSocket reconnection
  const scheduleReconnect = useCallback(() => {
    if (retryCountRef.current >= MAX_RETRIES) {
      setState(prev => ({ 
        ...prev, 
        error: 'Max reconnection attempts reached' 
      }));
      return;
    }

    retryTimeoutRef.current = setTimeout(() => {
      retryCountRef.current++;
      connectWebSocket();
    }, RETRY_INTERVAL);
  }, [connectWebSocket]);

  // Fetch initial data from API
  const fetchInventoryData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch(`/api/restaurants/${restaurantId}/inventory`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const items = result.data.items || [];
      
      setState(prev => ({ ...prev, items, loading: false }));
      await saveToCache(items);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Failed to fetch inventory data' 
      }));
      
      // Load cached data if API fails
      await loadCachedData();
    }
  }, [restaurantId, authToken, saveToCache, loadCachedData]);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setState(prev => ({ ...prev, isOnline: state.isConnected ?? false }));
      
      if (state.isConnected && !prev.isOnline) {
        // Reconnect when coming back online
        fetchInventoryData();
        connectWebSocket();
      }
    });

    return unsubscribe;
  }, [fetchInventoryData, connectWebSocket]);

  // Initialize component
  useEffect(() => {
    loadCachedData();
    fetchInventoryData();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [loadCachedData, fetchInventoryData, connectWebSocket]);

  // Retry connection handler
  const handleRetry = useCallback(() => {
    retryCountRef.current = 0;
    setState(prev => ({ ...prev, error: null }));
    fetchInventoryData();
    connectWebSocket();
  }, [fetchInventoryData, connectWebSocket]);

  // Render inventory item
  const renderInventoryItem = useCallback(({ item }: { item: InventoryItem }) => {
    const isLowStock = item.quantity <= item.minimumStock;
    const isExpiringSoon = new Date(item.expirationDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title>{item.name}</Title>
            <View style={styles.chips}>
              {isLowStock && (
                <Chip mode="outlined" textStyle={styles.lowStockChip}>
                  Low Stock
                </Chip>
              )}
              {isExpiringSoon && (
                <Chip mode="outlined" textStyle={styles.expiringChip}>
                  Expiring Soon
                </Chip>
              )}
            </View>
          </View>
          <Paragraph>Quantity: {item.quantity} {item.unit}</Paragraph>
          <Paragraph>Expires: {new Date(item.expirationDate).toLocaleDateString()}</Paragraph>
          <Paragraph>Supplier: {item.supplier}</Paragraph>
        </Card.Content>
      </Card>
    );
  }, []);

  // Render connection status
  const renderConnectionStatus = () => (
    <View style={styles.statusBar}>
      <Text style={styles.statusText}>
        {!state.isOnline ? '📴 Offline' : 
         !state.wsConnected ? '🔄 Connecting...' : 
         '🟢 Live'}
      </Text>
    </View>
  );

  // Render error state
  if (state.error && state.items.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{state.error}</Text>
        <Button mode="contained" onPress={handleRetry} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  // Render loading state
  if (state.loading && state.items.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderConnectionStatus()}
      <FlatList
        data={state.items}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={state.loading}
        onRefresh={fetchInventoryData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBar: {
    backgroundColor: '#fff',
    padding: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    gap: 4,
  },
  lowStockChip: {
    color: '#f57c00',
  },
  expiringChip: {
    color: '#d32f2f',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#d32f2f',
  },
  retryButton: {
    marginTop: 10,
  },
});