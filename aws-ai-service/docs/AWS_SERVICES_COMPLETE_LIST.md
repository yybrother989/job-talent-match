# Complete AWS Services List & Interactions

## 🎯 **All AWS Services Used in Job-Talent Matching Platform**

### **1. COMPUTE SERVICES**

#### **AWS Lambda**
- **Role**: Serverless compute for business logic
- **Interactions**:
  - Receives requests from API Gateway
  - Processes user registration, resume upload, job matching
  - Triggers other services (S3, DynamoDB, Bedrock, Textract)
  - Handles event processing and orchestration
- **Dependencies**: IAM, VPC, CloudWatch, DynamoDB, S3, Bedrock, Textract, SNS, SQS

#### **Amazon EC2** (Optional)
- **Role**: Virtual servers for custom applications
- **Interactions**: Hosts legacy applications or custom services
- **Dependencies**: VPC, IAM, CloudWatch, EBS

### **2. STORAGE SERVICES**

#### **Amazon S3**
- **Role**: Object storage for documents and files
- **Interactions**:
  - Stores resume documents, job descriptions, media files
  - Triggers Lambda functions on file upload
  - Provides data source for Textract and SageMaker
  - Serves static content via CloudFront
- **Dependencies**: IAM, KMS, CloudWatch, Lambda, Textract, SageMaker, CloudFront

#### **Amazon DynamoDB**
- **Role**: NoSQL database for structured data
- **Interactions**:
  - Stores user profiles, job postings, matches, applications
  - Provides data for Lambda functions
  - Triggers EventBridge on data changes
  - Indexes data for OpenSearch
- **Dependencies**: IAM, KMS, CloudWatch, Lambda, EventBridge, OpenSearch

#### **Amazon RDS** (Optional)
- **Role**: Relational database for complex queries
- **Interactions**: Stores analytics data, reports, complex relationships
- **Dependencies**: VPC, IAM, KMS, CloudWatch

### **3. AI & MACHINE LEARNING SERVICES**

#### **AWS Bedrock**
- **Role**: AI-powered resume parsing and job matching
- **Interactions**:
  - Processes resume text from Textract
  - Analyzes job descriptions and requirements
  - Performs semantic matching between users and jobs
  - Generates content and recommendations
- **Dependencies**: IAM, CloudWatch, CloudTrail, Lambda, Textract

#### **AWS Textract**
- **Role**: Document text extraction and analysis
- **Interactions**:
  - Extracts text from resume documents in S3
  - Analyzes forms, tables, and structured data
  - Provides OCR capabilities for scanned documents
  - Sends extracted text to Bedrock for processing
- **Dependencies**: IAM, S3, CloudWatch, CloudTrail, Lambda

#### **Amazon SageMaker**
- **Role**: Machine learning model training and inference
- **Interactions**:
  - Trains custom matching models
  - Provides ML-based job recommendations
  - Generates embeddings for semantic search
  - Optimizes matching algorithms
- **Dependencies**: IAM, S3, VPC, CloudWatch, CloudTrail, Lambda

### **4. DATABASE & SEARCH SERVICES**

#### **Amazon OpenSearch**
- **Role**: Search engine for jobs and profiles
- **Interactions**:
  - Indexes job postings and user profiles
  - Provides full-text search capabilities
  - Performs vector similarity search
  - Enables advanced filtering and ranking
- **Dependencies**: IAM, VPC, CloudWatch, DynamoDB, Lambda

### **5. NETWORKING & CONTENT DELIVERY**

#### **Amazon API Gateway**
- **Role**: API management and request routing
- **Interactions**:
  - Routes requests to appropriate Lambda functions
  - Handles authentication and authorization
  - Provides rate limiting and throttling
  - Caches responses for better performance
- **Dependencies**: IAM, Lambda, CloudWatch, WAF, CloudFront

#### **Amazon CloudFront**
- **Role**: Global content delivery network
- **Interactions**:
  - Caches static content from S3
  - Accelerates API responses
  - Provides global edge locations
  - Integrates with WAF for security
- **Dependencies**: S3, API Gateway, WAF, CloudWatch

#### **Amazon VPC**
- **Role**: Virtual private cloud for network isolation
- **Interactions**:
  - Provides secure network environment
  - Connects all services within private subnets
  - Enables VPC endpoints for AWS services
  - Manages security groups and NACLs
- **Dependencies**: IAM, CloudWatch, Route 53

### **6. SECURITY & IDENTITY SERVICES**

#### **AWS IAM**
- **Role**: Identity and access management
- **Interactions**:
  - Manages user authentication and authorization
  - Controls access to all AWS services
  - Provides roles for Lambda functions
  - Manages policies and permissions
- **Dependencies**: All AWS services

#### **Amazon Cognito**
- **Role**: User authentication and management
- **Interactions**:
  - Handles user registration and login
  - Manages user pools and identity pools
  - Provides JWT tokens for API access
  - Integrates with IAM for service access
- **Dependencies**: IAM, SES, CloudWatch, Lambda

#### **AWS KMS**
- **Role**: Key management and encryption
- **Interactions**:
  - Encrypts data at rest in S3 and DynamoDB
  - Manages encryption keys for all services
  - Provides key rotation and access control
  - Enables encryption in transit
- **Dependencies**: IAM, S3, DynamoDB, RDS, CloudWatch

#### **AWS WAF**
- **Role**: Web application firewall
- **Interactions**:
  - Protects API Gateway from attacks
  - Filters malicious requests
  - Provides DDoS protection
  - Integrates with CloudFront
- **Dependencies**: API Gateway, CloudFront, CloudWatch

### **7. MESSAGING & NOTIFICATION SERVICES**

#### **Amazon SNS**
- **Role**: Notification service
- **Interactions**:
  - Sends notifications for job matches
  - Publishes application status updates
  - Triggers email and SMS notifications
  - Integrates with SES for email delivery
- **Dependencies**: IAM, SES, CloudWatch, Lambda, DynamoDB

#### **Amazon SQS**
- **Role**: Message queuing service
- **Interactions**:
  - Queues application processing tasks
  - Handles asynchronous message processing
  - Provides dead letter queues for failed messages
  - Integrates with Lambda for message processing
- **Dependencies**: IAM, Lambda, SNS, CloudWatch

#### **Amazon SES**
- **Role**: Email delivery service
- **Interactions**:
  - Sends email notifications and confirmations
  - Handles user verification emails
  - Delivers job match notifications
  - Integrates with SNS for email triggers
- **Dependencies**: IAM, Route 53, CloudWatch, SNS

### **8. EVENT & STREAMING SERVICES**

#### **Amazon EventBridge**
- **Role**: Event routing and orchestration
- **Interactions**:
  - Routes events between services
  - Triggers job matching when new jobs are posted
  - Orchestrates complex workflows
  - Integrates with Lambda for event processing
- **Dependencies**: IAM, Lambda, DynamoDB, S3, CloudWatch

#### **Amazon Kinesis**
- **Role**: Real-time data streaming
- **Interactions**:
  - Streams user events and activities
  - Processes real-time analytics data
  - Feeds data to analytics pipeline
  - Integrates with Lambda for stream processing
- **Dependencies**: IAM, Lambda, S3, CloudWatch

### **9. MONITORING & OBSERVABILITY SERVICES**

#### **Amazon CloudWatch**
- **Role**: Monitoring and observability
- **Interactions**:
  - Collects metrics from all services
  - Stores logs from Lambda functions
  - Triggers alarms for performance issues
  - Provides dashboards for system monitoring
- **Dependencies**: All AWS services

#### **AWS X-Ray**
- **Role**: Distributed tracing
- **Interactions**:
  - Traces requests across services
  - Identifies performance bottlenecks
  - Provides service dependency mapping
  - Integrates with Lambda and API Gateway
- **Dependencies**: Lambda, API Gateway, CloudWatch

#### **AWS CloudTrail**
- **Role**: Audit logging and compliance
- **Interactions**:
  - Logs all API calls and changes
  - Provides audit trail for compliance
  - Tracks user activities and access
  - Integrates with S3 for log storage
- **Dependencies**: IAM, S3, CloudWatch, EventBridge

### **10. ANALYTICS & BUSINESS INTELLIGENCE**

#### **Amazon Athena**
- **Role**: Query engine for analytics
- **Interactions**:
  - Queries data stored in S3
  - Analyzes user behavior and job matching
  - Generates reports and insights
  - Integrates with QuickSight for visualization
- **Dependencies**: S3, IAM, CloudWatch

#### **Amazon QuickSight**
- **Role**: Business intelligence and visualization
- **Interactions**:
  - Creates dashboards and reports
  - Visualizes analytics data from Athena
  - Provides business insights
  - Integrates with various data sources
- **Dependencies**: Athena, S3, RDS, IAM

### **11. DEPLOYMENT & MANAGEMENT SERVICES**

#### **AWS CloudFormation**
- **Role**: Infrastructure as code
- **Interactions**:
  - Deploys and manages all AWS resources
  - Provides infrastructure templates
  - Enables version control for infrastructure
  - Integrates with CI/CD pipelines
- **Dependencies**: IAM, CloudWatch

#### **AWS CodePipeline**
- **Role**: CI/CD pipeline
- **Interactions**:
  - Automates deployment process
  - Integrates with GitHub for source control
  - Deploys Lambda functions and infrastructure
  - Provides deployment monitoring
- **Dependencies**: IAM, CloudFormation, Lambda, S3

#### **AWS CodeBuild**
- **Role**: Build service
- **Interactions**:
  - Builds and tests application code
  - Creates deployment packages
  - Integrates with CodePipeline
  - Provides build logs and metrics
- **Dependencies**: IAM, S3, CloudWatch

### **12. DNS & ROUTING SERVICES**

#### **Amazon Route 53**
- **Role**: DNS and domain management
- **Interactions**:
  - Routes traffic to API Gateway
  - Manages domain names and SSL certificates
  - Provides health checks for services
  - Integrates with CloudFront and SES
- **Dependencies**: API Gateway, CloudFront, SES, CloudWatch

## 🔄 **Service Interaction Matrix**

| Service | Primary Function | Key Interactions | Dependencies |
|---------|------------------|------------------|--------------|
| **API Gateway** | Request routing | Lambda, IAM, CloudWatch | All services |
| **Lambda** | Business logic | All services | IAM, VPC, CloudWatch |
| **DynamoDB** | Data storage | Lambda, EventBridge, OpenSearch | IAM, KMS, CloudWatch |
| **S3** | File storage | Lambda, Textract, SageMaker, CloudFront | IAM, KMS, CloudWatch |
| **Bedrock** | AI processing | Lambda, Textract, CloudWatch | IAM, CloudTrail |
| **Textract** | Document analysis | S3, Lambda, Bedrock | IAM, CloudWatch |
| **SageMaker** | ML models | S3, Lambda, OpenSearch | IAM, VPC, CloudWatch |
| **OpenSearch** | Search engine | DynamoDB, Lambda, SageMaker | IAM, VPC, CloudWatch |
| **SNS** | Notifications | Lambda, SES, DynamoDB | IAM, CloudWatch |
| **SQS** | Message queuing | Lambda, SNS, CloudWatch | IAM, CloudWatch |
| **EventBridge** | Event routing | Lambda, DynamoDB, S3 | IAM, CloudWatch |
| **Kinesis** | Data streaming | Lambda, S3, Athena | IAM, CloudWatch |
| **CloudWatch** | Monitoring | All services | All services |
| **IAM** | Access control | All services | All services |
| **KMS** | Encryption | S3, DynamoDB, RDS | IAM, CloudWatch |
| **VPC** | Network security | All services | IAM, CloudWatch |
| **CloudTrail** | Audit logging | All services | S3, CloudWatch |

## 📊 **Service Usage by Workflow Phase**

### **Phase 1: User Onboarding**
- **Primary**: API Gateway, Lambda, Cognito, DynamoDB, SES
- **Secondary**: IAM, CloudWatch, CloudTrail, SNS

### **Phase 2: Resume Processing**
- **Primary**: S3, Textract, Bedrock, Lambda, DynamoDB
- **Secondary**: IAM, CloudWatch, CloudTrail, EventBridge

### **Phase 3: Job Matching**
- **Primary**: EventBridge, Lambda, DynamoDB, Bedrock, SageMaker, OpenSearch
- **Secondary**: IAM, CloudWatch, CloudTrail, SNS, SQS

### **Phase 4: Notifications**
- **Primary**: SNS, SES, SQS, Lambda, DynamoDB
- **Secondary**: IAM, CloudWatch, CloudTrail

### **Phase 5: Analytics**
- **Primary**: Kinesis, Lambda, S3, Athena, QuickSight
- **Secondary**: IAM, CloudWatch, CloudTrail

This comprehensive list shows all AWS services used in the job-talent matching platform and how they interact with each other to create a complete, scalable, and secure system.
