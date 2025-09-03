import { config } from 'dotenv';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

// Debug AWS credential resolution
async function debugCredentials() {
  console.log('🔍 Debugging AWS Credential Resolution\n');

  // Load .env file
  config();

  console.log('📋 Step 1: Environment Variables (from .env)');
  console.log(`- AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set'}`);
  console.log(`- AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`- AWS_REGION: ${process.env.AWS_REGION || '❌ Not set'}`);

  console.log('\n📋 Step 2: AWS SDK Client Creation');
  try {
    const client = new BedrockRuntimeClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    console.log('✅ Bedrock client created successfully');
    
    // The AWS SDK automatically resolves credentials from:
    // 1. Environment variables (our .env file)
    // 2. AWS CLI credentials (~/.aws/credentials)
    // 3. IAM roles (if on EC2)
    // 4. Instance metadata (if on EC2)
    
    console.log('\n📋 Step 3: How AWS SDK Finds Credentials');
    console.log('The AWS SDK automatically looks for credentials in this order:');
    console.log('1. ✅ Environment Variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)');
    console.log('2. ✅ AWS CLI Credentials (~/.aws/credentials)');
    console.log('3. ❌ IAM Roles (only on EC2)');
    console.log('4. ❌ Instance Metadata (only on EC2)');
    
    console.log('\n🎯 In your case:');
    console.log('- Your .env file provides the credentials');
    console.log('- AWS SDK automatically uses them');
    console.log('- No separate "Bedrock API key" is needed');
    console.log('- Bedrock uses the same AWS credentials as other AWS services');
    
  } catch (error) {
    console.log('❌ Error creating Bedrock client:', error);
  }
}

// Run the debug
debugCredentials().catch(console.error);
