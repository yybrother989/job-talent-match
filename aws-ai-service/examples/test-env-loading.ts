import { config } from 'dotenv';

// Test that .env file is loaded correctly
async function testEnvLoading() {
  console.log('🔧 Testing .env File Loading\n');

  // Load environment variables
  config();

  console.log('📋 Environment Variables:');
  console.log(`- AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set'}`);
  console.log(`- AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`- AWS_REGION: ${process.env.AWS_REGION || '❌ Not set'}`);
  console.log(`- AWS_BEDROCK_MODEL_ID: ${process.env.AWS_BEDROCK_MODEL_ID || '❌ Not set'}`);
  console.log(`- LOG_LEVEL: ${process.env.LOG_LEVEL || '❌ Not set'}`);

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('\n🎉 SUCCESS! .env file is loaded correctly!');
    console.log('✅ AWS credentials are available');
    console.log('✅ The AWS AI module can now use these credentials');
    
    console.log('\n📊 Credential Details:');
    console.log(`- Access Key ID: ${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...`);
    console.log(`- Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY.substring(0, 8)}...`);
    console.log(`- Region: ${process.env.AWS_REGION}`);
    console.log(`- Model: ${process.env.AWS_BEDROCK_MODEL_ID}`);
  } else {
    console.log('\n❌ FAILED! .env file is not loaded correctly');
    console.log('💡 Make sure the .env file exists and contains your AWS credentials');
  }
}

// Run the test
testEnvLoading().catch(console.error);
