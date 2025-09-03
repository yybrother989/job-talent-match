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
  TrendingUp,
  Filter,
  Search,
  Brain,
  Zap,
  Target,
  BarChart3
} from 'lucide-react'
import { 
  performHybridJobMatching, 
  HybridMatch 
} from '@/lib/hybridMatchingAlgorithm'

export function EnhancedJobMatchingDashboard() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<HybridMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [minScore, setMinScore] = useState(70)
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)

  useEffect(() => {
    if (user) {
      loadHybridMatches()
    }
  }, [user, minScore])

  const loadHybridMatches = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      console.log('Loading hybrid matches for user:', user.id)
      const hybridMatches = await performHybridJobMatching(user.id, 50, minScore)
      setMatches(hybridMatches)
      
    } catch (err) {
      console.error('Error loading hybrid matches:', err)
      setError('Failed to load job matches. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getMatchQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200'
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'poor': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.85) return 'text-green-600'
    if (score >= 0.70) return 'text-blue-600'
    if (score >= 0.50) return 'text-yellow-600'
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

  const calculateAverageScores = () => {
    if (matches.length === 0) return null
    
    const totals = matches.reduce((acc, match) => ({
      hybrid: acc.hybrid + match.final_score,
      bm25: acc.bm25 + match.bm25_normalized,
      cosine: acc.cosine + match.cosine_similarity,
      skillOverlap: acc.skillOverlap + match.skill_overlap,
      traditional: acc.traditional + (
        (match.skill_match_score * 0.35 +
         match.experience_match_score * 0.25 +
         match.education_match_score * 0.15 +
         match.location_match_score * 0.10 +
         match.salary_match_score * 0.05) / 100
      )
    }), { hybrid: 0, bm25: 0, cosine: 0, skillOverlap: 0, traditional: 0 })
    
    return {
      hybrid: totals.hybrid / matches.length,
      bm25: totals.bm25 / matches.length,
      cosine: totals.cosine / matches.length,
      skillOverlap: totals.skillOverlap / matches.length,
      traditional: totals.traditional / matches.length
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing your profile with AI-powered matching...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button onClick={loadHybridMatches} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const filteredMatches = filterMatches(activeTab)
  const averageScores = calculateAverageScores()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI-Powered Job Matches</h2>
          <p className="text-gray-600">
            Hybrid matching combining semantic search, lexical analysis, and traditional scoring
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant={showScoreBreakdown ? "default" : "outline"}
            onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
            className="flex items-center space-x-2"
          >
            <BarChart3 className="h-4 w-4" />
            {showScoreBreakdown ? 'Hide' : 'Show'} Score Breakdown
          </Button>
          
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

      {/* Hybrid Scoring Overview */}
      {averageScores && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Hybrid Scoring Overview
            </CardTitle>
            <CardDescription>
              Average scores across all matches showing the effectiveness of each approach
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(averageScores.hybrid * 100)}%
                </div>
                <p className="text-sm text-gray-600">Final Score</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${averageScores.hybrid * 100}%` }}></div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(averageScores.bm25 * 100)}%
                </div>
                <p className="text-sm text-gray-600">Lexical (BM25)</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${averageScores.bm25 * 100}%` }}></div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(averageScores.cosine * 100)}%
                </div>
                <p className="text-sm text-gray-600">Semantic</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: `${averageScores.cosine * 100}%` }}></div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(averageScores.skillOverlap * 100)}%
                </div>
                <p className="text-sm text-gray-600">Skill Overlap</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${averageScores.skillOverlap * 100}%` }}></div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {Math.round(averageScores.traditional * 100)}%
                </div>
                <p className="text-sm text-gray-600">Traditional</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${averageScores.traditional * 100}%` }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              <Target className="h-5 w-5 text-yellow-600" />
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
              <Zap className="h-5 w-5 text-red-600" />
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
                        {match.must_have_compliance && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            All Skills Met ✅
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600">{match.company_name}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(match.final_score)}`}>
                        {Math.round(match.final_score * 100)}%
                      </div>
                      <p className="text-sm text-gray-500">Final Score</p>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {/* Score Breakdown */}
                  {showScoreBreakdown && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Score Breakdown</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Hybrid Score (70%)</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>BM25 (50%)</span>
                              <span className={getScoreColor(match.bm25_normalized)}>
                                {Math.round(match.bm25_normalized * 100)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Cosine (40%)</span>
                              <span className={getScoreColor(match.cosine_similarity)}>
                                {Math.round(match.cosine_similarity * 100)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Skill Overlap (10%)</span>
                              <span className={getScoreColor(match.skill_overlap)}>
                                {Math.round(match.skill_overlap * 100)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Must-Have Bonus</span>
                              <span className={match.must_have_compliance ? 'text-green-600' : 'text-gray-500'}>
                                {match.must_have_compliance ? '+10%' : '0%'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Traditional Score (30%)</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Skills (35%)</span>
                              <span className={getScoreColor(match.skill_match_score / 100)}>
                                {match.skill_match_score}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Experience (25%)</span>
                              <span className={getScoreColor(match.experience_match_score / 100)}>
                                {match.experience_match_score}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Education (15%)</span>
                              <span className={getScoreColor(match.education_match_score / 100)}>
                                {match.education_match_score}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Location (10%)</span>
                              <span className={getScoreColor(match.location_match_score / 100)}>
                                {match.location_match_score}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Salary (5%)</span>
                              <span className={getScoreColor(match.salary_match_score / 100)}>
                                {match.salary_match_score}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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

                    {/* Match Analysis */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Match Analysis</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Lexical Match</span>
                          <span className={getScoreColor(match.bm25_normalized)}>
                            {Math.round(match.bm25_normalized * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Semantic Match</span>
                          <span className={getScoreColor(match.cosine_similarity)}>
                            {Math.round(match.cosine_similarity * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Skill Coverage</span>
                          <span className={getScoreColor(match.skill_overlap)}>
                            {Math.round(match.skill_overlap * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Must-Have Skills</span>
                          <span className={match.must_have_compliance ? 'text-green-600' : 'text-red-600'}>
                            {match.must_have_compliance ? 'All Met' : `${match.missing_skills.length} Missing`}
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
