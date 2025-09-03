import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    console.log('AI Comparison: Testing both providers...');

    const results = {
      current: null as any,
      aws: null as any,
      comparison: null as any,
    };

    // Test Current Service (OpenAI)
    try {
      const currentStartTime = Date.now();
      const currentResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/parse-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const currentDuration = Date.now() - currentStartTime;
      
      if (currentResponse.ok) {
        const currentData = await currentResponse.json();
        results.current = {
          success: true,
          data: currentData.data,
          duration: currentDuration,
          provider: 'openai',
        };
      } else {
        results.current = {
          success: false,
          error: `HTTP ${currentResponse.status}`,
          duration: currentDuration,
          provider: 'openai',
        };
      }
    } catch (error) {
      results.current = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'openai',
      };
    }

    // Test AWS Service (Bedrock)
    try {
      const awsStartTime = Date.now();
      const awsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/parse-resume-aws`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const awsDuration = Date.now() - awsStartTime;
      
      if (awsResponse.ok) {
        const awsData = await awsResponse.json();
        results.aws = {
          success: true,
          data: awsData.data,
          duration: awsDuration,
          provider: 'aws-bedrock',
        };
      } else {
        results.aws = {
          success: false,
          error: `HTTP ${awsResponse.status}`,
          duration: awsDuration,
          provider: 'aws-bedrock',
        };
      }
    } catch (error) {
      results.aws = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: 'aws-bedrock',
      };
    }

    // Compare results
    if (results.current?.success && results.aws?.success) {
      results.comparison = {
        bothSuccessful: true,
        durationDifference: results.aws.duration - results.current.duration,
        skillsMatch: JSON.stringify(results.current.data.skills) === JSON.stringify(results.aws.data.skills),
        experienceMatch: results.current.data.experience === results.aws.data.experience,
        educationMatch: results.current.data.education === results.aws.data.education,
        fasterProvider: results.current.duration < results.aws.duration ? 'openai' : 'aws-bedrock',
      };
    } else {
      results.comparison = {
        bothSuccessful: false,
        currentSuccess: results.current?.success || false,
        awsSuccess: results.aws?.success || false,
      };
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('AI comparison error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to compare AI services',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
