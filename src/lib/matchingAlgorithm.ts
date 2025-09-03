// Bidirectional Job Matching Algorithm for Brave Platform
// Matches candidates to jobs AND jobs to candidates in real-time

import { supabase } from './supabase'

// Types for the matching system
export interface JobMatch {
  job_id: string
  candidate_id: string
  resume_id?: string
  match_type: 'candidate_to_job' | 'job_to_candidate' | 'bidirectional'
  skill_match_score: number
  experience_match_score: number
  education_match_score: number
  certification_match_score: number
  location_match_score: number
  salary_match_score: number
  overall_match_score: number
  matched_skills: string[]
  missing_skills: string[]
  experience_gap: number
  salary_gap: number
  match_quality: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface CandidateProfile {
  id: string
  resume_id?: string
  technical_skills: {
    programming_languages: string[]
    frameworks: string[]
    databases: string[]
    cloud_platforms: string[]
    tools: string[]
    methodologies: string[]
  }
  soft_skills: string[]
  experience_years: number
  education_level: string
  certifications: string[]
  location: string
  salary_expectation?: number
  remote_preference: boolean
}

export interface JobRequirements {
  id: string
  required_skills: {
    programming_languages: string[]
    frameworks: string[]
    databases: string[]
    cloud_platforms: string[]
    tools: string[]
    methodologies: string[]
  }
  preferred_skills: {
    programming_languages: string[]
    frameworks: string[]
    databases: string[]
    cloud_platforms: string[]
    tools: string[]
    methodologies: string[]
  }
  required_experience_years: number
  required_education_level: string
  required_certifications: string[]
  location: string
  remote_work: boolean
  salary_min?: number
  salary_max?: number
}

// Weighted scoring system for different match factors
const MATCH_WEIGHTS = {
  skills: 0.35,           // Technical skills are most important
  experience: 0.25,       // Experience level
  education: 0.15,        // Education requirements
  certifications: 0.10,   // Professional certifications
  location: 0.10,         // Geographic compatibility
  salary: 0.05            // Salary expectations
}

// Skill matching algorithm with fuzzy matching
export function calculateSkillMatch(
  candidateSkills: any,
  jobRequiredSkills: any,
  jobPreferredSkills: any
): { score: number; matched: string[]; missing: string[] } {
  let totalScore = 0
  let matchedSkills: string[] = []
  let missingSkills: string[] = []
  
  // Flatten all skills into arrays for comparison
  const candidateSkillArray = [
    ...(candidateSkills.programming_languages || []),
    ...(candidateSkills.frameworks || []),
    ...(candidateSkills.databases || []),
    ...(candidateSkills.cloud_platforms || []),
    ...(candidateSkills.tools || []),
    ...(candidateSkills.methodologies || [])
  ].map(skill => skill.toLowerCase())
  
  const requiredSkills = [
    ...(jobRequiredSkills.programming_languages || []),
    ...(jobRequiredSkills.frameworks || []),
    ...(jobRequiredSkills.databases || []),
    ...(jobRequiredSkills.cloud_platforms || []),
    ...(jobRequiredSkills.tools || []),
    ...(jobRequiredSkills.methodologies || [])
  ].map(skill => skill.toLowerCase())
  
  const preferredSkills = [
    ...(jobPreferredSkills.programming_languages || []),
    ...(jobPreferredSkills.frameworks || []),
    ...(jobPreferredSkills.databases || []),
    ...(jobPreferredSkills.cloud_platforms || []),
    ...(jobPreferredSkills.tools || []),
    ...(jobPreferredSkills.methodologies || [])
  ].map(skill => skill.toLowerCase())
  
  // Calculate required skills match (weighted higher)
  let requiredMatchCount = 0
  requiredSkills.forEach(skill => {
    if (candidateSkillArray.includes(skill)) {
      requiredMatchCount++
      matchedSkills.push(skill)
    } else {
      missingSkills.push(skill)
    }
  })
  
  // Calculate preferred skills match
  let preferredMatchCount = 0
  preferredSkills.forEach(skill => {
    if (candidateSkillArray.includes(skill) && !matchedSkills.includes(skill)) {
      preferredMatchCount++
      matchedSkills.push(skill)
    }
  })
  
  // Calculate score with required skills weighted higher
  const requiredScore = requiredSkills.length > 0 ? (requiredMatchCount / requiredSkills.length) * 70 : 0
  const preferredScore = preferredSkills.length > 0 ? (preferredMatchCount / preferredSkills.length) * 30 : 0
  totalScore = requiredScore + preferredScore
  
  return {
    score: Math.round(totalScore),
    matched: matchedSkills,
    missing: missingSkills
  }
}

// Experience matching algorithm
export function calculateExperienceMatch(
  candidateYears: number,
  jobRequiredYears: number
): { score: number; gap: number } {
  if (candidateYears >= jobRequiredYears) {
    // Candidate has sufficient experience
    const excessYears = candidateYears - jobRequiredYears
    if (excessYears <= 2) {
      return { score: 100, gap: 0 } // Perfect match
    } else if (excessYears <= 5) {
      return { score: 90, gap: excessYears } // Good match
    } else {
      return { score: 80, gap: excessYears } // Overqualified but acceptable
    }
  } else {
    // Candidate lacks experience
    const gap = jobRequiredYears - candidateYears
    if (gap <= 1) {
      return { score: 70, gap: gap } // Close, might work
    } else if (gap <= 3) {
      return { score: 50, gap: gap } // Significant gap
    } else {
      return { score: 30, gap: gap } // Too much gap
    }
  }
}

// Education matching algorithm
export function calculateEducationMatch(
  candidateEducation: string,
  jobRequiredEducation: string
): number {
  const educationLevels: Record<string, number> = {
    'high school': 1,
    'associate': 2,
    'bachelor': 3,
    'master': 4,
    'phd': 5
  }
  
  const candidateLevel = educationLevels[candidateEducation.toLowerCase()] || 0
  const requiredLevel = educationLevels[jobRequiredEducation.toLowerCase()] || 0
  
  if (candidateLevel >= requiredLevel) {
    return 100 // Meets or exceeds requirement
  } else {
    return Math.max(0, 100 - (requiredLevel - candidateLevel) * 20)
  }
}

// Certification matching algorithm
export function calculateCertificationMatch(
  candidateCerts: string[],
  jobRequiredCerts: string[]
): { score: number; matched: string[] } {
  if (jobRequiredCerts.length === 0) return { score: 100, matched: [] }
  
  const matched = candidateCerts.filter(cert => 
    jobRequiredCerts.some(required => 
      cert.toLowerCase().includes(required.toLowerCase()) ||
      required.toLowerCase().includes(cert.toLowerCase())
    )
  )
  
  const score = Math.round((matched.length / jobRequiredCerts.length) * 100)
  return { score, matched }
}

// Location matching algorithm
export function calculateLocationMatch(
  candidateLocation: string,
  jobLocation: string,
  jobRemote: boolean,
  candidateRemotePreference: boolean
): number {
  if (jobRemote && candidateRemotePreference) {
    return 100 // Perfect remote match
  }
  
  if (jobRemote && !candidateRemotePreference) {
    return 80 // Job is remote, candidate prefers office
  }
  
  if (!jobRemote && candidateRemotePreference) {
    return 60 // Job requires office, candidate prefers remote
  }
  
  // Both prefer office - check location similarity
  const candidateLoc = candidateLocation.toLowerCase()
  const jobLoc = jobLocation.toLowerCase()
  
  if (candidateLoc === jobLoc) {
    return 100 // Same location
  } else if (candidateLoc.includes(jobLoc) || jobLoc.includes(candidateLoc)) {
    return 90 // Similar/overlapping locations
  } else {
    return 50 // Different locations
  }
}

// Salary matching algorithm
export function calculateSalaryMatch(
  candidateSalary?: number,
  jobMinSalary?: number,
  jobMaxSalary?: number
): { score: number; gap: number } {
  if (!candidateSalary || !jobMinSalary) {
    return { score: 70, gap: 0 } // Can't determine, neutral score
  }
  
  if (candidateSalary >= jobMinSalary && candidateSalary <= (jobMaxSalary || jobMinSalary * 1.5)) {
    return { score: 100, gap: 0 } // Perfect salary match
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

// Main matching algorithm
export async function calculateJobMatch(
  candidateId: string,
  jobId: string,
  matchType: 'candidate_to_job' | 'job_to_candidate' | 'bidirectional'
): Promise<JobMatch> {
  try {
    // Fetch candidate profile and resume data
    const { data: candidateData, error: candidateError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        resumes (
          technical_skills,
          soft_skills,
          education,
          certifications,
          experience_details
        )
      `)
      .eq('id', candidateId)
      .single()
    
    if (candidateError) throw candidateError
    
    // Fetch job requirements
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()
    
    if (jobError) throw jobError
    
    // Get the most recent resume
    const latestResume = candidateData.resumes?.[0]
    if (!latestResume) {
      throw new Error('No resume found for candidate')
    }
    
    // Calculate individual match scores
    const skillMatch = calculateSkillMatch(
      latestResume.technical_skills,
      jobData.required_skills,
      jobData.preferred_skills
    )
    
    // Estimate candidate experience years from resume
    const candidateExperienceYears = latestResume.experience_details?.length || 0
    const experienceMatch = calculateExperienceMatch(
      candidateExperienceYears,
      jobData.required_experience_years
    )
    
    const educationMatch = calculateEducationMatch(
      latestResume.education?.[0]?.degree || '',
      jobData.required_education_level
    )
    
    const certificationMatch = calculateCertificationMatch(
      latestResume.certifications?.map((c: any) => c.name) || [],
      jobData.required_certifications || []
    )
    
    const locationMatch = calculateLocationMatch(
      candidateData.location || '',
      jobData.location || '',
      jobData.remote_work,
      candidateData.remote_preference || false
    )
    
    const salaryMatch = calculateSalaryMatch(
      candidateData.salary_expectation,
      jobData.salary_min,
      jobData.salary_max
    )
    
    // Calculate overall weighted score
    const overallScore = Math.round(
      skillMatch.score * MATCH_WEIGHTS.skills +
      experienceMatch.score * MATCH_WEIGHTS.experience +
      educationMatch * MATCH_WEIGHTS.education +
      certificationMatch.score * MATCH_WEIGHTS.certifications +
      locationMatch * MATCH_WEIGHTS.location +
      salaryMatch.score * MATCH_WEIGHTS.salary
    )
    
    // Determine match quality
    let matchQuality: 'excellent' | 'good' | 'fair' | 'poor'
    if (overallScore >= 85) matchQuality = 'excellent'
    else if (overallScore >= 70) matchQuality = 'good'
    else if (overallScore >= 50) matchQuality = 'fair'
    else matchQuality = 'poor'
    
    // Create match object
    const match: JobMatch = {
      job_id: jobId,
      candidate_id: candidateId,
      resume_id: latestResume.id,
      match_type: matchType,
      skill_match_score: skillMatch.score,
      experience_match_score: experienceMatch.score,
      education_match_score: educationMatch,
      certification_match_score: certificationMatch.score,
      location_match_score: locationMatch,
      salary_match_score: salaryMatch.score,
      overall_match_score: overallScore,
      matched_skills: skillMatch.matched,
      missing_skills: skillMatch.missing,
      experience_gap: experienceMatch.gap,
      salary_gap: salaryMatch.gap,
      match_quality: matchQuality
    }
    
    return match
    
  } catch (error) {
    console.error('Error calculating job match:', error)
    throw error
  }
}

// Find matching jobs for a candidate
export async function findMatchingJobsForCandidate(
  candidateId: string,
  limit: number = 20,
  minScore: number = 60
): Promise<JobMatch[]> {
  try {
    // Get all active jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
    
    if (jobsError) throw jobsError
    
    // Calculate matches for each job
    const matches: JobMatch[] = []
    for (const job of jobs) {
      try {
        const match = await calculateJobMatch(candidateId, job.id, 'candidate_to_job')
        if (match.overall_match_score >= minScore) {
          matches.push(match)
        }
      } catch (error) {
        console.warn(`Failed to calculate match for job ${job.id}:`, error)
        continue
      }
    }
    
    // Sort by match score and return top matches
    return matches
      .sort((a, b) => b.overall_match_score - a.overall_match_score)
      .slice(0, limit)
    
  } catch (error) {
    console.error('Error finding matching jobs:', error)
    throw error
  }
}

// Find matching candidates for a job
export async function findMatchingCandidatesForJob(
  jobId: string,
  limit: number = 20,
  minScore: number = 60
): Promise<JobMatch[]> {
  try {
    // Get all candidates with resumes
    const { data: candidates, error: candidatesError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        resumes (
          id,
          technical_skills,
          soft_skills,
          education,
          certifications,
          experience_details
        )
      `)
      .not('resumes', 'is', null)
    
    if (candidatesError) throw candidatesError
    
    // Calculate matches for each candidate
    const matches: JobMatch[] = []
    for (const candidate of candidates) {
      if (candidate.resumes && candidate.resumes.length > 0) {
        try {
          const match = await calculateJobMatch(candidate.id, jobId, 'job_to_candidate')
          if (match.overall_match_score >= minScore) {
            matches.push(match)
          }
        } catch (error) {
          console.warn(`Failed to calculate match for candidate ${candidate.id}:`, error)
          continue
        }
      }
    }
    
    // Sort by match score and return top matches
    return matches
      .sort((a, b) => b.overall_match_score - a.overall_match_score)
      .slice(0, limit)
    
  } catch (error) {
    console.error('Error finding matching candidates:', error)
    throw error
  }
}

// Store match results in database
export async function storeJobMatch(match: JobMatch): Promise<void> {
  try {
    const { error } = await supabase
      .from('job_matches')
      .upsert(match, { onConflict: 'job_id,candidate_id,match_type' })
    
    if (error) throw error
    
  } catch (error) {
    console.error('Error storing job match:', error)
    throw error
  }
}

// Batch process matches for all active jobs and candidates
export async function processAllMatches(): Promise<void> {
  try {
    console.log('Starting batch match processing...')
    
    // Get all active jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('status', 'active')
    
    if (jobsError) throw jobsError
    
    // Get all candidates with resumes
    const { data: candidates, error: candidatesError } = await supabase
      .from('user_profiles')
      .select('id')
      .not('resumes', 'is', null)
    
    if (candidatesError) throw candidatesError
    
    console.log(`Processing matches for ${jobs.length} jobs and ${candidates.length} candidates...`)
    
    let processedMatches = 0
    
    // Process matches in batches to avoid overwhelming the system
    for (const job of jobs) {
      for (const candidate of candidates) {
        try {
          const match = await calculateJobMatch(candidate.id, job.id, 'bidirectional')
          await storeJobMatch(match)
          processedMatches++
          
          if (processedMatches % 100 === 0) {
            console.log(`Processed ${processedMatches} matches...`)
          }
        } catch (error) {
          console.warn(`Failed to process match for job ${job.id} and candidate ${candidate.id}:`, error)
          continue
        }
      }
    }
    
    console.log(`Completed batch processing. Total matches processed: ${processedMatches}`)
    
  } catch (error) {
    console.error('Error in batch match processing:', error)
    throw error
  }
}
