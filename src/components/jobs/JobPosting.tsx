'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface Job {
  id: string
  title: string
  description: string
  requirements: string[]
  created_at: string
}

export function JobPosting() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')

  // Fetch existing jobs
  const fetchJobs = useCallback(async () => {
    if (!user || !supabase) return

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('employer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (err) {
      console.error('Error fetching jobs:', err)
      setError('Failed to load jobs')
    }
  }, [user])

  // Handle job creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !supabase) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Parse requirements (comma-separated)
      const requirementsList = requirements
        .split(',')
        .map(req => req.trim())
        .filter(req => req.length > 0)

      // Create job in database
      const { error: dbError } = await supabase
        .from('jobs')
        .insert([
          {
            employer_id: user.id,
            title: title.trim(),
            description: description.trim(),
            requirements: requirementsList,
          },
        ])

      if (dbError) throw dbError

      setSuccess('Job posted successfully!')
      
      // Reset form
      setTitle('')
      setDescription('')
      setRequirements('')
      
      // Refresh job list
      fetchJobs()
    } catch (err) {
      console.error('Job creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create job')
    } finally {
      setLoading(false)
    }
  }

  // Delete job
  const deleteJob = async (jobId: string) => {
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)

      if (error) throw error

      setSuccess('Job deleted successfully!')
      fetchJobs() // Refresh the list
    } catch (err) {
      console.error('Delete error:', err)
      setError('Failed to delete job')
    }
  }

  // Edit job (placeholder for future enhancement)
  const editJob = (job: Job) => {
    // TODO: Implement edit functionality
    console.log('Edit job:', job)
  }

  return (
    <div className="space-y-6">
      {/* Job Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Post a New Job</CardTitle>
          <CardDescription>
            Create a job listing to find the perfect candidate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Senior React Developer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role, responsibilities, and what you&apos;re looking for..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Input
                id="requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="e.g., React, TypeScript, 3+ years experience (comma-separated)"
              />
              <p className="text-sm text-gray-500">
                Separate multiple requirements with commas
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Posting Job...' : 'Post Job'}
            </Button>
          </form>

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

      {/* Job List */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Job Listings</CardTitle>
            <CardDescription>
              Manage your posted jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <p className="text-gray-600 text-sm">
                        Posted: {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editJob(job)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteJob(job.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-gray-700">{job.description}</p>
                  </div>

                  {job.requirements.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Requirements:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {job.requirements.map((req, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
