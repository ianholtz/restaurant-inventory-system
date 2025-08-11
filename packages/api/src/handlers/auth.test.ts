import { handler } from './auth';
import { APIGatewayProxyEvent, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('../services/dynamodb-service');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock DynamoDB service
const mockDynamoDBService = {
  getUserByEmail: jest.fn(),
  getUser: jest.fn(),
};

jest.mock('../services/dynamodb-service', () => ({
  DynamoDBService: jest.fn().mockImplementation(() => mockDynamoDBService),
}));

describe('Auth Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('Login endpoint', () => {
    const createLoginEvent = (body: any): APIGatewayProxyEvent => ({
      path: '/auth/login',
      httpMethod: 'POST',
      body: JSON.stringify(body),
      headers: {},
      multiValueHeaders: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
      isBase64Encoded: false,
    });

    it('should successfully authenticate admin user', async () => {
      const mockUser = {
        id: 'admin-id',
        email: 'admin@restaurant.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        restaurantId: 'restaurant-1',
        passwordHash: 'hashed-password',
      };

      mockDynamoDBService.getUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const event = createLoginEvent({
        email: 'admin@restaurant.com',
        password: 'admin',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBe('access-token');
      expect(body.data.refreshToken).toBe('refresh-token');
      expect(body.data.user.role).toBe('admin');
    });

    it('should successfully authenticate regular user', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@restaurant.com',
        firstName: 'Regular',
        lastName: 'User',
        role: 'user',
        restaurantId: 'restaurant-1',
        passwordHash: 'hashed-password',
      };

      mockDynamoDBService.getUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const event = createLoginEvent({
        email: 'user@restaurant.com',
        password: 'user',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.user.role).toBe('user');
    });

    it('should reject invalid credentials', async () => {
      mockDynamoDBService.getUserByEmail.mockResolvedValue(null);

      const event = createLoginEvent({
        email: 'invalid@restaurant.com',
        password: 'wrong-password',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid credentials');
    });

    it('should reject request with missing email', async () => {
      const event = createLoginEvent({
        password: 'admin',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Email and password required');
    });

    it('should reject request with missing password', async () => {
      const event = createLoginEvent({
        email: 'admin@restaurant.com',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Email and password required');
    });

    it('should handle password mismatch', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@restaurant.com',
        passwordHash: 'hashed-password',
        role: 'user',
        restaurantId: 'restaurant-1',
      };

      mockDynamoDBService.getUserByEmail.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const event = createLoginEvent({
        email: 'user@restaurant.com',
        password: 'wrong-password',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid credentials');
    });
  });

  describe('Refresh token endpoint', () => {
    const createRefreshEvent = (body: any): APIGatewayProxyEvent => ({
      path: '/auth/refresh',
      httpMethod: 'POST',
      body: JSON.stringify(body),
      headers: {},
      multiValueHeaders: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
      isBase64Encoded: false,
    });

    it('should successfully refresh token', async () => {
      const mockUser = {
        id: 'user-id',
        role: 'admin',
        restaurantId: 'restaurant-1',
      };

      mockJwt.verify.mockReturnValue({ userId: 'user-id', type: 'refresh' });
      mockDynamoDBService.getUser.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('new-access-token');

      const event = createRefreshEvent({
        refreshToken: 'valid-refresh-token',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBe('new-access-token');
    });

    it('should reject invalid refresh token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const event = createRefreshEvent({
        refreshToken: 'invalid-refresh-token',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Invalid refresh token');
    });

    it('should reject missing refresh token', async () => {
      const event = createRefreshEvent({});

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Refresh token required');
    });
  });

  describe('JWT Authorizer', () => {
    const createAuthorizerEvent = (token: string): APIGatewayTokenAuthorizerEvent => ({
      type: 'TOKEN',
      authorizationToken: `Bearer ${token}`,
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request',
    });

    it('should authorize valid token', async () => {
      mockJwt.verify.mockReturnValue({
        userId: 'user-id',
        restaurantId: 'restaurant-1',
        role: 'admin',
      });

      const event = createAuthorizerEvent('valid-token');
      const result = await handler(event);

      expect(result).toHaveProperty('principalId', 'user-id');
      expect(result).toHaveProperty('policyDocument');
      expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
      expect(result).toHaveProperty('context');
      expect(result.context.role).toBe('admin');
    });

    it('should reject invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const event = createAuthorizerEvent('invalid-token');

      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });

    it('should reject missing token', async () => {
      const event: APIGatewayTokenAuthorizerEvent = {
        type: 'TOKEN',
        authorizationToken: '',
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/request',
      };

      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });
  });

  describe('Error handling', () => {
    it('should handle internal server errors', async () => {
      mockDynamoDBService.getUserByEmail.mockRejectedValue(new Error('Database error'));

      const event: APIGatewayProxyEvent = {
        path: '/auth/login',
        httpMethod: 'POST',
        body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Internal server error');
    });

    it('should handle unknown endpoints', async () => {
      const event: APIGatewayProxyEvent = {
        path: '/auth/unknown',
        httpMethod: 'GET',
        body: null,
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        isBase64Encoded: false,
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Not found');
    });
  });
});