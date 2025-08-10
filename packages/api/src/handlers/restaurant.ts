import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb-service';
import { RestaurantSchema } from '@restaurant-inventory/shared';

const db = new DynamoDBService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod, pathParameters, body, requestContext } = event;
  const userId = requestContext.authorizer?.userId;
  const userRole = requestContext.authorizer?.role;
  const userRestaurantId = requestContext.authorizer?.restaurantId;

  try {
    switch (httpMethod) {
      case 'GET':
        if (pathParameters?.restaurantId) {
          return await getRestaurant(pathParameters.restaurantId, userRestaurantId, userRole);
        }
        return await getRestaurants(userId);

      case 'POST':
        return await createRestaurant(body, userId, userRole);

      case 'PUT':
        return await updateRestaurant(pathParameters?.restaurantId, body, userRestaurantId, userRole);

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Restaurant handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};

async function getRestaurants(userId: string): Promise<APIGatewayProxyResult> {
  const restaurants = await db.getUserRestaurants(userId);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      data: restaurants,
      timestamp: new Date().toISOString()
    })
  };
}

async function getRestaurant(restaurantId: string, userRestaurantId: string, userRole: string): Promise<APIGatewayProxyResult> {
  // Check access permissions
  if (userRole !== 'owner' && restaurantId !== userRestaurantId) {
    return {
      statusCode: 403,
      body: JSON.stringify({ success: false, error: 'Access denied' })
    };
  }

  const restaurant = await db.getRestaurant(restaurantId);
  
  if (!restaurant) {
    return {
      statusCode: 404,
      body: JSON.stringify({ success: false, error: 'Restaurant not found' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      data: restaurant,
      timestamp: new Date().toISOString()
    })
  };
}

async function createRestaurant(body: string | null, userId: string, userRole: string): Promise<APIGatewayProxyResult> {
  if (userRole !== 'owner') {
    return {
      statusCode: 403,
      body: JSON.stringify({ success: false, error: 'Only owners can create restaurants' })
    };
  }

  const data = JSON.parse(body || '{}');
  
  try {
    const validatedData = RestaurantSchema.omit({ 
      id: true, 
      createdAt: true, 
      updatedAt: true 
    }).parse(data);

    const restaurant = await db.createRestaurant(validatedData);

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        data: restaurant,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: 'Validation failed',
        details: error.errors || [error.message]
      })
    };
  }
}

async function updateRestaurant(restaurantId: string | undefined, body: string | null, userRestaurantId: string, userRole: string): Promise<APIGatewayProxyResult> {
  if (!restaurantId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: 'Restaurant ID required' })
    };
  }

  // Check access permissions
  if (userRole !== 'owner' && restaurantId !== userRestaurantId) {
    return {
      statusCode: 403,
      body: JSON.stringify({ success: false, error: 'Access denied' })
    };
  }

  const data = JSON.parse(body || '{}');
  
  try {
    const validatedData = RestaurantSchema.omit({ 
      id: true, 
      createdAt: true, 
      updatedAt: true 
    }).partial().parse(data);

    const restaurant = await db.updateRestaurant(restaurantId, validatedData);

    if (!restaurant) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: 'Restaurant not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: restaurant,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: 'Validation failed',
        details: error.errors || [error.message]
      })
    };
  }
}