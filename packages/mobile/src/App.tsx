import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';

import { InventoryListScreen } from './screens/InventoryListScreen';
import { InventoryDetailScreen } from './screens/InventoryDetailScreen';
import { AddInventoryScreen } from './screens/AddInventoryScreen';

const Stack = createStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="InventoryList">
            <Stack.Screen 
              name="InventoryList" 
              component={InventoryListScreen}
              options={{ title: 'Inventory' }}
            />
            <Stack.Screen 
              name="InventoryDetail" 
              component={InventoryDetailScreen}
              options={{ title: 'Item Details' }}
            />
            <Stack.Screen 
              name="AddInventory" 
              component={AddInventoryScreen}
              options={{ title: 'Add Item' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </QueryClientProvider>
  );
}