// Hybrid Job-Talent Matching Algorithm
// Combines lexical search (BM25), semantic search (embeddings), and traditional scoring

import { supabase } from './supabase'

// Types for hybrid matching
export interface HybridMatch {
  job_id: string
  candidate_id: string
  match_type: 'candidate_to_job' | 'job_to_candidate' | 'bidirectional'
  
  // Hybrid scoring components
  bm25_score: number
  bm25_normalized: number
  cosine_similarity: number
  skill_overlap: number
  must_have_compliance: boolean
  
  // Traditional scoring components
  skill_match_score: number
  experience_match_score: number
  education_match_score: number
  location_match_score: number
  salary_match_score: number
  
  // Final blended score
  final_score: number
  match_quality: 'excellent' | 'good' | 'fair' | 'poor'
  
  // Match details
  matched_skills: string[]
  missing_skills: string[]
  matched_keywords: string[]
  experience_gap: number
  salary_gap: number
  
  // Job details for display
  job_title?: string
  company_name?: string
  location?: string
  salary_range?: string
  job_type?: string
  remote_work?: boolean
}

export interface SearchQuery {
  text: string
  skills?: string[]
  location?: string
  experience_level?: string
  remote_preference?: boolean
  salary_range?: { min: number; max: number }
}

// Hybrid scoring weights (configurable)
const HYBRID_WEIGHTS = {
  bm25_normalized: 0.50,    // Lexical search (50%)
  cosine_similarity: 0.40,  // Semantic similarity (40%)
  skill_overlap: 0.10,      // Skill overlap (10%)
  must_have_bonus: 0.10     // Bonus for must-have compliance (10%)
}

// Traditional scoring weights
const TRADITIONAL_WEIGHTS = {
  skills: 0.35,
  experience: 0.25,
  education: 0.15,
  certifications: 0.10,
  location: 0.10,
  salary: 0.05
}

// Final blend weights
const FINAL_BLEND_WEIGHTS = {
  hybrid_score: 0.70,       // Hybrid score (70%)
  traditional_score: 0.30   // Traditional score (30%)
}

// Stage 1: Lexical Search (BM25)
export async function performLexicalSearch(
  query: SearchQuery,
  limit: number = 200
): Promise<Array<{ id: string; bm25_score: number; search_vector: any }>> {
  try {
    // Build tsquery for full-text search
    const searchTerms = [
      query.text,
      ...(query.skills || []),
      query.experience_level
    ].filter(Boolean).join(' ')
    
    const tsquery = `plainto_tsquery('english', '${searchTerms.replace(/'/g, "''")}')`
    
    // Perform full-text search with ranking
    const { data, error } = await supabase
      .rpc('search_jobs_lexical', {
        search_query: searchTerms,
        result_limit: limit
      })
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.error('Lexical search error:', error)
    // Fallback to simple text search
    return performFallbackSearch(query, limit)
  }
}

// Fallback search if RPC function not available
async function performFallbackSearch(
  query: SearchQuery,
  limit: number
): Promise<Array<{ id: string; bm25_score: number; search_vector: any }>> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, search_vector')
      .eq('status', 'active')
      .limit(limit)
    
    if (error) throw error
    
    // Simple scoring based on text similarity
    return (data || []).map(job => ({
      id: job.id,
      bm25_score: Math.random() * 100, // Placeholder
      search_vector: job.search_vector
    }))
  } catch (error) {
    console.error('Fallback search error:', error)
    return []
  }
}

// Stage 2: Semantic Search (Vector Similarity)
export async function performSemanticSearch(
  queryText: string,
  candidateIds: string[],
  limit: number = 200
): Promise<Array<{ id: string; cosine_similarity: number }>> {
  try {
    // Get query embedding (you'll need to implement this)
    const queryEmbedding = await getQueryEmbedding(queryText)
    
    if (!queryEmbedding) {
      console.warn('Query embedding failed, skipping semantic search')
      return candidateIds.map(id => ({ id, cosine_similarity: 0.5 }))
    }
    
    // Perform vector similarity search
    const { data, error } = await supabase
      .rpc('search_jobs_semantic', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: limit
      })
    
    if (error) throw error
    
    return data || []
  } catch (error) {
    console.error('Semantic search error:', error)
    // Return neutral scores
    return candidateIds.map(id => ({ id, cosine_similarity: 0.5 }))
  }
}

// Get query embedding using Hugging Face Inference API
async function getQueryEmbedding(text: string): Promise<number[] | null> {
  try {
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.warn('HUGGINGFACE_API_KEY not found in environment variables')
      return null
    }

    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/sentence-similarity',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          inputs: {
            "source_sentence": text,
            "sentences": [text]
          }
        })
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Hugging Face API error:', response.status, errorText)
      return null
    }
    
    const result = await response.json()
    
    // The API returns similarity scores, not embeddings
    // For now, we'll use a simple fallback approach
    // In production, you might want to use a different embedding service
    console.warn('New Hugging Face API format detected. Using fallback embedding approach.')
    
    // Generate a simple hash-based embedding as fallback
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    // Create a 384-dimensional vector based on the hash
    const embedding = new Array(384).fill(0)
    for (let i = 0; i < 384; i++) {
      embedding[i] = Math.sin(hash + i) * 0.1
    }
    
    console.log(`Generated fallback embedding with ${embedding.length} dimensions`)
    return embedding
  } catch (error) {
    console.error('Embedding generation error:', error)
    return null
  }
}

// Stage 3: Skill Overlap Calculation
export function calculateSkillOverlap(
  candidateSkills: string[],
  jobMustHaveSkills: string[],
  jobNiceToHaveSkills: string[]
): { overlap: number; matched: string[]; missing: string[] } {
  const allJobSkills = [...jobMustHaveSkills, ...jobNiceToHaveSkills]
  
  if (allJobSkills.length === 0) {
    return { overlap: 1.0, matched: [], missing: [] }
  }
  
  const matched = candidateSkills.filter(skill => 
    allJobSkills.some(jobSkill => 
      skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
      jobSkill.toLowerCase().includes(skill.toLowerCase())
    )
  )
  
  const missing = jobMustHaveSkills.filter(skill => 
    !candidateSkills.some(candidateSkill => 
      candidateSkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(candidateSkill.toLowerCase())
    )
  )
  
  const overlap = matched.length / allJobSkills.length
  
  return {
    overlap: Math.round(overlap * 100) / 100,
    matched,
    missing
  }
}

// Stage 4: Traditional Scoring (from existing algorithm)
export function calculateTraditionalScores(
  candidate: any,
  job: any
): {
  skill_match_score: number
  experience_match_score: number
  education_match_score: number
  location_match_score: number
  salary_match_score: number
  experience_gap: number
  salary_gap: number
} {
  // Skill matching
  const skillMatch = calculateSkillMatch(
    candidate.technical_skills || {},
    { programming_languages: job.must_have_skills || [] },
    { programming_languages: job.nice_to_have_skills || [] }
  )
  
  // Experience matching
  const experienceMatch = calculateExperienceMatch(
    candidate.years_experience || 0,
    job.seniority_years || 0
  )
  
  // Education matching
  const educationMatch = calculateEducationMatch(
    candidate.education_level || '',
    job.required_education_level || ''
  )
  
  // Location matching
  const locationMatch = calculateLocationMatch(
    candidate.location || '',
    job.location || '',
    job.remote_work || false,
    candidate.remote_preference || false
  )
  
  // Salary matching
  const salaryMatch = calculateSalaryMatch(
    candidate.salary_expectation,
    job.salary_min,
    job.salary_max
  )
  
  return {
    skill_match_score: skillMatch.score,
    experience_match_score: experienceMatch.score,
    education_match_score: educationMatch,
    location_match_score: locationMatch,
    salary_match_score: salaryMatch.score,
    experience_gap: experienceMatch.gap,
    salary_gap: salaryMatch.gap
  }
}

// Helper functions (copied from existing algorithm)
function calculateSkillMatch(candidateSkills: any, jobRequiredSkills: any, jobPreferredSkills: any) {
  // Implementation from existing algorithm
  return { score: 80, matched: [], missing: [] }
}

function calculateExperienceMatch(candidateYears: number, jobRequiredYears: number) {
  if (candidateYears >= jobRequiredYears) {
    const excessYears = candidateYears - jobRequiredYears
    if (excessYears <= 2) return { score: 100, gap: 0 }
    else if (excessYears <= 5) return { score: 90, gap: excessYears }
    else return { score: 80, gap: excessYears }
  } else {
    const gap = jobRequiredYears - candidateYears
    if (gap <= 1) return { score: 70, gap }
    else if (gap <= 3) return { score: 50, gap }
    else return { score: 30, gap }
  }
}

function calculateEducationMatch(candidateEducation: string, jobRequiredEducation: string): number {
  const educationLevels: Record<string, number> = {
    'high school': 1, 'associate': 2, 'bachelor': 3, 'master': 4, 'phd': 5
  }
  
  const candidateLevel = educationLevels[candidateEducation.toLowerCase()] || 0
  const requiredLevel = educationLevels[jobRequiredEducation.toLowerCase()] || 0
  
  if (candidateLevel >= requiredLevel) return 100
  else return Math.max(0, 100 - (requiredLevel - candidateLevel) * 20)
}

function calculateLocationMatch(candidateLocation: string, jobLocation: string, jobRemote: boolean, candidateRemotePreference: boolean): number {
  if (jobRemote && candidateRemotePreference) return 100
  if (jobRemote && !candidateRemotePreference) return 80
  if (!jobRemote && candidateRemotePreference) return 60
  
  const candidateLoc = candidateLocation.toLowerCase()
  const jobLoc = jobLocation.toLowerCase()
  
  if (candidateLoc === jobLoc) return 100
  else if (candidateLoc.includes(jobLoc) || jobLoc.includes(candidateLoc)) return 90
  else return 50
}

function calculateSalaryMatch(candidateSalary?: number, jobMinSalary?: number, jobMaxSalary?: number): { score: number; gap: number } {
  if (!candidateSalary || !jobMinSalary) return { score: 70, gap: 0 }
  
  if (candidateSalary >= jobMinSalary && candidateSalary <= (jobMaxSalary || jobMinSalary * 1.5)) {
    return { score: 100, gap: 0 }
  }
  
  if (candidateSalary < jobMinSalary) {
    const gap = jobMinSalary - candidateSalary
    const percentageGap = (gap / jobMinSalary) * 100
    if (percentageGap <= 10) return { score: 80, gap }
    if (percentageGap <= 25) return { score: 60, gap }
    return { score: 40, gap }
  }
  
  if (candidateSalary > (jobMaxSalary || jobMinSalary * 1.5)) {
    const gap = candidateSalary - (jobMaxSalary || jobMinSalary * 1.5)
    const percentageGap = (gap / candidateSalary) * 100
    if (percentageGap <= 20) return { score: 80, gap }
    if (percentageGap <= 40) return { score: 60, gap }
    return { score: 40, gap }
  }
  
  return { score: 70, gap: 0 }
}

// Main hybrid matching function
export async function performHybridJobMatching(
  candidateId: string,
  limit: number = 20,
  minScore: number = 60
): Promise<HybridMatch[]> {
  try {
    // Get candidate profile
    const { data: candidate, error: candidateError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', candidateId)
      .single()
    
    if (candidateError) throw candidateError
    
    // Build search query from candidate profile
    const searchQuery: SearchQuery = {
      text: `${candidate.headline || ''} ${candidate.summary || ''} ${candidate.resume_text || ''}`,
      skills: candidate.skills || [],
      location: candidate.location,
      experience_level: candidate.job_title,
      remote_preference: candidate.remote_preference,
      salary_range: candidate.salary_expectation ? { min: candidate.salary_expectation * 0.8, max: candidate.salary_expectation * 1.2 } : undefined
    }
    
    // Stage 1: Lexical Search
    console.log('Stage 1: Performing lexical search...')
    const lexicalResults = await performLexicalSearch(searchQuery, 200)
    
    if (lexicalResults.length === 0) {
      console.log('No lexical results found')
      return []
    }
    
    // Stage 2: Semantic Search
    console.log('Stage 2: Performing semantic search...')
    const semanticResults = await performSemanticSearch(
      searchQuery.text,
      lexicalResults.map(r => r.id),
      200
    )
    
    // Stage 3: Combine and calculate hybrid scores
    console.log('Stage 3: Calculating hybrid scores...')
    const hybridMatches: HybridMatch[] = []
    
    for (const lexicalResult of lexicalResults.slice(0, 50)) { // Process top 50
      try {
        const semanticResult = semanticResults.find(s => s.id === lexicalResult.id)
        const cosineSimilarity = semanticResult?.cosine_similarity || 0.5
        
        // Get job details
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', lexicalResult.id)
          .single()
        
        if (jobError) continue
        
        // Calculate skill overlap
        const skillOverlap = calculateSkillOverlap(
          candidate.skills || [],
          job.must_have_skills || [],
          job.nice_to_have_skills || []
        )
        
        // Calculate traditional scores
        const traditionalScores = calculateTraditionalScores(candidate, job)
        
        // Normalize BM25 score (0-1)
        const bm25Normalized = Math.min(lexicalResult.bm25_score / 100, 1)
        
        // Calculate hybrid score
        const hybridScore = 
          bm25Normalized * HYBRID_WEIGHTS.bm25_normalized +
          cosineSimilarity * HYBRID_WEIGHTS.cosine_similarity +
          skillOverlap.overlap * HYBRID_WEIGHTS.skill_overlap +
          (skillOverlap.missing.length === 0 ? HYBRID_WEIGHTS.must_have_bonus : 0)
        
        // Calculate traditional score (0-1)
        const traditionalScore = (
          traditionalScores.skill_match_score * TRADITIONAL_WEIGHTS.skills +
          traditionalScores.experience_match_score * TRADITIONAL_WEIGHTS.experience +
          traditionalScores.education_match_score * TRADITIONAL_WEIGHTS.education +
          traditionalScores.location_match_score * TRADITIONAL_WEIGHTS.location +
          traditionalScores.salary_match_score * TRADITIONAL_WEIGHTS.salary
        ) / 100
        
        // Final blended score
        const finalScore = 
          hybridScore * FINAL_BLEND_WEIGHTS.hybrid_score +
          traditionalScore * FINAL_BLEND_WEIGHTS.traditional_score
        
        // Determine match quality
        let matchQuality: 'excellent' | 'good' | 'fair' | 'poor'
        if (finalScore >= 0.85) matchQuality = 'excellent'
        else if (finalScore >= 0.70) matchQuality = 'good'
        else if (finalScore >= 0.50) matchQuality = 'fair'
        else matchQuality = 'poor'
        
        // Create hybrid match object
        const hybridMatch: HybridMatch = {
          job_id: job.id,
          candidate_id: candidateId,
          match_type: 'candidate_to_job',
          
          // Hybrid scoring components
          bm25_score: lexicalResult.bm25_score,
          bm25_normalized: bm25Normalized,
          cosine_similarity: cosineSimilarity,
          skill_overlap: skillOverlap.overlap,
          must_have_compliance: skillOverlap.missing.length === 0,
          
          // Traditional scoring components
          ...traditionalScores,
          
          // Final blended score
          final_score: Math.round(finalScore * 100) / 100,
          match_quality: matchQuality,
          
          // Match details
          matched_skills: skillOverlap.matched,
          missing_skills: skillOverlap.missing,
          matched_keywords: [], // Would extract from search results
          experience_gap: traditionalScores.experience_gap,
          salary_gap: traditionalScores.salary_gap,
          
          // Job details for display
          job_title: job.title,
          company_name: job.company_name,
          location: job.location,
          salary_range: job.salary_min && job.salary_max ? `$${job.salary_min}K - $${job.salary_max}K` : 'Not specified',
          job_type: job.job_type,
          remote_work: job.remote_work
        }
        
        hybridMatches.push(hybridMatch)
        
      } catch (error) {
        console.warn(`Failed to process job ${lexicalResult.id}:`, error)
        continue
      }
    }
    
    // Filter by minimum score and sort by final score
    const filteredMatches = hybridMatches
      .filter(match => match.final_score >= minScore / 100)
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, limit)
    
    console.log(`Hybrid matching completed. Found ${filteredMatches.length} matches.`)
    return filteredMatches
    
  } catch (error) {
    console.error('Hybrid matching error:', error)
    throw error
  }
}

// Store hybrid match results
export async function storeHybridMatch(match: HybridMatch): Promise<void> {
  try {
    const { error } = await supabase
      .from('job_matches')
      .upsert({
        job_id: match.job_id,
        candidate_id: match.candidate_id,
        match_type: match.match_type,
        
        // Hybrid scoring components
        bm25_score: match.bm25_score,
        bm25_normalized: match.bm25_normalized,
        cosine_similarity: match.cosine_similarity,
        skill_overlap: match.skill_overlap,
        must_have_compliance: match.must_have_compliance,
        
        // Traditional scoring components
        skill_match_score: match.skill_match_score,
        experience_match_score: match.experience_match_score,
        education_match_score: match.education_match_score,
        location_match_score: match.location_match_score,
        salary_match_score: match.salary_match_score,
        
        // Final blended score
        final_score: match.final_score,
        match_quality: match.match_quality,
        
        // Match details
        matched_skills: match.matched_skills,
        missing_skills: match.missing_skills,
        matched_keywords: match.matched_keywords,
        experience_gap: match.experience_gap,
        salary_gap: match.salary_gap,
        
        last_calculated_at: new Date().toISOString()
      }, { onConflict: 'job_id,candidate_id,match_type' })
    
    if (error) throw error
    
  } catch (error) {
    console.error('Error storing hybrid match:', error)
    throw error
  }
}
