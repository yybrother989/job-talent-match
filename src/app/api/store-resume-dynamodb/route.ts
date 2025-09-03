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
      resumeId,
      title,
      fileName,
      fileSize,
      fileType,
      s3Url,
      s3Key,
      parsedText,
      aiParsedData,
      aiProvider,
      skills,
      technicalSkills,
      education,
      certifications,
      experienceDetails,
    } = body;

    if (!userId || !resumeId || !title || !s3Url) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, resumeId, title, s3Url' },
        { status: 400 }
      );
    }

    console.log(`Storing resume data in DynamoDB for user: ${userId}`);

    // Create the DynamoDB item
    const item = {
      userId: userId,
      resumeId: resumeId,
      title: title,
      fileName: fileName || '',
      fileSize: fileSize || 0,
      fileType: fileType || '',
      s3Url: s3Url,
      s3Key: s3Key || '',
      parsedText: parsedText || '',
      
      // AI Parsing Results
      aiProvider: aiProvider || 'none',
      aiParsedData: aiParsedData || null,
      skills: skills || [],
      technicalSkills: technicalSkills || {},
      education: education || [],
      certifications: certifications || [],
      experienceDetails: experienceDetails || [],
      
      // Metadata
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'processed',
      version: '1.0',
    };

    // Store in DynamoDB
    const command = new PutItemCommand({
      TableName: 'job-talent-match-resumes',
      Item: marshall(item),
    });

    await dynamoDBClient.send(command);

    console.log(`DynamoDB storage successful for resume: ${resumeId}`);

    return NextResponse.json({
      success: true,
      resumeId,
      userId,
      s3Url,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('DynamoDB storage error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to store resume data in DynamoDB',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
