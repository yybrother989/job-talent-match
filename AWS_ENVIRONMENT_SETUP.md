# AWS Environment Setup Guide

## 🔧 **Environment Variables for AWS Migration**

Add these variables to your `.env.local` file:

```bash
# Existing variables (keep these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

# AWS Configuration (add these)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
AWS_SAGEMAKER_ENDPOINT=job-matching-embeddings-endpoint

# AI Provider Selection
AI_PROVIDER=current  # Options: 'current' or 'aws'
USE_AWS_BEDROCK=false
USE_AWS_SAGEMAKER=false
MIGRATION_PERCENTAGE=0  # 0-100, percentage of users to migrate

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🚀 **How to Get AWS Credentials**

### **Step 1: Create IAM User**
1. Go to AWS Console → IAM → Users
2. Click "Create user"
3. Username: `brave-ai-service`
4. Select "Programmatic access"

### **Step 2: Attach Policies**
Attach these policies:
- `AmazonBedrockFullAccess`
- `AmazonSageMakerFullAccess`
- `AWSLambdaFullAccess`

### **Step 3: Generate Access Keys**
1. Click "Create access key"
2. Copy the Access Key ID and Secret Access Key
3. Add them to your `.env.local` file

## 🧪 **Testing Commands**

### **Test Current Service**
```bash
curl -X POST http://localhost:3000/api/parse-resume \
  -H "Content-Type: application/json" \
  -d '{"text":"John Doe, Software Engineer with 5 years experience in React and Node.js"}'
```

### **Test AWS Service**
```bash
curl -X POST http://localhost:3000/api/parse-resume-aws \
  -H "Content-Type: application/json" \
  -d '{"text":"John Doe, Software Engineer with 5 years experience in React and Node.js"}'
```

### **Test Comparison**
```bash
curl -X POST http://localhost:3000/api/test-ai-comparison \
  -H "Content-Type: application/json" \
  -d '{"text":"John Doe, Software Engineer with 5 years experience in React and Node.js"}'
```

## 🔄 **Migration Steps**

### **Phase 1: Setup (Week 1)**
1. ✅ Install AWS SDK packages
2. ✅ Create service abstraction layer
3. ✅ Create AWS API routes
4. ⏳ Set up AWS account and credentials
5. ⏳ Request Bedrock access

### **Phase 2: Testing (Week 2)**
1. Test AWS Bedrock with sample data
2. Compare results with current service
3. Optimize prompts and parameters
4. Set up monitoring and logging

### **Phase 3: Gradual Migration (Week 3-4)**
1. Start with 10% of users
2. Monitor performance and errors
3. Gradually increase to 100%
4. Remove old dependencies

## 📊 **Monitoring**

### **Key Metrics to Track**
- Response time (target: < 3 seconds)
- Error rate (target: < 1%)
- Cost per request
- Parsing accuracy
- User satisfaction

### **AWS CloudWatch Alarms**
Set up alarms for:
- High error rates
- Slow response times
- Unusual cost spikes
- Service availability

## 🚨 **Rollback Plan**

If issues arise:
1. Set `AI_PROVIDER=current` in environment
2. Restart application
3. Monitor for stability
4. Investigate root cause

## 💰 **Cost Estimation**

### **AWS Bedrock Costs**
- Claude 3 Sonnet: ~$0.003 per 1K input tokens, ~$0.015 per 1K output tokens
- Average resume: ~500 input tokens, ~200 output tokens
- Cost per resume: ~$0.0015

### **Monthly Cost Estimate**
- 1000 resumes/month: ~$1.50
- 10000 resumes/month: ~$15.00
- 100000 resumes/month: ~$150.00

## 🎯 **Success Criteria**

Migration is successful when:
- ✅ AWS service response time < 3 seconds
- ✅ Error rate < 1%
- ✅ Parsing accuracy > 95%
- ✅ Cost per request < $0.01
- ✅ User satisfaction maintained
