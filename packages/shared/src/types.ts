import { z } from 'zod';

// Restaurant Schema
export const RestaurantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Inventory Item Schema
export const InventoryItemSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  name: z.string(),
  category: z.enum(['produce', 'meat', 'dairy', 'dry_goods', 'beverages']),
  quantity: z.number().min(0),
  unit: z.enum(['kg', 'lbs', 'pieces', 'liters', 'gallons']),
  costPerUnit: z.number().min(0),
  supplier: z.string(),
  expirationDate: z.date(),
  minimumStock: z.number().min(0),
  createdAt: z.date(),
  updatedAt: z.date()
});

// User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  restaurantId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['owner', 'manager', 'staff']),
  createdAt: z.date(),
  updatedAt: z.date()
});

// API Response Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.date()
});

// Export types
export type Restaurant = z.infer<typeof RestaurantSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type User = z.infer<typeof UserSchema>;
export type ApiResponse<T = any> = z.infer<typeof ApiResponseSchema> & { data?: T };