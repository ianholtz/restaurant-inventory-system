#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DynamoDBStack } from './stacks/dynamodb-stack';
import { DatabaseStack } from './stacks/database-stack';
import { ApiStack } from './stacks/api-stack';
import { FrontendStack } from './stacks/frontend-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
};

const stage = app.node.tryGetContext('stage') || 'dev';

// DynamoDB Stack (Primary data store)
const dynamoStack = new DynamoDBStack(app, `RestaurantInventory-DynamoDB-${stage}`, {
  env,
  stage
});

// Database Stack (PostgreSQL for complex analytics)
const databaseStack = new DatabaseStack(app, `RestaurantInventory-Database-${stage}`, {
  env,
  stage
});

// API Stack
const apiStack = new ApiStack(app, `RestaurantInventory-Api-${stage}`, {
  env,
  stage,
  mainTable: dynamoStack.mainTable,
  database: databaseStack.database,
  cache: databaseStack.cache
});

// Frontend Stack
new FrontendStack(app, `RestaurantInventory-Frontend-${stage}`, {
  env,
  stage,
  api: apiStack.api
});