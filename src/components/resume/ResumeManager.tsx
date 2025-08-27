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

import { Trash2, Download, Edit, Eye, Upload, FileText, Star } from 'lucide-react'

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
  experience_summary: string
  education_summary: string
  certifications: string[]
  languages: string[]
  is_primary: boolean
  is_public: boolean
  created_at: string
  updated_at: string
}

export function ResumeManager() {
  const { user } = useAuth()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [editingResume, setEditingResume] = useState<Resume | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state for editing
  const [editForm, setEditForm] = useState({
    title: '',
    experience_summary: '',
    education_summary: '',
    skills: [] as string[],
    certifications: [] as string[],
    languages: [] as string[],
    is_primary: false,
    is_public: true,
  })

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

        // Create resume record in database
        const { error: dbError } = await supabase
          .from('resumes')
          .insert([{
            user_id: user.id,
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
            file_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            parsed_text: '', // Will be populated later with AI parsing
            skills: [],
            experience_summary: '',
            education_summary: '',
            certifications: [],
            languages: [],
            is_primary: resumes.length === 0, // First resume is primary
            is_public: true,
          }])

        if (dbError) throw dbError
      }

      setSuccess('Resume uploaded successfully!')
      await fetchResumes()
    } catch (err) {
      console.error('Error uploading resume:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload resume')
    } finally {
      setUploading(false)
    }
  }, [user, resumes.length])

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
    const cert = prompt('Enter a certification:')
    if (cert && cert.trim()) {
      setEditForm({
        ...editForm,
        certifications: [...editForm.certifications, cert.trim()]
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
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Resume</CardTitle>
          <CardDescription>
            Upload your resume in PDF, DOC, or DOCX format (max 5MB)
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
              </div>
            )}
          </div>
          {uploading && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Uploading...</p>
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
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>File: {resume.file_name} ({formatFileSize(resume.file_size)})</p>
                        <p>Uploaded: {new Date(resume.created_at).toLocaleDateString()}</p>
                        {resume.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {resume.skills.map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
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
                      {cert}
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
