import { NextRequest, NextResponse } from 'next/server';
import { BedrockResumeParser } from '../../../../aws-ai-service/src/services/bedrock/resumeParser';
import { bedrockRateLimiter } from '@/lib/rateLimiter';

// Initialize Bedrock parser
const resumeParser = new BedrockResumeParser();

export async function POST(request: NextRequest) {
  try {
    // Check if AWS credentials are available
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    const { resumeText } = await request.json();

    if (!resumeText) {
      return NextResponse.json(
        { error: 'Resume text is required' },
        { status: 400 }
      );
    }

    console.log('AWS Bedrock: Starting resume parsing...');
    const startTime = Date.now();

    // Parse resume with Bedrock AI using rate limiter
    const parsingResult = await bedrockRateLimiter.addRequest(async () => {
      return await resumeParser.parseResume(resumeText, {
        includeConfidence: true,
        language: 'en',
        temperature: 0.1,
        maxTokens: 1000,
      });
    });

    if (!parsingResult.success || !parsingResult.data) {
      throw new Error('Failed to parse resume with Bedrock AI');
    }

    const duration = Date.now() - startTime;
    console.log(`AWS Bedrock: Parsing completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      data: {
        // Technical Skills (structured)
        technical_skills: {
          programming_languages: parsingResult.data.skills.filter(skill => 
            ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin'].includes(skill)
          ),
          frameworks: parsingResult.data.skills.filter(skill => 
            ['React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel', 'Rails'].includes(skill)
          ),
          databases: parsingResult.data.skills.filter(skill => 
            ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'SQLite'].includes(skill)
          ),
          cloud_platforms: parsingResult.data.skills.filter(skill => 
            ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform'].includes(skill)
          ),
          tools: parsingResult.data.skills.filter(skill => 
            ['Git', 'Jenkins', 'Jira', 'VS Code', 'IntelliJ', 'Figma', 'Slack'].includes(skill)
          ),
          methodologies: parsingResult.data.skills.filter(skill => 
            ['Agile', 'Scrum', 'CI/CD', 'DevOps', 'Microservices', 'TDD', 'BDD'].includes(skill)
          )
        },
        // Soft Skills
        soft_skills: parsingResult.data.skills.filter(skill => 
          ['Leadership', 'Communication', 'Teamwork', 'Problem Solving', 'Time Management', 'Adaptability'].includes(skill)
        ),
        // Domain Knowledge
        domain_knowledge: parsingResult.data.skills.filter(skill => 
          ['Machine Learning', 'Data Science', 'Cybersecurity', 'Blockchain', 'IoT', 'Mobile Development'].includes(skill)
        ),
        // Education Details
        education: parsingResult.data.education ? [{
          degree: parsingResult.data.education,
          field_of_study: 'Computer Science',
          institution: 'University',
          graduation_year: new Date().getFullYear() - (parsingResult.data.yearsOfExperience || 5) - 4,
          gpa: undefined,
          honors: []
        }] : [],
        // Certifications
        certifications: parsingResult.data.certifications ? parsingResult.data.certifications.map(cert => ({
          name: cert,
          issuing_organization: 'Certification Body',
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: undefined,
          credential_id: undefined,
          level: undefined
        })) : [],
        // Experience Details
        experience_details: parsingResult.data.experience ? 
          (Array.isArray(parsingResult.data.experience) 
            ? parsingResult.data.experience.map((exp, index) => ({
                company: `Company ${index + 1}`,
                title: parsingResult.data?.currentRole || 'Software Engineer',
                start_date: new Date(Date.now() - ((parsingResult.data?.yearsOfExperience || 5) - index) * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_date: index === 0 ? undefined : new Date(Date.now() - ((parsingResult.data?.yearsOfExperience || 5) - index - 1) * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                description: exp,
                key_achievements: [],
                technologies_used: parsingResult.data?.skills?.slice(0, 5) || [],
                impact_metrics: [],
                team_size: undefined,
                budget_managed: undefined
              }))
            : [{
                company: 'Current Company',
                title: parsingResult.data?.currentRole || 'Software Engineer',
                start_date: new Date(Date.now() - (parsingResult.data?.yearsOfExperience || 5) * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_date: undefined,
                description: parsingResult.data.experience,
                key_achievements: [],
                technologies_used: parsingResult.data?.skills?.slice(0, 5) || [],
                impact_metrics: [],
                team_size: undefined,
                budget_managed: undefined
              }]
          ) : [],
        // Legacy fields for backward compatibility
        skills: parsingResult.data?.skills || [],
        experience_summary: Array.isArray(parsingResult.data?.experience) 
          ? parsingResult.data.experience[0] || '' 
          : parsingResult.data?.experience || '',
        education_summary: parsingResult.data?.education || '',
        languages: parsingResult.data?.languages || [],
        // Additional fields
        summary: parsingResult.data?.summary,
        yearsOfExperience: parsingResult.data?.yearsOfExperience,
        currentRole: parsingResult.data?.currentRole,
        location: parsingResult.data?.location
      },
      provider: 'aws-bedrock',
      duration,
      confidence: parsingResult.confidence,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('AWS Bedrock error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to parse resume with AWS Bedrock',
        details: error instanceof Error ? error.message : 'Unknown error',
        provider: 'aws-bedrock',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
