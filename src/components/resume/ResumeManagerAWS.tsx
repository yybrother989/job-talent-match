'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Download, Edit, Eye, Upload, FileText, Star, Brain, DollarSign, AlertTriangle, Zap, Cloud } from 'lucide-react'

// Import text extraction functions from OCR version (most reliable)
const extractTextFromFile = async (file: File): Promise<string> => {
  const { extractTextFromFile: extractFn } = await import('@/lib/textExtractionOCR')
  return extractFn(file)
}

const cleanExtractedText = async (text: string): Promise<string> => {
  const { cleanExtractedText: cleanFn } = await import('@/lib/textExtractionOCR')
  return cleanFn(text)
}

const estimateTextQuality = async (text: string): Promise<number> => {
  const { estimateTextQuality: qualityFn } = await import('@/lib/textExtractionOCR')
  return qualityFn(text)
}

// AI Parsing functions
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
  
  // AI Parsing Results
  parsed_text: string
  parsing_confidence: number
  last_parsed_at: string | null
  
  // Technical Skills (AI-extracted, structured)
  technical_skills: {
    programming_languages: string[]
    frameworks: string[]
    databases: string[]
    cloud_platforms: string[]
    tools: string[]
    methodologies: string[]
  } | null
  
  // Soft Skills (AI-extracted)
  soft_skills: string[]
  
  // Domain Knowledge (AI-extracted)
  domain_knowledge: string[]
  
  // Education Details (AI-extracted, structured)
  education: Array<{
    degree: string
    field_of_study: string
    institution: string
    graduation_year: number
    gpa?: number
    honors?: string[]
  }> | null
  
  // Certifications (AI-extracted, structured)
  certifications: Array<{
    name: string
    issuing_organization: string
    issue_date: string
    expiry_date?: string
    credential_id?: string
    level?: string
  }> | null
  
  // Experience Details (AI-extracted, structured)
  experience_details: Array<{
    company: string
    title: string
    start_date: string
    end_date?: string
    description: string
    key_achievements: string[]
    technologies_used: string[]
    impact_metrics: string[]
    team_size?: number
    budget_managed?: number
  }> | null
  
  // Legacy fields for backward compatibility
  skills: string[]
  experience_summary: string
  education_summary: string
  languages: string[]
  
  // Resume Metadata
  is_primary: boolean
  is_public: boolean
  version: string
  ai_parsing_status: 'pending' | 'completed' | 'failed' | 'not_attempted'
  ai_parsing_error: string | null
  ai_provider: 'openai' | 'aws-bedrock' | null
  
  created_at: string
  updated_at: string
}

export function ResumeManagerAWS() {
  const { user } = useAuth()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editingResume, setEditingResume] = useState<Resume | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [aiProvider, setAiProvider] = useState<'openai' | 'aws'>('aws')
  const [hasOpenAIKey, setHasOpenAIKey] = useState(true)
  const [hasAWSKey, setHasAWSKey] = useState(true)

  // Form state for editing
  const [editForm, setEditForm] = useState({
    title: '',
    experience_summary: '',
    education_summary: '',
    skills: [] as string[],
    certifications: [] as Array<{
      name: string
      issuing_organization: string
      issue_date: string
      level?: string
      credential_id?: string
      expiry_date?: string
    }>,
    languages: [] as string[],
    is_primary: false,
    is_public: true,
  })

  // Check AI provider availability
  useEffect(() => {
    const checkProviders = async () => {
      try {
        // Check OpenAI
        const openaiResponse = await fetch('/api/test-openai')
        setHasOpenAIKey(openaiResponse.ok)
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
        .order('is_primary', { ascending: false })
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
      setError('')
      setSuccess('')

      for (const file of acceptedFiles) {
        // Validate file type
        if (!file.type.includes('pdf') && !file.type.includes('doc') && !file.type.includes('docx')) {
          setError('Only PDF, DOC, and DOCX files are allowed')
          continue
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          setError('File size must be less than 5MB')
          continue
        }

        const fileName = `${user.id}/${Date.now()}-${file.name}`
        
        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('resumes')
          .getPublicUrl(fileName)

        // Extract text from file
        let parsedText = ''
        // Variables already declared at function scope
        
        try {
          console.log('=== TEXT EXTRACTION DEBUG ===')
          console.log('File type:', file.type)
          console.log('File size:', file.size)
          console.log('Starting text extraction...')
          
          // Extract raw text
          console.log('Calling extractTextFromFile...')
          const rawText = await extractTextFromFile(file)
          console.log('Raw text extracted:', rawText ? rawText.substring(0, 200) + '...' : 'NO TEXT')
          console.log('Raw text length:', rawText ? rawText.length : 0)
          
          parsedText = await cleanExtractedText(rawText)
          console.log('Cleaned text:', parsedText ? parsedText.substring(0, 200) + '...' : 'NO TEXT')
          console.log('Cleaned text length:', parsedText ? parsedText.length : 0)
          
          // Estimate text quality
          const textQuality = await estimateTextQuality(parsedText)
          console.log('Text quality score:', textQuality)
          
          // Use AI parsing if text quality is good enough
          if (textQuality > 40 && parsedText.length > 100) {
            console.log('Text quality good, attempting AI parsing...')
            try {
              if (aiProvider === 'aws' && hasAWSKey) {
                console.log('Using AWS Bedrock for AI parsing...')
                aiParsedData = await parseResumeWithAWS(parsedText)
                aiProvider = 'aws-bedrock'
                console.log('AWS Bedrock parsing successful!')
              } else if (aiProvider === 'openai' && hasOpenAIKey) {
                console.log('Using OpenAI for AI parsing...')
                aiParsedData = await parseResumeWithOpenAI(parsedText)
                aiProvider = 'openai'
                parsingCost = await estimateParsingCost(parsedText)
                console.log('OpenAI parsing successful! Cost estimate:', parsingCost)
              } else if (hasAWSKey) {
                console.log('Falling back to AWS Bedrock...')
                aiParsedData = await parseResumeWithAWS(parsedText)
                aiProvider = 'aws-bedrock'
                console.log('AWS Bedrock parsing successful!')
              } else if (hasOpenAIKey) {
                console.log('Falling back to OpenAI...')
                aiParsedData = await parseResumeWithOpenAI(parsedText)
                aiProvider = 'openai'
                parsingCost = await estimateParsingCost(parsedText)
                console.log('OpenAI parsing successful! Cost estimate:', parsingCost)
              } else {
                console.log('No AI provider available, using basic extraction')
              }
            } catch (aiError) {
              console.warn('AI parsing failed, using basic text extraction:', aiError)
              // Continue with basic text extraction
            }
          } else {
            console.log('Text quality too low, using basic extraction')
            console.log('Text length:', parsedText.length)
            console.log('Quality threshold not met:', textQuality <= 40)
          }
        } catch (textError) {
          console.error('Text extraction failed completely:', textError)
          console.error('Error details:', textError instanceof Error ? textError.message : String(textError))
          
          // Fallback: Try basic text extraction from file name and type
          console.log('Attempting fallback text extraction...')
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
          file_url: publicUrl,
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

        const { error: dbError } = await supabase
          .from('resumes')
          .insert([resumeData])

        if (dbError) {
          console.error('Database error:', dbError)
          throw new Error(`Database error: ${dbError.message}`)
        }
      }

      const providerName = aiProvider === 'aws' ? 'AWS Bedrock' : aiProvider === 'openai' ? 'OpenAI' : 'basic extraction'
      setSuccess(`Resume uploaded and parsed successfully using ${providerName}! AI extracted ${aiParsedData?.data?.skills?.length || 0} skills.`)
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
    }
  }, [user, resumes.length, aiProvider, hasOpenAIKey, hasAWSKey])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
  })

  const deleteResume = async (resumeId: string) => {
    if (!supabase) return

    try {
      // Get resume to delete file from storage
      const resume = resumes.find(r => r.id === resumeId)
      if (!resume) return

      // Delete from database first
      const { error: dbError } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId)

      if (dbError) throw dbError

      // Delete file from storage
      const fileName = resume.file_url.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('resumes')
          .remove([`${user?.id}/${fileName}`])
      }

      setSuccess('Resume deleted successfully!')
      await fetchResumes()
    } catch (err) {
      console.error('Error deleting resume:', err)
      setError('Failed to delete resume')
    }
  }

  const setPrimaryResume = async (resumeId: string) => {
    if (!supabase) return

    try {
      // Update all resumes to not primary
      await supabase
        .from('resumes')
        .update({ is_primary: false })
        .eq('user_id', user?.id)

      // Set selected resume as primary
      const { error } = await supabase
        .from('resumes')
        .update({ is_primary: true })
        .eq('id', resumeId)

      if (error) throw error

      setSuccess('Primary resume updated!')
      await fetchResumes()
    } catch (err) {
      console.error('Error updating primary resume:', err)
      setError('Failed to update primary resume')
    }
  }

  const startEditing = (resume: Resume) => {
    setEditingResume(resume)
    setEditForm({
      title: resume.title,
      experience_summary: resume.experience_summary || '',
      education_summary: resume.education_summary || '',
      skills: resume.skills || [],
      certifications: resume.certifications || [],
      languages: resume.languages || [],
      is_primary: resume.is_primary,
      is_public: resume.is_public,
    })
  }

  const saveEdit = async () => {
    if (!editingResume || !supabase) return

    try {
      const { error } = await supabase
        .from('resumes')
        .update(editForm)
        .eq('id', editingResume.id)

      if (error) throw error

      setSuccess('Resume updated successfully!')
      setEditingResume(null)
      await fetchResumes()
    } catch (err) {
      console.error('Error updating resume:', err)
      setError('Failed to update resume')
    }
  }

  const cancelEdit = () => {
    setEditingResume(null)
    setEditForm({
      title: '',
      experience_summary: '',
      education_summary: '',
      skills: [],
      certifications: [],
      languages: [],
      is_primary: false,
      is_public: true,
    })
  }

  const addSkill = () => {
    const skill = prompt('Enter a skill:')
    if (skill && skill.trim()) {
      setEditForm({
        ...editForm,
        skills: [...editForm.skills, skill.trim()]
      })
    }
  }

  const removeSkill = (index: number) => {
    setEditForm({
      ...editForm,
      skills: editForm.skills.filter((_, i) => i !== index)
    })
  }

  const addCertification = () => {
    const certName = prompt('Enter certification name:')
    if (certName && certName.trim()) {
      const issuingOrg = prompt('Enter issuing organization:') || ''
      const newCert = {
        name: certName.trim(),
        issuing_organization: issuingOrg,
        issue_date: new Date().toISOString().split('T')[0],
        level: undefined,
        credential_id: undefined,
        expiry_date: undefined
      }
      setEditForm({
        ...editForm,
        certifications: [...editForm.certifications, newCert]
      })
    }
  }

  const removeCertification = (index: number) => {
    setEditForm({
      ...editForm,
      certifications: editForm.certifications.filter((_, i) => i !== index)
    })
  }

  const addLanguage = () => {
    const lang = prompt('Enter a language:')
    if (lang && lang.trim()) {
      setEditForm({
        ...editForm,
        languages: [...editForm.languages, lang.trim()]
      })
    }
  }

  const removeLanguage = (index: number) => {
    setEditForm({
      ...editForm,
      languages: editForm.languages.filter((_, i) => i !== index)
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
      {/* AI Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>AI Processing Options</CardTitle>
          <CardDescription>
            Choose your preferred AI provider for resume parsing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
              aiProvider === 'aws' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`} onClick={() => setAiProvider('aws')}>
              <Cloud className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium">AWS Bedrock</div>
                <div className="text-sm text-gray-600">
                  {hasAWSKey ? '✅ Available' : '❌ Not configured'}
                </div>
              </div>
            </div>
            <div className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
              aiProvider === 'openai' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
            }`} onClick={() => setAiProvider('openai')}>
              <Zap className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">OpenAI GPT</div>
                <div className="text-sm text-gray-600">
                  {hasOpenAIKey ? '✅ Available' : '❌ Not configured'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Resume</CardTitle>
          <CardDescription>
            Upload your resume in PDF, DOC, or DOCX format (max 5MB)
          </CardDescription>
          {!hasOpenAIKey && !hasAWSKey && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>No AI providers configured. Basic text extraction will be used.</span>
            </div>
          )}
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
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Drop your resume here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag & drop your resume here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, DOC, DOCX up to 5MB
                </p>
                <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-blue-600">
                  <Brain className="h-4 w-4" />
                  <span>AI-powered parsing with {aiProvider === 'aws' ? 'AWS Bedrock' : 'OpenAI GPT'}</span>
                  {aiProvider === 'openai' && (
                    <>
                      <DollarSign className="h-4 w-4" />
                      <span>~$0.01 per resume</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          {uploading && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Uploading and processing...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumes List */}
      <Card>
        <CardHeader>
          <CardTitle>My Resumes</CardTitle>
          <CardDescription>
            Manage your uploaded resumes and set your primary one
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resumes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 mb-4" />
              <p>No resumes uploaded yet</p>
              <p className="text-sm">Upload your first resume to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className={`border rounded-lg p-4 ${
                    resume.is_primary ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{resume.title}</h3>
                        {resume.is_primary && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            <Star className="h-3 w-3 mr-1" />
                            Primary
                          </Badge>
                        )}
                        {!resume.is_public && (
                          <Badge variant="outline">Private</Badge>
                        )}
                        {resume.ai_provider && (
                          <Badge variant="outline" className={
                            resume.ai_provider === 'aws-bedrock' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }>
                            {resume.ai_provider === 'aws-bedrock' ? (
                              <>
                                <Cloud className="h-3 w-3 mr-1" />
                                AWS Bedrock
                              </>
                            ) : (
                              <>
                                <Zap className="h-3 w-3 mr-1" />
                                OpenAI
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>File: {resume.file_name} ({formatFileSize(resume.file_size)})</p>
                        <p>Uploaded: {new Date(resume.created_at).toLocaleDateString()}</p>
                        {resume.parsing_confidence > 0 && (
                          <p>AI Confidence: {(resume.parsing_confidence * 100).toFixed(1)}%</p>
                        )}
                        {resume.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {resume.skills.slice(0, 10).map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {resume.skills.length > 10 && (
                              <Badge variant="outline" className="text-xs">
                                +{resume.skills.length - 10} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(resume)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      {!resume.is_primary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPrimaryResume(resume.id)}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Set Primary
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(resume.file_url, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(resume.file_url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteResume(resume.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingResume && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Resume: {editingResume.title}</CardTitle>
            <CardDescription>
              Update resume details and metadata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Resume title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience_summary">Experience Summary</Label>
                <Textarea
                  id="experience_summary"
                  value={editForm.experience_summary}
                  onChange={(e) => setEditForm({ ...editForm, experience_summary: e.target.value })}
                  placeholder="Brief summary of your experience..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="education_summary">Education Summary</Label>
                <Textarea
                  id="education_summary"
                  value={editForm.education_summary}
                  onChange={(e) => setEditForm({ ...editForm, education_summary: e.target.value })}
                  placeholder="Brief summary of your education..."
                  rows={3}
                />
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Skills</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSkill}>
                    Add Skill
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editForm.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Certifications</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addCertification}>
                    Add Certification
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editForm.certifications.map((cert, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {cert.name}
                      {cert.issuing_organization && ` - ${cert.issuing_organization}`}
                      {cert.issue_date && ` - ${new Date(cert.issue_date).toLocaleDateString()}`}
                      {cert.expiry_date && ` - ${new Date(cert.expiry_date).toLocaleDateString()}`}
                      {cert.level && ` - ${cert.level}`}
                      {cert.credential_id && ` - ${cert.credential_id}`}
                      <button
                        type="button"
                        onClick={() => removeCertification(index)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Languages</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
                    Add Language
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editForm.languages.map((lang, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {lang}
                      <button
                        type="button"
                        onClick={() => removeLanguage(index)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={editForm.is_public}
                  onChange={(e) => setEditForm({ ...editForm, is_public: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="is_public">Make this resume public</Label>
              </div>

              <div className="flex gap-2">
                <Button type="button" onClick={saveEdit} className="flex-1">
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Error and Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
          {success}
        </div>
      )}
    </div>
  )
}
