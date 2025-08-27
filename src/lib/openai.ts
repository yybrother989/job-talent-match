import OpenAI from 'openai'

// Check if OpenAI API key is available
const hasOpenAIKey = !!process.env.OPENAI_API_KEY

export const openai = hasOpenAIKey ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
}) : null

// Resume parsing function using ChatGPT API
export const parseResumeWithAI = async (resumeText: string) => {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.')
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using GPT-4o-mini for cost efficiency
      messages: [
        {
          role: "system",
          content: `You are an expert resume parser. Extract structured information from resume text and return it as valid JSON. 
          
          Focus on extracting:
          - Technical skills (programming languages, frameworks, tools, databases, cloud platforms)
          - Soft skills (leadership, communication, teamwork, etc.)
          - Education details (degree, field, institution, graduation year)
          - Certifications (name, issuer, date, level)
          - Experience details (companies, titles, durations, achievements, technologies used)
          - Domain knowledge (industry-specific expertise)
          
          Return ONLY valid JSON with this structure:
          {
            "technical_skills": {
              "programming_languages": ["JavaScript", "Python"],
              "frameworks": ["React", "Node.js"],
              "databases": ["PostgreSQL", "MongoDB"],
              "cloud_platforms": ["AWS", "Azure"],
              "tools": ["Git", "Docker"],
              "methodologies": ["Agile", "Scrum"]
            },
            "soft_skills": ["Leadership", "Communication"],
            "education": [
              {
                "degree": "Bachelor of Science",
                "field_of_study": "Computer Science",
                "institution": "University Name",
                "graduation_year": 2020
              }
            ],
            "certifications": [
              {
                "name": "AWS Certified Developer",
                "issuing_organization": "Amazon Web Services",
                "issue_date": "2023-01-15",
                "level": "Associate"
              }
            ],
            "experience_details": [
              {
                "company": "Tech Company",
                "title": "Software Engineer",
                "start_date": "2020-06-01",
                "end_date": "2023-01-01",
                "description": "Developed web applications using React and Node.js",
                "key_achievements": ["Led team of 5 developers", "Improved performance by 40%"],
                "technologies_used": ["React", "Node.js", "PostgreSQL"],
                "impact_metrics": ["Reduced load time by 40%", "Increased user engagement by 25%"]
              }
            ],
            "domain_knowledge": ["E-commerce", "FinTech"],
            "parsing_confidence": 0.95
          }`
        },
        {
          role: "user",
          content: `Parse this resume and extract the structured information:\n\n${resumeText}`
        }
      ],
      temperature: 0.1, // Low temperature for consistent parsing
      max_tokens: 2000,
      response_format: { type: "json_object" } // Ensure JSON response
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    // Parse the JSON response
    const parsedData = JSON.parse(content)
    
    // Validate and clean the data
    return validateAndCleanParsedData(parsedData)
    
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error('Failed to parse resume with AI')
  }
}

// Validate and clean the parsed data
const validateAndCleanParsedData = (data: any) => {
  const cleaned = {
    technical_skills: {
      programming_languages: Array.isArray(data.technical_skills?.programming_languages) 
        ? data.technical_skills.programming_languages.filter(Boolean) : [],
      frameworks: Array.isArray(data.technical_skills?.frameworks) 
        ? data.technical_skills.frameworks.filter(Boolean) : [],
      databases: Array.isArray(data.technical_skills?.databases) 
        ? data.technical_skills.databases.filter(Boolean) : [],
      cloud_platforms: Array.isArray(data.technical_skills?.cloud_platforms) 
        ? data.technical_skills.cloud_platforms.filter(Boolean) : [],
      tools: Array.isArray(data.technical_skills?.tools) 
        ? data.technical_skills.tools.filter(Boolean) : [],
      methodologies: Array.isArray(data.technical_skills?.methodologies) 
        ? data.technical_skills.methodologies.filter(Boolean) : []
    },
    soft_skills: Array.isArray(data.soft_skills) ? data.soft_skills.filter(Boolean) : [],
    education: Array.isArray(data.education) ? data.education.map((edu: any) => ({
      degree: edu.degree || '',
      field_of_study: edu.field_of_study || '',
      institution: edu.institution || '',
      graduation_year: parseInt(edu.graduation_year) || null
    })) : [],
    certifications: Array.isArray(data.certifications) ? data.certifications.map((cert: any) => ({
      name: cert.name || '',
      issuing_organization: cert.issuing_organization || '',
      issue_date: cert.issue_date || null,
      level: cert.level || ''
    })) : [],
    experience_details: Array.isArray(data.experience_details) ? data.experience_details.map((exp: any) => ({
      company: exp.company || '',
      title: exp.title || '',
      start_date: exp.start_date || null,
      end_date: exp.end_date || null,
      description: exp.description || '',
      key_achievements: Array.isArray(exp.key_achievements) ? exp.key_achievements.filter(Boolean) : [],
      technologies_used: Array.isArray(exp.technologies_used) ? exp.technologies_used.filter(Boolean) : [],
      impact_metrics: Array.isArray(exp.impact_metrics) ? exp.impact_metrics.filter(Boolean) : []
    })) : [],
    domain_knowledge: Array.isArray(data.domain_knowledge) ? data.domain_knowledge.filter(Boolean) : [],
    parsing_confidence: typeof data.parsing_confidence === 'number' ? data.parsing_confidence : 0.8
  }

  return cleaned
}

// Cost estimation helper
export const estimateParsingCost = (resumeText: string) => {
  const tokens = resumeText.split(' ').length * 1.3 // Rough token estimation
  const inputCost = (tokens / 1000) * 0.00015 // GPT-4o-mini input cost
  const outputCost = (2000 / 1000) * 0.0006 // GPT-4o-mini output cost (max tokens)
  return inputCost + outputCost
}
