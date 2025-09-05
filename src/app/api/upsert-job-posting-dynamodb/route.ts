import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'

// Server-side UUID
import { randomUUID } from 'crypto'

// Initialize DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

type NormalizedJob = {
  jobId?: string
  source?: string
  sourceUrl?: string
  title: string
  company?: { name: string; id?: string | null } | null
  location?: {
    city?: string | null
    region?: string | null
    country?: string | null
    lat?: number | null
    lon?: number | null
    remote?: boolean | null
  } | null
  employmentType?: string | null // full_time | part_time | contract | intern | temp
  seniority?: string | null // junior | mid | senior | lead | principal
  salary?: { min?: number | null; max?: number | null; currency?: string | null; periodicity?: string | null } | null
  description?: string | null
  requirements?: string[] | null
  responsibilities?: string[] | null
  skills?: { required?: string[]; niceToHave?: string[] }
  keywords?: string[] | null
  postedAt?: string | null
  updatedAt?: string | null
  expiresAt?: string | null
  status?: 'active' | 'closed' | 'expired' | 'draft'
  // Indexing helpers
  indexing?: { fullText?: string | null } | null
  // Embedding/Index status metadata (vector itself lives in OpenSearch)
  embedding?: { status?: 'pending' | 'ready' | 'failed'; model?: string | null; version?: string | null; lastUpdated?: string | null; vectorDim?: number | null; hash?: string | null; opensearchId?: string | null } | null
}

function normalizeArray(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => String(v))
  return String(value).split(',').map((s) => s.trim()).filter(Boolean)
}

function buildFullText(job: NormalizedJob): string {
  const parts: string[] = []
  if (job.title) parts.push(job.title)
  if (job.company?.name) parts.push(job.company.name)
  if (job.description) parts.push(job.description)
  if (job.requirements && job.requirements.length) parts.push(job.requirements.join(' '))
  if (job.responsibilities && job.responsibilities.length) parts.push(job.responsibilities.join(' '))
  const skills = [
    ...(job.skills?.required || []),
    ...(job.skills?.niceToHave || []),
  ]
  if (skills.length) parts.push(skills.join(' '))
  if (job.keywords && job.keywords.length) parts.push(job.keywords.join(' '))
  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    // Validate env
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json({ error: 'AWS credentials not configured' }, { status: 500 })
    }

    const body = (await request.json()) as Partial<NormalizedJob>

    // Basic validation
    if (!body || !body.title) {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 })
    }

    const now = new Date().toISOString()

    const job: NormalizedJob = {
      jobId: body.jobId || randomUUID(),
      source: body.source || 'simulated',
      sourceUrl: body.sourceUrl || '',
      title: body.title.trim(),
      company: body.company?.name ? { name: body.company.name, id: body.company.id || null } : (body.company || null) || null,
      location: body.location || null,
      employmentType: body.employmentType || null,
      seniority: body.seniority || null,
      salary: body.salary || null,
      description: (body.description || '')?.toString(),
      requirements: normalizeArray(body.requirements),
      responsibilities: normalizeArray(body.responsibilities),
      skills: {
        required: normalizeArray(body?.skills?.required),
        niceToHave: normalizeArray(body?.skills?.niceToHave),
      },
      keywords: normalizeArray(body.keywords),
      postedAt: body.postedAt || now,
      updatedAt: now,
      expiresAt: body.expiresAt || null,
      status: (body.status as any) || 'active',
      indexing: { fullText: buildFullText(body as NormalizedJob) },
      embedding: {
        status: 'pending',
        model: process.env.AWS_EMBEDDING_MODEL_ID || null,
        version: '1',
        lastUpdated: now,
        vectorDim: process.env.AWS_EMBEDDING_DIM ? Number(process.env.AWS_EMBEDDING_DIM) : null,
        hash: null,
        opensearchId: null,
      },
    }

    const put = new PutItemCommand({
      TableName: 'job-talent-match-job-postings',
      Item: marshall(job, { removeUndefinedValues: true }),
    })

    await dynamoDBClient.send(put)

    return NextResponse.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      embeddingStatus: job.embedding?.status || 'pending',
      timestamp: now,
    })
  } catch (error) {
    console.error('DynamoDB upsert job error:', error)
    return NextResponse.json(
      {
        error: 'Failed to upsert job posting',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}


