import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  TransactWriteCommand, 
  QueryCommand, 
  GetCommand,
  UpdateCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { InventoryItem } from '@restaurant-inventory/shared';

/**
 * Transaction result interface
 */
interface TransactionResult<T = any> {
  success: boolean;
  item?: T;
  error?: string;
}

/**
 * Bulk update result interface
 */
interface BulkUpdateResult {
  succeeded: number;
  failed: number;
  errors: Array<{ itemId: string; error: string }>;
}

/**
 * Usage history record interface
 */
interface UsageHistoryRecord {
  timestamp: string;
  quantityChange: number;
  reason: string;
  userId: string;
}

/**
 * Inventory service with DynamoDB transactions and advanced analytics
 */
export class InventoryService {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private logger: Logger;

  constructor() {
    const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.DYNAMODB_TABLE_NAME!;
    this.logger = new Logger({ serviceName: 'inventory-service' });
  }

  /**
   * Retrieves inventory items with optional filtering
   * 
   * @param restaurantId - Restaurant identifier
   * @param options - Query options including category filter
   * @returns Array of inventory items
   */
  async getInventoryItems(restaurantId: string, options: { category?: string } = {}): Promise<InventoryItem[]> {
    this.logger.info('Getting inventory items', { restaurantId, options });

    const params = options.category ? {
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `RESTAURANT#${restaurantId}`,
        ':sk': `ITEM#${options.category}`
      }
    } : {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `RESTAURANT#${restaurantId}`,
        ':sk': 'ITEM#'
      }
    };

    try {
      const result = await this.client.send(new QueryCommand(params));
      return result.Items as InventoryItem[] || [];
    } catch (error) {
      this.logger.error('Failed to get inventory items', { error: error.message, restaurantId });
      throw new Error('Failed to retrieve inventory items');
    }
  }

  /**
   * Retrieves a single inventory item
   * 
   * @param restaurantId - Restaurant identifier
   * @param itemId - Item identifier
   * @returns Inventory item or null if not found
   */
  async getInventoryItem(restaurantId: string, itemId: string): Promise<InventoryItem | null> {
    this.logger.info('Getting inventory item', { restaurantId, itemId });

    try {
      const result = await this.client.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `RESTAURANT#${restaurantId}`,
          SK: `ITEM#${itemId}`
        }
      }));

      return result.Item as InventoryItem || null;
    } catch (error) {
      this.logger.error('Failed to get inventory item', { error: error.message, restaurantId, itemId });
      throw new Error('Failed to retrieve inventory item');
    }
  }

  /**
   * Creates inventory item with transaction safety
   * 
   * @param restaurantId - Restaurant identifier
   * @param itemData - Item data to create
   * @param userId - User performing the operation
   * @returns Created inventory item
   */
  async createInventoryItemWithTransaction(
    restaurantId: string, 
    itemData: Omit<InventoryItem, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>, 
    userId: string
  ): Promise<InventoryItem> {
    const itemId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const yearMonth = timestamp.substring(0, 7).replace('-', '');

    const inventoryItem: InventoryItem = {
      id: itemId,
      restaurantId,
      ...itemData,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Prepare transaction items
    const transactItems = [
      // Create inventory item
      {
        Put: {
          TableName: this.tableName,
          Item: {
            PK: `RESTAURANT#${restaurantId}`,
            SK: `ITEM#${itemId}`,
            GSI1PK: `RESTAURANT#${restaurantId}`,
            GSI1SK: `ITEM#${itemData.category}#${itemData.expirationDate}`,
            GSI2PK: `CATEGORY#${itemData.category}`,
            GSI2SK: `EXPIRY#${itemData.expirationDate}#${restaurantId}`,
            EntityType: 'InventoryItem',
            ...inventoryItem
          },
          ConditionExpression: 'attribute_not_exists(PK)'
        }
      },
      // Log creation transaction
      {
        Put: {
          TableName: this.tableName,
          Item: {
            PK: `RESTAURANT#${restaurantId}`,
            SK: `TRANSACTION#${timestamp}#${crypto.randomUUID()}`,
            GSI1PK: `ITEM#${itemId}`,
            GSI1SK: `TRANSACTION#${timestamp}`,
            GSI3PK: `RESTAURANT#${restaurantId}#${yearMonth}`,
            GSI3SK: `TRANSACTION#${timestamp}`,
            EntityType: 'Transaction',
            itemId,
            restaurantId,
            quantityChange: itemData.quantity,
            reason: 'creation',
            userId,
            createdAt: timestamp
          }
        }
      }
    ];

    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: transactItems }));
      this.logger.info('Inventory item created with transaction', { itemId, restaurantId });
      return inventoryItem;
    } catch (error) {
      this.logger.error('Failed to create inventory item', { error: error.message, itemId });
      throw new Error('Failed to create inventory item');
    }
  }

  /**
   * Updates inventory item with transaction safety
   * 
   * @param restaurantId - Restaurant identifier
   * @param itemId - Item identifier
   * @param updates - Updates to apply
   * @param userId - User performing the operation
   * @returns Updated inventory item or null if not found
   */
  async updateInventoryItemWithTransaction(
    restaurantId: string, 
    itemId: string, 
    updates: Partial<InventoryItem>, 
    userId: string
  ): Promise<InventoryItem | null> {
    const timestamp = new Date().toISOString();

    // First, get the current item to check if it exists
    const currentItem = await this.getInventoryItem(restaurantId, itemId);
    if (!currentItem) {
      return null;
    }

    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
    });

    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = timestamp;

    const transactItems = [
      // Update inventory item
      {
        Update: {
          TableName: this.tableName,
          Key: {
            PK: `RESTAURANT#${restaurantId}`,
            SK: `ITEM#${itemId}`
          },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: 'attribute_exists(PK)'
        }
      },
      // Log update transaction
      {
        Put: {
          TableName: this.tableName,
          Item: {
            PK: `RESTAURANT#${restaurantId}`,
            SK: `TRANSACTION#${timestamp}#${crypto.randomUUID()}`,
            GSI1PK: `ITEM#${itemId}`,
            GSI1SK: `TRANSACTION#${timestamp}`,
            EntityType: 'Transaction',
            itemId,
            restaurantId,
            quantityChange: 0,
            reason: 'update',
            userId,
            changes: Object.keys(updates),
            createdAt: timestamp
          }
        }
      }
    ];

    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: transactItems }));
      
      // Return updated item
      const updatedItem = { ...currentItem, ...updates, updatedAt: timestamp };
      this.logger.info('Inventory item updated with transaction', { itemId, changes: Object.keys(updates) });
      return updatedItem;
    } catch (error) {
      this.logger.error('Failed to update inventory item', { error: error.message, itemId });
      throw new Error('Failed to update inventory item');
    }
  }

  /**
   * Adjusts inventory quantity with transaction safety and validation
   * 
   * @param restaurantId - Restaurant identifier
   * @param itemId - Item identifier
   * @param quantityChange - Quantity change (positive or negative)
   * @param reason - Reason for adjustment
   * @param userId - User performing the operation
   * @param notes - Optional notes
   * @returns Transaction result
   */
  async adjustInventoryWithTransaction(
    restaurantId: string,
    itemId: string,
    quantityChange: number,
    reason: string,
    userId: string,
    notes?: string
  ): Promise<TransactionResult<InventoryItem>> {
    const timestamp = new Date().toISOString();
    const yearMonth = timestamp.substring(0, 7).replace('-', '');

    // Get current item to validate the adjustment
    const currentItem = await this.getInventoryItem(restaurantId, itemId);
    if (!currentItem) {
      return { success: false, error: 'Item not found' };
    }

    const newQuantity = currentItem.quantity + quantityChange;
    if (newQuantity < 0) {
      return { success: false, error: 'Insufficient inventory quantity' };
    }

    const transactItems = [
      // Update inventory quantity
      {
        Update: {
          TableName: this.tableName,
          Key: {
            PK: `RESTAURANT#${restaurantId}`,
            SK: `ITEM#${itemId}`
          },
          UpdateExpression: 'ADD quantity :change SET updatedAt = :timestamp',
          ExpressionAttributeValues: {
            ':change': quantityChange,
            ':timestamp': timestamp
          },
          ConditionExpression: 'attribute_exists(PK) AND quantity >= :minQuantity',
          ExpressionAttributeValues: {
            ':change': quantityChange,
            ':timestamp': timestamp,
            ':minQuantity': quantityChange < 0 ? Math.abs(quantityChange) : 0
          }
        }
      },
      // Log transaction
      {
        Put: {
          TableName: this.tableName,
          Item: {
            PK: `RESTAURANT#${restaurantId}`,
            SK: `TRANSACTION#${timestamp}#${crypto.randomUUID()}`,
            GSI1PK: `ITEM#${itemId}`,
            GSI1SK: `TRANSACTION#${timestamp}`,
            GSI3PK: `RESTAURANT#${restaurantId}#${yearMonth}`,
            GSI3SK: `TRANSACTION#${timestamp}`,
            EntityType: 'Transaction',
            itemId,
            restaurantId,
            quantityChange,
            reason,
            userId,
            notes,
            createdAt: timestamp
          }
        }
      }
    ];

    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: transactItems }));
      
      const updatedItem = { ...currentItem, quantity: newQuantity, updatedAt: timestamp };
      this.logger.info('Inventory quantity adjusted', { itemId, quantityChange, newQuantity });
      
      return { success: true, item: updatedItem };
    } catch (error) {
      this.logger.error('Failed to adjust inventory', { error: error.message, itemId, quantityChange });
      
      if (error.name === 'TransactionCanceledException') {
        return { success: false, error: 'Insufficient inventory or concurrent modification' };
      }
      
      return { success: false, error: 'Failed to adjust inventory' };
    }
  }

  /**
   * Performs bulk inventory updates with transaction batching
   * 
   * @param restaurantId - Restaurant identifier
   * @param updates - Array of updates to perform
   * @param userId - User performing the operation
   * @returns Bulk update result
   */
  async bulkUpdateInventoryWithTransaction(
    restaurantId: string,
    updates: Array<{ itemId: string; quantityChange: number; reason?: string; notes?: string }>,
    userId: string
  ): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = { succeeded: 0, failed: 0, errors: [] };
    
    // Process updates in batches of 25 (DynamoDB transaction limit)
    const batchSize = 25;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        try {
          const adjustResult = await this.adjustInventoryWithTransaction(
            restaurantId,
            update.itemId,
            update.quantityChange,
            update.reason || 'bulk_update',
            userId,
            update.notes
          );
          
          if (adjustResult.success) {
            result.succeeded++;
          } else {
            result.failed++;
            result.errors.push({ itemId: update.itemId, error: adjustResult.error || 'Unknown error' });
          }
        } catch (error) {
          result.failed++;
          result.errors.push({ itemId: update.itemId, error: error.message });
        }
      }
    }

    this.logger.info('Bulk update completed', { 
      total: updates.length, 
      succeeded: result.succeeded, 
      failed: result.failed 
    });

    return result;
  }

  /**
   * Deletes inventory item with transaction safety
   * 
   * @param restaurantId - Restaurant identifier
   * @param itemId - Item identifier
   * @param userId - User performing the operation
   * @returns True if deleted, false if not found
   */
  async deleteInventoryItemWithTransaction(restaurantId: string, itemId: string, userId: string): Promise<boolean> {
    const timestamp = new Date().toISOString();

    // Check if item exists
    const currentItem = await this.getInventoryItem(restaurantId, itemId);
    if (!currentItem) {
      return false;
    }

    const transactItems = [
      // Delete inventory item
      {
        Delete: {
          TableName: this.tableName,
          Key: {
            PK: `RESTAURANT#${restaurantId}`,
            SK: `ITEM#${itemId}`
          },
          ConditionExpression: 'attribute_exists(PK)'
        }
      },
      // Log deletion transaction
      {
        Put: {
          TableName: this.tableName,
          Item: {
            PK: `RESTAURANT#${restaurantId}`,
            SK: `TRANSACTION#${timestamp}#${crypto.randomUUID()}`,
            GSI1PK: `ITEM#${itemId}`,
            GSI1SK: `TRANSACTION#${timestamp}`,
            EntityType: 'Transaction',
            itemId,
            restaurantId,
            quantityChange: -currentItem.quantity,
            reason: 'deletion',
            userId,
            createdAt: timestamp
          }
        }
      }
    ];

    try {
      await this.client.send(new TransactWriteCommand({ TransactItems: transactItems }));
      this.logger.info('Inventory item deleted with transaction', { itemId });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete inventory item', { error: error.message, itemId });
      throw new Error('Failed to delete inventory item');
    }
  }

  /**
   * Retrieves usage history for an inventory item
   * 
   * @param restaurantId - Restaurant identifier
   * @param itemId - Item identifier
   * @param days - Number of days to look back (default: 30)
   * @returns Array of usage history records
   */
  async getUsageHistory(restaurantId: string, itemId: string, days: number = 30): Promise<UsageHistoryRecord[]> {
    this.logger.info('Getting usage history', { restaurantId, itemId, days });

    try {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `ITEM#${itemId}`,
          ':sk': 'TRANSACTION#'
        },
        ScanIndexForward: false, // Most recent first
        Limit: days * 5 // Approximate limit based on expected transactions per day
      }));

      return (result.Items || []).map(item => ({
        timestamp: item.createdAt,
        quantityChange: item.quantityChange,
        reason: item.reason,
        userId: item.userId
      }));
    } catch (error) {
      this.logger.error('Failed to get usage history', { error: error.message, itemId });
      return [];
    }
  }
}