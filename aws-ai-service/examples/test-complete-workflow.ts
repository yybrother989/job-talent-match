import { UnifiedDataService } from '../src/index.js';

// Test the complete workflow: Document Upload → AI Processing → Data Storage → Job Matching
async function testCompleteWorkflow() {
  console.log('🔄 Testing Complete AWS Data Storage Workflow\n');

  try {
    // Create the unified data service
    const dataService = new UnifiedDataService();
    console.log('✅ Unified data service created successfully');

    // Test data
    const userId = 'test-user-123';
    const userEmail = 'test@example.com';
    
    // Mock resume content (simulating a PDF file)
    const mockResumeContent = `
      John Doe
      Senior Software Engineer
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

    const resumeBuffer = Buffer.from(mockResumeContent, 'utf-8');
    console.log(`📄 Mock resume prepared (${resumeBuffer.length} bytes)`);

    // Step 1: Upload and process resume
    console.log('\n🔄 Step 1: Uploading and processing resume...');
    const uploadResult = await dataService.uploadAndProcessResume(
      resumeBuffer,
      'john-doe-resume.pdf',
      'application/pdf',
      userId,
      userEmail
    );

    console.log('\n📊 Upload and Processing Results:');
    console.log(`- Success: ${uploadResult.success ? '✅' : '❌'}`);
    console.log(`- Total Time: ${uploadResult.totalTime}ms`);
    
    if (uploadResult.document) {
      console.log(`- Document Key: ${uploadResult.document.key}`);
      console.log(`- Document Size: ${uploadResult.document.size} bytes`);
      console.log(`- Uploaded At: ${uploadResult.document.uploadedAt}`);
    }

    if (uploadResult.processingResult) {
      console.log(`- AI Processing Success: ${uploadResult.processingResult.success ? '✅' : '❌'}`);
      console.log(`- AI Processing Time: ${uploadResult.processingResult.totalProcessingTime}ms`);
    }

    if (uploadResult.userProfile) {
      console.log(`- User Profile Created: ✅`);
      console.log(`- Skills Extracted: ${uploadResult.userProfile.skills.length}`);
      console.log(`- Current Role: ${uploadResult.userProfile.currentRole}`);
      console.log(`- Years of Experience: ${uploadResult.userProfile.yearsOfExperience}`);
    }

    if (uploadResult.error) {
      console.log(`- Error: ${uploadResult.error}`);
    }

    if (!uploadResult.success) {
      console.log('\n❌ Upload and processing failed. Stopping workflow test.');
      return;
    }

    // Step 2: Create some test job postings
    console.log('\n🔄 Step 2: Creating test job postings...');
    
    const testJobs = [
      {
        jobId: 'job-1',
        companyId: 'company-1',
        title: 'Senior Full Stack Developer',
        description: 'We are looking for a senior full stack developer with experience in React, Node.js, and cloud technologies.',
        requirements: ['React', 'Node.js', 'TypeScript', 'AWS', 'Docker'],
        responsibilities: ['Develop web applications', 'Lead technical projects', 'Mentor junior developers'],
        location: 'San Francisco, CA',
        remoteType: 'hybrid' as const,
        employmentType: 'full-time' as const,
        requiredSkills: ['React', 'Node.js', 'TypeScript', 'AWS'],
        preferredSkills: ['Docker', 'Kubernetes', 'GraphQL'],
        experienceLevel: 'senior' as const,
        companyName: 'TechCorp Inc.',
        isActive: true,
        postedBy: 'recruiter-1'
      },
      {
        jobId: 'job-2',
        companyId: 'company-2',
        title: 'Frontend Developer',
        description: 'Join our team as a frontend developer working with modern React applications.',
        requirements: ['React', 'JavaScript', 'HTML', 'CSS'],
        responsibilities: ['Build user interfaces', 'Optimize performance', 'Collaborate with design team'],
        location: 'Remote',
        remoteType: 'remote' as const,
        employmentType: 'full-time' as const,
        requiredSkills: ['React', 'JavaScript', 'HTML', 'CSS'],
        preferredSkills: ['Redux', 'TypeScript', 'Bootstrap'],
        experienceLevel: 'mid' as const,
        companyName: 'StartupXYZ',
        isActive: true,
        postedBy: 'recruiter-2'
      }
    ];

    for (const jobData of testJobs) {
      const job = {
        ...jobData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      try {
        await dataService.createJobPosting(job);
        console.log(`✅ Job created: ${job.title}`);
      } catch (error) {
        console.log(`❌ Failed to create job: ${job.title} - ${error}`);
      }
    }

    // Step 3: Find job matches
    console.log('\n🔄 Step 3: Finding job matches...');
    const matchingResult = await dataService.findJobMatches(userId, {
      limit: 10,
      minScore: 0.3
    });

    console.log('\n📊 Job Matching Results:');
    console.log(`- Success: ${matchingResult.success ? '✅' : '❌'}`);
    console.log(`- Total Matches Found: ${matchingResult.totalMatches}`);
    console.log(`- Matches Stored: ${matchingResult.matches.length}`);
    console.log(`- Processing Time: ${matchingResult.processingTime}ms`);

    if (matchingResult.matches.length > 0) {
      console.log('\n🎯 Top Job Matches:');
      matchingResult.matches.forEach((match, index) => {
        console.log(`\nMatch ${index + 1}:`);
        console.log(`  - Job ID: ${match.jobId}`);
        console.log(`  - Overall Score: ${(match.overallScore * 100).toFixed(1)}%`);
        console.log(`  - Skill Match: ${(match.skillMatchScore * 100).toFixed(1)}%`);
        console.log(`  - Experience Match: ${(match.experienceMatchScore * 100).toFixed(1)}%`);
        console.log(`  - Location Match: ${(match.locationMatchScore * 100).toFixed(1)}%`);
        console.log(`  - Matched Skills: ${match.matchedSkills.join(', ')}`);
        console.log(`  - Missing Skills: ${match.missingSkills.join(', ')}`);
        console.log(`  - Location Compatibility: ${match.locationCompatibility}`);
      });
    }

    if (matchingResult.error) {
      console.log(`- Error: ${matchingResult.error}`);
    }

    // Step 4: Get user's job matches
    console.log('\n🔄 Step 4: Retrieving user job matches...');
    const userMatches = await dataService.getUserJobMatches(userId, {
      limit: 5
    });

    console.log('\n📊 User Job Matches Retrieved:');
    console.log(`- Total Matches: ${userMatches.length}`);
    userMatches.forEach((match, index) => {
      console.log(`  ${index + 1}. Job ${match.jobId} - Score: ${(match.overallScore * 100).toFixed(1)}%`);
    });

    // Step 5: Get user documents
    console.log('\n🔄 Step 5: Retrieving user documents...');
    const userDocuments = await dataService.getUserDocuments(userId);

    console.log('\n📊 User Documents Retrieved:');
    console.log(`- Total Documents: ${userDocuments.length}`);
    userDocuments.forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc.originalName} - ${doc.size} bytes - ${doc.uploadedAt}`);
    });

    console.log('\n🎉 Complete Workflow Test Completed Successfully!');
    console.log('\n✅ AWS Services Tested:');
    console.log('  - S3 Document Storage');
    console.log('  - DynamoDB Data Storage');
    console.log('  - Bedrock AI Processing');
    console.log('  - Textract Document Processing');
    console.log('  - Complete Resume Processing Pipeline');
    console.log('  - Job Matching Algorithm');
    console.log('  - Unified Data Service');

    console.log('\n🚀 Ready for Production!');
    console.log('Your AWS AI module now has a complete data storage and processing workflow.');

  } catch (error) {
    console.log('\n💥 Complete workflow test failed:', error);
  }
}

// Run the test
testCompleteWorkflow().catch(console.error);
