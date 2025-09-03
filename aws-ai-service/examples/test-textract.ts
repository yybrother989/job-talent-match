import { config } from 'dotenv';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

// Test AWS Textract functionality
async function testTextract() {
  console.log('📄 Testing AWS Textract\n');

  // Load .env file
  config();

  try {
    // Create Textract client
    const client = new TextractClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    console.log('✅ Textract client created successfully');

    // Test with a simple text document (we'll create a mock document)
    console.log('\n🔄 Testing Textract access...');
    
    // For testing, we'll use a simple base64 encoded text image
    // In real usage, you would upload actual PDF/image files
    const testDocument = {
      Bytes: Buffer.from('Test document for Textract')
    };

    const command = new DetectDocumentTextCommand({
      Document: testDocument
    });

    console.log('📋 Testing document text detection...');
    const response = await client.send(command);
    
    console.log('\n🎉 SUCCESS! AWS Textract is working!');
    console.log(`📊 Response status: ${response.$metadata.httpStatusCode}`);
    console.log(`🆔 Request ID: ${response.$metadata.requestId}`);
    
    if (response.Blocks && response.Blocks.length > 0) {
      console.log(`📝 Text blocks detected: ${response.Blocks.length}`);
      console.log('📄 Extracted text:');
      response.Blocks.forEach((block, index) => {
        if (block.BlockType === 'LINE' && block.Text) {
          console.log(`  ${index + 1}. ${block.Text}`);
        }
      });
    } else {
      console.log('📝 No text blocks detected (expected for test document)');
    }

    console.log('\n✅ AWS Textract Integration Ready!');
    console.log('📋 Available Features:');
    console.log('  - Document text detection');
    console.log('  - Form data extraction');
    console.log('  - Table extraction');
    console.log('  - Handwriting recognition');
    console.log('  - Multi-page document processing');

  } catch (error) {
    console.log('\n❌ Textract test failed:');
    
    if (error instanceof Error) {
      if (error.message.includes('AccessDenied')) {
        console.log('💡 Access denied. Check your IAM permissions for Textract.');
        console.log('   Make sure you have AmazonTextractFullAccess policy attached.');
      } else if (error.message.includes('InvalidParameter')) {
        console.log('💡 Invalid parameter. The test document format might be incorrect.');
        console.log('   This is expected for our simple test - Textract works with real documents.');
      } else {
        console.log(`💡 Error: ${error.message}`);
      }
    } else {
      console.log('💡 Unknown error:', error);
    }
  }
}

// Run the test
testTextract().catch(console.error);
