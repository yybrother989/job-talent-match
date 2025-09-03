import { NextRequest, NextResponse } from 'next/server';
import { BedrockResumeParser } from '../../../../aws-ai-service/src/services/bedrock/resumeParser';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing AWS integration...');

    // Test 1: Check environment variables
    const envCheck = {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasRegion: !!process.env.AWS_REGION,
      hasModelId: !!process.env.AWS_BEDROCK_MODEL_ID,
    };

    console.log('Environment check:', envCheck);

    // Test 2: Try to create Bedrock parser
    let parserCreated = false;
    let parserError = null;
    try {
      const parser = new BedrockResumeParser();
      parserCreated = true;
      console.log('Bedrock parser created successfully');
    } catch (error) {
      parserError = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to create Bedrock parser:', error);
    }

    // Test 3: Try a simple parsing test
    let parsingTest = null;
    if (parserCreated) {
      try {
        const testText = `
          John Doe
          Senior Software Engineer
          john.doe@email.com | (555) 123-4567 | San Francisco, CA
          
          SUMMARY
          Experienced software engineer with 5 years of experience in full-stack development.
          
          SKILLS
          JavaScript, TypeScript, React, Node.js, AWS, Docker
          
          EXPERIENCE
          Senior Software Engineer | TechCorp Inc. | 2020 - Present
          - Led development of microservices architecture
          - Implemented CI/CD pipelines
          
          EDUCATION
          Bachelor of Science in Computer Science
          University of California, Berkeley | 2014 - 2018
        `;

        console.log('Testing resume parsing...');
        const startTime = Date.now();
        const result = await new BedrockResumeParser().parseResume(testText, {
          includeConfidence: true,
          language: 'en',
          temperature: 0.1,
          maxTokens: 500,
        });
        const duration = Date.now() - startTime;

        parsingTest = {
          success: result.success,
          duration,
          confidence: result.confidence,
          skillsCount: result.data?.skills?.length || 0,
          hasData: !!result.data,
        };

        console.log('Parsing test result:', parsingTest);
      } catch (error) {
        parsingTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        console.error('Parsing test failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      integration: {
        environment: envCheck,
        parserCreation: {
          success: parserCreated,
          error: parserError,
        },
        parsingTest,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Integration test error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Integration test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
