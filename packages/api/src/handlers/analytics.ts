import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb-service';

const db = new DynamoDBService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod, pathParameters, queryStringParameters, requestContext } = event;
  const restaurantId = pathParameters?.restaurantId;
  const userRestaurantId = requestContext.authorizer?.restaurantId;

  if (restaurantId !== userRestaurantId) {
    return {
      statusCode: 403,
      body: JSON.stringify({ success: false, error: 'Access denied' })
    };
  }

  try {
    if (event.path.includes('/dashboard')) {
      return await getDashboard(restaurantId!, queryStringParameters);
    }
    
    if (event.path.includes('/trends')) {
      return await getTrends(restaurantId!, queryStringParameters);
    }
    
    if (event.path.includes('/waste-reduction')) {
      return await getWasteReductionReport(restaurantId!, queryStringParameters);
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ success: false, error: 'Endpoint not found' })
    };
  } catch (error) {
    console.error('Analytics handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};

async function getDashboard(restaurantId: string, queryParams: any): Promise<APIGatewayProxyResult> {
  const period = queryParams?.period || '30d';
  
  // Get current inventory
  const inventoryItems = await db.getInventoryItems(restaurantId);
  
  // Calculate metrics
  const totalInventoryValue = inventoryItems.reduce((sum, item) => 
    sum + (item.quantity * item.costPerUnit), 0
  );
  
  const lowStockItems = inventoryItems.filter(item => 
    item.quantity <= item.minimumStock
  ).length;
  
  const expiringSoonItems = inventoryItems.filter(item => {
    const expiryDate = new Date(item.expirationDate);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return expiryDate <= weekFromNow;
  }).length;

  // Get waste data for the period
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period.replace('d', '')));
  
  const wasteReports = await db.getWasteReports(restaurantId, startDate.toISOString().split('T')[0], endDate);
  const wasteValue = wasteReports.reduce((sum, report) => sum + report.costImpact, 0);

  // Calculate waste by category
  const wasteByCategory = wasteReports.reduce((acc, report) => {
    const existing = acc.find(item => item.category === report.category);
    if (existing) {
      existing.value += report.costImpact;
    } else {
      acc.push({ category: report.category, value: report.costImpact });
    }
    return acc;
  }, [] as any[]);

  // Sort and get top 5
  const topWasteCategories = wasteByCategory
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      data: {
        totalInventoryValue,
        lowStockItems,
        expiringSoonItems,
        wasteValue,
        wasteReduction: 0, // Would calculate from historical data
        topWasteCategories
      },
      timestamp: new Date().toISOString()
    })
  };
}

async function getTrends(restaurantId: string, queryParams: any): Promise<APIGatewayProxyResult> {
  const metric = queryParams?.metric || 'waste';
  const period = queryParams?.period || 'weekly';
  const startDate = queryParams?.startDate;
  const endDate = queryParams?.endDate;

  // Get data based on metric
  let dataPoints: any[] = [];
  
  if (metric === 'waste') {
    const wasteReports = await db.getWasteReports(restaurantId, startDate, endDate);
    
    // Group by date
    const wasteByDate = wasteReports.reduce((acc, report) => {
      const date = report.createdAt.split('T')[0];
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.value += report.costImpact;
      } else {
        acc.push({ date, value: report.costImpact });
      }
      return acc;
    }, [] as any[]);
    
    dataPoints = wasteByDate.sort((a, b) => a.date.localeCompare(b.date));
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      data: {
        metric,
        period,
        dataPoints
      },
      timestamp: new Date().toISOString()
    })
  };
}

async function getWasteReductionReport(restaurantId: string, queryParams: any): Promise<APIGatewayProxyResult> {
  const format = queryParams?.format || 'json';
  const period = queryParams?.period || 'monthly';

  // Get waste data
  const wasteReports = await db.getWasteReports(restaurantId);
  const inventoryItems = await db.getInventoryItems(restaurantId);

  const totalWasteCost = wasteReports.reduce((sum, report) => sum + report.costImpact, 0);
  
  // Calculate potential savings (simplified)
  const potentialSavings = totalWasteCost * 0.3; // Assume 30% reduction potential
  
  // Generate recommendations
  const recommendations = [
    {
      category: 'produce',
      issue: 'High spoilage rate',
      recommendation: 'Implement FIFO rotation and reduce order quantities',
      potentialSavings: potentialSavings * 0.4
    },
    {
      category: 'dairy',
      issue: 'Items expiring before use',
      recommendation: 'Improve inventory turnover and staff training',
      potentialSavings: potentialSavings * 0.3
    }
  ];

  // Top waste items
  const wasteByItem = wasteReports.reduce((acc, report) => {
    const existing = acc.find(item => item.itemName === report.itemName);
    if (existing) {
      existing.wasteValue += report.costImpact;
      existing.wasteQuantity += report.quantityWasted;
    } else {
      acc.push({
        itemName: report.itemName,
        wasteValue: report.costImpact,
        wasteQuantity: report.quantityWasted,
        primaryReason: report.wasteReason
      });
    }
    return acc;
  }, [] as any[]);

  const topWasteItems = wasteByItem
    .sort((a, b) => b.wasteValue - a.wasteValue)
    .slice(0, 10);

  const reportData = {
    summary: {
      totalWasteCost,
      potentialSavings,
      wasteReductionOpportunities: recommendations.length
    },
    recommendations,
    topWasteItems
  };

  if (format === 'pdf') {
    // In a real implementation, you would generate a PDF here
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="waste-reduction-report.pdf"'
      },
      body: 'PDF generation not implemented in this example',
      isBase64Encoded: false
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      data: reportData,
      timestamp: new Date().toISOString()
    })
  };
}