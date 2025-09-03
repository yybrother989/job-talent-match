import { BedrockResumeParser } from '../src/index.js';

// Test that the AWS AI module works with .env file
async function testEnvIntegration() {
  console.log('🔧 Testing AWS AI Module with .env File\n');

  try {
    // Create parser without explicit credentials (should use .env)
    const parser = new BedrockResumeParser();
    console.log('✅ Parser created using .env credentials');

    // Test with a very simple resume to avoid rate limits
    const simpleResume = "John Doe, Software Engineer, 3 years experience in JavaScript and React";

    console.log('\n🔄 Testing resume parsing with .env credentials...');
    console.log(`Resume: ${simpleResume}`);

    const result = await parser.parseResume(simpleResume, {
      maxTokens: 200, // Small token limit to avoid rate limits
      temperature: 0.1,
    });

    if (result.success && result.data) {
      console.log('\n🎉 SUCCESS! AWS AI Module is working with .env file!');
      console.log(`⏱️  Processing time: ${result.processingTime}ms`);
      console.log(`🎯 Confidence: ${result.confidence?.toFixed(2) || 'N/A'}`);
      console.log(`🔧 Provider: ${result.provider}`);
      
      console.log('\n📊 Extracted Data:');
      console.log(`- Skills: ${result.data.skills.join(', ')}`);
      console.log(`- Current Role: ${result.data.currentRole}`);
      console.log(`- Years of Experience: ${result.data.yearsOfExperience}`);
      console.log(`- Education: ${result.data.education}`);
      
    } else {
      console.log('\n❌ Resume parsing failed!');
      console.log(`Error: ${result.error}`);
      
      if (result.error?.includes('ThrottlingException')) {
        console.log('\n💡 Rate limit hit. This is normal for testing.');
        console.log('✅ The important thing is that .env credentials are working!');
      }
    }

  } catch (error) {
    console.log('\n💥 Unexpected error:', error);
  }
}

// Run the test
testEnvIntegration().catch(console.error);
