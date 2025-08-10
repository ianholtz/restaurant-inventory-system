import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar } from 'react-native-paper';
import { RealTimeInventory } from '../components/RealTimeInventory';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface InventoryScreenProps {
  navigation: any;
  route: {
    params: {
      restaurantId: string;
      authToken: string;
    };
  };
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const { restaurantId, authToken } = route.params;
  const wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'wss://api.restaurant-inventory.com/ws';

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Live Inventory" />
        <Appbar.Action 
          icon="refresh" 
          onPress={() => {
            // Force refresh - handled by component
          }} 
        />
      </Appbar.Header>
      
      <ErrorBoundary
        onError={(error, errorInfo) => {
          // Log to crash reporting service
          console.error('Inventory screen error:', error, errorInfo);
        }}
      >
        <RealTimeInventory
          restaurantId={restaurantId}
          wsUrl={wsUrl}
          authToken={authToken}
        />
      </ErrorBoundary>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});