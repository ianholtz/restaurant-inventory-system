import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import { InventoryService } from '../services/inventory-service';
import { InventoryItemSchema } from '@restaurant-inventory/shared';

/**
 * Types for inventory operations
 */
interface InventoryAdjustment {
  quantityChange: number;
  reason: 'sale' | 'delivery' | 'waste' | 'adjustment' | 'transfer';
  notes?: string;
}

interface BulkUpdate {
  itemId: string;
  quantityChange: number;
  reason?: string;
  notes?: string;
}

interface ExpirationAlert {
  itemId: string;
  itemName: string;
  daysUntilExpiry: number;
  severity: 'warning' | 'critical';
}

interface UsagePattern {
  itemId: string;
  averageDailyUsage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  predictedStockout: string | null;
}

const logger = new Logger({ serviceName: 'inventory-service' });
const metrics = new Metrics({ namespace: 'RestaurantInventory' });
const inventoryService = new InventoryService();

/**
 * Main Lambda handler for inventory management operations
 * 
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod, pathParameters, body, queryStringParameters, requestContext } = event;
  const restaurantId = pathParameters?.restaurantId;
  const itemId = pathParameters?.itemId;
  const userRestaurantId = requestContext.authorizer?.restaurantId;
  const userId = requestContext.authorizer?.userId;

  logger.addContext({ restaurantId, userId, httpMethod });
  metrics.addDimension('RestaurantId', restaurantId || 'unknown');

  // Authorization check
  if (restaurantId !== userRestaurantId) {
    logger.warn('Access denied', { requestedRestaurant: restaurantId, userRestaurant: userRestaurantId });
    metrics.addMetric('AccessDenied', MetricUnits.Count, 1);
    return createErrorResponse(403, 'Access denied');
  }

  try {
    let result: APIGatewayProxyResult;

    switch (httpMethod) {
      case 'GET':
        result = itemId 
          ? await getInventoryItem(restaurantId!, itemId)
          : await getInventoryItems(restaurantId!, queryStringParameters);
        break;

      case 'POST':
        if (event.path.includes('/adjust')) {
          result = await adjustInventory(restaurantId!, itemId!, body, userId!);
        } else if (event.path.includes('/bulk-update')) {
          result = await bulkUpdateInventory(restaurantId!, body, userId!);
        } else {
          result = await createInventoryItem(restaurantId!, body, userId!);
        }
        break;

      case 'PUT':
        result = await updateInventoryItem(restaurantId!, itemId!, body, userId!);
        break;

      case 'DELETE':
        result = await deleteInventoryItem(restaurantId!, itemId!, userId!);
        break;

      default:
        result = createErrorResponse(405, 'Method not allowed');
    }

    metrics.addMetric('RequestSuccess', MetricUnits.Count, 1);
    return result;

  } catch (error) {
    logger.error('Inventory handler error', { error: error.message, stack: error.stack });
    metrics.addMetric('RequestError', MetricUnits.Count, 1);
    return createErrorResponse(500, 'Internal server error');
  }
};

/**
 * Retrieves inventory items with filtering and alerts
 */
async function getInventoryItems(restaurantId: string, queryParams: any): Promise<APIGatewayProxyResult> {
  logger.info('Getting inventory items', { restaurantId, queryParams });

  const category = queryParams?.category;
  const expiring = queryParams?.expiring;
  const lowStock = queryParams?.lowStock === 'true';
  
  const items = await inventoryService.getInventoryItems(restaurantId, { category });
  
  // Calculate alerts and usage patterns
  const alerts = calculateExpirationAlerts(items);
  const usagePatterns = await calculateUsagePatterns(restaurantId, items);
  
  // Apply filters
  let filteredItems = items;
  
  if (expiring) {
    const days = parseInt(expiring);
    filteredItems = items.filter(item => {
      const daysUntilExpiry = Math.ceil(
        (new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= days;
    });
  }
  
  if (lowStock) {
    filteredItems = filteredItems.filter(item => item.quantity <= item.minimumStock);
  }

  metrics.addMetric('ItemsRetrieved', MetricUnits.Count, filteredItems.length);
  metrics.addMetric('AlertsGenerated', MetricUnits.Count, alerts.length);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      data: {
        items: filteredItems,
        alerts,
        usagePatterns,
        summary: {
          totalItems: items.length,
          lowStockCount: items.filter(i => i.quantity <= i.minimumStock).length,
          expiringCount: alerts.length
        }
      },
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Retrieves a single inventory item with detailed analytics
 */
async function getInventoryItem(restaurantId: string, itemId: string): Promise<APIGatewayProxyResult> {
  logger.info('Getting inventory item', { restaurantId, itemId });

  const item = await inventoryService.getInventoryItem(restaurantId, itemId);
  
  if (!item) {
    return createErrorResponse(404, 'Item not found');
  }

  const usageHistory = await inventoryService.getUsageHistory(restaurantId, itemId);
  const alerts = calculateExpirationAlerts([item]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      data: {
        item,
        usageHistory,
        alerts: alerts.filter(alert => alert.itemId === itemId)
      },
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Creates a new inventory item with transaction safety
 */
async function createInventoryItem(restaurantId: string, body: string | null, userId: string): Promise<APIGatewayProxyResult> {
  logger.info('Creating inventory item', { restaurantId, userId });

  const data = JSON.parse(body || '{}');
  
  try {
    const validatedData = InventoryItemSchema.omit({ 
      id: true, 
      restaurantId: true, 
      createdAt: true, 
      updatedAt: true 
    }).parse(data);

    const item = await inventoryService.createInventoryItemWithTransaction(restaurantId, validatedData, userId);
    
    metrics.addMetric('ItemCreated', MetricUnits.Count, 1);
    logger.info('Inventory item created', { itemId: item.id, name: item.name });

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        data: item,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    logger.error('Validation failed', { error: error.message });
    return createErrorResponse(400, 'Validation failed', error.errors || [error.message]);
  }
}

/**
 * Updates inventory item with optimistic locking
 */
async function updateInventoryItem(restaurantId: string, itemId: string, body: string | null, userId: string): Promise<APIGatewayProxyResult> {
  logger.info('Updating inventory item', { restaurantId, itemId, userId });

  const data = JSON.parse(body || '{}');
  
  try {
    const validatedData = InventoryItemSchema.omit({ 
      id: true, 
      restaurantId: true, 
      createdAt: true, 
      updatedAt: true 
    }).partial().parse(data);

    const item = await inventoryService.updateInventoryItemWithTransaction(restaurantId, itemId, validatedData, userId);

    if (!item) {
      return createErrorResponse(404, 'Item not found');
    }

    metrics.addMetric('ItemUpdated', MetricUnits.Count, 1);
    logger.info('Inventory item updated', { itemId, changes: Object.keys(validatedData) });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: item,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    logger.error('Update validation failed', { error: error.message });
    return createErrorResponse(400, 'Validation failed', error.errors || [error.message]);
  }
}

/**
 * Adjusts inventory quantity with transaction logging
 */
async function adjustInventory(restaurantId: string, itemId: string, body: string | null, userId: string): Promise<APIGatewayProxyResult> {
  logger.info('Adjusting inventory', { restaurantId, itemId, userId });

  const adjustment: InventoryAdjustment = JSON.parse(body || '{}');
  
  if (!adjustment.quantityChange || !adjustment.reason) {
    return createErrorResponse(400, 'Quantity change and reason required');
  }

  try {
    const result = await inventoryService.adjustInventoryWithTransaction(
      restaurantId, 
      itemId, 
      adjustment.quantityChange, 
      adjustment.reason, 
      userId,
      adjustment.notes
    );

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Adjustment failed');
    }

    metrics.addMetric('InventoryAdjusted', MetricUnits.Count, 1);
    metrics.addMetric('QuantityChanged', MetricUnits.Count, Math.abs(adjustment.quantityChange));
    
    logger.info('Inventory adjusted', { 
      itemId, 
      quantityChange: adjustment.quantityChange, 
      reason: adjustment.reason,
      newQuantity: result.item?.quantity
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: result.item,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    logger.error('Inventory adjustment failed', { error: error.message, itemId });
    return createErrorResponse(500, 'Adjustment failed');
  }
}

/**
 * Performs bulk inventory updates with transaction safety
 */
async function bulkUpdateInventory(restaurantId: string, body: string | null, userId: string): Promise<APIGatewayProxyResult> {
  logger.info('Bulk updating inventory', { restaurantId, userId });

  const { updates }: { updates: BulkUpdate[] } = JSON.parse(body || '{}');
  
  if (!Array.isArray(updates) || updates.length === 0) {
    return createErrorResponse(400, 'Updates array required');
  }

  if (updates.length > 50) {
    return createErrorResponse(400, 'Maximum 50 updates per request');
  }

  try {
    const result = await inventoryService.bulkUpdateInventoryWithTransaction(restaurantId, updates, userId);

    metrics.addMetric('BulkUpdateRequested', MetricUnits.Count, updates.length);
    metrics.addMetric('BulkUpdateSucceeded', MetricUnits.Count, result.succeeded);
    metrics.addMetric('BulkUpdateFailed', MetricUnits.Count, result.failed);

    logger.info('Bulk update completed', { 
      totalRequested: updates.length,
      succeeded: result.succeeded,
      failed: result.failed
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          totalRequested: updates.length,
          succeeded: result.succeeded,
          failed: result.failed,
          errors: result.errors
        },
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    logger.error('Bulk update failed', { error: error.message });
    return createErrorResponse(500, 'Bulk update failed');
  }
}

/**
 * Deletes inventory item with cascade handling
 */
async function deleteInventoryItem(restaurantId: string, itemId: string, userId: string): Promise<APIGatewayProxyResult> {
  logger.info('Deleting inventory item', { restaurantId, itemId, userId });

  try {
    const deleted = await inventoryService.deleteInventoryItemWithTransaction(restaurantId, itemId, userId);
    
    if (!deleted) {
      return createErrorResponse(404, 'Item not found');
    }

    metrics.addMetric('ItemDeleted', MetricUnits.Count, 1);
    logger.info('Inventory item deleted', { itemId });

    return {
      statusCode: 204,
      body: ''
    };
  } catch (error) {
    logger.error('Delete failed', { error: error.message, itemId });
    return createErrorResponse(500, 'Delete failed');
  }
}

/**
 * Calculates expiration alerts for inventory items
 */
function calculateExpirationAlerts(items: any[]): ExpirationAlert[] {
  const alerts: ExpirationAlert[] = [];
  const now = Date.now();

  for (const item of items) {
    const expiryTime = new Date(item.expirationDate).getTime();
    const daysUntilExpiry = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      alerts.push({
        itemId: item.id,
        itemName: item.name,
        daysUntilExpiry,
        severity: daysUntilExpiry <= 2 ? 'critical' : 'warning'
      });
    }
  }

  return alerts;
}

/**
 * Calculates usage patterns for predictive analytics
 */
async function calculateUsagePatterns(restaurantId: string, items: any[]): Promise<UsagePattern[]> {
  const patterns: UsagePattern[] = [];

  // Simplified pattern calculation - in production, this would use historical transaction data
  for (const item of items.slice(0, 10)) { // Limit for performance
    try {
      const usageHistory = await inventoryService.getUsageHistory(restaurantId, item.id, 30);
      
      if (usageHistory.length > 0) {
        const totalUsage = usageHistory.reduce((sum, record) => sum + Math.abs(record.quantityChange), 0);
        const averageDailyUsage = totalUsage / Math.max(usageHistory.length, 1);
        
        // Simple trend calculation
        const recentUsage = usageHistory.slice(-7).reduce((sum, record) => sum + Math.abs(record.quantityChange), 0) / 7;
        const olderUsage = usageHistory.slice(0, 7).reduce((sum, record) => sum + Math.abs(record.quantityChange), 0) / 7;
        
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (recentUsage > olderUsage * 1.2) trend = 'increasing';
        else if (recentUsage < olderUsage * 0.8) trend = 'decreasing';
        
        // Predict stockout
        const daysUntilStockout = averageDailyUsage > 0 ? Math.floor(item.quantity / averageDailyUsage) : null;
        const predictedStockout = daysUntilStockout ? 
          new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null;
        
        patterns.push({
          itemId: item.id,
          averageDailyUsage,
          trend,
          predictedStockout
        });
      }
    } catch (error) {
      logger.warn('Failed to calculate usage pattern', { itemId: item.id, error: error.message });
    }
  }

  return patterns;
}

/**
 * Creates standardized error response
 */
function createErrorResponse(statusCode: number, message: string, details?: string[]): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    })
  };
}