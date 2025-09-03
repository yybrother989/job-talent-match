// AI Service abstraction layer for easy migration between providers
export interface ParsedResume {
  skills: string[];
  experience: string;
  education: string;
  summary: string;
  yearsOfExperience?: number;
  currentRole?: string;
}

export interface JobMatch {
  jobId: string;
  score: number;
  title: string;
  company: string;
  location: string;
  matchReasons: string[];
}

export interface UserProfile {
  userId: string;
  skills: string[];
  experience: string;
  education: string;
  location?: string;
  salaryExpectation?: number;
}

export interface AIService {
  parseResume(text: string): Promise<ParsedResume>;
  generateEmbedding(text: string): Promise<number[]>;
  matchJobs(profile: UserProfile): Promise<JobMatch[]>;
}

export class AIServiceFactory {
  static create(): AIService {
    const provider = process.env.AI_PROVIDER || 'current';
    
    switch (provider) {
      case 'aws':
        return new AWSAIService();
      case 'current':
      default:
        return new CurrentAIService();
    }
  }
}

// Current implementation (OpenAI + Hugging Face)
export class CurrentAIService implements AIService {
  async parseResume(text: string): Promise<ParsedResume> {
    try {
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Current AI service error:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('/api/generate-embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.embedding || [];
    } catch (error) {
      console.error('Current embedding service error:', error);
      throw error;
    }
  }

  async matchJobs(profile: UserProfile): Promise<JobMatch[]> {
    // This would call your existing matching algorithm
    // For now, return empty array
    return [];
  }
}

// AWS implementation (Bedrock + SageMaker)
export class AWSAIService implements AIService {
  private bedrockClient: any;
  private sagemakerClient: any;

  constructor() {
    // Dynamically import AWS SDK to avoid build issues
    this.initializeClients();
  }

  private async initializeClients() {
    try {
      const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
      const { SageMakerRuntimeClient, InvokeEndpointCommand } = await import('@aws-sdk/client-sagemaker-runtime');
      
      this.bedrockClient = {
        client: new BedrockRuntimeClient({ 
          region: process.env.AWS_REGION || 'us-east-1' 
        }),
        InvokeModelCommand
      };
      
      this.sagemakerClient = {
        client: new SageMakerRuntimeClient({ 
          region: process.env.AWS_REGION || 'us-east-1' 
        }),
        InvokeEndpointCommand
      };
    } catch (error) {
      console.error('Failed to initialize AWS clients:', error);
      throw error;
    }
  }

  async parseResume(text: string): Promise<ParsedResume> {
    try {
      if (!this.bedrockClient) {
        await this.initializeClients();
      }

      const command = new this.bedrockClient.InvokeModelCommand({
        modelId: process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
        body: JSON.stringify({
          prompt: `Parse this resume and extract skills, experience, and education in JSON format: ${text}`,
          max_tokens: 1000,
          temperature: 0.1
        })
      });

      const response = await this.bedrockClient.client.send(command);
      return this.parseBedrockResponse(response);
    } catch (error) {
      console.error('AWS Bedrock error:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.sagemakerClient) {
        await this.initializeClients();
      }

      const command = new this.sagemakerClient.InvokeEndpointCommand({
        EndpointName: process.env.AWS_SAGEMAKER_ENDPOINT || 'job-matching-embeddings-endpoint',
        Body: JSON.stringify({ text }),
        ContentType: 'application/json'
      });

      const response = await this.sagemakerClient.client.send(command);
      const result = JSON.parse(response.body);
      return result.embedding || [];
    } catch (error) {
      console.error('AWS SageMaker error:', error);
      throw error;
    }
  }

  async matchJobs(profile: UserProfile): Promise<JobMatch[]> {
    // This would use AWS services for enhanced matching
    // For now, return empty array
    return [];
  }

  private parseBedrockResponse(response: any): ParsedResume {
    try {
      const content = JSON.parse(response.body);
      const parsed = JSON.parse(content.completion || '{}');
      
      return {
        skills: parsed.skills || [],
        experience: parsed.experience || '',
        education: parsed.education || '',
        summary: parsed.summary || '',
        yearsOfExperience: parsed.yearsOfExperience || 0,
        currentRole: parsed.currentRole || ''
      };
    } catch (error) {
      console.error('Failed to parse Bedrock response:', error);
      // Fallback parsing
      return {
        skills: [],
        experience: '',
        education: '',
        summary: '',
        yearsOfExperience: 0,
        currentRole: ''
      };
    }
  }
}
