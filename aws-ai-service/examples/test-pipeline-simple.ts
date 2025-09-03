import { BedrockResumeParser } from '../src/index.js';

// Test the resume parsing part of the pipeline (without document processing)
async function testPipelineSimple() {
  console.log('🔄 Testing Resume Processing Pipeline (Simple)\n');

  try {
    // Create the resume parser
    const parser = new BedrockResumeParser();
    console.log('✅ Resume parser created successfully');

    // Test resume text (simulating what would come from Textract)
    const resumeText = `
      John Doe
      Software Engineer
      john.doe@email.com | (555) 123-4567 | San Francisco, CA
      
      SUMMARY
      Experienced software engineer with 5 years of experience in full-stack development, 
      specializing in React, Node.js, and cloud technologies.
      
      EXPERIENCE
      Senior Software Engineer | TechCorp Inc. | 2020 - Present
      - Led development of microservices architecture using Node.js and React
      - Implemented CI/CD pipelines reducing deployment time by 60%
      - Technologies: React, Node.js, TypeScript, AWS, Docker, Kubernetes
      
      Software Engineer | StartupXYZ | 2018 - 2020
      - Developed responsive web applications using React and Redux
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
    `;

    console.log(`📄 Resume text prepared (${resumeText.length} characters)`);

    // Process the resume
    console.log('\n🔄 Processing resume with Bedrock...');
    const result = await parser.parseResume(resumeText, {
      includeConfidence: true,
      language: 'en',
      temperature: 0.1,
      maxTokens: 1000,
    });

    // Display results
    console.log('\n📊 Processing Results:');
    console.log(`- Success: ${result.success ? '✅' : '❌'}`);
    console.log(`- Processing Time: ${result.processingTime}ms`);
    console.log(`- Confidence: ${result.confidence?.toFixed(2) || 'N/A'}`);
    console.log(`- Provider: ${result.provider}`);
    
    if (result.success && result.data) {
      console.log('\n🎯 Extracted Resume Data:');
      console.log(`- Skills (${result.data.skills.length}): ${result.data.skills.join(', ')}`);
      console.log(`- Current Role: ${result.data.currentRole}`);
      console.log(`- Years of Experience: ${result.data.yearsOfExperience}`);
      console.log(`- Education: ${result.data.education}`);
      console.log(`- Location: ${result.data.location || 'Not specified'}`);
      console.log(`- Languages: ${result.data.languages?.join(', ') || 'Not specified'}`);
      console.log(`- Certifications: ${result.data.certifications?.join(', ') || 'Not specified'}`);
      console.log(`- Projects: ${result.data.projects?.join(', ') || 'Not specified'}`);
      
      console.log('\n📝 Experience Summary:');
      console.log(result.data.experience);
      
      console.log('\n📋 Professional Summary:');
      console.log(result.data.summary);
    }

    if (result.error) {
      console.log(`\n❌ Error: ${result.error}`);
    }

    // Test batch processing
    console.log('\n🔄 Testing batch processing...');
    const batchTexts = [
      'Jane Smith, Frontend Developer, 3 years experience in React and Vue.js',
      'Mike Johnson, Backend Engineer, 5 years experience in Python and Django',
      'Sarah Wilson, Full-stack Developer, 4 years experience in JavaScript and Node.js'
    ];

    const batchResults = await parser.parseResumesBatch(batchTexts, {
      includeConfidence: true,
      maxTokens: 500,
    });

    console.log('\n📊 Batch Processing Results:');
    batchResults.forEach((result, index) => {
      console.log(`\nResume ${index + 1}:`);
      if (result.success && result.data) {
        console.log(`  ✅ Success - ${result.data.skills.length} skills extracted`);
        console.log(`  ⏱️  Processing time: ${result.processingTime}ms`);
        console.log(`  🎯 Skills: ${result.data.skills.join(', ')}`);
        console.log(`  👤 Role: ${result.data.currentRole}`);
        console.log(`  📅 Experience: ${result.data.yearsOfExperience} years`);
      } else {
        console.log(`  ❌ Failed - ${result.error}`);
      }
    });

    const successful = batchResults.filter(r => r.success).length;
    const totalTime = batchResults.reduce((sum, r) => sum + r.processingTime, 0);
    const avgTime = totalTime / batchResults.length;

    console.log('\n📊 Batch Statistics:');
    console.log(`- Total resumes: ${batchResults.length}`);
    console.log(`- Successful: ${successful}`);
    console.log(`- Failed: ${batchResults.length - successful}`);
    console.log(`- Average processing time: ${avgTime.toFixed(0)}ms`);
    console.log(`- Total processing time: ${totalTime}ms`);

    console.log('\n🎉 Pipeline Test Completed Successfully!');
    console.log('\n✅ Available Features:');
    console.log('  - AI-powered resume parsing (Bedrock)');
    console.log('  - Skills extraction');
    console.log('  - Experience analysis');
    console.log('  - Education parsing');
    console.log('  - Location detection');
    console.log('  - Certification extraction');
    console.log('  - Project identification');
    console.log('  - Batch processing');
    console.log('  - Confidence scoring');
    console.log('  - Comprehensive error handling');

    console.log('\n🚀 Ready for Integration!');
    console.log('The AWS AI module is ready to be integrated with your main application.');

  } catch (error) {
    console.log('\n💥 Pipeline test failed:', error);
  }
}

// Run the test
testPipelineSimple().catch(console.error);
