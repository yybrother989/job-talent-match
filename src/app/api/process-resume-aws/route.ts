import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

// Initialize AWS services
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const dynamoClient = new DynamoDBClient({ 
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    console.log('AWS Pipeline: Starting complete resume processing...');
    const startTime = Date.now();

    // Step 1: Upload to S3
    const fileBuffer = await file.arrayBuffer();
    const fileName = `resumes/${userId}/${Date.now()}-${file.name}`;
    
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileName,
      Body: new Uint8Array(fileBuffer),
      ContentType: file.type,
    });

    await s3Client.send(uploadCommand);
    console.log('AWS Pipeline: File uploaded to S3');

    // Step 2: Extract text (simplified - in production you'd use Textract)
    const fileText = `Resume content for ${file.name}`; // Simplified for demo

    // Step 3: Parse with Bedrock
    const prompt = `Parse the following resume text and extract structured information. Return a JSON object with the following fields:
    - name: Full name
    - email: Email address
    - phone: Phone number
    - location: Location/address
    - summary: Professional summary
    - skills: Array of technical skills
    - experience: Array of work experience objects with company, title, duration, description
    - education: Array of education objects with degree, institution, year
    - languages: Array of languages
    - yearsOfExperience: Number of years of experience
    - currentRole: Current job title

    Resume text: ${fileText}`;

    const bedrockCommand = new InvokeModelCommand({
      modelId: process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const bedrockResponse = await bedrockClient.send(bedrockCommand);
    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
    const parsedData = JSON.parse(responseBody.content[0].text);
    
    console.log('AWS Pipeline: Resume parsed with Bedrock');

    // Step 4: Store in DynamoDB
    const resumeId = `resume-${Date.now()}`;
    const item = {
      userId: userId,
      resumeId: resumeId,
      s3Key: fileName,
      parsedData: parsedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'processed',
      version: '1.0',
    };

    const dynamoCommand = new PutItemCommand({
      TableName: 'job-talent-match-resumes',
      Item: marshall(item),
    });

    await dynamoClient.send(dynamoCommand);
    console.log('AWS Pipeline: Data stored in DynamoDB');

    const duration = Date.now() - startTime;
    console.log(`AWS Pipeline: Complete processing finished in ${duration}ms`);

    return NextResponse.json({
      success: true,
      data: {
        resumeId,
        s3Key: fileName,
        parsedData,
        processingTime: duration,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('AWS Pipeline error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to process resume with AWS pipeline',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}