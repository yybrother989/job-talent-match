# AWS AI Service Module

A modular AWS AI service for job-talent matching platform, providing resume parsing, job matching, and AI-powered recommendations using AWS Bedrock, SageMaker, and other AWS services.

## 🚀 Features

- **Resume Parsing**: Extract skills, experience, education, and more from resume text
- **Job Matching**: AI-powered job recommendations with detailed scoring
- **Skills Gap Analysis**: Identify missing skills and learning recommendations
- **Interview Preparation**: Generate interview questions and preparation materials
- **Batch Processing**: Process multiple resumes or jobs efficiently
- **Comprehensive Logging**: Detailed logging and monitoring capabilities

## 📦 Installation

```bash
cd aws-ai-service
npm install
```

## 🔧 Configuration

Set up your AWS credentials and configuration:

```bash
# Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
export LOG_LEVEL=info
```

## 🎯 Quick Start

### Resume Parsing

```typescript
import { BedrockResumeParser } from './src';

const parser = new BedrockResumeParser('us-east-1', 'anthropic.claude-3-sonnet-20240229-v1:0');

const result = await parser.parseResume(`
  John Doe
  Senior Software Engineer
  Experience: 5 years in React and Node.js
  Skills: JavaScript, TypeScript, AWS
`);

if (result.success) {
  console.log('Skills:', result.data.skills);
  console.log('Experience:', result.data.experience);
}
```

### Job Matching

```typescript
import { BedrockJobMatcher } from './src';

const matcher = new BedrockJobMatcher();

const result = await matcher.matchJobs(userProfile, availableJobs, {
  maxResults: 10,
  minScore: 70,
  useRAG: true
});

if (result.success) {
  console.log('Top matches:', result.matches);
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## 📚 Examples

```bash
# Resume parsing example
npm run example:resume

# Job matching example
npm run example:job-matching

# Batch processing example
npm run example:batch
```

## 🏗️ Architecture

```
aws-ai-service/
├── src/
│   ├── services/
│   │   ├── bedrock/          # AWS Bedrock services
│   │   ├── sagemaker/        # AWS SageMaker services
│   │   ├── textract/         # AWS Textract services
│   │   └── lambda/           # AWS Lambda services
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
├── tests/                    # Test files
├── examples/                 # Usage examples
└── docs/                     # Documentation
```

## 🔌 Integration

### With Main Application

```typescript
// In your main app
import { AWSAIServiceFactory } from './aws-ai-service';

const resumeParser = AWSAIServiceFactory.createResumeParser();
const jobMatcher = AWSAIServiceFactory.createJobMatcher();

// Use the services
const parsedResume = await resumeParser.parseResume(resumeText);
const jobMatches = await jobMatcher.matchJobs(parsedResume.data, jobs);
```

### API Endpoints

```typescript
// Create API endpoints that use the module
app.post('/api/parse-resume', async (req, res) => {
  const parser = AWSAIServiceFactory.createResumeParser();
  const result = await parser.parseResume(req.body.text);
  res.json(result);
});
```

## 📊 Monitoring

The module includes comprehensive logging and monitoring:

```typescript
import { logger } from './src';

// Logging levels: error, warn, info, debug
logger.info('Resume parsing started', { userId: '123' });
logger.error('Parsing failed', { error: 'Invalid input' });
```

## 🚀 Deployment

### As NPM Package

```bash
npm publish
```

### As Docker Container

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 🔒 Security

- AWS credentials are managed securely
- Input validation using Zod schemas
- Error handling and sanitization
- Logging without sensitive data exposure

## 📈 Performance

- **Resume Parsing**: ~2-3 seconds per resume
- **Job Matching**: ~1-2 seconds for 100 jobs
- **Batch Processing**: Parallel processing for efficiency
- **Caching**: Built-in response caching (optional)

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build the module
npm run build

# Run in development mode
npm run dev

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📝 API Reference

### BedrockResumeParser

```typescript
class BedrockResumeParser {
  constructor(region?: string, modelId?: string)
  
  async parseResume(text: string, options?: ResumeParsingOptions): Promise<ResumeParsingResult>
  async parseResumesBatch(texts: string[], options?: ResumeParsingOptions): Promise<ResumeParsingResult[]>
}
```

### BedrockJobMatcher

```typescript
class BedrockJobMatcher {
  constructor(region?: string, modelId?: string)
  
  async matchJobs(userProfile: Resume, availableJobs: any[], options?: JobMatchingOptions): Promise<JobMatchingResult>
  async analyzeSkillsGap(userProfile: Resume, targetJob: any): Promise<SkillsGapAnalysis>
  async prepareForInterview(userProfile: Resume, job: any, companyInfo?: any): Promise<InterviewPreparation>
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Check the documentation in `/docs`
- Review the examples in `/examples`

---

**Built with ❤️ for the Brave Job-Talent Matching Platform**
