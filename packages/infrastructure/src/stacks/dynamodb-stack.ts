import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

interface DynamoDBStackProps extends cdk.StackProps {
  stage: string;
}

export class DynamoDBStack extends cdk.Stack {
  public readonly mainTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDBStackProps) {
    super(scope, id, props);

    // Single table design for restaurant inventory system
    this.mainTable = new dynamodb.Table(this, 'RestaurantInventoryTable', {
      tableName: `restaurant-inventory-${props.stage}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: props.stage === 'prod',
      removalPolicy: props.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      
      // TTL for temporary data like sessions
      timeToLiveAttribute: 'TTL',

      // Stream for real-time processing
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
    });

    // GSI1: Restaurant-based queries (inventory by restaurant, users by restaurant)
    this.mainTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING
      }
    });

    // GSI2: Category and expiration queries
    this.mainTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: {
        name: 'GSI2PK',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'GSI2SK',
        type: dynamodb.AttributeType.STRING
      }
    });

    // GSI3: Time-based analytics queries
    this.mainTable.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: {
        name: 'GSI3PK',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'GSI3SK',
        type: dynamodb.AttributeType.STRING
      }
    });

    // GSI4: User and authentication queries
    this.mainTable.addGlobalSecondaryIndex({
      indexName: 'GSI4',
      partitionKey: {
        name: 'GSI4PK',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'GSI4SK',
        type: dynamodb.AttributeType.STRING
      }
    });

    // Output table name for other stacks
    new cdk.CfnOutput(this, 'TableName', {
      value: this.mainTable.tableName,
      exportName: `${props.stage}-RestaurantInventoryTableName`
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.mainTable.tableArn,
      exportName: `${props.stage}-RestaurantInventoryTableArn`
    });
  }
}