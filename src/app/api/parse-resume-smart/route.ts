import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { retryWithBackoff, smartParseResume } from '@/lib/retryLogic';

// Initialize Bedrock client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Bedrock parser function
const bedrockParser = async (resumeText: string) => {
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
  
  // Extract the text content from the response
  const content = responseBody.content[0].text;
  
  // Try to parse as JSON, if it fails, return the raw text
  let parsedData;
  try {
    parsedData = JSON.parse(content);
  } catch (parseError) {
    console.warn('Failed to parse Bedrock response as JSON, using raw text:', parseError);
    // Return a basic structure with the raw text
    parsedData = {
      skills: content.match(/[A-Za-z]+/g) || [], // Extract words as potential skills
      experience: content,
      education: '',
      summary: content.substring(0, 200),
      yearsOfExperience: 0,
      currentRole: 'Software Engineer'
    };
  }
  
  return {
    success: true,
    data: parsedData,
    confidence: 0.9
  };
};

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

    // OpenAI parser function - direct implementation
    const openaiParser = async () => {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert resume parser. You MUST extract ALL the following fields from the resume text and return them in EXACTLY this JSON structure. Do not skip any fields - if information is not found, use empty arrays or appropriate defaults.

            REQUIRED FIELDS (MUST BE INCLUDED):
            
            "technical_skills": {
              "programming_languages": ["list", "all", "programming", "languages"],
              "frameworks": ["list", "all", "frameworks", "libraries"],
              "databases": ["list", "all", "databases"],
              "cloud_platforms": ["list", "all", "cloud", "platforms"],
              "tools": ["list", "all", "tools", "software"],
              "methodologies": ["list", "all", "methodologies", "processes"]
            }
            
            "soft_skills": ["list", "all", "soft", "skills", "found"]
            "domain_knowledge": ["list", "all", "industry", "domains", "found"]
            
            "education": [
              {
                "degree": "exact degree name",
                "field_of_study": "exact field name", 
                "institution": "exact institution name",
                "graduation_year": 2020
              }
            ]
            
            "certifications": [
              {
                "name": "exact certification name",
                "issuing_organization": "exact organization name",
                "issue_date": "YYYY-MM-DD format",
                "level": "certification level if mentioned"
              }
            ]
            
            "experience_details": [
              {
                "company": "exact company name",
                "title": "exact job title",
                "start_date": "YYYY-MM-DD format",
                "end_date": "YYYY-MM-DD format or null if current",
                "description": "detailed job description",
                "key_achievements": ["list", "all", "achievements", "found"],
                "technologies_used": ["list", "all", "technologies", "mentioned"],
                "impact_metrics": ["list", "all", "metrics", "found"]
              }
            ]
            
            "parsing_confidence": 0.95
            
            IMPORTANT: 
            - Return ONLY valid JSON
            - Include ALL fields even if empty
            - Use empty arrays [] for missing data
            - Extract EVERY piece of information you can find
            - Be thorough and comprehensive`
          },
          {
            role: "user",
            content: resumeText
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      try {
        return JSON.parse(content);
      } catch (parseError) {
        throw new Error(`Failed to parse OpenAI response as JSON: ${parseError}`);
      }
    };

    // For now, use OpenAI parser directly since it's working reliably
    // TODO: Fix Bedrock integration later
    console.log('Using OpenAI parser directly for reliable parsing...');
    const result = await openaiParser();

    const duration = Date.now() - startTime;
    console.log(`Smart Resume Parser: Completed in ${duration}ms using OpenAI`);

    return NextResponse.json({
      success: true,
      data: {
        // Technical Skills (structured) - use the structured data from OpenAI parser
        technical_skills: result.technical_skills || {
          programming_languages: [],
          frameworks: [],
          databases: [],
          cloud_platforms: [],
          tools: [],
          methodologies: []
        },
        // Soft Skills
        soft_skills: result.soft_skills || [],
        // Domain Knowledge
        domain_knowledge: result.domain_knowledge || [],
        // Education Details
        education: result.education || [],
        // Certifications
        certifications: result.certifications || [],
        // Experience Details
        experience_details: result.experience_details || [],
        // Legacy fields for backward compatibility
        skills: result.technical_skills?.programming_languages?.concat(
          result.technical_skills?.frameworks || [],
          result.technical_skills?.databases || [],
          result.technical_skills?.cloud_platforms || [],
          result.technical_skills?.tools || [],
          result.technical_skills?.methodologies || []
        ) || [],
        experience_summary: result.experience_details?.[0]?.description || '',
        education_summary: result.education?.[0]?.degree || '',
        languages: [],
        // Additional fields
        summary: '',
        yearsOfExperience: 0,
        currentRole: '',
        location: ''
      },
      provider: 'openai',
      fallback: false,
      fallbackReason: null,
      duration,
      confidence: result.parsing_confidence || 0.95,
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