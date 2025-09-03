# AWS AI Module Integration Guide

## 🎯 **Integration Strategy**

This guide shows how to integrate the separate AWS AI module with your main job-talent-match application.

## 📁 **Module Structure**

```
job-talent-match/                 # Your main app
├── aws-ai-service/              # Separate AWS AI module
│   ├── src/
│   ├── examples/
│   ├── tests/
│   └── package.json
├── src/
│   ├── app/
│   ├── components/
│   └── lib/
└── package.json
```

## 🔌 **Integration Methods**

### **Method 1: Local Module (Recommended for Development)**

```bash
# In your main app's package.json
{
  "dependencies": {
    "aws-ai-service": "file:./aws-ai-service"
  }
}
```

### **Method 2: NPM Package (Recommended for Production)**

```bash
# Publish the module to NPM
cd aws-ai-service
npm publish

# Install in main app
npm install aws-ai-service
```

### **Method 3: Git Submodule (For Team Collaboration)**

```bash
# Add as git submodule
git submodule add https://github.com/your-org/aws-ai-service.git aws-ai-service

# Update submodule
git submodule update --remote
```

## 🔧 **Integration Steps**

### **Step 1: Update Main App Dependencies**

```bash
# In your main app
npm install ./aws-ai-service
```

### **Step 2: Create Integration Layer**

Create `src/lib/aws-ai-integration.ts`:

```typescript
import { 
  BedrockResumeParser, 
  BedrockJobMatcher, 
  AWSAIServiceFactory,
  ResumeParsingOptions,
  JobMatchingOptions 
} from 'aws-ai-service';

export class AWSAIIntegration {
  private resumeParser: BedrockResumeParser;
  private jobMatcher: BedrockJobMatcher;

  constructor() {
    this.resumeParser = AWSAIServiceFactory.createResumeParser();
    this.jobMatcher = AWSAIServiceFactory.createJobMatcher();
  }

  async parseResume(text: string, options?: ResumeParsingOptions) {
    return await this.resumeParser.parseResume(text, options);
  }

  async matchJobs(userProfile: any, availableJobs: any[], options?: JobMatchingOptions) {
    return await this.jobMatcher.matchJobs(userProfile, availableJobs, options);
  }

  async analyzeSkillsGap(userProfile: any, targetJob: any) {
    return await this.jobMatcher.analyzeSkillsGap(userProfile, targetJob);
  }

  async prepareForInterview(userProfile: any, job: any, companyInfo?: any) {
    return await this.jobMatcher.prepareForInterview(userProfile, job, companyInfo);
  }
}
```

### **Step 3: Update API Routes**

Update `src/app/api/parse-resume-aws/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AWSAIIntegration } from '@/lib/aws-ai-integration';

const awsAI = new AWSAIIntegration();

export async function POST(request: NextRequest) {
  try {
    const { text, options } = await request.json();
    
    const result = await awsAI.parseResume(text, options);
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to parse resume with AWS AI' },
      { status: 500 }
    );
  }
}
```

### **Step 4: Create Job Matching API**

Create `src/app/api/job-matching-aws/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AWSAIIntegration } from '@/lib/aws-ai-integration';

const awsAI = new AWSAIIntegration();

export async function POST(request: NextRequest) {
  try {
    const { userProfile, availableJobs, options } = await request.json();
    
    const result = await awsAI.matchJobs(userProfile, availableJobs, options);
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to match jobs with AWS AI' },
      { status: 500 }
    );
  }
}
```

### **Step 5: Update Frontend Components**

Update your resume parsing component:

```typescript
// In your React component
import { useState } from 'react';

export function ResumeUpload() {
  const [isUsingAWS, setIsUsingAWS] = useState(false);

  const parseResume = async (text: string) => {
    const endpoint = isUsingAWS ? '/api/parse-resume-aws' : '/api/parse-resume';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    return await response.json();
  };

  return (
    <div>
      <label>
        <input 
          type="checkbox" 
          checked={isUsingAWS}
          onChange={(e) => setIsUsingAWS(e.target.checked)}
        />
        Use AWS AI Services
      </label>
      
      {/* Rest of your component */}
    </div>
  );
}
```

## 🧪 **Testing Integration**

### **A/B Testing Setup**

Create `src/lib/ai-service-factory.ts`:

```typescript
import { AWSAIIntegration } from './aws-ai-integration';

export class AIServiceFactory {
  static create(provider: 'current' | 'aws' = 'current') {
    switch (provider) {
      case 'aws':
        return new AWSAIIntegration();
      case 'current':
      default:
        return new CurrentAIService(); // Your existing service
    }
  }
}
```

### **Feature Flag Integration**

```typescript
// In your environment variables
AWS_AI_ENABLED=false
AWS_AI_PERCENTAGE=0  # 0-100, percentage of users to use AWS

// In your service
export function shouldUseAWS(userId: string): boolean {
  if (!process.env.AWS_AI_ENABLED) return false;
  
  const percentage = parseInt(process.env.AWS_AI_PERCENTAGE || '0');
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return Math.abs(hash) % 100 < percentage;
}
```

## 📊 **Monitoring Integration**

### **Add AWS AI Metrics**

```typescript
// In your AWS AI integration
import { logger } from 'aws-ai-service';

export class AWSAIIntegration {
  async parseResume(text: string, options?: ResumeParsingOptions) {
    const startTime = Date.now();
    
    try {
      const result = await this.resumeParser.parseResume(text, options);
      
      // Log metrics
      logger.info('Resume parsing completed', {
        processingTime: Date.now() - startTime,
        success: result.success,
        confidence: result.confidence,
        provider: 'aws-bedrock'
      });
      
      return result;
    } catch (error) {
      logger.error('Resume parsing failed', { error, processingTime: Date.now() - startTime });
      throw error;
    }
  }
}
```

## 🚀 **Deployment Strategy**

### **Development Environment**

```bash
# Use local module
npm install ./aws-ai-service

# Test with feature flags
AWS_AI_ENABLED=true AWS_AI_PERCENTAGE=10 npm run dev
```

### **Production Environment**

```bash
# Use published NPM package
npm install aws-ai-service@latest

# Deploy with gradual rollout
AWS_AI_ENABLED=true AWS_AI_PERCENTAGE=25 npm run build
```

## 🔄 **Migration Workflow**

### **Phase 1: Development & Testing**

1. **Develop AWS AI module** independently
2. **Test with sample data** and validate results
3. **Create integration layer** in main app
4. **A/B test** with small percentage of users

### **Phase 2: Gradual Rollout**

1. **Start with 10%** of users
2. **Monitor performance** and error rates
3. **Gradually increase** to 50%, then 100%
4. **Optimize** based on real usage data

### **Phase 3: Full Migration**

1. **Remove old dependencies** (OpenAI, Hugging Face)
2. **Clean up unused code**
3. **Update documentation**
4. **Monitor and optimize**

## 🎯 **Benefits of This Approach**

- ✅ **Independent Development**: Work on AWS AI module separately
- ✅ **Risk Mitigation**: Main app stays stable during development
- ✅ **Easy Testing**: Test AWS services without affecting main app
- ✅ **Gradual Migration**: Roll out gradually with feature flags
- ✅ **Team Collaboration**: Different teams can work on different modules
- ✅ **Version Control**: Separate releases and rollbacks
- ✅ **Cost Control**: Test AWS costs before full integration

## 📝 **Next Steps**

1. **Complete AWS AI module development**
2. **Set up AWS credentials and test access**
3. **Create integration layer in main app**
4. **Test with sample data**
5. **Plan gradual rollout strategy**

This modular approach gives you the flexibility to develop and test AWS AI services independently while maintaining a stable main application! 🚀
