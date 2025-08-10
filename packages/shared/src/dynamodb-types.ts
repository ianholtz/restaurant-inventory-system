// DynamoDB-specific type extensions for single-table design

export interface DynamoDBRecord {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  GSI3PK?: string;
  GSI3SK?: string;
  GSI4PK?: string;
  GSI4SK?: string;
  EntityType: string;
  TTL?: number;
}

export interface RestaurantRecord extends DynamoDBRecord {
  EntityType: 'Restaurant';
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord extends DynamoDBRecord {
  EntityType: 'User';
  id: string;
  restaurantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'manager' | 'staff';
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemRecord extends DynamoDBRecord {
  EntityType: 'InventoryItem';
  id: string;
  restaurantId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  expirationDate: string;
  minimumStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecord extends DynamoDBRecord {
  EntityType: 'Transaction';
  id: string;
  restaurantId: string;
  itemId: string;
  quantityChange: number;
  reason: 'sale' | 'delivery' | 'waste' | 'adjustment' | 'transfer';
  notes?: string;
  userId: string;
  createdAt: string;
}

export interface WasteReportRecord extends DynamoDBRecord {
  EntityType: 'WasteReport';
  id: string;
  restaurantId: string;
  inventoryItemId: string;
  itemName: string;
  category: string;
  quantityWasted: number;
  wasteReason: 'expired' | 'spoiled' | 'overproduction' | 'damaged' | 'contaminated' | 'other';
  costImpact: number;
  notes?: string;
  reportedBy: string;
  createdAt: string;
}

export interface AnalyticsSummaryRecord extends DynamoDBRecord {
  EntityType: 'AnalyticsSummary';
  restaurantId: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
  totalInventoryValue: number;
  totalWasteValue: number;
  totalWasteQuantity: number;
  lowStockItems: number;
  expiringSoonItems: number;
  createdAt: string;
}

// Key generation utilities
export class DynamoDBKeyGenerator {
  static restaurantKey(restaurantId: string) {
    return {
      PK: `RESTAURANT#${restaurantId}`,
      SK: 'METADATA'
    };
  }

  static userKey(userId: string) {
    return {
      PK: `USER#${userId}`,
      SK: 'METADATA'
    };
  }

  static inventoryItemKey(restaurantId: string, itemId: string) {
    return {
      PK: `RESTAURANT#${restaurantId}`,
      SK: `ITEM#${itemId}`
    };
  }

  static transactionKey(restaurantId: string, timestamp: string, transactionId: string) {
    return {
      PK: `RESTAURANT#${restaurantId}`,
      SK: `TRANSACTION#${timestamp}#${transactionId}`
    };
  }

  static wasteReportKey(restaurantId: string, timestamp: string, wasteId: string) {
    return {
      PK: `RESTAURANT#${restaurantId}`,
      SK: `WASTE#${timestamp}#${wasteId}`
    };
  }

  static analyticsKey(restaurantId: string, period: string, date: string) {
    return {
      PK: `ANALYTICS#${restaurantId}`,
      SK: `SUMMARY#${period}#${date}`
    };
  }

  // GSI key generators
  static restaurantItemsGSI(restaurantId: string, category?: string, expirationDate?: string) {
    return {
      GSI1PK: `RESTAURANT#${restaurantId}`,
      GSI1SK: category && expirationDate ? `ITEM#${category}#${expirationDate}` : 'ITEM#'
    };
  }

  static categoryExpirationGSI(category: string, expirationDate: string, restaurantId: string) {
    return {
      GSI2PK: `CATEGORY#${category}`,
      GSI2SK: `EXPIRY#${expirationDate}#${restaurantId}`
    };
  }

  static timeBasedAnalyticsGSI(restaurantId: string, yearMonth: string, type: 'TRANSACTION' | 'WASTE', timestamp: string) {
    return {
      GSI3PK: `RESTAURANT#${restaurantId}#${yearMonth}`,
      GSI3SK: `${type}#${timestamp}`
    };
  }

  static userEmailGSI(email: string, userId: string) {
    return {
      GSI4PK: `EMAIL#${email}`,
      GSI4SK: `USER#${userId}`
    };
  }
}