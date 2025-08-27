import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Log environment variables for debugging
    console.log('Environment check:')
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY)
    console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0)
    
    const { resumeText } = await request.json()

    if (!resumeText) {
      return NextResponse.json({ error: 'Resume text is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using cheaper model as fallback
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
          content: `Parse this resume and extract the structured information:\n\n${resumeText}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    const parsedData = JSON.parse(content)
    return NextResponse.json(parsedData)

  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // Check if it's an OpenAI API error
    if (error && typeof error === 'object' && 'status' in error) {
      console.error('OpenAI API status:', error.status)
      console.error('OpenAI API error details:', error)
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to parse resume with AI',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
