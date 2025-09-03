'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Database,
  Users,
  Briefcase
} from 'lucide-react'
import { 
  generateAllJobEmbeddings, 
  generateAllProfileEmbeddings,
  testEmbeddingGeneration 
} from '@/lib/embeddingUtils'

export function EmbeddingManager() {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalJobs: 0,
    jobsWithEmbeddings: 0,
    totalProfiles: 0,
    profilesWithEmbeddings: 0
  })
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    // This would fetch actual stats from your database
    // For now, using placeholder data
    setStats({
      totalJobs: 150,
      jobsWithEmbeddings: 45,
      totalProfiles: 89,
      profilesWithEmbeddings: 23
    })
  }

  const handleGenerateJobEmbeddings = async () => {
    setLoading(true)
    try {
      const result = await generateAllJobEmbeddings()
      setTestResult({
        type: 'jobs',
        success: true,
        data: result
      })
      await loadStats()
      setLastUpdate(new Date())
    } catch (error) {
      setTestResult({
        type: 'jobs',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateProfileEmbeddings = async () => {
    setLoading(true)
    try {
      const result = await generateAllProfileEmbeddings()
      setTestResult({
        type: 'profiles',
        success: true,
        data: result
      })
      await loadStats()
      setLastUpdate(new Date())
    } catch (error) {
      setTestResult({
        type: 'profiles',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTestEmbedding = async () => {
    setLoading(true)
    try {
      const result = await testEmbeddingGeneration()
      setTestResult({
        type: 'test',
        success: result.success,
        data: result
      })
    } catch (error) {
      setTestResult({
        type: 'test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const getJobEmbeddingProgress = () => {
    if (stats.totalJobs === 0) return 0
    return (stats.jobsWithEmbeddings / stats.totalJobs) * 100
  }

  const getProfileEmbeddingProgress = () => {
    if (stats.totalProfiles === 0) return 0
    return (stats.profilesWithEmbeddings / stats.totalProfiles) * 100
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Embedding Management</h2>
        <p className="text-gray-600">
          Manage Hugging Face embeddings for jobs and user profiles
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Jobs Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Jobs Embeddings
            </CardTitle>
            <CardDescription>
              Track embedding generation progress for job listings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{stats.jobsWithEmbeddings} / {stats.totalJobs}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${getJobEmbeddingProgress()}%` }}></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Coverage</span>
              <span>{Math.round(getJobEmbeddingProgress())}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Profiles Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              Profile Embeddings
            </CardTitle>
            <CardDescription>
              Track embedding generation progress for user profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{stats.profilesWithEmbeddings} / {stats.totalProfiles}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: `${getProfileEmbeddingProgress()}%` }}></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Coverage</span>
              <span>{Math.round(getProfileEmbeddingProgress())}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Embedding Actions
          </CardTitle>
          <CardDescription>
            Generate embeddings for jobs and profiles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handleGenerateJobEmbeddings}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Briefcase className="h-4 w-4" />
              <span>Generate Job Embeddings</span>
            </Button>
            
            <Button
              onClick={handleGenerateProfileEmbeddings}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>Generate Profile Embeddings</span>
            </Button>
            
            <Button
              onClick={handleTestEmbedding}
              disabled={loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Brain className="h-4 w-4" />
              <span>Test Embedding API</span>
            </Button>
          </div>
          
          {lastUpdate && (
            <div className="text-sm text-gray-600 text-center">
              Last updated: {lastUpdate.toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {testResult.type === 'test' ? 'API Test Results' : 
               testResult.type === 'jobs' ? 'Job Embedding Results' : 
               'Profile Embedding Results'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResult.success ? (
              <div className="space-y-3">
                {testResult.type === 'test' && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Embedding API is working correctly</span>
                  </div>
                )}
                
                {testResult.type === 'jobs' && testResult.data && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Successfully processed:</span>
                      <Badge variant="secondary">{testResult.data.success} jobs</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed:</span>
                      <Badge variant="destructive">{testResult.data.failed} jobs</Badge>
                    </div>
                  </div>
                )}
                
                {testResult.type === 'profiles' && testResult.data && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Successfully processed:</span>
                      <Badge variant="secondary">{testResult.data.success} profiles</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed:</span>
                      <Badge variant="destructive">{testResult.data.failed} profiles</Badge>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>Error: {testResult.error}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-purple-600" />
            About Embeddings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            • <strong>Model:</strong> all-MiniLM-L6-v2 (384 dimensions)
          </p>
          <p>
            • <strong>Purpose:</strong> Semantic similarity for job-candidate matching
          </p>
          <p>
            • <strong>Generation:</strong> Automatically triggered when content changes
          </p>
          <p>
            • <strong>Storage:</strong> Stored as vector(384) in PostgreSQL with pgvector
          </p>
          <p>
            • <strong>API:</strong> Hugging Face Inference API (rate limited)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

