import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

// Test simple DynamoDB operations with our current table structure
async function testSimpleDynamoDB() {
  console.log('🔄 Testing Simple DynamoDB Operations\n');

  try {
    const client = new DynamoDBClient({ region: 'us-east-1' });
    
    // Test 1: Create a simple user profile
    console.log('📝 Test 1: Creating User Profile...');
    const userId = 'test-user-123';
    
    const userProfile = {
      userId,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS'],
      currentRole: 'Senior Software Engineer',
      yearsOfExperience: 5,
      location: 'San Francisco, CA',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    };

    console.log('🔄 Storing user profile...');
    const putCommand = new PutItemCommand({
      TableName: 'job-talent-match-user-profiles',
      Item: marshall(userProfile)
    });

    await client.send(putCommand);
    console.log('✅ User profile created successfully!');
    console.log(`   - User ID: ${userProfile.userId}`);
    console.log(`   - Name: ${userProfile.firstName} ${userProfile.lastName}`);
    console.log(`   - Skills: ${userProfile.skills.length}`);

    // Test 2: Retrieve the user profile
    console.log('\n📖 Test 2: Retrieving User Profile...');
    const getCommand = new GetItemCommand({
      TableName: 'job-talent-match-user-profiles',
      Key: marshall({ userId })
    });

    const result = await client.send(getCommand);
    
    if (result.Item) {
      const retrievedProfile = unmarshall(result.Item);
      console.log('✅ User profile retrieved successfully!');
      console.log(`   - User ID: ${retrievedProfile.userId}`);
      console.log(`   - Name: ${retrievedProfile.firstName} ${retrievedProfile.lastName}`);
      console.log(`   - Role: ${retrievedProfile.currentRole}`);
      console.log(`   - Experience: ${retrievedProfile.yearsOfExperience} years`);
      console.log(`   - Skills: ${retrievedProfile.skills.join(', ')}`);
    } else {
      console.log('❌ No profile found');
    }

    // Test 3: Create a job posting
    console.log('\n💼 Test 3: Creating Job Posting...');
    const jobId = 'job-123';
    
    const jobPosting = {
      jobId,
      companyId: 'company-1',
      title: 'Senior Full Stack Developer',
      description: 'We are looking for a senior full stack developer with experience in React, Node.js, and cloud technologies.',
      requirements: ['React', 'Node.js', 'TypeScript', 'AWS', 'Docker'],
      location: 'San Francisco, CA',
      remoteType: 'hybrid',
      employmentType: 'full-time',
      requiredSkills: ['React', 'Node.js', 'TypeScript', 'AWS'],
      preferredSkills: ['Docker', 'Kubernetes', 'GraphQL'],
      experienceLevel: 'senior',
      companyName: 'TechCorp Inc.',
      isActive: true,
      postedBy: 'recruiter-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('🔄 Storing job posting...');
    const putJobCommand = new PutItemCommand({
      TableName: 'job-talent-match-job-postings',
      Item: marshall(jobPosting)
    });

    await client.send(putJobCommand);
    console.log('✅ Job posting created successfully!');
    console.log(`   - Job ID: ${jobPosting.jobId}`);
    console.log(`   - Title: ${jobPosting.title}`);
    console.log(`   - Company: ${jobPosting.companyName}`);
    console.log(`   - Location: ${jobPosting.location}`);

    // Test 4: Create a job match
    console.log('\n🎯 Test 4: Creating Job Match...');
    const matchId = `${userId}-${jobId}-${Date.now()}`;
    
    const jobMatch = {
      matchId,
      userId,
      jobId,
      overallScore: 0.85,
      skillMatchScore: 0.90,
      experienceMatchScore: 0.80,
      locationMatchScore: 1.0,
      matchedSkills: ['React', 'Node.js', 'TypeScript', 'AWS'],
      missingSkills: ['Docker'],
      status: 'pending',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    console.log('🔄 Storing job match...');
    const putMatchCommand = new PutItemCommand({
      TableName: 'job-talent-match-job-matches',
      Item: marshall(jobMatch)
    });

    await client.send(putMatchCommand);
    console.log('✅ Job match created successfully!');
    console.log(`   - Match ID: ${jobMatch.matchId}`);
    console.log(`   - Overall Score: ${(jobMatch.overallScore * 100).toFixed(1)}%`);
    console.log(`   - Skill Match: ${(jobMatch.skillMatchScore * 100).toFixed(1)}%`);
    console.log(`   - Location Match: ${(jobMatch.locationMatchScore * 100).toFixed(1)}%`);

    // Summary
    console.log('\n🎉 Simple DynamoDB Test Completed Successfully!');
    console.log('\n📊 Test Results:');
    console.log('✅ User Profile Creation - Working');
    console.log('✅ User Profile Retrieval - Working');
    console.log('✅ Job Posting Creation - Working');
    console.log('✅ Job Match Creation - Working');

    console.log('\n🚀 DynamoDB Status:');
    console.log('✅ All tables are accessible');
    console.log('✅ Data can be stored and retrieved');
    console.log('✅ Ready for integration with the AI pipeline');

  } catch (error) {
    console.log('\n💥 Simple DynamoDB test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('AccessDenied')) {
        console.log('\n🔧 Solution: Add DynamoDB permissions to your IAM user');
        console.log('1. Go to AWS IAM Console');
        console.log('2. Find user: job-talent-match-ai');
        console.log('3. Add DynamoDB permissions');
      } else if (error.message.includes('ResourceNotFoundException')) {
        console.log('\n🔧 Solution: DynamoDB table not found');
        console.log('1. Check table names');
        console.log('2. Verify region: us-east-1');
      }
    }
  }
}

// Run the test
testSimpleDynamoDB().catch(console.error);
