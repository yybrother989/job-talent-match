import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

// Initialize DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    // Check if AWS credentials are available
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    console.log('🚀 Creating DynamoDB table: job-talent-match-resumes');
    
    // Check if table already exists
    try {
      const describeResult = await dynamoDBClient.send(new DescribeTableCommand({
        TableName: 'job-talent-match-resumes'
      }));
      
      return NextResponse.json({
        success: true,
        message: 'Table already exists',
        tableStatus: describeResult.Table.TableStatus,
        tableArn: describeResult.Table.TableArn,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
      // Table doesn't exist, continue with creation
    }

    // Create the table
    const command = new CreateTableCommand({
      TableName: 'job-talent-match-resumes',
      KeySchema: [
        {
          AttributeName: 'userId',
          KeyType: 'HASH' // Partition key
        },
        {
          AttributeName: 'resumeId',
          KeyType: 'RANGE' // Sort key
        }
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'userId',
          AttributeType: 'S' // String
        },
        {
          AttributeName: 'resumeId',
          AttributeType: 'S' // String
        }
      ],
      BillingMode: 'PAY_PER_REQUEST', // On-demand billing
      GlobalSecondaryIndexes: [
        {
          IndexName: 'resumeId-index',
          KeySchema: [
            {
              AttributeName: 'resumeId',
              KeyType: 'HASH'
            }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        }
      ],
      Tags: [
        {
          Key: 'Project',
          Value: 'job-talent-match'
        },
        {
          Key: 'Environment',
          Value: 'development'
        }
      ]
    });

    const result = await dynamoDBClient.send(command);
    
    return NextResponse.json({
      success: true,
      message: 'Table created successfully',
      tableArn: result.TableDescription.TableArn,
      tableStatus: result.TableDescription.TableStatus,
      note: 'Table is being created and will be active shortly',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Error creating DynamoDB table:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to create DynamoDB table',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
