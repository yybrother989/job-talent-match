import { ResumeProcessingPipeline } from '../src/index.js';

// Test the complete resume processing pipeline (Textract + Bedrock)
async function testCompletePipeline() {
  console.log('🔄 Testing Complete Resume Processing Pipeline\n');

  try {
    // Create the pipeline
    const pipeline = new ResumeProcessingPipeline();
    console.log('✅ Pipeline created successfully');

    // Create a mock PDF document (in real usage, this would be an actual PDF)
    // For testing, we'll create a simple text document that simulates a resume
    const mockResumeText = `
      John Doe
      Software Engineer
      john.doe@email.com | (555) 123-4567 | San Francisco, CA
      
      SUMMARY
      Experienced software engineer with 5 years of experience in full-stack development, 
      specializing in React, Node.js, and cloud technologies. Passionate about building 
      scalable applications and leading development teams.
      
      EXPERIENCE
      Senior Software Engineer | TechCorp Inc. | 2020 - Present
      - Led development of microservices architecture using Node.js and React
      - Implemented CI/CD pipelines reducing deployment time by 60%
      - Mentored junior developers and conducted code reviews
      - Technologies: React, Node.js, TypeScript, AWS, Docker, Kubernetes
      
      Software Engineer | StartupXYZ | 2018 - 2020
      - Developed responsive web applications using React and Redux
      - Collaborated with design team to implement user interfaces
      - Optimized application performance resulting in 40% faster load times
      - Technologies: React, Redux, JavaScript, HTML, CSS, Git
      
      EDUCATION
      Bachelor of Science in Computer Science
      University of California, Berkeley | 2014 - 2018
      
      SKILLS
      Programming Languages: JavaScript, TypeScript, Python, Java
      Frontend: React, Redux, HTML5, CSS3, Bootstrap
      Backend: Node.js, Express, REST APIs, GraphQL
      Databases: PostgreSQL, MongoDB, Redis
      Cloud: AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes
      Tools: Git, Jenkins, Jira, VS Code
      
      CERTIFICATIONS
      - AWS Certified Solutions Architect
      - Google Cloud Professional Developer
      
      PROJECTS
      - E-commerce Platform: Built full-stack application with React and Node.js
      - Task Management App: Developed collaborative project management tool
      - API Gateway: Designed and implemented microservices communication layer
    `;

    // Convert text to buffer (simulating a document)
    const documentBytes = Buffer.from(mockResumeText, 'utf-8');
    
    console.log(`📄 Mock document created (${documentBytes.length} bytes)`);

    // Validate document
    const validation = pipeline.validateDocument(documentBytes);
    if (!validation.valid) {
      console.log(`❌ Document validation failed: ${validation.error}`);
      return;
    }
    console.log('✅ Document validation passed');

    // Process the resume through the complete pipeline
    console.log('\n🔄 Processing resume through complete pipeline...');
    const result = await pipeline.processResume(documentBytes, {
      includeStructuredData: true,
      includeFormData: true,
      includeTableData: true,
      includeConfidence: true,
      language: 'en',
      temperature: 0.1,
      maxTokens: 1000,
    });

    // Display results
    console.log('\n📊 Pipeline Results:');
    console.log(`- Success: ${result.success ? '✅' : '❌'}`);
    console.log(`- Total Processing Time: ${result.totalProcessingTime}ms`);
    
    if (result.documentProcessing) {
      console.log('\n📄 Document Processing (Textract):');
      console.log(`  - Success: ${result.documentProcessing.success ? '✅' : '❌'}`);
      console.log(`  - Processing Time: ${result.documentProcessing.processingTime}ms`);
      console.log(`  - Text Length: ${result.documentProcessing.extractedText?.length || 0} characters`);
      
      if (result.documentProcessing.extractedText) {
        console.log(`  - Extracted Text Preview: ${result.documentProcessing.extractedText.substring(0, 100)}...`);
      }
    }

    if (result.resumeParsing) {
      console.log('\n🤖 Resume Parsing (Bedrock):');
      console.log(`  - Success: ${result.resumeParsing.success ? '✅' : '❌'}`);
      console.log(`  - Processing Time: ${result.resumeParsing.processingTime}ms`);
      console.log(`  - Confidence: ${result.resumeParsing.confidence?.toFixed(2) || 'N/A'}`);
      
      if (result.resumeParsing.data) {
        console.log(`  - Skills: ${result.resumeParsing.data.skills.join(', ')}`);
        console.log(`  - Current Role: ${result.resumeParsing.data.currentRole}`);
        console.log(`  - Years of Experience: ${result.resumeParsing.data.yearsOfExperience}`);
        console.log(`  - Education: ${result.resumeParsing.data.education}`);
        console.log(`  - Location: ${result.resumeParsing.data.location || 'Not specified'}`);
      }
    }

    if (result.error) {
      console.log(`\n❌ Error: ${result.error}`);
    }

    // Test batch processing
    console.log('\n🔄 Testing batch processing...');
    const batchResults = await pipeline.processResumesBatch([documentBytes, documentBytes], {
      includeConfidence: true,
      maxTokens: 500,
    });

    const stats = pipeline.getProcessingStats(batchResults);
    console.log('\n📊 Batch Processing Stats:');
    console.log(`  - Total Documents: ${stats.total}`);
    console.log(`  - Successful: ${stats.successful}`);
    console.log(`  - Failed: ${stats.failed}`);
    console.log(`  - Average Processing Time: ${stats.averageProcessingTime.toFixed(0)}ms`);
    console.log(`  - Total Processing Time: ${stats.totalProcessingTime}ms`);

    console.log('\n🎉 Complete Pipeline Test Completed!');
    console.log('\n✅ Available Features:');
    console.log('  - Document text extraction (Textract)');
    console.log('  - Form and table data extraction (Textract)');
    console.log('  - AI-powered resume parsing (Bedrock)');
    console.log('  - Batch processing');
    console.log('  - Document validation');
    console.log('  - Comprehensive error handling');
    console.log('  - Processing statistics');

  } catch (error) {
    console.log('\n💥 Pipeline test failed:', error);
  }
}

// Run the test
testCompletePipeline().catch(console.error);
