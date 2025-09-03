import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
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

    console.log('Checking DynamoDB for user profiles...');

    if (userId) {
      // Get specific user profile
      const command = new GetItemCommand({
        TableName: 'job-talent-match-user-profiles',
        Key: {
          userId: { S: userId },
        },
      });

      const result = await dynamoDBClient.send(command);

      if (!result.Item) {
        return NextResponse.json({
          success: true,
          count: 0,
          items: [],
          message: 'No profile found for this user',
          timestamp: new Date().toISOString(),
        });
      }

      const item = unmarshall(result.Item);

      return NextResponse.json({
        success: true,
        count: 1,
        items: [{
          userId: item.userId,
          profileData: item.profileData,
          preferencesData: item.preferencesData,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          status: item.status,
        }],
        timestamp: new Date().toISOString(),
      });
    } else {
      // Scan all user profiles
      const command = new ScanCommand({
        TableName: 'job-talent-match-user-profiles',
        Limit: 10, // Limit to 10 items for testing
      });

      const result = await dynamoDBClient.send(command);

      // Unmarshall the items
      const items = result.Items?.map(item => unmarshall(item)) || [];

      console.log(`Found ${items.length} user profiles in DynamoDB`);

      return NextResponse.json({
        success: true,
        count: items.length,
        items: items.map(item => ({
          userId: item.userId,
          profileData: item.profileData,
          preferencesData: item.preferencesData,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          status: item.status,
        })),
        timestamp: new Date().toISOString(),
      });
    }

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
