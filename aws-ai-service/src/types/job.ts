import { z } from 'zod';

// Job matching schemas
export const JobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  description: z.string(),
  requirements: z.string(),
  skills: z.array(z.string()),
  mustHaveSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
  experienceLevel: z.enum(['entry', 'junior', 'mid', 'senior', 'lead', 'executive']),
  yearsRequired: z.number(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']),
  remoteWork: z.boolean(),
  benefits: z.array(z.string()).optional(),
  industry: z.string().optional(),
  companySize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
});

export const JobMatchSchema = z.object({
  jobId: z.string(),
  userId: z.string(),
  score: z.number().min(0).max(100),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  matchReasons: z.array(z.string()),
  scoreBreakdown: z.object({
    skills: z.number(),
    experience: z.number(),
    education: z.number(),
    location: z.number(),
    salary: z.number(),
    culture: z.number().optional(),
  }),
  hybridScore: z.object({
    bm25: z.number(),
    semantic: z.number(),
    skillOverlap: z.number(),
    mustHaveBonus: z.number(),
  }),
  traditionalScore: z.object({
    skills: z.number(),
    experience: z.number(),
    education: z.number(),
    location: z.number(),
    salary: z.number(),
  }),
  finalScore: z.number(),
  createdAt: z.date(),
});

export const JobMatchingRequestSchema = z.object({
  userId: z.string(),
  userProfile: z.object({
    skills: z.array(z.string()),
    experience: z.string(),
    education: z.string(),
    location: z.string().optional(),
    salaryExpectation: z.number().optional(),
    preferences: z.object({
      remoteWork: z.boolean().optional(),
      jobType: z.array(z.string()).optional(),
      industries: z.array(z.string()).optional(),
      companySize: z.array(z.string()).optional(),
    }).optional(),
  }),
  options: z.object({
    maxResults: z.number().default(10),
    minScore: z.number().default(60),
    includeScoreBreakdown: z.boolean().default(true),
    useRAG: z.boolean().default(true),
  }).optional(),
});

export const JobMatchingResponseSchema = z.object({
  success: z.boolean(),
  matches: z.array(JobMatchSchema).optional(),
  error: z.string().optional(),
  totalJobs: z.number().optional(),
  processingTime: z.number(),
  provider: z.string(),
  timestamp: z.date(),
});

// Type exports
export type Job = z.infer<typeof JobSchema>;
export type JobMatch = z.infer<typeof JobMatchSchema>;
export type JobMatchingRequest = z.infer<typeof JobMatchingRequestSchema>;
export type JobMatchingResponse = z.infer<typeof JobMatchingResponseSchema>;

// Job matching options
export interface JobMatchingOptions {
  maxResults?: number;
  minScore?: number;
  includeScoreBreakdown?: boolean;
  useRAG?: boolean;
  useHybridAlgorithm?: boolean;
  weightSkills?: number;
  weightExperience?: number;
  weightEducation?: number;
  weightLocation?: number;
  weightSalary?: number;
}

// Job matching result
export interface JobMatchingResult {
  success: boolean;
  matches?: JobMatch[];
  error?: string;
  totalJobs?: number;
  processingTime: number;
  provider: string;
  timestamp: Date;
}

// Skills gap analysis
export interface SkillsGapAnalysis {
  missingSkills: string[];
  learningRecommendations: string[];
  alternativeJobs: string[];
  careerDevelopmentPath: string[];
  estimatedTimeToAcquire: string;
  resources: string[];
}

// Interview preparation
export interface InterviewPreparation {
  technicalQuestions: string[];
  behavioralQuestions: string[];
  suggestedAnswers: string[];
  questionsToAsk: string[];
  companyInsights: string[];
  tips: string[];
}
