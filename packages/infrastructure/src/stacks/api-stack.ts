import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface ApiStackProps extends cdk.StackProps {
  stage: string;
  mainTable: dynamodb.Table;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly filesBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // S3 Bucket for file storage
    this.filesBucket = new s3.Bucket(this, 'FilesBucket', {
      bucketName: `restaurant-inventory-files-${props.stage}-${this.account}`,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*']
      }],
      lifecycleRules: [{
        id: 'DeleteIncompleteMultipartUploads',
        abortIncompleteMultipartUploadAfter: cdk.Duration.days(1)
      }],
      removalPolicy: props.stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY
    });

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
              ],
              resources: [
                props.mainTable.tableArn,
                `${props.mainTable.tableArn}/index/*`
              ]
            })
          ]
        }),
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              resources: [`${this.filesBucket.bucketArn}/*`]
            })
          ]
        })
      }
    });

    // Lambda function defaults
    const lambdaDefaults = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      role: lambdaRole,
      environment: {
        DYNAMODB_TABLE_NAME: props.mainTable.tableName,
        S3_BUCKET_NAME: this.filesBucket.bucketName,
        STAGE: props.stage
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK
    };

    // Lambda functions
    const authFunction = new lambda.Function(this, 'AuthFunction', {
      ...lambdaDefaults,
      code: lambda.Code.fromAsset('../api/dist/handlers'),
      handler: 'auth.handler',
      functionName: `restaurant-inventory-auth-${props.stage}`
    });

    const restaurantFunction = new lambda.Function(this, 'RestaurantFunction', {
      ...lambdaDefaults,
      code: lambda.Code.fromAsset('../api/dist/handlers'),
      handler: 'restaurant.handler',
      functionName: `restaurant-inventory-restaurant-${props.stage}`
    });

    const inventoryFunction = new lambda.Function(this, 'InventoryFunction', {
      ...lambdaDefaults,
      code: lambda.Code.fromAsset('../api/dist/handlers'),
      handler: 'inventory.handler',
      functionName: `restaurant-inventory-inventory-${props.stage}`
    });

    const wasteFunction = new lambda.Function(this, 'WasteFunction', {
      ...lambdaDefaults,
      code: lambda.Code.fromAsset('../api/dist/handlers'),
      handler: 'waste.handler',
      functionName: `restaurant-inventory-waste-${props.stage}`
    });

    const analyticsFunction = new lambda.Function(this, 'AnalyticsFunction', {
      ...lambdaDefaults,
      code: lambda.Code.fromAsset('../api/dist/handlers'),
      handler: 'analytics.handler',
      functionName: `restaurant-inventory-analytics-${props.stage}`
    });

    // JWT Authorizer
    const authorizer = new apigateway.TokenAuthorizer(this, 'JWTAuthorizer', {
      handler: authFunction,
      identitySource: 'method.request.header.Authorization',
      authorizerName: 'JWTAuthorizer',
      resultsCacheTtl: cdk.Duration.minutes(5)
    });

    // API Gateway
    this.api = new apigateway.RestApi(this, 'RestaurantInventoryAPI', {
      restApiName: `restaurant-inventory-api-${props.stage}`,
      description: 'Restaurant Inventory Management API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token']
      },
      deployOptions: {
        stageName: props.stage,
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true
      }
    });

    // API Routes
    // Auth routes (no authorization required)
    const auth = this.api.root.addResource('auth');
    auth.addMethod('POST', new apigateway.LambdaIntegration(authFunction), {
      requestParameters: {
        'method.request.path.proxy': true
      }
    });

    // Restaurant routes
    const restaurants = this.api.root.addResource('restaurants');
    restaurants.addMethod('GET', new apigateway.LambdaIntegration(restaurantFunction), {
      authorizer
    });
    restaurants.addMethod('POST', new apigateway.LambdaIntegration(restaurantFunction), {
      authorizer
    });

    const restaurant = restaurants.addResource('{restaurantId}');
    restaurant.addMethod('GET', new apigateway.LambdaIntegration(restaurantFunction), {
      authorizer
    });
    restaurant.addMethod('PUT', new apigateway.LambdaIntegration(restaurantFunction), {
      authorizer
    });

    // Inventory routes
    const inventory = restaurant.addResource('inventory');
    inventory.addMethod('GET', new apigateway.LambdaIntegration(inventoryFunction), {
      authorizer
    });
    inventory.addMethod('POST', new apigateway.LambdaIntegration(inventoryFunction), {
      authorizer
    });

    const inventoryItem = inventory.addResource('{itemId}');
    inventoryItem.addMethod('GET', new apigateway.LambdaIntegration(inventoryFunction), {
      authorizer
    });
    inventoryItem.addMethod('PUT', new apigateway.LambdaIntegration(inventoryFunction), {
      authorizer
    });
    inventoryItem.addMethod('DELETE', new apigateway.LambdaIntegration(inventoryFunction), {
      authorizer
    });

    // Inventory adjustments
    inventoryItem.addResource('adjust').addMethod('POST', 
      new apigateway.LambdaIntegration(inventoryFunction), { authorizer }
    );

    inventory.addResource('bulk-update').addMethod('POST', 
      new apigateway.LambdaIntegration(inventoryFunction), { authorizer }
    );

    // Waste tracking routes
    const waste = restaurant.addResource('waste');
    waste.addMethod('GET', new apigateway.LambdaIntegration(wasteFunction), {
      authorizer
    });
    waste.addMethod('POST', new apigateway.LambdaIntegration(wasteFunction), {
      authorizer
    });

    waste.addResource('summary').addMethod('GET', 
      new apigateway.LambdaIntegration(wasteFunction), { authorizer }
    );

    // Analytics routes
    const analytics = restaurant.addResource('analytics');
    analytics.addResource('dashboard').addMethod('GET', 
      new apigateway.LambdaIntegration(analyticsFunction), { authorizer }
    );
    analytics.addResource('trends').addMethod('GET', 
      new apigateway.LambdaIntegration(analyticsFunction), { authorizer }
    );

    const reports = restaurant.addResource('reports');
    reports.addResource('waste-reduction').addMethod('GET', 
      new apigateway.LambdaIntegration(analyticsFunction), { authorizer }
    );

    // CloudWatch Alarms
    this.createCloudWatchAlarms(props.stage, [
      authFunction, restaurantFunction, inventoryFunction, 
      wasteFunction, analyticsFunction
    ]);

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      exportName: `${props.stage}-ApiUrl`
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: this.filesBucket.bucketName,
      exportName: `${props.stage}-S3BucketName`
    });
  }

  private createCloudWatchAlarms(stage: string, functions: lambda.Function[]) {
    functions.forEach((fn, index) => {
      // Error rate alarm
      new cloudwatch.Alarm(this, `${fn.functionName}ErrorAlarm`, {
        alarmName: `${fn.functionName}-errors-${stage}`,
        metric: fn.metricErrors({
          period: cdk.Duration.minutes(5)
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });

      // Duration alarm
      new cloudwatch.Alarm(this, `${fn.functionName}DurationAlarm`, {
        alarmName: `${fn.functionName}-duration-${stage}`,
        metric: fn.metricDuration({
          period: cdk.Duration.minutes(5)
        }),
        threshold: 25000, // 25 seconds
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });

      // Throttle alarm
      new cloudwatch.Alarm(this, `${fn.functionName}ThrottleAlarm`, {
        alarmName: `${fn.functionName}-throttles-${stage}`,
        metric: fn.metricThrottles({
          period: cdk.Duration.minutes(5)
        }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });
    });

    // API Gateway alarms
    const api4xxAlarm = new cloudwatch.Alarm(this, 'Api4xxAlarm', {
      alarmName: `api-4xx-errors-${stage}`,
      metric: this.api.metricClientError({
        period: cdk.Duration.minutes(5)
      }),
      threshold: 50,
      evaluationPeriods: 2
    });

    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      alarmName: `api-5xx-errors-${stage}`,
      metric: this.api.metricServerError({
        period: cdk.Duration.minutes(5)
      }),
      threshold: 10,
      evaluationPeriods: 2
    });

    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      alarmName: `api-latency-${stage}`,
      metric: this.api.metricLatency({
        period: cdk.Duration.minutes(5)
      }),
      threshold: 5000, // 5 seconds
      evaluationPeriods: 2
    });
  }
}