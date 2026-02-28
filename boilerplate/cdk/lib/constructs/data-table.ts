import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * Properties for the DataTable construct
 */
export interface DataTableProps {
  /**
   * Application name used in resource naming
   */
  appName: string;

  /**
   * Environment name (dev, staging, prod)
   */
  environment: string;

  /**
   * Number of GSIs to create
   * Creates GSI1, GSI2, etc. with GSI{N}PK and GSI{N}SK
   * @default 1
   */
  gsiCount?: number;

  /**
   * TTL attribute name
   * @default 'TTL'
   */
  ttlAttribute?: string;

  /**
   * Enable DynamoDB Streams
   * @default false
   */
  enableStream?: boolean;

  /**
   * Stream view type if streams are enabled
   * @default NEW_AND_OLD_IMAGES
   */
  streamViewType?: dynamodb.StreamViewType;
}

/**
 * DataTable - Reusable construct for DynamoDB single-table design
 * 
 * Creates a DynamoDB table with PK/SK keys for single-table design,
 * configurable GSIs, TTL, and environment-appropriate settings.
 * 
 * Key structure follows multi-tenant pattern:
 * - PK: TENANT#{tenantId}#{entityType}#{entityId}
 * - SK: Varies by access pattern
 * 
 * @example
 * ```typescript
 * const table = new DataTable(this, 'Data', {
 *   appName: 'myapp',
 *   environment: 'prod',
 *   gsiCount: 2,
 * });
 * 
 * table.grantReadWriteData(myLambda);
 * ```
 */
export class DataTable extends Construct {
  /**
   * The DynamoDB table
   */
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DataTableProps) {
    super(scope, id);

    const isProd = props.environment === 'prod';
    const isStaging = props.environment === 'staging';

    // Main table with single-table design keys
    this.table = new dynamodb.Table(this, 'Table', {
      tableName: `${props.appName}-${props.environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: isProd || isStaging,
      timeToLiveAttribute: props.ttlAttribute ?? 'TTL',
      stream: props.enableStream
        ? props.streamViewType ?? dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        : undefined,
    });

    // Add GSIs
    const gsiCount = props.gsiCount ?? 1;
    for (let i = 1; i <= gsiCount; i++) {
      this.table.addGlobalSecondaryIndex({
        indexName: `GSI${i}`,
        partitionKey: {
          name: `GSI${i}PK`,
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: { name: `GSI${i}SK`, type: dynamodb.AttributeType.STRING },
        projectionType: dynamodb.ProjectionType.ALL,
      });
    }

    // Outputs
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'DynamoDB table ARN',
    });
  }

  /**
   * Grant read permissions to the table and all indexes
   */
  grantReadData(grantee: iam.IGrantable): iam.Grant {
    return this.table.grantReadData(grantee);
  }

  /**
   * Grant write permissions to the table
   */
  grantWriteData(grantee: iam.IGrantable): iam.Grant {
    return this.table.grantWriteData(grantee);
  }

  /**
   * Grant read and write permissions to the table and all indexes
   */
  grantReadWriteData(grantee: iam.IGrantable): iam.Grant {
    return this.table.grantReadWriteData(grantee);
  }

  /**
   * Grant permissions for DynamoDB Streams
   */
  grantStreamRead(grantee: iam.IGrantable): iam.Grant {
    return this.table.grantStreamRead(grantee);
  }

  /**
   * Get the table name
   */
  get tableName(): string {
    return this.table.tableName;
  }

  /**
   * Get the table ARN
   */
  get tableArn(): string {
    return this.table.tableArn;
  }

  /**
   * Get the table stream ARN (if streams enabled)
   */
  get tableStreamArn(): string | undefined {
    return this.table.tableStreamArn;
  }
}
