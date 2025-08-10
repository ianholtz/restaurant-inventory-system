import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, FAB, Chip } from 'react-native-paper';
import { useQuery } from 'react-query';
import { InventoryItem } from '@restaurant-inventory/shared';

interface Props {
  navigation: any;
}

export const InventoryListScreen: React.FC<Props> = ({ navigation }) => {
  const { data: inventory, isLoading } = useQuery<InventoryItem[]>(
    'inventory',
    () => fetchInventory()
  );

  const fetchInventory = async (): Promise<InventoryItem[]> => {
    // Replace with actual API call
    const response = await fetch('/api/restaurants/123/inventory');
    const result = await response.json();
    return result.data;
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    const isExpiringSoon = new Date(item.expirationDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const isLowStock = item.quantity <= item.minimumStock;

    return (
      <Card 
        style={styles.card}
        onPress={() => navigation.navigate('InventoryDetail', { item })}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title>{item.name}</Title>
            <View style={styles.chips}>
              {isExpiringSoon && (
                <Chip mode="outlined" textStyle={{ color: '#d32f2f' }}>
                  Expiring Soon
                </Chip>
              )}
              {isLowStock && (
                <Chip mode="outlined" textStyle={{ color: '#f57c00' }}>
                  Low Stock
                </Chip>
              )}
            </View>
          </View>
          <Paragraph>
            Quantity: {item.quantity} {item.unit}
          </Paragraph>
          <Paragraph>
            Expires: {new Date(item.expirationDate).toLocaleDateString()}
          </Paragraph>
          <Paragraph>
            Supplier: {item.supplier}
          </Paragraph>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={inventory}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddInventory')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});