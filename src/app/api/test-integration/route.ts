import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

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

    // Test 2: Try to create Bedrock client
    let clientCreated = false;
    let clientError = null;
    try {
      const client = new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      clientCreated = true;
      console.log('Bedrock client created successfully');
    } catch (error) {
      clientError = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to create Bedrock client:', error);
    }

    // Test 3: Try a simple parsing test
    let parsingTest = null;
    if (clientCreated) {
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

        Resume text: ${testText}`;

        const command = new InvokeModelCommand({
          modelId: process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 1000,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ]
          })
        });

        const client = new BedrockRuntimeClient({
          region: process.env.AWS_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          },
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const parsedData = JSON.parse(responseBody.content[0].text);
        
        const duration = Date.now() - startTime;

        parsingTest = {
          success: true,
          duration,
          confidence: 0.9,
          skillsCount: parsedData?.skills?.length || 0,
          hasData: !!parsedData,
          extractedName: parsedData?.name,
          extractedEmail: parsedData?.email,
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
        clientCreation: {
          success: clientCreated,
          error: clientError,
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