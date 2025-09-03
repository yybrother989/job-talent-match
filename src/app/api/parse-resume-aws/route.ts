import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
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

    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    console.log('AWS Bedrock: Starting resume parsing...');

    const command = new InvokeModelCommand({
      modelId: process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
      body: JSON.stringify({
        prompt: `Parse this resume text and extract the following information in JSON format:
        {
          "skills": ["skill1", "skill2", ...],
          "experience": "summary of work experience",
          "education": "educational background",
          "summary": "professional summary",
          "yearsOfExperience": number,
          "currentRole": "current job title"
        }
        
        Resume text: ${text}`,
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    const startTime = Date.now();
    const response = await bedrockClient.send(command);
    const duration = Date.now() - startTime;

    console.log(`AWS Bedrock: Parsing completed in ${duration}ms`);

    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const parsedData = JSON.parse(responseBody.completion || '{}');

    return NextResponse.json({
      success: true,
      data: {
        skills: parsedData.skills || [],
        experience: parsedData.experience || '',
        education: parsedData.education || '',
        summary: parsedData.summary || '',
        yearsOfExperience: parsedData.yearsOfExperience || 0,
        currentRole: parsedData.currentRole || '',
      },
      provider: 'aws-bedrock',
      duration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('AWS Bedrock error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to parse resume with AWS Bedrock',
        details: error instanceof Error ? error.message : 'Unknown error',
        provider: 'aws-bedrock',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
