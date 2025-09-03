import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Initialize DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  try {
    // Check if AWS credentials are available
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('Checking DynamoDB for resumes...');

    // Scan DynamoDB table
    const command = new ScanCommand({
      TableName: 'job-talent-match-resumes',
      ...(userId && {
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
        },
      }),
      Limit: 10, // Limit to 10 items for testing
    });

    const result = await dynamoDBClient.send(command);

    // Unmarshall the items
    const items = result.Items?.map(item => unmarshall(item)) || [];

    console.log(`Found ${items.length} resumes in DynamoDB`);

    return NextResponse.json({
      success: true,
      count: items.length,
      items: items.map(item => ({
        resumeId: item.resumeId,
        userId: item.userId,
        title: item.title,
        fileName: item.fileName,
        s3Url: item.s3Url,
        aiProvider: item.aiProvider,
        skillsCount: item.skills?.length || 0,
        createdAt: item.createdAt,
      })),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('DynamoDB check error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to check DynamoDB',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
