import { Pool } from 'pg';
import { createClient } from 'redis';
import { InventoryItem } from '@restaurant-inventory/shared';

export class DatabaseService {
  private pool: Pool;
  private redis: any;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production'
    });

    this.redis = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`
    });
  }

  async getInventoryItems(restaurantId: string): Promise<InventoryItem[]> {
    const cacheKey = `inventory:${restaurantId}`;
    
    // Try cache first
    try {
      await this.redis.connect();
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        await this.redis.disconnect();
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Redis cache miss:', error);
    }

    // Query database
    const query = `
      SELECT * FROM inventory_items 
      WHERE restaurant_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [restaurantId]);
    const items = result.rows;

    // Cache result
    try {
      await this.redis.setEx(cacheKey, 300, JSON.stringify(items)); // 5 min cache
      await this.redis.disconnect();
    } catch (error) {
      console.warn('Redis cache set failed:', error);
    }

    return items;
  }

  async createInventoryItem(itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
    const query = `
      INSERT INTO inventory_items (
        restaurant_id, name, category, quantity, unit, 
        cost_per_unit, supplier, expiration_date, minimum_stock
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      itemData.restaurantId,
      itemData.name,
      itemData.category,
      itemData.quantity,
      itemData.unit,
      itemData.costPerUnit,
      itemData.supplier,
      itemData.expirationDate,
      itemData.minimumStock
    ];

    const result = await this.pool.query(query, values);
    
    // Invalidate cache
    try {
      await this.redis.connect();
      await this.redis.del(`inventory:${itemData.restaurantId}`);
      await this.redis.disconnect();
    } catch (error) {
      console.warn('Redis cache invalidation failed:', error);
    }

    return result.rows[0];
  }
}