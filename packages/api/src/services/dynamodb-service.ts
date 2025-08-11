import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { InventoryItem, Restaurant, User, WasteReport } from '@restaurant-inventory/shared';

export class DynamoDBService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.DYNAMODB_TABLE_NAME!;
  }

  // Restaurant operations
  async getRestaurant(restaurantId: string): Promise<Restaurant | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `RESTAURANT#${restaurantId}`,
        SK: 'METADATA'
      }
    }));
    return result.Item as Restaurant || null;
  }

  async createRestaurant(restaurant: Omit<Restaurant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Restaurant> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const item = {
      PK: `RESTAURANT#${id}`,
      SK: 'METADATA',
      GSI1PK: `RESTAURANT#${id}`,
      GSI1SK: 'METADATA',
      EntityType: 'Restaurant',
      id,
      ...restaurant,
      createdAt: now,
      updatedAt: now
    };

    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: item
    }));

    return item as Restaurant;
  }

  // Inventory operations
  async getInventoryItems(restaurantId: string, category?: string): Promise<InventoryItem[]> {
    const params = category ? {
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `RESTAURANT#${restaurantId}`,
        ':sk': `ITEM#${category}`
      }
    } : {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `RESTAURANT#${restaurantId}`,
        ':sk': 'ITEM#'
      }
    };

    const result = await this.client.send(new QueryCommand(params));
    return result.Items as InventoryItem[] || [];
  }

  async getExpiringItems(category: string, startDate: string, endDate: string): Promise<InventoryItem[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':pk': `CATEGORY#${category}`,
        ':start': `EXPIRY#${startDate}`,
        ':end': `EXPIRY#${endDate}`
      }
    }));
    return result.Items as InventoryItem[] || [];
  }

  async createInventoryItem(restaurantId: string, item: Omit<InventoryItem, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const inventoryItem = {
      PK: `RESTAURANT#${restaurantId}`,
      SK: `ITEM#${id}`,
      GSI1PK: `RESTAURANT#${restaurantId}`,
      GSI1SK: `ITEM#${item.category}#${item.expirationDate}`,
      GSI2PK: `CATEGORY#${item.category}`,
      GSI2SK: `EXPIRY#${item.expirationDate}#${restaurantId}`,
      EntityType: 'InventoryItem',
      id,
      restaurantId,
      ...item,
      createdAt: now,
      updatedAt: now
    };

    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: inventoryItem
    }));

    return inventoryItem as InventoryItem;
  }

  async updateInventoryQuantity(restaurantId: string, itemId: string, quantityChange: number, reason: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const transactionId = crypto.randomUUID();
    const yearMonth = timestamp.substring(0, 7).replace('-', '');

    // Update inventory item quantity
    await this.client.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `RESTAURANT#${restaurantId}`,
        SK: `ITEM#${itemId}`
      },
      UpdateExpression: 'ADD quantity :change SET updatedAt = :now',
      ExpressionAttributeValues: {
        ':change': quantityChange,
        ':now': timestamp
      }
    }));

    // Log transaction
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `RESTAURANT#${restaurantId}`,
        SK: `TRANSACTION#${timestamp}#${transactionId}`,
        GSI1PK: `ITEM#${itemId}`,
        GSI1SK: `TRANSACTION#${timestamp}`,
        GSI3PK: `RESTAURANT#${restaurantId}#${yearMonth}`,
        GSI3SK: `TRANSACTION#${timestamp}`,
        EntityType: 'Transaction',
        id: transactionId,
        restaurantId,
        itemId,
        quantityChange,
        reason,
        createdAt: timestamp
      }
    }));
  }

  // Waste tracking
  async createWasteReport(restaurantId: string, report: Omit<WasteReport, 'id' | 'restaurantId' | 'createdAt'>): Promise<WasteReport> {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const date = timestamp.substring(0, 10);
    const yearMonth = timestamp.substring(0, 7).replace('-', '');

    const wasteReport = {
      PK: `RESTAURANT#${restaurantId}`,
      SK: `WASTE#${timestamp}#${id}`,
      GSI1PK: `RESTAURANT#${restaurantId}`,
      GSI1SK: `WASTE#${report.category}#${timestamp}`,
      GSI2PK: `WASTE#${report.category}`,
      GSI2SK: `DATE#${date}#${restaurantId}`,
      GSI3PK: `RESTAURANT#${restaurantId}#${yearMonth}`,
      GSI3SK: `WASTE#${timestamp}`,
      EntityType: 'WasteReport',
      id,
      restaurantId,
      ...report,
      createdAt: timestamp
    };

    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: wasteReport
    }));

    return wasteReport as WasteReport;
  }

  async getWasteReports(restaurantId: string, startDate?: string, endDate?: string): Promise<WasteReport[]> {
    const yearMonth = startDate ? startDate.substring(0, 7).replace('-', '') : new Date().toISOString().substring(0, 7).replace('-', '');
    
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk AND begins_with(GSI3SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `RESTAURANT#${restaurantId}#${yearMonth}`,
        ':sk': 'WASTE#'
      }
    }));

    return result.Items as WasteReport[] || [];
  }

  // Analytics
  async getMonthlyAnalytics(restaurantId: string, yearMonth: string): Promise<any[]> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `RESTAURANT#${restaurantId}#${yearMonth}`
      }
    }));

    return result.Items || [];
  }

  // User operations
  async getUser(userId: string): Promise<User | null> {
    const result = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'METADATA'
      }
    }));

    return result.Item as User || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI4',
      KeyConditionExpression: 'GSI4PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `EMAIL#${email}`
      }
    }));

    return result.Items?.[0] as User || null;
  }

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const userItem = {
      PK: `USER#${id}`,
      SK: 'METADATA',
      GSI4PK: `EMAIL#${user.email}`,
      GSI4SK: `USER#${id}`,
      EntityType: 'User',
      id,
      ...user,
      createdAt: now,
      updatedAt: now
    };

    // Only add restaurant-related GSI keys if user has a restaurantId
    if (user.restaurantId) {
      userItem.GSI1PK = `RESTAURANT#${user.restaurantId}`;
      userItem.GSI1SK = `USER#${id}`;
    }

    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: userItem
    }));

    return userItem as User;
  }

  async initializeAdminUser(): Promise<User> {
    const adminEmail = 'admin@system.local';
    
    // Check if admin user already exists
    const existingAdmin = await this.getUserByEmail(adminEmail);
    if (existingAdmin) {
      return existingAdmin;
    }

    // Create admin user with hardcoded credentials
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash('admin', 10);

    const adminUser = await this.createUser({
      email: adminEmail,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      passwordHash
    });

    return adminUser;
  }
}