import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if AWS credentials are available
    const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
    const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;
    const hasRegion = !!process.env.AWS_REGION;
    const hasModelId = !!process.env.AWS_BEDROCK_MODEL_ID;

    const awsConfigured = hasAccessKey && hasSecretKey && hasRegion && hasModelId;

    return NextResponse.json({
      success: true,
      awsConfigured,
      details: {
        hasAccessKey,
        hasSecretKey,
        hasRegion,
        hasModelId,
        region: process.env.AWS_REGION || 'not set',
        modelId: process.env.AWS_BEDROCK_MODEL_ID || 'not set'
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('AWS test error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test AWS configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
