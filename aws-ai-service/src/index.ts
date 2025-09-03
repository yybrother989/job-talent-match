// AWS AI Service Module - Main Entry Point
export * from './services/bedrock/resumeParser';
export * from './services/bedrock/jobMatcher';
export * from './services/textract/documentProcessor';
export * from './services/pipeline/resumeProcessingPipeline';
export * from './services/s3/documentStorage';
export * from './services/dynamodb/dataService';
export * from './services/data/unifiedDataService';
export * from './types/resume';
export * from './types/job';
export * from './types/dataModels';
export * from './utils/logger';

// Main service classes
export { BedrockResumeParser } from './services/bedrock/resumeParser';
export { BedrockJobMatcher } from './services/bedrock/jobMatcher';
export { DocumentProcessor } from './services/textract/documentProcessor';
export { ResumeProcessingPipeline } from './services/pipeline/resumeProcessingPipeline';
export { DocumentStorageService } from './services/s3/documentStorage';
export { DynamoDBDataService } from './services/dynamodb/dataService';
export { UnifiedDataService } from './services/data/unifiedDataService';

// Types
export type {
  Resume,
  ParsedResume,
  ResumeParsingRequest,
  ResumeParsingResponse,
  ResumeParsingOptions,
  ResumeParsingResult,
} from './types/resume';

export type {
  Job,
  JobMatch,
  JobMatchingRequest,
  JobMatchingResponse,
  JobMatchingOptions,
  JobMatchingResult,
  SkillsGapAnalysis,
  InterviewPreparation,
} from './types/job';

// Utility functions
export { logger } from './utils/logger';

// Service factory for easy initialization
export class AWSAIServiceFactory {
  static createResumeParser(region?: string, modelId?: string) {
    return new BedrockResumeParser(region, modelId);
  }

  static createJobMatcher(region?: string, modelId?: string) {
    return new BedrockJobMatcher(region, modelId);
  }
}

// Default configuration
export const DEFAULT_CONFIG = {
  region: 'us-east-1',
  modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  logLevel: 'info',
} as const;
