import { BedrockResumeParser, ResumeParsingOptions } from '../src/index.js';

// Test AWS credentials and Bedrock access
async function testAWSCredentials() {
  console.log('🔐 Testing AWS Credentials and Bedrock Access\n');

  try {
    // Test 1: Create parser with your credentials
    const parser = new BedrockResumeParser('us-east-1', 'anthropic.claude-3-5-sonnet-20240620-v1:0');
    console.log('✅ Parser created with Claude 3.5 Sonnet');

    // Test 2: Simple resume parsing test
    const testResume = `
      John Doe
      Software Engineer
      Experience: 5 years in React, Node.js, and AWS
      Skills: JavaScript, TypeScript, Python, React, Node.js, AWS
      Education: Computer Science Degree
      Location: San Francisco, CA
    `;

    const options: ResumeParsingOptions = {
      includeConfidence: true,
      includeRawResponse: false,
      language: 'en',
      temperature: 0.1,
      maxTokens: 500,
    };

    console.log('\n🔄 Testing resume parsing with AWS Bedrock...');
    console.log(`Resume text length: ${testResume.length} characters`);

    const result = await parser.parseResume(testResume, options);

    if (result.success && result.data) {
      console.log('\n🎉 SUCCESS! AWS Bedrock is working!');
      console.log(`⏱️  Processing time: ${result.processingTime}ms`);
      console.log(`🎯 Confidence: ${result.confidence?.toFixed(2) || 'N/A'}`);
      console.log(`🔧 Provider: ${result.provider}`);
      
      console.log('\n📊 Extracted Data:');
      console.log(`- Skills: ${result.data.skills.join(', ')}`);
      console.log(`- Current Role: ${result.data.currentRole}`);
      console.log(`- Years of Experience: ${result.data.yearsOfExperience}`);
      console.log(`- Education: ${result.data.education}`);
      console.log(`- Location: ${result.data.location || 'Not specified'}`);
      
      console.log('\n📝 Experience Summary:');
      console.log(result.data.experience);
      
      console.log('\n📋 Professional Summary:');
      console.log(result.data.summary);

    } else {
      console.log('\n❌ Resume parsing failed!');
      console.log(`Error: ${result.error}`);
      
      if (result.error?.includes('AccessDenied')) {
        console.log('\n💡 This might be a Bedrock access issue. Check:');
        console.log('1. Have you requested access to Claude models in Bedrock?');
        console.log('2. Is your IAM user granted Bedrock permissions?');
        console.log('3. Are you using the correct region (us-east-1)?');
      }
    }

  } catch (error) {
    console.log('\n💥 Unexpected error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        console.log('\n💡 Credentials issue. Check:');
        console.log('1. Are your AWS credentials set in .env file?');
        console.log('2. Are the credentials valid and active?');
        console.log('3. Does your IAM user have Bedrock permissions?');
      }
    }
  }
}

// Run the test
testAWSCredentials().catch(console.error);
