'use client'

import { useAuth } from '@/contexts/AuthContext'
import { ResumeUpload } from '@/components/resume/ResumeUpload'
import { JobPosting } from '@/components/jobs/JobPosting'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function UserDashboard() {
  const { user, signOut } = useAuth()

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please sign in to access your dashboard.</p>
      </div>
    )
  }

  // Get user role from metadata or default to job_seeker
  const userRole = user.user_metadata?.role || 'job_seeker'
  const isJobSeeker = userRole === 'job_seeker'
  const isEmployer = userRole === 'employer'

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user.email}!
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={isJobSeeker ? 'default' : 'secondary'}>
                  {isJobSeeker ? 'Job Seeker' : 'Employer'}
                </Badge>
                <span className="text-gray-600">
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="grid gap-8">
          {isJobSeeker && (
            <>
              {/* Job Seeker Dashboard */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Seeker Dashboard</CardTitle>
                  <CardDescription>
                    Upload your resume and get matched with relevant job opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Quick Actions</h3>
                      <div className="space-y-3">
                        <Button className="w-full" variant="outline">
                          Browse Jobs
                        </Button>
                        <Button className="w-full" variant="outline">
                          View Matches
                        </Button>
                        <Button className="w-full" variant="outline">
                          Update Profile
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Your Stats</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">0</div>
                          <div className="text-sm text-blue-600">Resumes</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">0</div>
                          <div className="text-sm text-green-600">Job Matches</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resume Management */}
              <ResumeUpload />
            </>
          )}

          {isEmployer && (
            <>
              {/* Employer Dashboard */}
              <Card>
                <CardHeader>
                  <CardTitle>Employer Dashboard</CardTitle>
                  <CardDescription>
                    Post jobs and find the perfect candidates for your team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Quick Actions</h3>
                      <div className="space-y-3">
                        <Button className="w-full" variant="outline">
                          Browse Candidates
                        </Button>
                        <Button className="w-full" variant="outline">
                          View Applications
                        </Button>
                        <Button className="w-full" variant="outline">
                          Company Settings
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Your Stats</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">0</div>
                          <div className="text-sm text-blue-600">Active Jobs</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">0</div>
                          <div className="text-sm text-green-600">Total Applications</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Job Management */}
              <JobPosting />
            </>
          )}

          {/* Coming Soon Features */}
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Exciting features we're working on for Phase 3
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">🤖</div>
                  <h4 className="font-semibold">AI Matching</h4>
                  <p className="text-sm text-gray-600">
                    Intelligent job-resume matching with detailed explanations
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">📊</div>
                  <h4 className="font-semibold">Analytics</h4>
                  <p className="text-sm text-gray-600">
                    Detailed insights into your job search or hiring process
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">💬</div>
                  <h4 className="font-semibold">Messaging</h4>
                  <p className="text-sm text-gray-600">
                    Direct communication between job seekers and employers
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
