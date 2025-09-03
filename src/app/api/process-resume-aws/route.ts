import { NextRequest, NextResponse } from 'next/server';
import { DocumentStorageService } from '../../../../aws-ai-service/src/services/s3/documentStorage';
import { BedrockResumeParser } from '../../../../aws-ai-service/src/services/bedrock/resumeParser';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

// Initialize AWS services
const documentStorage = new DocumentStorageService();
const resumeParser = new BedrockResumeParser();
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

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
    const userEmail = formData.get('userEmail') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    console.log('AWS Pipeline: Starting complete resume processing...');
    const startTime = Date.now();

    // Step 1: Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Step 2: Upload to S3
    console.log('AWS Pipeline: Uploading to S3...');
    const document = await documentStorage.uploadDocument(
      fileBuffer,
      file.name,
      file.type,
      userId,
      {
        folder: 'resumes',
        tags: {
          type: 'resume',
          userId,
          uploadedAt: new Date().toISOString()
        }
      }
    );

    // Step 3: Extract text (simplified for now - in production, use Textract)
    let extractedText = '';
    try {
      // For now, we'll use a simple text extraction
      // In production, you'd use Textract here
      extractedText = `Resume: ${file.name}\nFile Type: ${file.type}\nFile Size: ${file.size} bytes\n\nThis is a placeholder for text extraction. In production, AWS Textract would extract the actual text from the document.`;
    } catch (error) {
      console.warn('Text extraction failed, using fallback:', error);
      extractedText = `Resume: ${file.name}\nFile Type: ${file.type}\nFile Size: ${file.size} bytes`;
    }

    // Step 4: Parse with Bedrock AI
    console.log('AWS Pipeline: Parsing with Bedrock AI...');
    const parsingResult = await resumeParser.parseResume(extractedText, {
      includeConfidence: true,
      language: 'en',
      temperature: 0.1,
      maxTokens: 1000,
    });

    if (!parsingResult.success || !parsingResult.data) {
      throw new Error('Failed to parse resume with Bedrock AI');
    }

    // Step 5: Store in DynamoDB
    console.log('AWS Pipeline: Storing in DynamoDB...');
    const userProfile = {
      userId,
      email: userEmail || 'unknown@example.com',
      firstName: 'User',
      lastName: 'Name',
      skills: parsingResult.data.skills,
      currentRole: parsingResult.data.currentRole,
      yearsOfExperience: parsingResult.data.yearsOfExperience,
      summary: parsingResult.data.summary,
      education: parsingResult.data.education ? [parsingResult.data.education] : undefined,
      experience: parsingResult.data.experience || [],
      projects: parsingResult.data.projects || [],
      certifications: parsingResult.data.certifications || [],
      languages: parsingResult.data.languages || [],
      location: parsingResult.data.location || 'Not specified',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const putProfileCommand = new PutItemCommand({
      TableName: 'job-talent-match-user-profiles',
      Item: marshall(userProfile)
    });

    await dynamoClient.send(putProfileCommand);

    const totalTime = Date.now() - startTime;

    console.log(`AWS Pipeline: Complete processing finished in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        // S3 Document info
        document: {
          key: document.key,
          size: document.size,
          uploadedAt: document.uploadedAt
        },
        // AI Parsing results
        aiParsing: {
          skills: parsingResult.data.skills,
          currentRole: parsingResult.data.currentRole,
          yearsOfExperience: parsingResult.data.yearsOfExperience,
          summary: parsingResult.data.summary,
          education: parsingResult.data.education,
          experience: parsingResult.data.experience,
          projects: parsingResult.data.projects,
          certifications: parsingResult.data.certifications,
          languages: parsingResult.data.languages,
          location: parsingResult.data.location,
          confidence: parsingResult.confidence
        },
        // DynamoDB storage
        userProfile: {
          userId: userProfile.userId,
          skillsCount: userProfile.skills.length,
          role: userProfile.currentRole,
          experience: userProfile.yearsOfExperience
        }
      },
      provider: 'aws-complete-pipeline',
      duration: totalTime,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('AWS Pipeline error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to process resume with AWS pipeline',
        details: error instanceof Error ? error.message : 'Unknown error',
        provider: 'aws-complete-pipeline',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
