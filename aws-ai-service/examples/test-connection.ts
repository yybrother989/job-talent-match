import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Simple connection test
async function testConnection() {
  console.log('🔗 Testing AWS Bedrock Connection\n');

  try {
    const client = new BedrockRuntimeClient({ region: 'us-east-1' });
    const modelId = 'anthropic.claude-3-5-sonnet-20240620-v1:0';

    console.log('✅ Bedrock client created');
    console.log(`✅ Model ID: ${modelId}`);
    console.log('✅ Region: us-east-1');

    // Simple test with minimal tokens
    const command = new InvokeModelCommand({
      modelId: modelId,
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        messages: [
          {
            role: "user",
            content: "Say 'Hello, AWS Bedrock is working!'"
          }
        ],
        max_tokens: 10,
        temperature: 0.1,
      }),
    });

    console.log('\n🔄 Testing simple API call...');
    const response = await client.send(command);
    
    // Convert response body
    let responseBody;
    if (response.body instanceof Uint8Array) {
      responseBody = new TextDecoder().decode(response.body);
    } else {
      responseBody = response.body;
    }

    const parsed = JSON.parse(responseBody);
    const content = parsed.content[0]?.text || 'No response';

    console.log('\n🎉 SUCCESS! AWS Bedrock is fully working!');
    console.log(`📝 Response: ${content}`);
    console.log(`⏱️  Status: ${response.$metadata.httpStatusCode}`);
    console.log(`🆔 Request ID: ${response.$metadata.requestId}`);

  } catch (error) {
    console.log('\n❌ Connection test failed:');
    console.log(error);
    
    if (error instanceof Error) {
      if (error.message.includes('ThrottlingException')) {
        console.log('\n💡 Rate limit hit. Wait a few minutes and try again.');
      } else if (error.message.includes('AccessDenied')) {
        console.log('\n💡 Access denied. Check your IAM permissions.');
      } else if (error.message.includes('credentials')) {
        console.log('\n💡 Credentials issue. Check your .env file.');
      }
    }
  }
}

// Run the test
testConnection().catch(console.error);
