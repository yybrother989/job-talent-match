import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
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
    const bucketName = formData.get('bucketName') as string;
    const key = formData.get('key') as string;

    if (!file || !bucketName || !key) {
      return NextResponse.json(
        { error: 'Missing required fields: file, bucketName, key' },
        { status: 400 }
      );
    }

    console.log(`Uploading to S3: ${bucketName}/${key}`);
    console.log(`File: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
      Metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'job-talent-match-app',
      },
    });

    await s3Client.send(command);

    // Generate public URL
    const url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    console.log(`S3 upload successful: ${url}`);

    return NextResponse.json({
      success: true,
      url,
      key,
      bucketName,
      fileSize: file.size,
      contentType: file.type,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('S3 upload error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to upload to S3',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
