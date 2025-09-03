import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

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

    const body = await request.json();
    const {
      userId,
      profileData,
      preferencesData,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    console.log(`Storing user profile data in DynamoDB for user: ${userId}`);

    // Create the DynamoDB item
    const item = {
      userId: userId,
      profileData: profileData || {},
      preferencesData: preferencesData || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      version: '1.0',
    };

    // Store in DynamoDB
    const command = new PutItemCommand({
      TableName: 'job-talent-match-user-profiles',
      Item: marshall(item),
    });

    await dynamoDBClient.send(command);

    console.log(`DynamoDB storage successful for user profile: ${userId}`);

    return NextResponse.json({
      success: true,
      userId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('DynamoDB storage error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to store user profile data in DynamoDB',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
