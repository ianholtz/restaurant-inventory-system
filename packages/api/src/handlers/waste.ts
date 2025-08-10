import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb-service';

const db = new DynamoDBService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod, pathParameters, body, queryStringParameters, requestContext } = event;
  const restaurantId = pathParameters?.restaurantId;
  const userRestaurantId = requestContext.authorizer?.restaurantId;
  const userId = requestContext.authorizer?.userId;

  if (restaurantId !== userRestaurantId) {
    return {
      statusCode: 403,
      body: JSON.stringify({ success: false, error: 'Access denied' })
    };
  }

  try {
    switch (httpMethod) {
      case 'GET':
        if (event.path.includes('/summary')) {
          return await getWasteSummary(restaurantId!, queryStringParameters);
        }
        return await getWasteReports(restaurantId!, queryStringParameters);

      case 'POST':
        return await createWasteReport(restaurantId!, body, userId);

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Waste handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};

async function getWasteReports(restaurantId: string, queryParams: any): Promise<APIGatewayProxyResult> {
  const startDate = queryParams?.startDate;
  const endDate = queryParams?.endDate;
  const category = queryParams?.category;

  const reports = await db.getWasteReports(restaurantId, startDate, endDate);

  // Filter by category if specified
  const filteredReports = category 
    ? reports.filter(report => report.category === category)
    : reports;

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      data: filteredReports,
      timestamp: new Date().toISOString()
    })
  };
}

async function createWasteReport(restaurantId: string, body: string | null, userId: string): Promise<APIGatewayProxyResult> {
  const data = JSON.parse(body || '{}');
  
  if (!data.inventoryItemId || !data.quantityWasted || !data.wasteReason) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        success: false, 
        error: 'Inventory item ID, quantity wasted, and waste reason are required' 
      })
    };
  }

  // Get inventory item details
  const inventoryItem = await db.getInventoryItem(restaurantId, data.inventoryItemId);
  if (!inventoryItem) {
    return {
      statusCode: 404,
      body: JSON.stringify({ success: false, error: 'Inventory item not found' })
    };
  }

  const costImpact = data.quantityWasted * inventoryItem.costPerUnit;

  const wasteReport = await db.createWasteReport(restaurantId, {
    inventoryItemId: data.inventoryItemId,
    itemName: inventoryItem.name,
    category: inventoryItem.category,
    quantityWasted: data.quantityWasted,
    wasteReason: data.wasteReason,
    costImpact,
    notes: data.notes,
    reportedBy: userId
  });

  return {
    statusCode: 201,
    body: JSON.stringify({
      success: true,
      data: wasteReport,
      timestamp: new Date().toISOString()
    })
  };
}

async function getWasteSummary(restaurantId: string, queryParams: any): Promise<APIGatewayProxyResult> {
  const period = queryParams?.period || 'monthly';
  const startDate = queryParams?.startDate;
  const endDate = queryParams?.endDate;

  const reports = await db.getWasteReports(restaurantId, startDate, endDate);

  // Calculate summary statistics
  const totalWasteValue = reports.reduce((sum, report) => sum + report.costImpact, 0);
  const totalWasteQuantity = reports.reduce((sum, report) => sum + report.quantityWasted, 0);

  // Group by category
  const wasteByCategory = reports.reduce((acc, report) => {
    const existing = acc.find(item => item.category === report.category);
    if (existing) {
      existing.quantity += report.quantityWasted;
      existing.value += report.costImpact;
    } else {
      acc.push({
        category: report.category,
        quantity: report.quantityWasted,
        value: report.costImpact
      });
    }
    return acc;
  }, [] as any[]);

  // Group by reason
  const wasteByReason = reports.reduce((acc, report) => {
    const existing = acc.find(item => item.reason === report.wasteReason);
    if (existing) {
      existing.quantity += report.quantityWasted;
      existing.value += report.costImpact;
    } else {
      acc.push({
        reason: report.wasteReason,
        quantity: report.quantityWasted,
        value: report.costImpact
      });
    }
    return acc;
  }, [] as any[]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      data: {
        totalWasteValue,
        totalWasteQuantity,
        wasteByCategory,
        wasteByReason,
        period: {
          startDate: startDate || 'N/A',
          endDate: endDate || 'N/A'
        }
      },
      timestamp: new Date().toISOString()
    })
  };
}