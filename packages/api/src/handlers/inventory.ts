import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { InventoryItemSchema, ApiResponse } from '@restaurant-inventory/shared';
import { DatabaseService } from '../services/database';

const logger = new Logger();
const db = new DatabaseService();

export const getInventory = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const restaurantId = event.pathParameters?.restaurantId;
    
    if (!restaurantId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Restaurant ID is required',
          timestamp: new Date()
        } as ApiResponse)
      };
    }

    const items = await db.getInventoryItems(restaurantId);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: items,
        timestamp: new Date()
      } as ApiResponse)
    };
  } catch (error) {
    logger.error('Error fetching inventory', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      } as ApiResponse)
    };
  }
};

export const createInventoryItem = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const restaurantId = event.pathParameters?.restaurantId;
    const body = JSON.parse(event.body || '{}');
    
    if (!restaurantId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Restaurant ID is required',
          timestamp: new Date()
        } as ApiResponse)
      };
    }

    // Validate input
    const itemData = InventoryItemSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse({
      ...body,
      restaurantId
    });

    const newItem = await db.createInventoryItem(itemData);
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        data: newItem,
        timestamp: new Date()
      } as ApiResponse)
    };
  } catch (error) {
    logger.error('Error creating inventory item', { error });
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      } as ApiResponse)
    };
  }
};