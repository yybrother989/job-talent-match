# AWS Infrastructure Setup Guide

This guide will help you set up the complete AWS infrastructure for the job-talent matching platform.

## 🏗️ **Required AWS Services**

### **1. Core AI Services**
- **AWS Bedrock** - AI-powered resume parsing and job matching
- **AWS Textract** - Document text extraction and form processing
- **AWS SageMaker** - Custom embedding models (optional)

### **2. Data Storage Services**
- **Amazon S3** - Document storage (resumes, job descriptions)
- **Amazon DynamoDB** - Structured data storage (profiles, jobs, matches)
- **Amazon OpenSearch** - Advanced search capabilities (optional)

### **3. Compute Services**
- **AWS Lambda** - Serverless processing (optional)
- **Amazon EC2** - Application hosting (if needed)

### **4. Monitoring & Security**
- **AWS CloudWatch** - Monitoring and logging
- **AWS IAM** - Identity and access management
- **AWS KMS** - Encryption key management

## 📋 **Step-by-Step Setup**

### **Step 1: Create S3 Bucket**

```bash
# Create S3 bucket for document storage
aws s3 mb s3://job-talent-match-documents --region us-east-1

# Configure bucket for public access (if needed)
aws s3api put-public-access-block \
    --bucket job-talent-match-documents \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

### **Step 2: Create DynamoDB Tables**

```bash
# User Profiles Table
aws dynamodb create-table \
    --table-name job-talent-match-user-profiles \
    --attribute-definitions \
        AttributeName=pk,AttributeType=S \
        AttributeName=sk,AttributeType=S \
        AttributeName=gsi1pk,AttributeType=S \
        AttributeName=gsi1sk,AttributeType=S \
    --key-schema \
        AttributeName=pk,KeyType=HASH \
        AttributeName=sk,KeyType=RANGE \
    --global-secondary-indexes \
        IndexName=gsi1,KeySchema='[{AttributeName=gsi1pk,KeyType=HASH},{AttributeName=gsi1sk,KeyType=RANGE}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-east-1

# Job Postings Table
aws dynamodb create-table \
    --table-name job-talent-match-job-postings \
    --attribute-definitions \
        AttributeName=pk,AttributeType=S \
        AttributeName=sk,AttributeType=S \
        AttributeName=gsi1pk,AttributeType=S \
        AttributeName=gsi1sk,AttributeType=S \
        AttributeName=gsi2pk,AttributeType=S \
        AttributeName=gsi2sk,AttributeType=S \
    --key-schema \
        AttributeName=pk,KeyType=HASH \
        AttributeName=sk,KeyType=RANGE \
    --global-secondary-indexes \
        IndexName=gsi1,KeySchema='[{AttributeName=gsi1pk,KeyType=HASH},{AttributeName=gsi1sk,KeyType=RANGE}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
        IndexName=gsi2,KeySchema='[{AttributeName=gsi2pk,KeyType=HASH},{AttributeName=gsi2sk,KeyType=RANGE}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-east-1

# Job Matches Table
aws dynamodb create-table \
    --table-name job-talent-match-job-matches \
    --attribute-definitions \
        AttributeName=pk,AttributeType=S \
        AttributeName=sk,AttributeType=S \
        AttributeName=gsi1pk,AttributeType=S \
        AttributeName=gsi1sk,AttributeType=S \
    --key-schema \
        AttributeName=pk,KeyType=HASH \
        AttributeName=sk,KeyType=RANGE \
    --global-secondary-indexes \
        IndexName=gsi1,KeySchema='[{AttributeName=gsi1pk,KeyType=HASH},{AttributeName=gsi1sk,KeyType=RANGE}]',Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-east-1

# Companies Table
aws dynamodb create-table \
    --table-name job-talent-match-companies \
    --attribute-definitions \
        AttributeName=pk,AttributeType=S \
        AttributeName=sk,AttributeType=S \
    --key-schema \
        AttributeName=pk,KeyType=HASH \
        AttributeName=sk,KeyType=RANGE \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-east-1

# Applications Table
aws dynamodb create-table \
    --table-name job-talent-match-applications \
    --attribute-definitions \
        AttributeName=pk,AttributeType=S \
        AttributeName=sk,AttributeType=S \
    --key-schema \
        AttributeName=pk,KeyType=HASH \
        AttributeName=sk,KeyType=RANGE \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-east-1

# User Events Table
aws dynamodb create-table \
    --table-name job-talent-match-user-events \
    --attribute-definitions \
        AttributeName=pk,AttributeType=S \
        AttributeName=sk,AttributeType=S \
    --key-schema \
        AttributeName=pk,KeyType=HASH \
        AttributeName=sk,KeyType=RANGE \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-east-1

# Search Queries Table
aws dynamodb create-table \
    --table-name job-talent-match-search-queries \
    --attribute-definitions \
        AttributeName=pk,AttributeType=S \
        AttributeName=sk,AttributeType=S \
    --key-schema \
        AttributeName=pk,KeyType=HASH \
        AttributeName=sk,KeyType=RANGE \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-east-1
```

### **Step 3: Configure IAM Permissions**

Create an IAM policy for your application:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": [
                "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "textract:DetectDocumentText",
                "textract:AnalyzeDocument",
                "textract:StartDocumentAnalysis",
                "textract:GetDocumentAnalysis"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::job-talent-match-documents",
                "arn:aws:s3:::job-talent-match-documents/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:BatchGetItem",
                "dynamodb:BatchWriteItem"
            ],
            "Resource": [
                "arn:aws:dynamodb:us-east-1:*:table/job-talent-match-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "cloudwatch:PutMetricData",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
```

### **Step 4: Environment Variables**

Add these to your `.env` file:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key

# S3 Configuration
AWS_S3_BUCKET=job-talent-match-documents

# DynamoDB Configuration
AWS_DYNAMODB_USER_PROFILES_TABLE=job-talent-match-user-profiles
AWS_DYNAMODB_JOB_POSTINGS_TABLE=job-talent-match-job-postings
AWS_DYNAMODB_JOB_MATCHES_TABLE=job-talent-match-job-matches
AWS_DYNAMODB_COMPANIES_TABLE=job-talent-match-companies
AWS_DYNAMODB_APPLICATIONS_TABLE=job-talent-match-applications
AWS_DYNAMODB_USER_EVENTS_TABLE=job-talent-match-user-events
AWS_DYNAMODB_SEARCH_QUERIES_TABLE=job-talent-match-search-queries

# Bedrock Configuration
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
```

## 🔧 **Testing the Setup**

### **Test S3 Access**
```bash
npm run test:s3
```

### **Test DynamoDB Access**
```bash
npm run test:dynamodb
```

### **Test Complete Workflow**
```bash
npm run test:workflow
```

## 📊 **Cost Estimation**

### **Free Tier (First 12 months)**
- **S3**: 5GB storage, 20,000 GET requests, 2,000 PUT requests
- **DynamoDB**: 25GB storage, 25 read/write capacity units
- **Bedrock**: Limited free tier for Claude models
- **Textract**: 1,000 pages per month

### **Production Costs (estimated monthly)**
- **S3**: $0.023/GB + $0.0004/1,000 requests
- **DynamoDB**: $0.25/GB + $0.09/read capacity unit + $0.09/write capacity unit
- **Bedrock**: $0.003/1K input tokens + $0.015/1K output tokens
- **Textract**: $0.0015/page

## 🚀 **Production Considerations**

### **1. Security**
- Enable encryption at rest for all services
- Use IAM roles instead of access keys when possible
- Implement VPC endpoints for private access
- Enable CloudTrail for audit logging

### **2. Performance**
- Use DynamoDB auto-scaling for production workloads
- Implement caching with ElastiCache
- Use CloudFront for S3 content delivery
- Monitor with CloudWatch dashboards

### **3. Backup & Recovery**
- Enable S3 versioning and cross-region replication
- Implement DynamoDB point-in-time recovery
- Create automated backup schedules
- Test disaster recovery procedures

### **4. Monitoring**
- Set up CloudWatch alarms for key metrics
- Implement structured logging
- Use AWS X-Ray for distributed tracing
- Create operational dashboards

## 🔄 **Next Steps**

1. **Set up the infrastructure** using the commands above
2. **Configure environment variables** in your `.env` file
3. **Test the services** using the provided test scripts
4. **Integrate with your main application**
5. **Deploy to production** with proper monitoring

## 📚 **Additional Resources**

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [AWS Textract Documentation](https://docs.aws.amazon.com/textract/)
- [Amazon S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Amazon DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS IAM Documentation](https://docs.aws.amazon.com/iam/)
