'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Resume {
  id: string
  file_url: string
  parsed_text: string
  skills: string[]
  created_at: string
}

export function ResumeUpload() {
  const { user } = useAuth()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch existing resumes
  const fetchResumes = useCallback(async () => {
    if (!user || !supabase) return

    try {
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
    }
  }, [user])

  // Handle file upload
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || !supabase) return

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      for (const file of acceptedFiles) {
        // Upload file to Supabase Storage
        const fileName = `${user.id}/${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('resumes')
          .getPublicUrl(fileName)

        // Parse text from file (simplified - in Phase 3 we'll use AI)
        setParsing(true)
        const parsedText = await parseFileText(file)
        setParsing(false)

        // Extract basic skills (simplified - in Phase 3 we'll use AI)
        const skills = extractBasicSkills()

        // Save to database
        const { error: dbError } = await supabase
          .from('resumes')
          .insert([
            {
              user_id: user.id,
              file_url: urlData.publicUrl,
              parsed_text: parsedText,
              skills,
            },
          ])

        if (dbError) throw dbError

        setSuccess(`Resume "${file.name}" uploaded successfully!`)
        fetchResumes() // Refresh the list
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [user, fetchResumes])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: false,
  })

  // Simple text parsing (placeholder for Phase 3 AI)
  const parseFileText = async (file: File): Promise<string> => {
    // For now, return a placeholder
    // In Phase 3, we'll use AI to extract actual text
    return `Resume content for ${file.name} - This will be parsed with AI in Phase 3`
  }

  // Basic skill extraction (placeholder for Phase 3 AI)
  const extractBasicSkills = (): string[] => {
    // For now, return placeholder skills
    // In Phase 3, we'll use AI to extract actual skills
    return ['JavaScript', 'React', 'Node.js', 'TypeScript']
  }

  // Delete resume
  const deleteResume = async (resumeId: string) => {
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId)

      if (error) throw error

      setSuccess('Resume deleted successfully!')
      fetchResumes() // Refresh the list
    } catch (err) {
      console.error('Delete error:', err)
      setError('Failed to delete resume')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Resume</CardTitle>
          <CardDescription>
            Upload your resume to get matched with relevant job opportunities
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
            {uploading ? (
              <div className="space-y-2">
                <div className="text-blue-600 font-medium">Uploading...</div>
                {parsing && <div className="text-sm text-gray-600">Parsing resume...</div>}
              </div>
            ) : isDragActive ? (
              <p className="text-blue-600 font-medium">Drop your resume here...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-600">
                  Drag & drop your resume here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, DOC, and DOCX files
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-700">
              {success}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resume List */}
      {resumes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Resumes</CardTitle>
            <CardDescription>
              Manage your uploaded resumes
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
                    <div className="font-medium">Resume</div>
                    <div className="text-sm text-gray-600">
                      Uploaded: {new Date(resume.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Skills: {resume.skills.join(', ')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(resume.file_url, '_blank')}
                    >
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteResume(resume.id)}
                    >
                      Delete
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
