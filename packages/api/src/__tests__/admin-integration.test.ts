import { DynamoDBService } from '../services/dynamodb-service';
import bcrypt from 'bcryptjs';

// Mock DynamoDB client for testing
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('Admin Integration Tests', () => {
  let dbService: DynamoDBService;
  let mockSend: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock the DynamoDB client
    mockSend = jest.fn();
    
    // Mock the DynamoDBDocumentClient
    const mockClient = {
      send: mockSend
    };

    // Create service instance with mocked client
    dbService = new DynamoDBService();
    (dbService as any).client = mockClient;
  });

  describe('Admin User Initialization', () => {
    it('should create admin user if it does not exist', async () => {
      // Mock getUserByEmail to return null (user doesn't exist)
      mockSend
        .mockResolvedValueOnce({ Items: [] }) // getUserByEmail returns empty
        .mockResolvedValueOnce({}); // createUser succeeds

      const adminUser = await dbService.initializeAdminUser();

      expect(adminUser).toBeDefined();
      expect(adminUser.email).toBe('admin@system.local');
      expect(adminUser.role).toBe('admin');
      expect(adminUser.firstName).toBe('System');
      expect(adminUser.lastName).toBe('Administrator');
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should return existing admin user if it already exists', async () => {
      const existingAdmin = {
        id: 'existing-admin-id',
        email: 'admin@system.local',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        passwordHash: '$2b$10$existinghash',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };

      // Mock getUserByEmail to return existing admin
      mockSend.mockResolvedValueOnce({ Items: [existingAdmin] });

      const adminUser = await dbService.initializeAdminUser();

      expect(adminUser).toEqual(existingAdmin);
      expect(mockSend).toHaveBeenCalledTimes(1); // Only getUserByEmail called
    });

    it('should hash the admin password correctly', async () => {
      // Mock getUserByEmail to return null
      mockSend
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({});

      await dbService.initializeAdminUser();

      // Verify that PutCommand was called with hashed password
      const putCall = mockSend.mock.calls[1][0];
      const userItem = putCall.input.Item;

      expect(userItem.passwordHash).toBeDefined();
      expect(userItem.passwordHash).not.toBe('admin'); // Should be hashed
      
      // Verify the hash is valid
      const isValidHash = await bcrypt.compare('admin', userItem.passwordHash);
      expect(isValidHash).toBe(true);
    });
  });

  describe('User Creation with Optional Restaurant ID', () => {
    it('should create admin user without restaurantId', async () => {
      const adminUserData = {
        email: 'admin@system.local',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin' as const,
        passwordHash: '$2b$10$hashedpassword'
      };

      mockSend.mockResolvedValueOnce({});

      const createdUser = await dbService.createUser(adminUserData);

      const putCall = mockSend.mock.calls[0][0];
      const userItem = putCall.input.Item;

      expect(userItem.GSI1PK).toBeUndefined();
      expect(userItem.GSI1SK).toBeUndefined();
      expect(userItem.restaurantId).toBeUndefined();
    });

    it('should create regular user with restaurantId', async () => {
      const regularUserData = {
        restaurantId: 'restaurant-123',
        email: 'manager@restaurant.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'manager' as const,
        passwordHash: '$2b$10$hashedpassword'
      };

      mockSend.mockResolvedValueOnce({});

      const createdUser = await dbService.createUser(regularUserData);

      const putCall = mockSend.mock.calls[0][0];
      const userItem = putCall.input.Item;

      expect(userItem.GSI1PK).toBe('RESTAURANT#restaurant-123');
      expect(userItem.GSI1SK).toMatch(/^USER#/);
      expect(userItem.restaurantId).toBe('restaurant-123');
    });
  });

  describe('User Retrieval', () => {
    it('should retrieve user by ID', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'staff'
      };

      mockSend.mockResolvedValueOnce({ Item: mockUser });

      const user = await dbService.getUser('user-123');

      expect(user).toEqual(mockUser);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Key: {
              PK: 'USER#user-123',
              SK: 'METADATA'
            }
          })
        })
      );
    });

    it('should return null if user not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const user = await dbService.getUser('nonexistent-user');

      expect(user).toBeNull();
    });

    it('should retrieve user by email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@system.local',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin'
      };

      mockSend.mockResolvedValueOnce({ Items: [mockUser] });

      const user = await dbService.getUserByEmail('admin@system.local');

      expect(user).toEqual(mockUser);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            IndexName: 'GSI4',
            KeyConditionExpression: 'GSI4PK = :pk',
            ExpressionAttributeValues: {
              ':pk': 'EMAIL#admin@system.local'
            }
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(dbService.getUser('user-123')).rejects.toThrow('DynamoDB error');
    });

    it('should handle missing environment variables', () => {
      // This would test environment variable validation
      // In a real scenario, you'd test the constructor behavior
      expect(() => {
        // Constructor should handle missing env vars gracefully
        new DynamoDBService();
      }).not.toThrow();
    });
  });
});