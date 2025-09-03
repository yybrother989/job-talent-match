import { config } from 'dotenv';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Resume, ResumeParsingOptions, ResumeParsingResult } from '../../types/resume';
import { logger } from '../../utils/logger';

// Load environment variables
config();

export class BedrockResumeParser {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(region?: string, modelId?: string) {
    this.client = new BedrockRuntimeClient({ 
      region: region || process.env.AWS_REGION || 'us-east-1' 
    });
    this.modelId = modelId || process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';
  }

  async parseResume(text: string, options: ResumeParsingOptions = {}): Promise<ResumeParsingResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting resume parsing with Bedrock', { 
        textLength: text.length, 
        model: this.modelId,
        options 
      });

      const prompt = this.buildPrompt(text, options);
      
      // Check if this is a Claude 3.5 model that requires Messages API
      const isClaude35 = this.modelId.includes('claude-3-5') || this.modelId.includes('claude-3.5');
      
      let command;
      if (isClaude35) {
        // Use Messages API for Claude 3.5
        command = new InvokeModelCommand({
          modelId: this.modelId,
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.1,
          }),
        });
      } else {
        // Use legacy API for older Claude models
        command = new InvokeModelCommand({
          modelId: this.modelId,
          body: JSON.stringify({
            prompt,
            max_tokens_to_sample: options.maxTokens || 1000,
            temperature: options.temperature || 0.1,
          }),
        });
      }

      const response = await this.client.send(command);
      const processingTime = Date.now() - startTime;

      // Convert response body to string if it's a Uint8Array
      let responseBody;
      if (response.body instanceof Uint8Array) {
        responseBody = new TextDecoder().decode(response.body);
      } else {
        responseBody = response.body;
      }

      const parsedData = this.parseResponse({ ...response, body: responseBody }, options);
      const confidence = this.calculateConfidence(parsedData, text);

      logger.info('Resume parsing completed', { 
        processingTime, 
        confidence,
        skillsCount: parsedData.skills?.length || 0 
      });

      return {
        success: true,
        data: parsedData,
        confidence,
        processingTime,
        provider: 'aws-bedrock',
        timestamp: new Date(),
        rawResponse: options.includeRawResponse ? response : undefined,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Resume parsing failed', { error, processingTime });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        provider: 'aws-bedrock',
        timestamp: new Date(),
      };
    }
  }

  private buildPrompt(text: string, options: ResumeParsingOptions): string {
    const language = options.language || 'en';
    
    return `Human: Parse this resume text and extract the following information in JSON format. 
Be accurate and comprehensive in your analysis.

Required JSON structure:
{
  "skills": ["skill1", "skill2", "skill3"],
  "experience": "summary of work experience",
  "education": "educational background",
  "summary": "professional summary",
  "yearsOfExperience": number,
  "currentRole": "current job title",
  "location": "location if mentioned",
  "salaryExpectation": number if mentioned,
  "languages": ["language1", "language2"],
  "certifications": ["cert1", "cert2"],
  "projects": ["project1", "project2"]
}

Resume text (${language}):
${text}

Instructions:
- Extract all technical and soft skills
- Calculate years of experience from work history
- Identify current or most recent role
- Include location if mentioned
- Extract any certifications or projects
- Be specific and accurate
- Return only valid JSON, no additional text

Assistant:`;
  }

  private parseResponse(response: any, options: ResumeParsingOptions): Resume {
    try {
      const responseBody = JSON.parse(response.body as string);
      
      // Handle different response formats
      let content = '';
      if (responseBody.content && Array.isArray(responseBody.content)) {
        // Messages API format (Claude 3.5)
        content = responseBody.content[0]?.text || '';
      } else {
        // Legacy API format (older Claude models)
        content = responseBody.completion || responseBody.content || '';
      }
      
      // Try to parse the JSON response
      const parsed = JSON.parse(content);
      
      // Validate and clean the data
      return {
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        experience: parsed.experience || '',
        education: parsed.education || '',
        summary: parsed.summary || '',
        yearsOfExperience: typeof parsed.yearsOfExperience === 'number' ? parsed.yearsOfExperience : 0,
        currentRole: parsed.currentRole || '',
        location: parsed.location || '',
        salaryExpectation: typeof parsed.salaryExpectation === 'number' ? parsed.salaryExpectation : undefined,
        languages: Array.isArray(parsed.languages) ? parsed.languages : [],
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      };
    } catch (error) {
      logger.error('Failed to parse Bedrock response', { error, response });
      
      // Fallback parsing
      return {
        skills: [],
        experience: '',
        education: '',
        summary: '',
        yearsOfExperience: 0,
        currentRole: '',
        location: '',
        salaryExpectation: undefined,
        languages: [],
        certifications: [],
        projects: [],
      };
    }
  }

  private calculateConfidence(parsedData: Resume, originalText: string): number {
    let confidence = 0;
    
    // Check if we extracted meaningful data
    if (parsedData.skills.length > 0) confidence += 0.3;
    if (parsedData.experience.length > 10) confidence += 0.2;
    if (parsedData.education.length > 5) confidence += 0.2;
    if (parsedData.summary.length > 10) confidence += 0.2;
    if (parsedData.currentRole && parsedData.currentRole.length > 0) confidence += 0.1;
    
    // Penalize if we got too little data relative to input
    const extractedTextLength = [
      parsedData.skills.join(' '),
      parsedData.experience,
      parsedData.education,
      parsedData.summary
    ].join(' ').length;
    
    const extractionRatio = extractedTextLength / originalText.length;
    if (extractionRatio < 0.1) confidence *= 0.5;
    
    return Math.min(confidence, 1.0);
  }

  // Batch processing for multiple resumes
  async parseResumesBatch(
    texts: string[], 
    options: ResumeParsingOptions = {}
  ): Promise<ResumeParsingResult[]> {
    logger.info('Starting batch resume parsing', { count: texts.length });
    
    const results = await Promise.allSettled(
      texts.map(text => this.parseResume(text, options))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason?.message || 'Unknown error',
          processingTime: 0,
          provider: 'aws-bedrock',
          timestamp: new Date(),
        };
      }
    });
  }
}
