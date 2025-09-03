'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { UserProfile } from '@/components/profile/UserProfile'
import { ResumeManager } from '@/components/resume/ResumeManager'
import { ResumeManagerS3 } from '@/components/resume/ResumeManagerS3'
import { JobMatchingDashboard } from '@/components/matching/JobMatchingDashboard'
import { AIParsingTest } from '@/components/test/AIParsingTest'
import { EmbeddingTest } from '@/components/test/EmbeddingTest'
import { EmbeddingManager } from '@/components/admin/EmbeddingManager'
import { ClientOnly } from '@/components/ClientOnly'
import { User, Briefcase, FileText, Settings, LogOut, Building2, Users, Brain, Star, Database } from 'lucide-react'

export function UserDashboard() {
  const { user, signOut, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to access your dashboard.</p>
        </div>
      </div>
    )
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // All users are job seekers now
  const isJobSeeker = user.user_metadata?.role === 'job_seeker'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Brave</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">{user.email}</span>
                <Badge variant="secondary">
                  Job Seeker
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="resumes" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Resumes</span>
            </TabsTrigger>
            <TabsTrigger value="matching" className="flex items-center space-x-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Job Matches</span>
            </TabsTrigger>
            <TabsTrigger value="ai-test" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">AI Test</span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Welcome Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Welcome back!
                  </CardTitle>
                  <CardDescription>
                    Manage your profile and resumes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Email</span>
                      <span className="text-sm font-medium">{user.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Role</span>
                      <Badge variant="secondary">
                        Job Seeker
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Member since</span>
                      <span className="text-sm font-medium">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Get started with these common tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('profile')}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Complete your profile
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActiveTab('resumes')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {isJobSeeker ? 'Upload resume' : 'View resumes'}
                    </Button>

                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coming Soon Features */}
            <Card>
              <CardHeader>
                <CardTitle>Coming Soon</CardTitle>
                <CardDescription>
                  Exciting features we&apos;re working on for Phase 3
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg bg-green-50">
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Star className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2">AI Job Matching ✅</h3>
                    <p className="text-sm text-gray-600">
                      Now available! Check the "Job Matches" tab
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Smart Applications</h3>
                    <p className="text-sm text-gray-600">
                      One-click applications with AI-powered resume optimization
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Analytics Dashboard</h3>
                    <p className="text-sm text-gray-600">
                      Track your application success and profile views
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <UserProfile />
          </TabsContent>

          {/* Resumes Tab */}
          <TabsContent value="resumes">
            <ClientOnly fallback={
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading resume manager...</p>
                </div>
              </div>
            }>
              <ResumeManagerS3 />
            </ClientOnly>
          </TabsContent>

          {/* Job Matching Tab */}
          <TabsContent value="matching">
            <ClientOnly fallback={
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading job matches...</p>
                </div>
              </div>
            }>
              <JobMatchingDashboard />
            </ClientOnly>
          </TabsContent>

          {/* AI Test Tab */}
          <TabsContent value="ai-test">
            <ClientOnly fallback={
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading AI test...</p>
                </div>
              </div>
            }>
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Integration Testing</h2>
                  <p className="text-gray-600">Test OpenAI resume parsing and Hugging Face embeddings</p>
                </div>
                
                <Tabs defaultValue="resume-parsing" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="resume-parsing">Resume Parsing (OpenAI)</TabsTrigger>
                    <TabsTrigger value="embeddings">Embeddings (Hugging Face)</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="resume-parsing" className="mt-6">
                    <AIParsingTest />
                  </TabsContent>
                  
                  <TabsContent value="embeddings" className="mt-6">
                    <EmbeddingTest />
                  </TabsContent>
                </Tabs>
              </div>
            </ClientOnly>
          </TabsContent>

          {/* Admin Tab */}
          <TabsContent value="admin">
            <ClientOnly fallback={
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading admin features...</p>
                </div>
              </div>
            }>
              <EmbeddingManager />
            </ClientOnly>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account preferences and security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Email Notifications</h3>
                      <p className="text-sm text-gray-600">Receive updates about your account</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Privacy Settings</h3>
                      <p className="text-sm text-gray-600">Control who can see your profile</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Delete Account</h3>
                      <p className="text-sm text-gray-600">Permanently remove your account and data</p>
                    </div>
                    <Button variant="destructive" size="sm">
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
