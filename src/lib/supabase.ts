import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Debug logging
console.log('Environment variables check:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')

// Ensure environment variables are available and create client
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
console.log('✅ Supabase client created successfully')

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'job_seeker' | 'employer'
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          role: 'job_seeker' | 'employer'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'job_seeker' | 'employer'
          created_at?: string
        }
      }
      resumes: {
        Row: {
          id: string
          user_id: string
          file_url: string
          parsed_text: string
          skills: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_url: string
          parsed_text: string
          skills?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_url?: string
          parsed_text?: string
          skills?: string[]
          created_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          employer_id: string
          title: string
          description: string
          requirements: string[]
          created_at: string
        }
        Insert: {
          id?: string
          employer_id: string
          title: string
          requirements?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          employer_id?: string
          title?: string
          description?: string
          requirements?: string[]
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          job_id: string
          resume_id: string
          score: number
          explanation: string
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          resume_id: string
          score: number
          explanation: string
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          resume_id?: string
          score?: number
          explanation?: string
          created_at?: string
        }
      }
    }
  }
}
