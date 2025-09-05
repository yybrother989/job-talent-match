import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { randomUUID } from 'crypto'

// Initialize DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

type MatchScores = {
  lexical?: number
  vector?: number
  rules?: number
  rerank?: number
  total?: number
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json({ error: 'AWS credentials not configured' }, { status: 500 })
    }

    const body = await request.json()
    const {
      resumeId,
      jobId,
      matchId,
      userId,
      scores,
      explanation,
      rank,
      provider,
      filters,
      features,
      status,
    } = body || {}

    if (!resumeId || !jobId) {
      return NextResponse.json({ error: 'Missing required fields: resumeId, jobId' }, { status: 400 })
    }

    const now = new Date().toISOString()

    const item = {
      // PK + SK
      resumeId: String(resumeId),
      matchId: matchId || randomUUID(),

      // Joining keys / filters
      jobId: String(jobId),
      userId: userId ? String(userId) : undefined,

      // Scores and explanations
      scores: (scores || {}) as MatchScores,
      explanation: explanation || '',
      rank: typeof rank === 'number' ? rank : undefined,
      provider: provider || 'hybrid',
      filters: filters || undefined,
      features: features || undefined,

      // Metadata
      createdAt: now,
      updatedAt: now,
      status: (status as string) || 'active',
      version: '1.0',
    }

    const put = new PutItemCommand({
      TableName: 'job-talent-match-job-matches',
      Item: marshall(item, { removeUndefinedValues: true }),
    })

    await dynamoDBClient.send(put)

    return NextResponse.json({
      success: true,
      resumeId: item.resumeId,
      jobId: item.jobId,
      matchId: item.matchId,
      timestamp: now,
    })
  } catch (error) {
    console.error('DynamoDB upsert job-match error:', error)
    return NextResponse.json(
      {
        error: 'Failed to upsert job match',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}


