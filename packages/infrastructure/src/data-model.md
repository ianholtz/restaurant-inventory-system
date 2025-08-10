# DynamoDB Single Table Design

## Table Structure

**Main Table**: `restaurant-inventory-{stage}`
- **PK** (Partition Key): Primary identifier
- **SK** (Sort Key): Secondary identifier for sorting
- **TTL**: Time-to-live for temporary records
- **GSI1PK/GSI1SK**: Restaurant-based queries
- **GSI2PK/GSI2SK**: Category and expiration queries  
- **GSI3PK/GSI3SK**: Time-based analytics
- **GSI4PK/GSI4SK**: User and authentication queries

## Entity Patterns

### Restaurant
```
PK: RESTAURANT#{restaurantId}
SK: METADATA
GSI1PK: RESTAURANT#{restaurantId}
GSI1SK: METADATA
```

### User
```
PK: USER#{userId}
SK: METADATA
GSI1PK: RESTAURANT#{restaurantId}
GSI1SK: USER#{userId}
GSI4PK: EMAIL#{email}
GSI4SK: USER#{userId}
```

### Inventory Item
```
PK: RESTAURANT#{restaurantId}
SK: ITEM#{itemId}
GSI1PK: RESTAURANT#{restaurantId}
GSI1SK: ITEM#{category}#{expirationDate}
GSI2PK: CATEGORY#{category}
GSI2SK: EXPIRY#{expirationDate}#{restaurantId}
```

### Inventory Transaction
```
PK: RESTAURANT#{restaurantId}
SK: TRANSACTION#{timestamp}#{transactionId}
GSI1PK: ITEM#{itemId}
GSI1SK: TRANSACTION#{timestamp}
GSI3PK: RESTAURANT#{restaurantId}#{YYYYMM}
GSI3SK: TRANSACTION#{timestamp}
```

### Waste Report
```
PK: RESTAURANT#{restaurantId}
SK: WASTE#{timestamp}#{wasteId}
GSI1PK: RESTAURANT#{restaurantId}
GSI1SK: WASTE#{category}#{timestamp}
GSI2PK: WASTE#{category}
GSI2SK: DATE#{YYYY-MM-DD}#{restaurantId}
GSI3PK: RESTAURANT#{restaurantId}#{YYYYMM}
GSI3SK: WASTE#{timestamp}
```

### Analytics Summary
```
PK: ANALYTICS#{restaurantId}
SK: SUMMARY#{period}#{date}
GSI3PK: ANALYTICS#{period}
GSI3SK: DATE#{date}#{restaurantId}
```

## Access Patterns

### Primary Access Patterns
1. **Get restaurant details**: `PK = RESTAURANT#{restaurantId}, SK = METADATA`
2. **Get user details**: `PK = USER#{userId}, SK = METADATA`
3. **Get inventory item**: `PK = RESTAURANT#{restaurantId}, SK = ITEM#{itemId}`

### GSI1 - Restaurant-based queries
1. **Get all users for restaurant**: `GSI1PK = RESTAURANT#{restaurantId}, SK begins_with USER#`
2. **Get inventory by category**: `GSI1PK = RESTAURANT#{restaurantId}, SK begins_with ITEM#{category}`
3. **Get waste reports for restaurant**: `GSI1PK = RESTAURANT#{restaurantId}, SK begins_with WASTE#`

### GSI2 - Category and expiration queries
1. **Get expiring items by category**: `GSI2PK = CATEGORY#{category}, GSI2SK begins_with EXPIRY#`
2. **Get waste by category and date**: `GSI2PK = WASTE#{category}, GSI2SK begins_with DATE#`

### GSI3 - Time-based analytics
1. **Get monthly transactions**: `GSI3PK = RESTAURANT#{restaurantId}#{YYYYMM}, SK begins_with TRANSACTION#`
2. **Get monthly waste reports**: `GSI3PK = RESTAURANT#{restaurantId}#{YYYYMM}, SK begins_with WASTE#`
3. **Cross-restaurant analytics**: `GSI3PK = ANALYTICS#{period}, GSI3SK begins_with DATE#`

### GSI4 - User authentication
1. **Login by email**: `GSI4PK = EMAIL#{email}, GSI4SK = USER#{userId}`

## Sample Data

### Restaurant Record
```json
{
  "PK": "RESTAURANT#rest-123",
  "SK": "METADATA",
  "GSI1PK": "RESTAURANT#rest-123",
  "GSI1SK": "METADATA",
  "EntityType": "Restaurant",
  "Name": "Mario's Kitchen",
  "Address": "123 Main St",
  "Phone": "+1-555-0123",
  "Email": "contact@marios.com",
  "CreatedAt": "2024-01-15T10:00:00Z",
  "UpdatedAt": "2024-01-15T10:00:00Z"
}
```

### Inventory Item Record
```json
{
  "PK": "RESTAURANT#rest-123",
  "SK": "ITEM#item-456",
  "GSI1PK": "RESTAURANT#rest-123",
  "GSI1SK": "ITEM#produce#2024-01-20",
  "GSI2PK": "CATEGORY#produce",
  "GSI2SK": "EXPIRY#2024-01-20#rest-123",
  "EntityType": "InventoryItem",
  "Name": "Roma Tomatoes",
  "Category": "produce",
  "Quantity": 25.5,
  "Unit": "kg",
  "CostPerUnit": 2.50,
  "Supplier": "Fresh Produce Co",
  "ExpirationDate": "2024-01-20",
  "MinimumStock": 5.0,
  "CreatedAt": "2024-01-15T10:00:00Z",
  "UpdatedAt": "2024-01-15T10:00:00Z"
}
```

### Waste Report Record
```json
{
  "PK": "RESTAURANT#rest-123",
  "SK": "WASTE#2024-01-15T14:30:00Z#waste-789",
  "GSI1PK": "RESTAURANT#rest-123",
  "GSI1SK": "WASTE#produce#2024-01-15T14:30:00Z",
  "GSI2PK": "WASTE#produce",
  "GSI2SK": "DATE#2024-01-15#rest-123",
  "GSI3PK": "RESTAURANT#rest-123#202401",
  "GSI3SK": "WASTE#2024-01-15T14:30:00Z",
  "EntityType": "WasteReport",
  "InventoryItemId": "item-456",
  "ItemName": "Roma Tomatoes",
  "QuantityWasted": 3.0,
  "WasteReason": "expired",
  "CostImpact": 7.50,
  "ReportedBy": "user-101",
  "CreatedAt": "2024-01-15T14:30:00Z"
}
```

## Query Examples

### Get all inventory items for a restaurant
```javascript
const params = {
  TableName: 'restaurant-inventory-dev',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
  ExpressionAttributeValues: {
    ':pk': 'RESTAURANT#rest-123',
    ':sk': 'ITEM#'
  }
};
```

### Get expiring items by category
```javascript
const params = {
  TableName: 'restaurant-inventory-dev',
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :start AND :end',
  ExpressionAttributeValues: {
    ':pk': 'CATEGORY#produce',
    ':start': 'EXPIRY#2024-01-15',
    ':end': 'EXPIRY#2024-01-22'
  }
};
```

### Get monthly analytics for restaurant
```javascript
const params = {
  TableName: 'restaurant-inventory-dev',
  IndexName: 'GSI3',
  KeyConditionExpression: 'GSI3PK = :pk',
  ExpressionAttributeValues: {
    ':pk': 'RESTAURANT#rest-123#202401'
  }
};
```