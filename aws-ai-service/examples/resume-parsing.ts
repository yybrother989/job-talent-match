import { BedrockResumeParser, ResumeParsingOptions } from '../src/index.js';

// Example usage of the AWS AI Service Module for resume parsing
async function exampleResumeParsing() {
  console.log('🚀 AWS AI Service - Resume Parsing Example\n');

  // Initialize the resume parser
  const parser = new BedrockResumeParser('us-east-1', 'anthropic.claude-3-sonnet-20240229-v1:0');

  // Sample resume text
  const resumeText = `
    John Doe
    Senior Software Engineer
    john.doe@email.com | (555) 123-4567 | San Francisco, CA
    
    SUMMARY
    Experienced software engineer with 8 years of experience in full-stack development, 
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

  // Parsing options
  const options: ResumeParsingOptions = {
    includeConfidence: true,
    includeRawResponse: false,
    language: 'en',
    temperature: 0.1,
    maxTokens: 1000,
  };

  try {
    console.log('📄 Parsing resume...');
    console.log(`Text length: ${resumeText.length} characters\n`);

    // Parse the resume
    const result = await parser.parseResume(resumeText, options);

    if (result.success && result.data) {
      console.log('✅ Resume parsing successful!\n');
      console.log('📊 Results:');
      console.log(`- Processing time: ${result.processingTime}ms`);
      console.log(`- Confidence: ${result.confidence?.toFixed(2) || 'N/A'}`);
      console.log(`- Provider: ${result.provider}\n`);

      console.log('🎯 Extracted Information:');
      console.log(`- Skills (${result.data.skills.length}): ${result.data.skills.join(', ')}`);
      console.log(`- Current Role: ${result.data.currentRole}`);
      console.log(`- Years of Experience: ${result.data.yearsOfExperience}`);
      console.log(`- Education: ${result.data.education}`);
      console.log(`- Location: ${result.data.location || 'Not specified'}`);
      console.log(`- Languages: ${result.data.languages?.join(', ') || 'Not specified'}`);
      console.log(`- Certifications: ${result.data.certifications?.join(', ') || 'Not specified'}`);
      console.log(`- Projects: ${result.data.projects?.join(', ') || 'Not specified'}\n`);

      console.log('📝 Experience Summary:');
      console.log(result.data.experience);
      console.log('\n📋 Professional Summary:');
      console.log(result.data.summary);

    } else {
      console.log('❌ Resume parsing failed!');
      console.log(`Error: ${result.error}`);
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Batch processing example
async function exampleBatchProcessing() {
  console.log('\n🔄 AWS AI Service - Batch Processing Example\n');

  const parser = new BedrockResumeParser();

  const resumes = [
    'Jane Smith, Frontend Developer with 3 years experience in React and Vue.js',
    'Mike Johnson, Backend Engineer with 5 years experience in Python and Django',
    'Sarah Wilson, Full-stack Developer with 4 years experience in JavaScript and Node.js',
  ];

  try {
    console.log(`📚 Processing ${resumes.length} resumes in batch...\n`);

    const results = await parser.parseResumesBatch(resumes);

    results.forEach((result, index) => {
      console.log(`Resume ${index + 1}:`);
      if (result.success && result.data) {
        console.log(`  ✅ Success - ${result.data.skills.length} skills extracted`);
        console.log(`  ⏱️  Processing time: ${result.processingTime}ms`);
        console.log(`  🎯 Skills: ${result.data.skills.join(', ')}`);
      } else {
        console.log(`  ❌ Failed - ${result.error}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('💥 Batch processing error:', error);
  }
}

// Run examples
async function runExamples() {
  await exampleResumeParsing();
  await exampleBatchProcessing();
}

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

export { exampleResumeParsing, exampleBatchProcessing };
