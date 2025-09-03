import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { JobMatch, JobMatchingOptions, JobMatchingResult, SkillsGapAnalysis, InterviewPreparation } from '../../types/job';
import { Resume } from '../../types/resume';
import { logger } from '../../utils/logger';

export class BedrockJobMatcher {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(region: string = 'us-east-1', modelId: string = 'anthropic.claude-3-sonnet-20240229-v1:0') {
    this.client = new BedrockRuntimeClient({ region });
    this.modelId = modelId;
  }

  async matchJobs(
    userProfile: Resume, 
    availableJobs: any[], 
    options: JobMatchingOptions = {}
  ): Promise<JobMatchingResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting job matching with Bedrock', { 
        userId: userProfile.userId,
        jobsCount: availableJobs.length,
        options 
      });

      const prompt = this.buildJobMatchingPrompt(userProfile, availableJobs, options);
      
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: JSON.stringify({
          prompt,
          max_tokens: options.maxResults ? options.maxResults * 200 : 2000,
          temperature: 0.1,
        }),
      });

      const response = await this.client.send(command);
      const processingTime = Date.now() - startTime;

      const matches = this.parseJobMatches(response, availableJobs, options);

      logger.info('Job matching completed', { 
        processingTime, 
        matchesCount: matches.length,
        averageScore: matches.reduce((sum, match) => sum + match.score, 0) / matches.length
      });

      return {
        success: true,
        matches,
        totalJobs: availableJobs.length,
        processingTime,
        provider: 'aws-bedrock',
        timestamp: new Date(),
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Job matching failed', { error, processingTime });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        provider: 'aws-bedrock',
        timestamp: new Date(),
      };
    }
  }

  async analyzeSkillsGap(
    userProfile: Resume, 
    targetJob: any
  ): Promise<SkillsGapAnalysis> {
    const startTime = Date.now();
    
    try {
      const prompt = this.buildSkillsGapPrompt(userProfile, targetJob);
      
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: JSON.stringify({
          prompt,
          max_tokens: 1000,
          temperature: 0.1,
        }),
      });

      const response = await this.client.send(command);
      const processingTime = Date.now() - startTime;

      const analysis = this.parseSkillsGapAnalysis(response);

      logger.info('Skills gap analysis completed', { 
        processingTime,
        missingSkillsCount: analysis.missingSkills.length
      });

      return analysis;

    } catch (error) {
      logger.error('Skills gap analysis failed', { error });
      throw error;
    }
  }

  async prepareForInterview(
    userProfile: Resume, 
    job: any, 
    companyInfo?: any
  ): Promise<InterviewPreparation> {
    const startTime = Date.now();
    
    try {
      const prompt = this.buildInterviewPrepPrompt(userProfile, job, companyInfo);
      
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: JSON.stringify({
          prompt,
          max_tokens: 1500,
          temperature: 0.1,
        }),
      });

      const response = await this.client.send(command);
      const processingTime = Date.now() - startTime;

      const preparation = this.parseInterviewPreparation(response);

      logger.info('Interview preparation completed', { 
        processingTime,
        questionsCount: preparation.technicalQuestions.length + preparation.behavioralQuestions.length
      });

      return preparation;

    } catch (error) {
      logger.error('Interview preparation failed', { error });
      throw error;
    }
  }

  private buildJobMatchingPrompt(
    userProfile: Resume, 
    availableJobs: any[], 
    options: JobMatchingOptions
  ): string {
    return `Analyze this user profile and match them with the best jobs from the available list.

    User Profile:
    - Skills: ${userProfile.skills.join(', ')}
    - Experience: ${userProfile.experience}
    - Education: ${userProfile.education}
    - Current Role: ${userProfile.currentRole}
    - Years of Experience: ${userProfile.yearsOfExperience}
    - Location: ${userProfile.location}
    - Salary Expectation: ${userProfile.salaryExpectation}

    Available Jobs:
    ${availableJobs.map(job => `
    Job ID: ${job.id}
    Title: ${job.title}
    Company: ${job.company}
    Location: ${job.location}
    Required Skills: ${job.mustHaveSkills?.join(', ') || ''}
    Nice-to-have Skills: ${job.niceToHaveSkills?.join(', ') || ''}
    Experience Required: ${job.yearsRequired} years
    Salary Range: ${job.salaryMin}-${job.salaryMax}
    Job Type: ${job.jobType}
    Remote Work: ${job.remoteWork}
    Description: ${job.description}
    `).join('\n')}

    Instructions:
    1. Rank jobs by overall fit (0-100 score)
    2. Consider skills match, experience level, location, salary, and job type
    3. Provide specific reasons for each match
    4. Return top ${options.maxResults || 10} matches
    5. Include score breakdown for transparency

    Return JSON format:
    {
      "matches": [
        {
          "jobId": "job_id",
          "score": 85,
          "title": "Job Title",
          "company": "Company Name",
          "location": "Location",
          "matchReasons": ["reason1", "reason2"],
          "scoreBreakdown": {
            "skills": 90,
            "experience": 80,
            "education": 85,
            "location": 70,
            "salary": 75
          }
        }
      ]
    }`;
  }

  private buildSkillsGapPrompt(userProfile: Resume, targetJob: any): string {
    return `Analyze the skills gap between this user profile and the target job.

    User Profile:
    - Skills: ${userProfile.skills.join(', ')}
    - Experience: ${userProfile.experience}
    - Education: ${userProfile.education}
    - Years of Experience: ${userProfile.yearsOfExperience}

    Target Job:
    - Title: ${targetJob.title}
    - Required Skills: ${targetJob.mustHaveSkills?.join(', ') || ''}
    - Nice-to-have Skills: ${targetJob.niceToHaveSkills?.join(', ') || ''}
    - Experience Required: ${targetJob.yearsRequired} years
    - Description: ${targetJob.description}

    Provide:
    1. Missing skills analysis
    2. Learning recommendations
    3. Alternative job suggestions
    4. Career development path
    5. Estimated time to acquire missing skills
    6. Learning resources

    Return JSON format:
    {
      "missingSkills": ["skill1", "skill2"],
      "learningRecommendations": ["recommendation1", "recommendation2"],
      "alternativeJobs": ["job1", "job2"],
      "careerDevelopmentPath": ["step1", "step2"],
      "estimatedTimeToAcquire": "3-6 months",
      "resources": ["resource1", "resource2"]
    }`;
  }

  private buildInterviewPrepPrompt(userProfile: Resume, job: any, companyInfo?: any): string {
    return `Prepare interview questions and answers for this user applying to this job.

    User Profile:
    - Skills: ${userProfile.skills.join(', ')}
    - Experience: ${userProfile.experience}
    - Education: ${userProfile.education}
    - Current Role: ${userProfile.currentRole}
    - Years of Experience: ${userProfile.yearsOfExperience}

    Job:
    - Title: ${job.title}
    - Company: ${job.company}
    - Required Skills: ${job.mustHaveSkills?.join(', ') || ''}
    - Description: ${job.description}
    - Requirements: ${job.requirements}

    Company Info: ${companyInfo ? JSON.stringify(companyInfo) : 'Not provided'}

    Provide:
    1. Technical questions based on job requirements
    2. Behavioral questions based on company culture
    3. Suggested answers highlighting user's experience
    4. Questions to ask the interviewer
    5. Company-specific insights and tips

    Return JSON format:
    {
      "technicalQuestions": ["question1", "question2"],
      "behavioralQuestions": ["question1", "question2"],
      "suggestedAnswers": ["answer1", "answer2"],
      "questionsToAsk": ["question1", "question2"],
      "companyInsights": ["insight1", "insight2"],
      "tips": ["tip1", "tip2"]
    }`;
  }

  private parseJobMatches(response: any, availableJobs: any[], options: JobMatchingOptions): JobMatch[] {
    try {
      const responseBody = JSON.parse(response.body as string);
      const content = responseBody.completion || responseBody.content || '';
      const parsed = JSON.parse(content);
      
      return parsed.matches.map((match: any) => {
        const job = availableJobs.find(j => j.id === match.jobId);
        return {
          jobId: match.jobId,
          userId: '', // Will be set by caller
          score: match.score,
          title: match.title || job?.title || '',
          company: match.company || job?.company || '',
          location: match.location || job?.location || '',
          matchReasons: match.matchReasons || [],
          scoreBreakdown: match.scoreBreakdown || {},
          hybridScore: {}, // Will be calculated separately
          traditionalScore: match.scoreBreakdown || {},
          finalScore: match.score,
          createdAt: new Date(),
        };
      });
    } catch (error) {
      logger.error('Failed to parse job matches', { error, response });
      return [];
    }
  }

  private parseSkillsGapAnalysis(response: any): SkillsGapAnalysis {
    try {
      const responseBody = JSON.parse(response.body as string);
      const content = responseBody.completion || responseBody.content || '';
      const parsed = JSON.parse(content);
      
      return {
        missingSkills: parsed.missingSkills || [],
        learningRecommendations: parsed.learningRecommendations || [],
        alternativeJobs: parsed.alternativeJobs || [],
        careerDevelopmentPath: parsed.careerDevelopmentPath || [],
        estimatedTimeToAcquire: parsed.estimatedTimeToAcquire || 'Unknown',
        resources: parsed.resources || [],
      };
    } catch (error) {
      logger.error('Failed to parse skills gap analysis', { error, response });
      return {
        missingSkills: [],
        learningRecommendations: [],
        alternativeJobs: [],
        careerDevelopmentPath: [],
        estimatedTimeToAcquire: 'Unknown',
        resources: [],
      };
    }
  }

  private parseInterviewPreparation(response: any): InterviewPreparation {
    try {
      const responseBody = JSON.parse(response.body as string);
      const content = responseBody.completion || responseBody.content || '';
      const parsed = JSON.parse(content);
      
      return {
        technicalQuestions: parsed.technicalQuestions || [],
        behavioralQuestions: parsed.behavioralQuestions || [],
        suggestedAnswers: parsed.suggestedAnswers || [],
        questionsToAsk: parsed.questionsToAsk || [],
        companyInsights: parsed.companyInsights || [],
        tips: parsed.tips || [],
      };
    } catch (error) {
      logger.error('Failed to parse interview preparation', { error, response });
      return {
        technicalQuestions: [],
        behavioralQuestions: [],
        suggestedAnswers: [],
        questionsToAsk: [],
        companyInsights: [],
        tips: [],
      };
    }
  }
}
