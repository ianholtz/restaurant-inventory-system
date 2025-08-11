import { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb-service';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const db = new DynamoDBService();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const handler = async (event: APIGatewayProxyEvent | APIGatewayTokenAuthorizerEvent): Promise<APIGatewayProxyResult | APIGatewayAuthorizerResult> => {
  // JWT Authorizer
  if ('type' in event && event.type === 'TOKEN') {
    return handleAuthorizer(event as APIGatewayTokenAuthorizerEvent);
  }

  // Auth endpoints
  const httpEvent = event as APIGatewayProxyEvent;
  const path = httpEvent.path;
  const method = httpEvent.httpMethod;

  try {
    if (path === '/auth/login' && method === 'POST') {
      return await handleLogin(httpEvent);
    }
    
    if (path === '/auth/refresh' && method === 'POST') {
      return await handleRefresh(httpEvent);
    }

    if (path === '/auth/init-admin' && method === 'POST') {
      return await handleInitAdmin(httpEvent);
    }

    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ success: false, error: 'Not found' })
    };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ success: false, error: 'Internal server error' })
    };
  }
};

async function handleLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { email, password, username } = JSON.parse(event.body || '{}');

  // Handle admin login with username
  if (username === 'admin' && password === 'admin') {
    const adminUser = await db.initializeAdminUser();
    
    const accessToken = jwt.sign(
      { userId: adminUser.id, restaurantId: adminUser.restaurantId, role: adminUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: adminUser.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data: {
          accessToken,
          refreshToken,
          expiresIn: 3600,
          user: {
            id: adminUser.id,
            email: adminUser.email,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            role: adminUser.role,
            restaurantId: adminUser.restaurantId
          }
        },
        timestamp: new Date().toISOString()
      })
    };
  }

  // Handle regular email/password login
  if (!email || !password) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ success: false, error: 'Email and password required' })
    };
  }

  const user = await db.getUserByEmail(email);
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return {
      statusCode: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ success: false, error: 'Invalid credentials' })
    };
  }

  const accessToken = jwt.sign(
    { userId: user.id, restaurantId: user.restaurantId, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          restaurantId: user.restaurantId
        }
      },
      timestamp: new Date().toISOString()
    })
  };
}

async function handleRefresh(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { refreshToken } = JSON.parse(event.body || '{}');

  if (!refreshToken) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ success: false, error: 'Refresh token required' })
    };
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const user = await db.getUser(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = jwt.sign(
      { userId: user.id, restaurantId: user.restaurantId, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data: {
          accessToken,
          refreshToken,
          expiresIn: 3600
        },
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ success: false, error: 'Invalid refresh token' })
    };
  }
}

async function handleInitAdmin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const adminUser = await db.initializeAdminUser();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        data: {
          message: 'Admin user initialized successfully',
          adminId: adminUser.id
        },
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Admin initialization error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ success: false, error: 'Failed to initialize admin user' })
    };
  }
}

async function handleAuthorizer(event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {
  const token = event.authorizationToken?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Unauthorized');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    return {
      principalId: decoded.userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn
          }
        ]
      },
      context: {
        userId: decoded.userId,
        restaurantId: decoded.restaurantId,
        role: decoded.role
      }
    };
  } catch (error) {
    throw new Error('Unauthorized');
  }
}