import { config } from 'dotenv';
import { 
  DynamoDBClient, 
  PutItemCommand, 
  GetItemCommand, 
  UpdateItemCommand, 
  DeleteItemCommand, 
  QueryCommand, 
  ScanCommand,
  BatchGetItemCommand,
  BatchWriteItemCommand
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { logger } from '../../utils/logger';
import { 
  UserProfile, 
  JobPosting, 
  JobMatch, 
  CompanyProfile, 
  Application, 
  UserEvent,
  SearchQuery,
  DynamoDBItem 
} from '../../types/dataModels';

// Load environment variables
config();

export interface QueryOptions {
  limit?: number;
  nextToken?: string;
  scanIndexForward?: boolean;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
}

export interface BatchWriteOptions {
  tableName: string;
  items: any[];
  operation: 'put' | 'delete';
}

export class DynamoDBDataService {
  private client: DynamoDBClient;
  private tables: {
    userProfiles: string;
    jobPostings: string;
    jobMatches: string;
    companies: string;
    applications: string;
    userEvents: string;
    searchQueries: string;
  };

  constructor(region?: string) {
    this.client = new DynamoDBClient({ 
      region: region || process.env.AWS_REGION || 'us-east-1' 
    });
    
    this.tables = {
      userProfiles: process.env.AWS_DYNAMODB_USER_PROFILES_TABLE || 'job-talent-match-user-profiles',
      jobPostings: process.env.AWS_DYNAMODB_JOB_POSTINGS_TABLE || 'job-talent-match-job-postings',
      jobMatches: process.env.AWS_DYNAMODB_JOB_MATCHES_TABLE || 'job-talent-match-job-matches',
      companies: process.env.AWS_DYNAMODB_COMPANIES_TABLE || 'job-talent-match-companies',
      applications: process.env.AWS_DYNAMODB_APPLICATIONS_TABLE || 'job-talent-match-applications',
      userEvents: process.env.AWS_DYNAMODB_USER_EVENTS_TABLE || 'job-talent-match-user-events',
      searchQueries: process.env.AWS_DYNAMODB_SEARCH_QUERIES_TABLE || 'job-talent-match-search-queries'
    };
  }

  // User Profile Operations
  async createUserProfile(profile: UserProfile): Promise<UserProfile> {
    try {
      const item = this.formatUserProfileItem(profile);
      
      logger.info('Creating user profile', { userId: profile.userId });

      const command = new PutItemCommand({
        TableName: this.tables.userProfiles,
        Item: marshall(item),
        ConditionExpression: 'attribute_not_exists(pk)'
      });

      await this.client.send(command);
      
      logger.info('User profile created successfully', { userId: profile.userId });
      return profile;

    } catch (error) {
      logger.error('Failed to create user profile', { error, userId: profile.userId });
      throw new Error(`Failed to create user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      logger.info('Getting user profile', { userId });

      const command = new GetItemCommand({
        TableName: this.tables.userProfiles,
        Key: marshall({
          pk: `USER#${userId}`,
          sk: `PROFILE#${userId}`
        })
      });

      const response = await this.client.send(command);
      
      if (!response.Item) {
        return null;
      }

      const item = unmarshall(response.Item);
      return this.parseUserProfileItem(item);

    } catch (error) {
      logger.error('Failed to get user profile', { error, userId });
      throw new Error(`Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      logger.info('Updating user profile', { userId });

      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build update expression dynamically
      Object.entries(updates).forEach(([key, value], index) => {
        if (value !== undefined) {
          updateExpression.push(`#attr${index} = :val${index}`);
          expressionAttributeNames[`#attr${index}`] = key;
          expressionAttributeValues[`:val${index}`] = value;
        }
      });

      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const command = new UpdateItemCommand({
        TableName: this.tables.userProfiles,
        Key: marshall({
          pk: `USER#${userId}`,
          sk: `PROFILE#${userId}`
        }),
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ReturnValues: 'ALL_NEW'
      });

      const response = await this.client.send(command);
      
      if (!response.Attributes) {
        throw new Error('No attributes returned from update');
      }

      const item = unmarshall(response.Attributes);
      const updatedProfile = this.parseUserProfileItem(item);
      
      logger.info('User profile updated successfully', { userId });
      return updatedProfile;

    } catch (error) {
      logger.error('Failed to update user profile', { error, userId });
      throw new Error(`Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Job Posting Operations
  async createJobPosting(job: JobPosting): Promise<JobPosting> {
    try {
      const item = this.formatJobPostingItem(job);
      
      logger.info('Creating job posting', { jobId: job.jobId });

      const command = new PutItemCommand({
        TableName: this.tables.jobPostings,
        Item: marshall(item),
        ConditionExpression: 'attribute_not_exists(pk)'
      });

      await this.client.send(command);
      
      logger.info('Job posting created successfully', { jobId: job.jobId });
      return job;

    } catch (error) {
      logger.error('Failed to create job posting', { error, jobId: job.jobId });
      throw new Error(`Failed to create job posting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getJobPosting(jobId: string): Promise<JobPosting | null> {
    try {
      logger.info('Getting job posting', { jobId });

      const command = new GetItemCommand({
        TableName: this.tables.jobPostings,
        Key: marshall({
          pk: `JOB#${jobId}`,
          sk: `POSTING#${jobId}`
        })
      });

      const response = await this.client.send(command);
      
      if (!response.Item) {
        return null;
      }

      const item = unmarshall(response.Item);
      return this.parseJobPostingItem(item);

    } catch (error) {
      logger.error('Failed to get job posting', { error, jobId });
      throw new Error(`Failed to get job posting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchJobs(filters: any, options: QueryOptions = {}): Promise<JobPosting[]> {
    try {
      logger.info('Searching jobs', { filters });

      // This is a simplified search - in production, you'd use GSI for better performance
      const command = new ScanCommand({
        TableName: this.tables.jobPostings,
        FilterExpression: this.buildFilterExpression(filters),
        ExpressionAttributeNames: this.buildExpressionAttributeNames(filters),
        ExpressionAttributeValues: marshall(this.buildExpressionAttributeValues(filters)),
        Limit: options.limit || 50
      });

      const response = await this.client.send(command);
      
      if (!response.Items) {
        return [];
      }

      const jobs = response.Items.map(item => this.parseJobPostingItem(unmarshall(item)));
      
      logger.info('Jobs search completed', { count: jobs.length });
      return jobs;

    } catch (error) {
      logger.error('Failed to search jobs', { error, filters });
      throw new Error(`Failed to search jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Job Match Operations
  async createJobMatch(match: JobMatch): Promise<JobMatch> {
    try {
      const item = this.formatJobMatchItem(match);
      
      logger.info('Creating job match', { matchId: match.matchId });

      const command = new PutItemCommand({
        TableName: this.tables.jobMatches,
        Item: marshall(item),
        ConditionExpression: 'attribute_not_exists(pk)'
      });

      await this.client.send(command);
      
      logger.info('Job match created successfully', { matchId: match.matchId });
      return match;

    } catch (error) {
      logger.error('Failed to create job match', { error, matchId: match.matchId });
      throw new Error(`Failed to create job match: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserJobMatches(userId: string, options: QueryOptions = {}): Promise<JobMatch[]> {
    try {
      logger.info('Getting user job matches', { userId });

      const command = new QueryCommand({
        TableName: this.tables.jobMatches,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: marshall({
          ':pk': `USER#${userId}`
        }),
        Limit: options.limit || 50,
        ScanIndexForward: options.scanIndexForward ?? false
      });

      const response = await this.client.send(command);
      
      if (!response.Items) {
        return [];
      }

      const matches = response.Items.map(item => this.parseJobMatchItem(unmarshall(item)));
      
      logger.info('User job matches retrieved', { userId, count: matches.length });
      return matches;

    } catch (error) {
      logger.error('Failed to get user job matches', { error, userId });
      throw new Error(`Failed to get user job matches: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Batch Operations
  async batchWriteItems(options: BatchWriteOptions): Promise<void> {
    try {
      logger.info('Starting batch write operation', { 
        tableName: options.tableName, 
        count: options.items.length,
        operation: options.operation 
      });

      const items = options.items.map(item => ({
        [options.operation === 'put' ? 'PutRequest' : 'DeleteRequest']: 
          options.operation === 'put' 
            ? { Item: marshall(item) }
            : { Key: marshall({ pk: item.pk, sk: item.sk }) }
      }));

      const command = new BatchWriteItemCommand({
        RequestItems: {
          [options.tableName]: items
        }
      });

      await this.client.send(command);
      
      logger.info('Batch write operation completed successfully', { 
        tableName: options.tableName, 
        count: options.items.length 
      });

    } catch (error) {
      logger.error('Failed batch write operation', { error, tableName: options.tableName });
      throw new Error(`Failed batch write operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility methods for data formatting
  private formatUserProfileItem(profile: UserProfile): DynamoDBItem {
    return {
      pk: `USER#${profile.userId}`,
      sk: `PROFILE#${profile.userId}`,
      gsi1pk: `EMAIL#${profile.email}`,
      gsi1sk: `USER#${profile.userId}`,
      data: profile,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };
  }

  private formatJobPostingItem(job: JobPosting): DynamoDBItem {
    return {
      pk: `JOB#${job.jobId}`,
      sk: `POSTING#${job.jobId}`,
      gsi1pk: `COMPANY#${job.companyId}`,
      gsi1sk: `JOB#${job.jobId}`,
      gsi2pk: `LOCATION#${job.location}`,
      gsi2sk: `JOB#${job.jobId}`,
      data: job,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };
  }

  private formatJobMatchItem(match: JobMatch): DynamoDBItem {
    return {
      pk: `USER#${match.userId}`,
      sk: `MATCH#${match.matchId}`,
      gsi1pk: `JOB#${match.jobId}`,
      gsi1sk: `MATCH#${match.matchId}`,
      data: match,
      createdAt: match.createdAt,
      updatedAt: match.lastUpdated
    };
  }

  private parseUserProfileItem(item: any): UserProfile {
    return item.data;
  }

  private parseJobPostingItem(item: any): JobPosting {
    return item.data;
  }

  private parseJobMatchItem(item: any): JobMatch {
    return item.data;
  }

  private buildFilterExpression(filters: any): string {
    const conditions: string[] = [];
    Object.keys(filters).forEach((key, index) => {
      if (filters[key] !== undefined && filters[key] !== null) {
        conditions.push(`#attr${index} = :val${index}`);
      }
    });
    return conditions.join(' AND ');
  }

  private buildExpressionAttributeNames(filters: any): Record<string, string> {
    const names: Record<string, string> = {};
    Object.keys(filters).forEach((key, index) => {
      if (filters[key] !== undefined && filters[key] !== null) {
        names[`#attr${index}`] = key;
      }
    });
    return names;
  }

  private buildExpressionAttributeValues(filters: any): Record<string, any> {
    const values: Record<string, any> = {};
    Object.keys(filters).forEach((key, index) => {
      if (filters[key] !== undefined && filters[key] !== null) {
        values[`:val${index}`] = filters[key];
      }
    });
    return values;
  }
}
