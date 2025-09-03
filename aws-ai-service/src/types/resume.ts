import { z } from 'zod';

// Resume parsing schemas
export const ResumeSchema = z.object({
  skills: z.array(z.string()),
  experience: z.string(),
  education: z.string(),
  summary: z.string(),
  yearsOfExperience: z.number().optional(),
  currentRole: z.string().optional(),
  location: z.string().optional(),
  salaryExpectation: z.number().optional(),
  languages: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
});

export const ParsedResumeSchema = ResumeSchema.extend({
  id: z.string(),
  userId: z.string(),
  originalText: z.string(),
  parsedAt: z.date(),
  confidence: z.number().min(0).max(1),
  source: z.enum(['bedrock', 'openai', 'manual']),
});

export const ResumeParsingRequestSchema = z.object({
  text: z.string().min(1),
  userId: z.string().optional(),
  options: z.object({
    includeConfidence: z.boolean().default(true),
    includeRawResponse: z.boolean().default(false),
    language: z.string().default('en'),
  }).optional(),
});

export const ResumeParsingResponseSchema = z.object({
  success: z.boolean(),
  data: ResumeSchema.optional(),
  error: z.string().optional(),
  confidence: z.number().optional(),
  processingTime: z.number(),
  provider: z.string(),
  timestamp: z.date(),
});

// Type exports
export type Resume = z.infer<typeof ResumeSchema>;
export type ParsedResume = z.infer<typeof ParsedResumeSchema>;
export type ResumeParsingRequest = z.infer<typeof ResumeParsingRequestSchema>;
export type ResumeParsingResponse = z.infer<typeof ResumeParsingResponseSchema>;

// Resume parsing options
export interface ResumeParsingOptions {
  includeConfidence?: boolean;
  includeRawResponse?: boolean;
  language?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// Resume parsing result
export interface ResumeParsingResult {
  success: boolean;
  data?: Resume;
  error?: string;
  confidence?: number;
  processingTime: number;
  provider: string;
  timestamp: Date;
  rawResponse?: any;
}
