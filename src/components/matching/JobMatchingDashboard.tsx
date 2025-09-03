'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  Star, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Filter
} from 'lucide-react'
import { 
  findMatchingJobsForCandidate, 
  JobMatch,
  calculateJobMatch 
} from '@/lib/matchingAlgorithm'

interface JobMatchDisplay extends JobMatch {
  job_title?: string
  company_name?: string
  location?: string
  salary_range?: string
  job_type?: string
  remote_work?: boolean
}

export function JobMatchingDashboard() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<JobMatchDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [minScore, setMinScore] = useState(70)

  useEffect(() => {
    if (user) {
      loadMatches()
    }
  }, [user, minScore])

  const loadMatches = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      const jobMatches = await findMatchingJobsForCandidate(user.id, 50, minScore)
      
      // Enrich matches with job details (you'll need to fetch these from your jobs table)
      const enrichedMatches = await Promise.all(
        jobMatches.map(async (match) => {
          try {
            // For now, we'll use placeholder data
            // In a real app, you'd fetch job details from your database
            return {
              ...match,
              job_title: `Software Engineer ${match.overall_match_score >= 85 ? '(Perfect Match!)' : ''}`,
              company_name: 'Tech Company',
              location: 'Remote / Toronto',
              salary_range: '$80K - $120K',
              job_type: 'Full-time',
              remote_work: true
            }
          } catch (error) {
            console.warn('Failed to enrich match:', error)
            return match
          }
        })
      )
      
      setMatches(enrichedMatches)
    } catch (err) {
      console.error('Error loading matches:', err)
      setError('Failed to load job matches. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getMatchQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-blue-100 text-blue-800'
      case 'fair': return 'bg-yellow-100 text-yellow-800'
      case 'poor': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filterMatches = (tab: string) => {
    switch (tab) {
      case 'excellent':
        return matches.filter(m => m.match_quality === 'excellent')
      case 'good':
        return matches.filter(m => m.match_quality === 'good')
      case 'fair':
        return matches.filter(m => m.match_quality === 'fair')
      case 'poor':
        return matches.filter(m => m.match_quality === 'poor')
      default:
        return matches
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Finding your perfect job matches...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <XCircle className="h-12 w-12 mx-auto mb-4" />
            <p>{error}</p>
            <Button onClick={loadMatches} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const filteredMatches = filterMatches(activeTab)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Job Matches</h2>
          <p className="text-gray-600">
            We found {matches.length} jobs that match your profile
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Min Score:</span>
            <select 
              value={minScore} 
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={50}>50%</option>
              <option value={60}>60%</option>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
              <option value={90}>90%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Match Quality Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {matches.filter(m => m.match_quality === 'excellent').length}
                </p>
                <p className="text-sm text-gray-600">Excellent Matches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {matches.filter(m => m.match_quality === 'good').length}
                </p>
                <p className="text-sm text-gray-600">Good Matches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {matches.filter(m => m.match_quality === 'fair').length}
                </p>
                <p className="text-sm text-gray-600">Fair Matches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {matches.filter(m => m.match_quality === 'poor').length}
                </p>
                <p className="text-sm text-gray-600">Poor Matches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matches Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({matches.length})</TabsTrigger>
          <TabsTrigger value="excellent">
            Excellent ({matches.filter(m => m.match_quality === 'excellent').length})
          </TabsTrigger>
          <TabsTrigger value="good">
            Good ({matches.filter(m => m.match_quality === 'good').length})
          </TabsTrigger>
          <TabsTrigger value="fair">
            Fair ({matches.filter(m => m.match_quality === 'fair').length})
          </TabsTrigger>
          <TabsTrigger value="poor">
            Poor ({matches.filter(m => m.match_quality === 'poor').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredMatches.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-4" />
                  <p>No {activeTab === 'all' ? '' : activeTab} matches found.</p>
                  <p className="text-sm">Try lowering the minimum score or updating your profile.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredMatches.map((match) => (
              <Card key={`${match.job_id}-${match.candidate_id}`} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold">{match.job_title}</h3>
                        <Badge variant="outline" className={getMatchQualityColor(match.match_quality)}>
                          {match.match_quality}
                        </Badge>
                      </div>
                      <p className="text-gray-600">{match.company_name}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(match.overall_match_score)}`}>
                        {match.overall_match_score}%
                      </div>
                      <p className="text-sm text-gray-500">Match Score</p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Job Details */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Job Details</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{match.location}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span>{match.salary_range}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{match.job_type}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          <span>{match.remote_work ? 'Remote Available' : 'On-site Required'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Match Breakdown */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Match Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Skills</span>
                          <span className={getScoreColor(match.skill_match_score)}>
                            {match.skill_match_score}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Experience</span>
                          <span className={getScoreColor(match.experience_match_score)}>
                            {match.experience_match_score}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Education</span>
                          <span className={getScoreColor(match.education_match_score)}>
                            {match.education_match_score}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Location</span>
                          <span className={getScoreColor(match.location_match_score)}>
                            {match.location_match_score}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Skills Analysis */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="font-medium text-gray-900 mb-3">Skills Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">✅ Matched Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {match.matched_skills.length > 0 ? (
                            match.matched_skills.map((skill, index) => (
                              <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No skills matched</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">❌ Missing Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {match.missing_skills.length > 0 ? (
                            match.missing_skills.map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-red-600">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-green-600">All required skills met! 🎉</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      {match.experience_gap > 0 ? (
                        <span className="text-yellow-600">
                          ⚠️ You need {match.experience_gap} more years of experience
                        </span>
                      ) : match.experience_gap < 0 ? (
                        <span className="text-green-600">
                          ✅ You have {Math.abs(match.experience_gap)} extra years of experience
                        </span>
                      ) : (
                        <span className="text-green-600">✅ Experience level matches perfectly</span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button size="sm">
                        Apply Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
