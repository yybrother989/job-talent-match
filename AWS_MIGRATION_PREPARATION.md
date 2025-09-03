# AWS AI Migration Preparation Guide

## 🎯 **Migration Overview**

This guide outlines the step-by-step process to migrate AI components from current services (OpenAI + Hugging Face) to AWS services (Bedrock + SageMaker).

## 📋 **Phase 1: AWS Account & Service Setup**

### **Step 1: AWS Account Setup**
1. **Create AWS Account** (if not exists)
   - Go to [aws.amazon.com](https://aws.amazon.com)
   - Sign up for AWS account
   - Set up billing alerts and budgets

2. **Configure AWS CLI**
   ```bash
   # Install AWS CLI
   brew install awscli  # macOS
   
   # Configure credentials
   aws configure
   # Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
   ```

3. **Set up IAM User**
   - Create IAM user with programmatic access
   - Attach policies: `BedrockFullAccess`, `SageMakerFullAccess`, `LambdaFullAccess`
   - Generate access keys

### **Step 2: Request Service Access**
1. **AWS Bedrock Access**
   - Go to AWS Bedrock console
   - Request access to Claude models
   - Wait for approval (usually 24-48 hours)

2. **AWS SageMaker Access**
   - Enable SageMaker service
   - Set up execution role
   - Configure VPC (optional)

### **Step 3: Environment Preparation**
1. **Install AWS SDK**
   ```bash
   npm install @aws-sdk/client-bedrock-runtime @aws-sdk/client-sagemaker-runtime
   ```

2. **Update Environment Variables**
   ```bash
   # Add to .env.local
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
   ```

## 🔧 **Phase 2: Code Preparation (Week 2-3)**

### **Step 1: Create Service Abstraction Layer**

Create `src/lib/ai/aiService.ts`:
```typescript
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
```

### **Step 2: Implement AWS Services**

Create `src/lib/ai/awsAIService.ts`:
```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { SageMakerRuntimeClient, InvokeEndpointCommand } from "@aws-sdk/client-sagemaker-runtime";

export class AWSAIService implements AIService {
  private bedrockClient: BedrockRuntimeClient;
  private sagemakerClient: SageMakerRuntimeClient;

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    this.sagemakerClient = new SageMakerRuntimeClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
  }

  async parseResume(text: string): Promise<ParsedResume> {
    const command = new InvokeModelCommand({
      modelId: process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
      body: JSON.stringify({
        prompt: `Parse this resume and extract skills, experience, and education: ${text}`,
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    const response = await this.bedrockClient.send(command);
    return this.parseBedrockResponse(response);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const command = new InvokeEndpointCommand({
      EndpointName: process.env.AWS_SAGEMAKER_ENDPOINT || 'job-matching-embeddings-endpoint',
      Body: JSON.stringify({ text }),
      ContentType: 'application/json'
    });

    const response = await this.sagemakerClient.send(command);
    return JSON.parse(response.body);
  }

  private parseBedrockResponse(response: any): ParsedResume {
    // Parse Bedrock response format
    const content = JSON.parse(response.body);
    return {
      skills: content.skills || [],
      experience: content.experience || '',
      education: content.education || '',
      summary: content.summary || ''
    };
  }
}
```

### **Step 3: Update API Routes**

Update `src/app/api/parse-resume/route.ts`:
```typescript
import { AIServiceFactory } from '@/lib/ai/aiService';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    const aiService = AIServiceFactory.create();
    const parsedData = await aiService.parseResume(text);
    
    return Response.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Resume parsing error:', error);
    return Response.json({ error: "Failed to parse resume" }, { status: 500 });
  }
}
```

## 🧪 **Phase 3: Testing & Validation (Week 3-4)**

### **Step 1: A/B Testing Setup**
1. **Environment-based switching**
   ```bash
   # Test current services
   AI_PROVIDER=current npm run dev
   
   # Test AWS services
   AI_PROVIDER=aws npm run dev
   ```

2. **Create test endpoints**
   ```typescript
   // src/app/api/test-ai/route.ts
   export async function POST(request: Request) {
     const { provider, text } = await request.json();
     
     // Temporarily override provider
     process.env.AI_PROVIDER = provider;
     const aiService = AIServiceFactory.create();
     
     const startTime = Date.now();
     const result = await aiService.parseResume(text);
     const duration = Date.now() - startTime;
     
     return Response.json({
       provider,
       result,
       duration,
       timestamp: new Date().toISOString()
     });
   }
   ```

### **Step 2: Performance Comparison**
1. **Test with sample resumes**
2. **Compare parsing accuracy**
3. **Measure response times**
4. **Monitor costs**

## 🚀 **Phase 4: Gradual Migration (Week 4-6)**

### **Step 1: Feature Flags**
```typescript
// src/lib/ai/featureFlags.ts
export const AI_FEATURES = {
  USE_AWS_BEDROCK: process.env.USE_AWS_BEDROCK === 'true',
  USE_AWS_SAGEMAKER: process.env.USE_AWS_SAGEMAKER === 'true',
  MIGRATION_PERCENTAGE: parseInt(process.env.MIGRATION_PERCENTAGE || '0')
};

export function shouldUseAWS(userId: string): boolean {
  if (!AI_FEATURES.USE_AWS_BEDROCK) return false;
  
  // Gradual rollout based on user ID hash
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return Math.abs(hash) % 100 < AI_FEATURES.MIGRATION_PERCENTAGE;
}
```

### **Step 2: Gradual Rollout**
1. **Start with 10% of users**
2. **Monitor performance and errors**
3. **Gradually increase to 50%, then 100%**
4. **Rollback capability if issues arise**

## 📊 **Phase 5: Monitoring & Optimization (Week 6-8)**

### **Step 1: Set up Monitoring**
1. **AWS CloudWatch**
   - Monitor API calls and errors
   - Set up alarms for failures
   - Track costs and usage

2. **Application Monitoring**
   ```typescript
   // Add to AI service calls
   const startTime = Date.now();
   try {
     const result = await aiService.parseResume(text);
     console.log(`AI Service Success: ${Date.now() - startTime}ms`);
     return result;
   } catch (error) {
     console.error(`AI Service Error: ${Date.now() - startTime}ms`, error);
     throw error;
   }
   ```

### **Step 2: Cost Optimization**
1. **Monitor AWS costs daily**
2. **Optimize model usage**
3. **Implement caching where possible**
4. **Set up billing alerts**

## 🔒 **Security & Compliance**

### **Step 1: IAM Policies**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "sagemaker:InvokeEndpoint"
      ],
      "Resource": "*"
    }
  ]
}
```

### **Step 2: Environment Security**
```bash
# Never commit AWS keys to git
echo "AWS_ACCESS_KEY_ID=your_key" >> .env.local
echo "AWS_SECRET_ACCESS_KEY=your_secret" >> .env.local
echo ".env.local" >> .gitignore
```

## 📈 **Success Metrics**

### **Performance Metrics**
- Response time < 3 seconds
- Error rate < 1%
- Cost per request < $0.01
- Uptime > 99.9%

### **Quality Metrics**
- Parsing accuracy > 95%
- User satisfaction > 4.5/5
- Feature adoption > 80%

## 🚨 **Rollback Plan**

### **Emergency Rollback**
1. **Environment variable switch**
   ```bash
   AI_PROVIDER=current
   ```

2. **Database rollback** (if needed)
3. **User notification** of temporary issues
4. **Root cause analysis**

## 📅 **Timeline Summary**

- **Week 1-2**: AWS setup and service access
- **Week 2-3**: Code preparation and abstraction
- **Week 3-4**: Testing and validation
- **Week 4-6**: Gradual migration
- **Week 6-8**: Monitoring and optimization

## 🎯 **Next Steps**

1. **Start with AWS account setup**
2. **Request Bedrock access immediately**
3. **Create service abstraction layer**
4. **Test with sample data**
5. **Plan gradual rollout**

---

*This migration plan ensures minimal risk while maximizing the benefits of AWS AI services.*
