const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

// Initialize DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function createResumesTable() {
  try {
    console.log('🚀 Creating DynamoDB table: job-talent-match-resumes');
    
    // Check if table already exists
    try {
      await dynamoDBClient.send(new DescribeTableCommand({
        TableName: 'job-talent-match-resumes'
      }));
      console.log('✅ Table already exists!');
      return;
    } catch (error) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
      // Table doesn't exist, continue with creation
    }

    // Create the table
    const command = new CreateTableCommand({
      TableName: 'job-talent-match-resumes',
      KeySchema: [
        {
          AttributeName: 'userId',
          KeyType: 'HASH' // Partition key
        },
        {
          AttributeName: 'resumeId',
          KeyType: 'RANGE' // Sort key
        }
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'userId',
          AttributeType: 'S' // String
        },
        {
          AttributeName: 'resumeId',
          AttributeType: 'S' // String
        }
      ],
      BillingMode: 'PAY_PER_REQUEST', // On-demand billing
      GlobalSecondaryIndexes: [
        {
          IndexName: 'resumeId-index',
          KeySchema: [
            {
              AttributeName: 'resumeId',
              KeyType: 'HASH'
            }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        }
      ],
      Tags: [
        {
          Key: 'Project',
          Value: 'job-talent-match'
        },
        {
          Key: 'Environment',
          Value: 'development'
        }
      ]
    });

    const result = await dynamoDBClient.send(command);
    console.log('✅ Table created successfully!');
    console.log('📋 Table ARN:', result.TableDescription.TableArn);
    console.log('⏳ Table status:', result.TableDescription.TableStatus);
    
    // Wait for table to be active
    console.log('⏳ Waiting for table to become active...');
    let tableStatus = result.TableDescription.TableStatus;
    while (tableStatus !== 'ACTIVE') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const describeResult = await dynamoDBClient.send(new DescribeTableCommand({
        TableName: 'job-talent-match-resumes'
      }));
      tableStatus = describeResult.Table.TableStatus;
      console.log(`⏳ Table status: ${tableStatus}`);
    }
    
    console.log('🎉 Table is now ACTIVE and ready to use!');
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

// Run the script
createResumesTable();
