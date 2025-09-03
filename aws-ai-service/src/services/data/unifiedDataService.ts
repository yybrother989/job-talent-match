import { config } from 'dotenv';
import { DocumentStorageService } from '../s3/documentStorage';
import { DynamoDBDataService } from '../dynamodb/dataService';
import { ResumeProcessingPipeline } from '../pipeline/resumeProcessingPipeline';
import { logger } from '../../utils/logger';
import { 
  UserProfile, 
  JobPosting, 
  JobMatch, 
  S3Document,
  ResumeProcessingPipelineResult 
} from '../../types/dataModels';

// Load environment variables
config();

export interface ResumeUploadResult {
  success: boolean;
  document?: S3Document;
  processingResult?: ResumeProcessingPipelineResult;
  userProfile?: UserProfile;
  error?: string;
  totalTime: number;
}

export interface JobMatchingResult {
  success: boolean;
  matches: JobMatch[];
  totalMatches: number;
  processingTime: number;
  error?: string;
}

export class UnifiedDataService {
  private documentStorage: DocumentStorageService;
  private dataService: DynamoDBDataService;
  private resumePipeline: ResumeProcessingPipeline;

  constructor(region?: string) {
    this.documentStorage = new DocumentStorageService(region);
    this.dataService = new DynamoDBDataService(region);
    this.resumePipeline = new ResumeProcessingPipeline(region);
  }

  // Complete Resume Upload and Processing Workflow
  async uploadAndProcessResume(
    file: Buffer,
    fileName: string,
    contentType: string,
    userId: string,
    userEmail: string
  ): Promise<ResumeUploadResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting complete resume upload and processing workflow', { 
        userId, 
        fileName, 
        fileSize: file.length 
      });

      // Step 1: Upload document to S3
      logger.info('Step 1: Uploading document to S3...');
      const document = await this.documentStorage.uploadDocument(
        file,
        fileName,
        contentType,
        userId,
        {
          folder: 'resumes',
          tags: {
            type: 'resume',
            userId,
            uploadedAt: new Date().toISOString()
          }
        }
      );

      // Step 2: Process resume with AI pipeline
      logger.info('Step 2: Processing resume with AI pipeline...');
      const processingResult = await this.resumePipeline.processResume(file, {
        includeStructuredData: true,
        includeFormData: true,
        includeTableData: true,
        includeConfidence: true,
        language: 'en',
        temperature: 0.1,
        maxTokens: 1000,
      });

      if (!processingResult.success || !processingResult.resumeParsing?.success) {
        return {
          success: false,
          document,
          processingResult,
          error: 'Failed to process resume with AI',
          totalTime: Date.now() - startTime
        };
      }

      // Step 3: Create or update user profile
      logger.info('Step 3: Creating/updating user profile...');
      const resumeData = processingResult.resumeParsing.data;
      if (!resumeData) {
        return {
          success: false,
          document,
          processingResult,
          error: 'No resume data extracted',
          totalTime: Date.now() - startTime
        };
      }

      // Check if user profile exists
      let userProfile = await this.dataService.getUserProfile(userId);
      
      if (userProfile) {
        // Update existing profile
        userProfile = await this.dataService.updateUserProfile(userId, {
          skills: resumeData.skills,
          currentRole: resumeData.currentRole,
          yearsOfExperience: resumeData.yearsOfExperience,
          summary: resumeData.summary,
          education: resumeData.education ? [resumeData.education] : undefined,
          experience: resumeData.experience,
          projects: resumeData.projects,
          certifications: resumeData.certifications,
          languages: resumeData.languages,
          location: resumeData.location,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Create new profile
        userProfile = {
          userId,
          email: userEmail,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          skills: resumeData.skills,
          currentRole: resumeData.currentRole,
          yearsOfExperience: resumeData.yearsOfExperience,
          summary: resumeData.summary,
          education: resumeData.education ? [resumeData.education] : undefined,
          experience: resumeData.experience,
          projects: resumeData.projects,
          certifications: resumeData.certifications,
          languages: resumeData.languages,
          location: resumeData.location,
          isActive: true
        };
        
        await this.dataService.createUserProfile(userProfile);
      }

      const totalTime = Date.now() - startTime;
      
      logger.info('Resume upload and processing completed successfully', { 
        userId, 
        totalTime,
        skillsCount: resumeData.skills.length 
      });

      return {
        success: true,
        document,
        processingResult,
        userProfile,
        totalTime
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error('Resume upload and processing failed', { error, userId, totalTime });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalTime
      };
    }
  }

  // Job Matching Workflow
  async findJobMatches(userId: string, options: {
    limit?: number;
    minScore?: number;
    location?: string;
    remoteType?: string;
    employmentType?: string;
  } = {}): Promise<JobMatchingResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting job matching workflow', { userId, options });

      // Step 1: Get user profile
      const userProfile = await this.dataService.getUserProfile(userId);
      if (!userProfile) {
        return {
          success: false,
          matches: [],
          totalMatches: 0,
          processingTime: Date.now() - startTime,
          error: 'User profile not found'
        };
      }

      // Step 2: Search for relevant jobs
      const jobFilters: any = {
        isActive: true
      };
      
      if (options.location) {
        jobFilters.location = options.location;
      }
      if (options.remoteType) {
        jobFilters.remoteType = options.remoteType;
      }
      if (options.employmentType) {
        jobFilters.employmentType = options.employmentType;
      }

      const jobs = await this.dataService.searchJobs(jobFilters, {
        limit: options.limit || 100
      });

      // Step 3: Calculate matches (simplified matching algorithm)
      const matches: JobMatch[] = [];
      
      for (const job of jobs) {
        const matchScore = this.calculateMatchScore(userProfile, job);
        
        if (matchScore.overallScore >= (options.minScore || 0.5)) {
          const match: JobMatch = {
            matchId: `${userId}-${job.jobId}-${Date.now()}`,
            userId,
            jobId: job.jobId,
            createdAt: new Date().toISOString(),
            overallScore: matchScore.overallScore,
            skillMatchScore: matchScore.skillMatchScore,
            experienceMatchScore: matchScore.experienceMatchScore,
            locationMatchScore: matchScore.locationMatchScore,
            semanticMatchScore: 0, // Placeholder for semantic matching
            lexicalMatchScore: 0, // Placeholder for lexical matching
            matchedSkills: matchScore.matchedSkills,
            missingSkills: matchScore.missingSkills,
            experienceGap: matchScore.experienceGap,
            locationCompatibility: matchScore.locationCompatibility,
            status: 'pending',
            lastUpdated: new Date().toISOString()
          };
          
          matches.push(match);
        }
      }

      // Step 4: Sort matches by score and store them
      matches.sort((a, b) => b.overallScore - a.overallScore);
      
      // Store top matches
      const topMatches = matches.slice(0, options.limit || 20);
      for (const match of topMatches) {
        await this.dataService.createJobMatch(match);
      }

      const processingTime = Date.now() - startTime;
      
      logger.info('Job matching completed', { 
        userId, 
        totalMatches: matches.length,
        storedMatches: topMatches.length,
        processingTime 
      });

      return {
        success: true,
        matches: topMatches,
        totalMatches: matches.length,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Job matching failed', { error, userId, processingTime });

      return {
        success: false,
        matches: [],
        totalMatches: 0,
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get user's job matches
  async getUserJobMatches(userId: string, options: {
    limit?: number;
    status?: string;
  } = {}): Promise<JobMatch[]> {
    try {
      logger.info('Getting user job matches', { userId, options });

      const matches = await this.dataService.getUserJobMatches(userId, {
        limit: options.limit || 50
      });

      // Filter by status if specified
      const filteredMatches = options.status 
        ? matches.filter(match => match.status === options.status)
        : matches;

      logger.info('User job matches retrieved', { 
        userId, 
        totalMatches: matches.length,
        filteredMatches: filteredMatches.length 
      });

      return filteredMatches;

    } catch (error) {
      logger.error('Failed to get user job matches', { error, userId });
      throw new Error(`Failed to get user job matches: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create job posting
  async createJobPosting(job: JobPosting): Promise<JobPosting> {
    try {
      logger.info('Creating job posting', { jobId: job.jobId });

      const createdJob = await this.dataService.createJobPosting(job);
      
      logger.info('Job posting created successfully', { jobId: job.jobId });
      return createdJob;

    } catch (error) {
      logger.error('Failed to create job posting', { error, jobId: job.jobId });
      throw new Error(`Failed to create job posting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get user documents
  async getUserDocuments(userId: string): Promise<S3Document[]> {
    try {
      logger.info('Getting user documents', { userId });

      const documents = await this.documentStorage.listUserDocuments(userId, undefined, 'resumes');
      
      logger.info('User documents retrieved', { userId, count: documents.length });
      return documents;

    } catch (error) {
      logger.error('Failed to get user documents', { error, userId });
      throw new Error(`Failed to get user documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility method for calculating match scores
  private calculateMatchScore(userProfile: UserProfile, job: JobPosting): {
    overallScore: number;
    skillMatchScore: number;
    experienceMatchScore: number;
    locationMatchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    experienceGap?: number;
    locationCompatibility: 'exact' | 'nearby' | 'remote' | 'incompatible';
  } {
    // Skill matching
    const userSkills = new Set(userProfile.skills.map(s => s.toLowerCase()));
    const requiredSkills = new Set(job.requiredSkills.map(s => s.toLowerCase()));
    const preferredSkills = new Set(job.preferredSkills.map(s => s.toLowerCase()));
    
    const matchedRequiredSkills = Array.from(requiredSkills).filter(skill => userSkills.has(skill));
    const matchedPreferredSkills = Array.from(preferredSkills).filter(skill => userSkills.has(skill));
    const missingSkills = Array.from(requiredSkills).filter(skill => !userSkills.has(skill));
    
    const skillMatchScore = (matchedRequiredSkills.length + matchedPreferredSkills.length * 0.5) / 
                           (requiredSkills.size + preferredSkills.size * 0.5);

    // Experience matching
    const userExperience = userProfile.yearsOfExperience || 0;
    const experienceGap = Math.abs(userExperience - this.getExperienceLevelYears(job.experienceLevel));
    const experienceMatchScore = Math.max(0, 1 - (experienceGap / 10)); // Normalize to 0-1

    // Location matching
    let locationMatchScore = 0;
    let locationCompatibility: 'exact' | 'nearby' | 'remote' | 'incompatible' = 'incompatible';
    
    if (job.remoteType === 'remote') {
      locationMatchScore = 1;
      locationCompatibility = 'remote';
    } else if (userProfile.location && job.location) {
      if (userProfile.location.toLowerCase() === job.location.toLowerCase()) {
        locationMatchScore = 1;
        locationCompatibility = 'exact';
      } else if (this.isNearbyLocation(userProfile.location, job.location)) {
        locationMatchScore = 0.7;
        locationCompatibility = 'nearby';
      }
    }

    // Overall score (weighted average)
    const overallScore = (
      skillMatchScore * 0.5 +
      experienceMatchScore * 0.3 +
      locationMatchScore * 0.2
    );

    return {
      overallScore,
      skillMatchScore,
      experienceMatchScore,
      locationMatchScore,
      matchedSkills: [...matchedRequiredSkills, ...matchedPreferredSkills],
      missingSkills,
      experienceGap,
      locationCompatibility
    };
  }

  private getExperienceLevelYears(level: string): number {
    const experienceMap: Record<string, number> = {
      'entry': 1,
      'mid': 3,
      'senior': 7,
      'lead': 10,
      'executive': 15
    };
    return experienceMap[level] || 3;
  }

  private isNearbyLocation(userLocation: string, jobLocation: string): boolean {
    // Simplified location matching - in production, use geocoding service
    const userCity = userLocation.split(',')[0].toLowerCase();
    const jobCity = jobLocation.split(',')[0].toLowerCase();
    return userCity === jobCity;
  }
}
