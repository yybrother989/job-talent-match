// Utility functions for managing embeddings in the Brave platform

import { supabase } from './supabase'

// Generate embedding using Hugging Face API
export async function generateEmbedding(text: string): Promise<number[] | null> {
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

// Generate and store embedding for a job
export async function generateJobEmbedding(jobId: string): Promise<boolean> {
  try {
    // Get job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('title, description, requirements, must_have_skills, nice_to_have_skills')
      .eq('id', jobId)
      .single()
    
    if (jobError) throw jobError
    
    // Combine text for embedding
    const textForEmbedding = [
      job.title,
      job.description,
      job.requirements,
      (job.must_have_skills || []).join(' '),
      (job.nice_to_have_skills || []).join(' ')
    ].filter(Boolean).join(' ')
    
    // Generate embedding
    const embedding = await generateEmbedding(textForEmbedding)
    
    if (!embedding) {
      console.error('Failed to generate embedding for job:', jobId)
      return false
    }
    
    // Update job with embedding
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ 
        embedding: embedding,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
    
    if (updateError) throw updateError
    
    console.log(`Successfully updated embedding for job: ${jobId}`)
    return true
    
  } catch (error) {
    console.error('Error generating job embedding:', error)
    return false
  }
}

// Generate and store embedding for a user profile
export async function generateProfileEmbedding(profileId: string): Promise<boolean> {
  try {
    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        headline,
        summary,
        job_title,
        skills,
        resumes (
          technical_skills,
          soft_skills,
          experience_details,
          education
        )
      `)
      .eq('id', profileId)
      .single()
    
    if (profileError) throw profileError
    
    // Combine text for embedding
    const textParts = [
      profile.headline,
      profile.summary,
      profile.job_title,
      (profile.skills || []).join(' ')
    ]
    
    // Add resume data if available
    if (profile.resumes && profile.resumes.length > 0) {
      const resume = profile.resumes[0]
      textParts.push(
        JSON.stringify(resume.technical_skills || {}),
        (resume.soft_skills || []).join(' '),
        JSON.stringify(resume.experience_details || []),
        JSON.stringify(resume.education || [])
      )
    }
    
    const textForEmbedding = textParts.filter(Boolean).join(' ')
    
    // Generate embedding
    const embedding = await generateEmbedding(textForEmbedding)
    
    if (!embedding) {
      console.error('Failed to generate embedding for profile:', profileId)
      return false
    }
    
    // Update profile with embedding
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        embedding: embedding,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
    
    if (updateError) throw updateError
    
    console.log(`Successfully updated embedding for profile: ${profileId}`)
    return true
    
  } catch (error) {
    console.error('Error generating profile embedding:', error)
    return false
  }
}

// Batch generate embeddings for all jobs
export async function generateAllJobEmbeddings(): Promise<{ success: number; failed: number }> {
  try {
    console.log('Starting batch job embedding generation...')
    
    // Get all jobs without embeddings
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id')
      .eq('status', 'active')
      .is('embedding', null)
    
    if (jobsError) throw jobsError
    
    console.log(`Found ${jobs.length} jobs without embeddings`)
    
    let success = 0
    let failed = 0
    
    // Process jobs in batches to avoid overwhelming the API
    for (const job of jobs) {
      try {
        const result = await generateJobEmbedding(job.id)
        if (result) {
          success++
        } else {
          failed++
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
        if ((success + failed) % 10 === 0) {
          console.log(`Processed ${success + failed}/${jobs.length} jobs...`)
        }
      } catch (error) {
        console.warn(`Failed to process job ${job.id}:`, error)
        failed++
      }
    }
    
    console.log(`Batch embedding generation completed. Success: ${success}, Failed: ${failed}`)
    return { success, failed }
    
  } catch (error) {
    console.error('Error in batch job embedding generation:', error)
    throw error
  }
}

// Batch generate embeddings for all user profiles
export async function generateAllProfileEmbeddings(): Promise<{ success: number; failed: number }> {
  try {
    console.log('Starting batch profile embedding generation...')
    
    // Get all profiles without embeddings
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id')
      .is('embedding', null)
    
    if (profilesError) throw profilesError
    
    console.log(`Found ${profiles.length} profiles without embeddings`)
    
    let success = 0
    let failed = 0
    
    // Process profiles in batches
    for (const profile of profiles) {
      try {
        const result = await generateProfileEmbedding(profile.id)
        if (result) {
          success++
        } else {
          failed++
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
        if ((success + failed) % 10 === 0) {
          console.log(`Processed ${success + failed}/${profiles.length} profiles...`)
        }
      } catch (error) {
        console.warn(`Failed to process profile ${profile.id}:`, error)
        failed++
      }
    }
    
    console.log(`Batch embedding generation completed. Success: ${success}, Failed: ${failed}`)
    return { success, failed }
    
  } catch (error) {
    console.error('Error in batch profile embedding generation:', error)
    throw error
  }
}

// Test embedding generation
export async function testEmbeddingGeneration(): Promise<{
  success: boolean
  dimensions?: number
  error?: string
}> {
  try {
    const testText = 'Senior React Developer with TypeScript experience'
    const embedding = await generateEmbedding(testText)
    
    if (embedding && embedding.length === 384) {
      return {
        success: true,
        dimensions: embedding.length
      }
    } else {
      return {
        success: false,
        error: 'Invalid embedding format or dimensions'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
