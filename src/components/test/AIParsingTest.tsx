'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// AI parsing functions (will call API route)
const parseResumeWithAI = async (text: string) => {
  try {
    const response = await fetch('/api/parse-resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resumeText: text }),
    })

    if (!response.ok) {
      throw new Error('Failed to parse resume')
    }

    return await response.json()
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
}

const estimateParsingCost = (text: string) => {
  const tokens = text.split(' ').length * 1.3
  const inputCost = (tokens / 1000) * 0.00015
  const outputCost = (2000 / 1000) * 0.0006
  return inputCost + outputCost
}
import { Brain, DollarSign, Loader2 } from 'lucide-react'

export function AIParsingTest() {
  const [sampleText, setSampleText] = useState(`John Doe
Software Engineer
john.doe@email.com | (555) 123-4567 | linkedin.com/in/johndoe

SUMMARY
Experienced software engineer with 5+ years developing web applications using React, Node.js, and PostgreSQL. Led development teams and improved application performance by 40%.

SKILLS
Programming Languages: JavaScript, Python, TypeScript
Frameworks: React, Node.js, Express, Django
Databases: PostgreSQL, MongoDB, Redis
Cloud Platforms: AWS, Azure
Tools: Git, Docker, Jenkins
Methodologies: Agile, Scrum, TDD

EXPERIENCE
Senior Software Engineer | TechCorp | 2021-Present
• Led team of 5 developers in building e-commerce platform
• Improved application performance by 40% through optimization
• Technologies: React, Node.js, PostgreSQL, AWS

Software Engineer | StartupXYZ | 2019-2021
• Developed REST APIs and frontend components
• Implemented CI/CD pipeline reducing deployment time by 60%
• Technologies: Python, Django, React, Docker

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2019
GPA: 3.8/4.0

CERTIFICATIONS
AWS Certified Developer Associate | Amazon Web Services | 2022
Certified Scrum Master | Scrum Alliance | 2021`)

  const [parsedData, setParsedData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cost, setCost] = useState<number | null>(null)

  const testParsing = async () => {
    if (!sampleText.trim()) {
      setError('Please enter some sample text')
      return
    }

    setLoading(true)
    setError('')
    setParsedData(null)
    setCost(null)

    try {
      // Estimate cost first
      const estimatedCost = estimateParsingCost(sampleText)
      setCost(estimatedCost)

      // Parse with AI
      const result = await parseResumeWithAI(sampleText)
      setParsedData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse resume')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Resume Parsing Test
          </CardTitle>
          <CardDescription>
            Test the ChatGPT API resume parsing functionality with sample text
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Sample Resume Text
            </label>
            <Textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="Paste or type sample resume text here..."
              rows={15}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button 
              onClick={testParsing} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              {loading ? 'Parsing...' : 'Parse with AI'}
            </Button>

            {cost && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                <span>Estimated cost: ${cost.toFixed(4)}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle>Parsed Results</CardTitle>
            <CardDescription>
              Structured data extracted by ChatGPT API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
