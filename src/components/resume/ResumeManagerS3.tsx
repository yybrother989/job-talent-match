'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// import { Progress } from '@/components/ui/progress' // Component doesn't exist
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, Trash2 } from 'lucide-react'
import { extractTextFromFile } from '@/lib/textExtractionOCR'
import { estimateTextQuality } from '@/lib/textExtractionOCR'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const parseResumeWithOpenAI = async (text: string) => {
  try {
    const response = await fetch('/api/parse-resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resumeText: text }),
    })

    if (!response.ok) {
      throw new Error('Failed to parse resume with OpenAI')
    }

    return await response.json()
  } catch (error) {
    console.error('OpenAI API call failed:', error)
    throw error
  }
}

const parseResumeWithAWS = async (text: string) => {
  try {
    const response = await fetch('/api/parse-resume-smart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resumeText: text }),
    })

    if (!response.ok) {
      throw new Error('Failed to parse resume with smart parser')
    }

    return await response.json()
  } catch (error) {
    console.error('Smart parser API call failed:', error)
    throw error
  }
}

const estimateParsingCost = async (text: string): Promise<number> => {
  const { estimateParsingCost: costFn } = await import('@/lib/openai')
  return costFn(text)
}

interface Resume {
  id: string
  user_id: string
  title: string
  file_url: string
  file_name: string
  file_size: number
  file_type: string
  parsed_text: string
  skills: string[]
  created_at: string
}

export function ResumeManagerS3() {
  const { user } = useAuth()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false)
  const [hasAWSKey, setHasAWSKey] = useState(false)

  // Check AI provider availability
  useEffect(() => {
    async function checkProviders() {
      try {
        // Check OpenAI
        const openaiResponse = await fetch('/api/test-openai')
        const openaiData = await openaiResponse.json()
        setHasOpenAIKey(openaiData.success)
      } catch {
        setHasOpenAIKey(false)
      }

      try {
        // Check AWS
        const awsResponse = await fetch('/api/test-aws')
        const awsData = await awsResponse.json()
        setHasAWSKey(awsData.awsConfigured)
      } catch {
        setHasAWSKey(false)
      }
    }

    checkProviders()
  }, [])

  const fetchResumes = async () => {
    if (!user || !supabase) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setResumes(data || [])
    } catch (err) {
      console.error('Error fetching resumes:', err)
      setError('Failed to load resumes')
    } finally {
      setLoading(false)
    }
  }

  // Load user resumes
  useEffect(() => {
    if (user) {
      fetchResumes()
    }
  }, [user])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || !supabase) return

    // Declare variables at function scope
    let aiParsedData: any = null
    let aiProvider: string = 'basic extraction'
    let parsingCost: number = 0

    try {
      setUploading(true)
      setUploadProgress('Starting upload process...')
      setError('')
      setSuccess('')

      for (const file of acceptedFiles) {
        // Validate file type
        if (!file.type.includes('pdf') && !file.type.includes('doc') && !file.type.includes('docx')) {
          setError('Only PDF, DOC, and DOCX files are allowed')
          return
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          setError('File size must be less than 5MB')
          return
        }

        console.log('=== S3 UPLOAD DEBUG ===')
        console.log('File:', file.name, 'Size:', file.size, 'Type:', file.type)

        setUploadProgress('Uploading file to S3...')
        // Upload to S3
        const s3Result = await fetch('/api/upload-s3', {
          method: 'POST',
          body: (() => {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('bucketName', 'job-talent-match-documents')
            formData.append('key', `resumes/${user.id}/${Date.now()}-${file.name}`)
            return formData
          })(),
        })

        if (!s3Result.ok) {
          const errorData = await s3Result.json()
          throw new Error(`S3 upload failed: ${errorData.error}`)
        }

        const s3Data = await s3Result.json()
        console.log('S3 upload successful:', s3Data.url)

        setUploadProgress('S3 upload complete! Extracting text from document...')
        // Extract text from file
        let parsedText = ''
        
        try {
          console.log('=== TEXT EXTRACTION DEBUG ===')
          console.log('File type:', file.type)
          console.log('File size:', file.size)
          
          parsedText = await extractTextFromFile(file)
          console.log('Extracted text length:', parsedText ? parsedText.length : 0)
          
          // Estimate text quality
          const textQuality = await estimateTextQuality(parsedText)
          console.log('Text quality score:', textQuality)
          
          // Use AI parsing if text quality is good enough
          if (textQuality > 40 && parsedText.length > 100) {
            console.log('Text quality good, attempting AI parsing...')
            setUploadProgress('Text extracted! Analyzing with AI...')
            try {
              if (hasAWSKey) {
                console.log('Using AWS Bedrock for AI parsing...')
                setUploadProgress('Using AWS Bedrock AI to parse resume...')
                aiParsedData = await parseResumeWithAWS(parsedText)
                aiProvider = 'aws-bedrock'
                console.log('AWS Bedrock parsing successful!')
              } else if (hasOpenAIKey) {
                console.log('Using OpenAI for AI parsing...')
                setUploadProgress('Using OpenAI to parse resume...')
                aiParsedData = await parseResumeWithOpenAI(parsedText)
                aiProvider = 'openai'
                parsingCost = await estimateParsingCost(parsedText)
                console.log('OpenAI parsing successful! Cost estimate:', parsingCost)
              } else {
                console.log('No AI provider available, using basic extraction')
                setUploadProgress('No AI provider available, using basic extraction...')
              }
            } catch (aiError) {
              console.warn('AI parsing failed, using basic text extraction:', aiError)
              // Continue with basic text extraction
            }
          } else {
            console.log('Text quality too low, using basic extraction')
            console.log('Text length:', parsedText.length)
            console.log('Quality threshold not met:', textQuality <= 40)
            setUploadProgress('Text quality low, using basic extraction...')
          }
        } catch (textError) {
          console.error('Text extraction failed completely:', textError)
          console.error('Error details:', textError instanceof Error ? textError.message : String(textError))
          
          // Fallback: Try basic text extraction from file name and type
          console.log('Attempting fallback text extraction...')
          setUploadProgress('Text extraction failed, using fallback method...')
          parsedText = `Resume: ${file.name}\nFile Type: ${file.type}\nFile Size: ${file.size} bytes\n\nText extraction failed. Please ensure the file contains extractable text.`
          console.log('Fallback text created:', parsedText)
        }

        // Create resume record in database with AI parsing data
        // Note: Adding all required fields based on database constraints
        const resumeData = {
          user_id: user.id,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension for title
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_url: s3Data.url, // Use S3 URL instead of Supabase URL
          parsed_text: parsedText,
          skills: aiParsedData?.data?.skills || [],
        }

        console.log('=== AI PARSING DEBUG ===')
        console.log('AI Parsed Data:', aiParsedData)
        console.log('AI Provider:', aiProvider)
        console.log('Technical Skills:', aiParsedData?.data?.technical_skills)
        console.log('Education:', aiParsedData?.data?.education)
        console.log('Certifications:', aiParsedData?.data?.certifications)
        console.log('Experience Details:', aiParsedData?.data?.experience_details)
        console.log('Resume Data to insert:', JSON.stringify(resumeData, null, 2))

        setUploadProgress('Saving resume data to PostgreSQL...')
        // Store in Supabase PostgreSQL (for backward compatibility)
        const { error: dbError } = await supabase
          .from('resumes')
          .insert([resumeData])

        if (dbError) {
          console.error('Supabase database error:', dbError)
          throw new Error(`Database error: ${dbError.message}`)
        }

        setUploadProgress('Saving resume data to DynamoDB...')
        // Also store in DynamoDB
        console.log('Storing resume data in DynamoDB...')
        try {
          const dynamoResponse = await fetch('/api/store-resume-dynamodb', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              resumeId: `resume-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: resumeData.title,
              fileName: resumeData.file_name,
              fileSize: resumeData.file_size,
              fileType: resumeData.file_type,
              s3Url: s3Data.url,
              s3Key: s3Data.key,
              parsedText: parsedText,
              aiParsedData: aiParsedData,
              aiProvider: aiProvider,
              skills: resumeData.skills,
              technicalSkills: aiParsedData?.data?.technical_skills || {},
              education: aiParsedData?.data?.education || [],
              certifications: aiParsedData?.data?.certifications || [],
              experienceDetails: aiParsedData?.data?.experience_details || [],
            }),
          })

          if (!dynamoResponse.ok) {
            const errorData = await dynamoResponse.json()
            console.warn('DynamoDB storage failed:', errorData.error)
            // Don't throw error - continue with Supabase storage
          } else {
            const dynamoData = await dynamoResponse.json()
            console.log('DynamoDB storage successful:', dynamoData.resumeId)
            setUploadProgress('DynamoDB storage complete!')
          }
        } catch (dynamoError) {
          console.warn('DynamoDB storage error:', dynamoError)
          setUploadProgress('DynamoDB storage failed, but PostgreSQL saved successfully')
          // Don't throw error - continue with Supabase storage
        }
      }

      const providerName = aiProvider === 'aws-bedrock' ? 'AWS Bedrock' : aiProvider === 'openai' ? 'OpenAI' : 'basic extraction'
      setUploadProgress('') // Clear progress message
      setSuccess(`Resume uploaded to S3, parsed with ${providerName}, and stored in both PostgreSQL and DynamoDB! AI extracted ${aiParsedData?.data?.skills?.length || 0} skills.`)
      await fetchResumes()
    } catch (err) {
      console.error('Error uploading resume:', err)
      console.error('Error type:', typeof err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      
      let errorMessage = 'Failed to upload resume'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'object' && err !== null) {
        errorMessage = JSON.stringify(err)
      }
      
      setError(errorMessage)
    } finally {
      setUploading(false)
      setUploadProgress('') // Clear progress message
    }
  }, [user, resumes.length, hasOpenAIKey, hasAWSKey])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
  })

  const deleteResume = async (id: string) => {
    if (!user || !supabase) return

    try {
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      setSuccess('Resume deleted successfully')
      await fetchResumes()
    } catch (err) {
      console.error('Error deleting resume:', err)
      setError('Failed to delete resume')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading resumes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Resume to S3
          </CardTitle>
          <CardDescription>
            Upload your resume to AWS S3 and get AI-powered parsing with skills extraction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume here'}
            </p>
            <p className="text-gray-500 mb-4">
              or click to select a file (PDF, DOC, DOCX - max 5MB)
            </p>
            <Button variant="outline" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Select File'}
            </Button>
          </div>

          {/* AI Provider Status */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <Badge variant={hasAWSKey ? 'default' : 'secondary'}>
              AWS Bedrock: {hasAWSKey ? 'Available' : 'Not Configured'}
            </Badge>
            <Badge variant={hasOpenAIKey ? 'default' : 'secondary'}>
              OpenAI: {hasOpenAIKey ? 'Available' : 'Not Configured'}
            </Badge>
          </div>

          {/* Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse"></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {uploadProgress || 'Uploading to S3 and processing...'}
              </p>
            </div>
          )}

          {/* Messages */}
          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resumes List */}
      {resumes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Resumes ({resumes.length})
            </CardTitle>
            <CardDescription>
              Resumes stored in S3 with AI-extracted skills and information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{resume.title}</h3>
                    <p className="text-sm text-gray-500">
                      {resume.file_name} • {(resume.file_size / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-sm text-gray-500">
                      Skills: {resume.skills.length} extracted
                    </p>
                    <p className="text-xs text-gray-400">
                      Uploaded: {new Date(resume.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(resume.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteResume(resume.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
