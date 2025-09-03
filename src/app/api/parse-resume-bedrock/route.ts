import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockRateLimiter } from '@/lib/rateLimiter';

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

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
      const prompt = `Parse the following resume text and extract structured information. Return a JSON object with the following fields:
      - name: Full name
      - email: Email address
      - phone: Phone number
      - location: Location/address
      - summary: Professional summary
      - skills: Array of technical skills
      - experience: Array of work experience objects with company, title, duration, description
      - education: Array of education objects with degree, institution, year
      - languages: Array of languages
      - yearsOfExperience: Number of years of experience
      - currentRole: Current job title

      Resume text: ${resumeText}`;

      const command = new InvokeModelCommand({
        modelId: process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      return {
        success: true,
        data: JSON.parse(responseBody.content[0].text),
        confidence: 0.9
      };
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
          programming_languages: parsingResult.data.skills?.filter((skill: string) => 
            ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin'].includes(skill)
          ) || [],
          frameworks: parsingResult.data.skills?.filter((skill: string) => 
            ['React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel', 'Rails'].includes(skill)
          ) || [],
          databases: parsingResult.data.skills?.filter((skill: string) => 
            ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'SQLite'].includes(skill)
          ) || [],
          cloud_platforms: parsingResult.data.skills?.filter((skill: string) => 
            ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform'].includes(skill)
          ) || [],
          tools: parsingResult.data.skills?.filter((skill: string) => 
            ['Git', 'Jenkins', 'Jira', 'VS Code', 'IntelliJ', 'Figma', 'Slack'].includes(skill)
          ) || [],
          methodologies: parsingResult.data.skills?.filter((skill: string) => 
            ['Agile', 'Scrum', 'CI/CD', 'DevOps', 'Microservices', 'TDD', 'BDD'].includes(skill)
          ) || []
        },
        // Soft Skills
        soft_skills: parsingResult.data.skills?.filter((skill: string) => 
          ['Leadership', 'Communication', 'Teamwork', 'Problem Solving', 'Time Management', 'Adaptability'].includes(skill)
        ) || [],
        // Domain Knowledge
        domain_knowledge: parsingResult.data.skills?.filter((skill: string) => 
          ['Machine Learning', 'Data Science', 'Cybersecurity', 'Blockchain', 'IoT', 'Mobile Development'].includes(skill)
        ) || [],
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
        certifications: parsingResult.data.certifications ? parsingResult.data.certifications.map((cert: string) => ({
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
            ? parsingResult.data.experience.map((exp: string, index: number) => ({
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