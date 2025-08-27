'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, role: 'job_seeker' | 'employer') => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only proceed if Supabase client is available
    if (!supabase) {
      console.log('❌ Supabase client not available')
      setLoading(false)
      return
    }

    console.log('✅ Supabase client available, initializing auth...')

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.email || 'No session')
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' && session?.user && supabase) {
        // User just signed up, create profile in our user_profiles table
        try {
          console.log('Creating user profile for:', session.user.email)
          
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([
              {
                user_id: session.user.id,
                first_name: '',
                last_name: '',
                role: session.user.user_metadata?.role || 'job_seeker',
              },
            ])
          
          if (profileError) {
            console.error('Error creating user profile:', profileError)
          } else {
            console.log('User profile created successfully')
          }

          // Also create user preferences
          const { error: preferencesError } = await supabase
            .from('user_preferences')
            .insert([
              {
                user_id: session.user.id,
                job_alerts: true,
                email_notifications: true,
                push_notifications: false,
                privacy_level: 'public',
                preferred_job_types: [],
                preferred_locations: [],
              },
            ])
          
          if (preferencesError) {
            console.error('Error creating user preferences:', preferencesError)
          } else {
            console.log('User preferences created successfully')
          }
        } catch (error) {
          console.error('Error in profile creation:', error)
        }
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, role: 'job_seeker' | 'employer') => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }

    console.log('Starting signup for:', email, 'with role:', role)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
      },
    })
    
    if (error) {
      console.error('Signup error:', error)
      throw error
    }

    console.log('Signup successful:', data)
    
    // Note: Profile creation now happens in the auth state change listener
    // This ensures it happens after the user is fully created
  }

  const signOut = async () => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
