import { NextRequest, NextResponse } from 'next/server';
import { BedrockResumeParser } from '../../../../aws-ai-service/src/services/bedrock/resumeParser';
import { retryWithBackoff, smartParseResume } from '@/lib/retryLogic';

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

    console.log('Smart Resume Parser: Starting...');
    const startTime = Date.now();

    // OpenAI fallback function
    const openaiParser = async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/parse-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeText }),
      });

      if (!response.ok) {
        throw new Error('OpenAI API call failed');
      }

      return await response.json();
    };

    // Use smart parsing with retry and fallback
    const result = await smartParseResume(resumeText, resumeParser, openaiParser);

    const duration = Date.now() - startTime;
    console.log(`Smart Resume Parser: Completed in ${duration}ms using ${result.provider}`);

    return NextResponse.json({
      success: true,
      data: {
        // Technical Skills (structured)
        technical_skills: {
          programming_languages: result.data?.skills?.filter((skill: string) => 
            ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin'].includes(skill)
          ) || [],
          frameworks: result.data?.skills?.filter((skill: string) => 
            ['React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel', 'Rails'].includes(skill)
          ) || [],
          databases: result.data?.skills?.filter((skill: string) => 
            ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'SQLite'].includes(skill)
          ) || [],
          cloud_platforms: result.data?.skills?.filter((skill: string) => 
            ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform'].includes(skill)
          ) || [],
          tools: result.data?.skills?.filter((skill: string) => 
            ['Git', 'Jenkins', 'Jira', 'VS Code', 'IntelliJ', 'Figma', 'Slack'].includes(skill)
          ) || [],
          methodologies: result.data?.skills?.filter((skill: string) => 
            ['Agile', 'Scrum', 'CI/CD', 'DevOps', 'Microservices', 'TDD', 'BDD'].includes(skill)
          ) || []
        },
        // Soft Skills
        soft_skills: result.data?.skills?.filter((skill: string) => 
          ['Leadership', 'Communication', 'Teamwork', 'Problem Solving', 'Time Management', 'Adaptability'].includes(skill)
        ) || [],
        // Domain Knowledge
        domain_knowledge: result.data?.skills?.filter((skill: string) => 
          ['Machine Learning', 'Data Science', 'Cybersecurity', 'Blockchain', 'IoT', 'Mobile Development'].includes(skill)
        ) || [],
        // Education Details
        education: result.data?.education ? [{
          degree: result.data.education,
          field_of_study: 'Computer Science',
          institution: 'University',
          graduation_year: new Date().getFullYear() - (result.data.yearsOfExperience || 5) - 4,
          gpa: undefined,
          honors: []
        }] : [],
        // Certifications
        certifications: result.data?.certifications ? result.data.certifications.map((cert: string) => ({
          name: cert,
          issuing_organization: 'Certification Body',
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: undefined,
          credential_id: undefined,
          level: undefined
        })) : [],
        // Experience Details
        experience_details: result.data?.experience ? 
          (Array.isArray(result.data.experience) 
            ? result.data.experience.map((exp: string, index: number) => ({
                company: `Company ${index + 1}`,
                title: result.data.currentRole,
                start_date: new Date(Date.now() - ((result.data.yearsOfExperience || 5) - index) * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_date: index === 0 ? undefined : new Date(Date.now() - ((result.data.yearsOfExperience || 5) - index - 1) * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                description: exp,
                key_achievements: [],
                technologies_used: result.data.skills?.slice(0, 5) || [],
                impact_metrics: [],
                team_size: undefined,
                budget_managed: undefined
              }))
            : [{
                company: 'Current Company',
                title: result.data.currentRole,
                start_date: new Date(Date.now() - (result.data.yearsOfExperience || 5) * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_date: undefined,
                description: result.data.experience,
                key_achievements: [],
                technologies_used: result.data.skills?.slice(0, 5) || [],
                impact_metrics: [],
                team_size: undefined,
                budget_managed: undefined
              }]
          ) : [],
        // Legacy fields for backward compatibility
        skills: result.data?.skills || [],
        experience_summary: Array.isArray(result.data?.experience) 
          ? result.data.experience[0] || '' 
          : result.data?.experience || '',
        education_summary: result.data?.education || '',
        languages: result.data?.languages || [],
        // Additional fields
        summary: result.data?.summary,
        yearsOfExperience: result.data?.yearsOfExperience,
        currentRole: result.data?.currentRole,
        location: result.data?.location
      },
      provider: result.provider,
      fallback: result.fallback,
      fallbackReason: result.fallbackReason,
      duration,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Smart Resume Parser error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to parse resume with smart parser',
        details: error instanceof Error ? error.message : 'Unknown error',
        provider: 'smart-parser',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
