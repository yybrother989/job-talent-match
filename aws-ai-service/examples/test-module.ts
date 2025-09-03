import { BedrockResumeParser, ResumeParsingOptions } from '../src/index.js';

// Simple test to verify the module structure works
async function testModuleStructure() {
  console.log('🧪 Testing AWS AI Module Structure\n');

  try {
    // Test 1: Module imports work
    console.log('✅ Module imports successful');
    
    // Test 2: Can create parser instance
    const parser = new BedrockResumeParser('us-east-1', 'anthropic.claude-3-sonnet-20240229-v1:0');
    console.log('✅ Parser instance created');
    
    // Test 3: Can create options
    const options: ResumeParsingOptions = {
      includeConfidence: true,
      includeRawResponse: false,
      language: 'en',
      temperature: 0.1,
      maxTokens: 1000,
    };
    console.log('✅ Options created:', options);
    
    // Test 4: Test with mock data (will fail without AWS credentials, but that's expected)
    const mockResumeText = "John Doe, Software Engineer, 5 years experience in React and Node.js";
    
    console.log('\n🔄 Testing with mock data (will fail without AWS credentials)...');
    const result = await parser.parseResume(mockResumeText, options);
    
    if (result.success) {
      console.log('✅ Resume parsing successful!');
      console.log('📊 Result:', result);
    } else {
      console.log('❌ Resume parsing failed (expected without AWS credentials)');
      console.log('🔍 Error:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Module test failed:', error);
  }
}

// Test the module structure
testModuleStructure().catch(console.error);
