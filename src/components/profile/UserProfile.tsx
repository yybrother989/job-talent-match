'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface UserProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone: string
  city: string
  state: string
  country: string
  timezone: string
  bio: string
  website: string
  linkedin_url: string
  github_url: string
  years_experience: number
  current_company: string
  current_title: string
  desired_salary_min: number
  desired_salary_max: number
  willing_to_relocate: boolean
  remote_preference: 'remote_only' | 'hybrid' | 'on_site' | 'flexible'
  created_at: string
  updated_at: string
}

interface UserPreferences {
  id: string
  user_id: string
  job_alerts: boolean
  email_notifications: boolean
  push_notifications: boolean
  privacy_level: 'public' | 'private' | 'connections_only'
  preferred_job_types: string[]
  preferred_locations: string[]
  salary_preferences: any
}

export function UserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    city: '',
    state: '',
    country: 'US',
    timezone: '',
    bio: '',
    website: '',
    linkedin_url: '',
    github_url: '',
    years_experience: 0,
    current_company: '',
    current_title: '',
    desired_salary_min: 0,
    desired_salary_max: 0,
    willing_to_relocate: false,
    remote_preference: 'flexible' as 'remote_only' | 'hybrid' | 'on_site' | 'flexible',
  })

  // Preferences form state
  const [preferencesForm, setPreferencesForm] = useState({
    job_alerts: true,
    email_notifications: true,
    push_notifications: false,
    privacy_level: 'public' as 'public' | 'private' | 'connections_only',
    preferred_job_types: [] as string[],
    preferred_locations: [] as string[],
  })

  // Load user profile and preferences
  useEffect(() => {
    if (user) {
      loadUserData()
    } else {
      // If no user, don't show loading state
      setLoading(false)
    }
  }, [user])

  const loadUserData = async () => {
    if (!user || !supabase) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Check if user_profiles table exists first
      const { data: tableCheck, error: tableError } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1)

      if (tableError) {
        console.log('user_profiles table not ready yet:', tableError.message)
        setLoading(false)
        return
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile error:', profileError)
      }

      if (profileData) {
        setProfile(profileData)
        setFormData({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          phone: profileData.phone || '',
          city: profileData.city || '',
          state: profileData.state || '',
          country: profileData.country || 'US',
          timezone: profileData.timezone || '',
          bio: profileData.bio || '',
          website: profileData.website || '',
          linkedin_url: profileData.linkedin_url || '',
          github_url: profileData.github_url || '',
          years_experience: profileData.years_experience || 0,
          current_company: profileData.current_company || '',
          current_title: profileData.current_title || '',
          desired_salary_min: profileData.desired_salary_min || 0,
          desired_salary_max: profileData.desired_salary_max || 0,
          willing_to_relocate: profileData.willing_to_relocate || false,
          remote_preference: profileData.remote_preference || 'flexible',
        })
      }

      // Check if user_preferences table exists
      const { data: prefTableCheck, error: prefTableError } = await supabase
        .from('user_preferences')
        .select('count')
        .limit(1)

      if (prefTableError) {
        console.log('user_preferences table not ready yet:', prefTableError.message)
        setLoading(false)
        return
      }

      // Load preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        console.error('Preferences error:', preferencesError)
      }

      if (preferencesData) {
        setPreferences(preferencesData)
        setPreferencesForm({
          job_alerts: preferencesData.job_alerts,
          email_notifications: preferencesData.email_notifications,
          push_notifications: preferencesData.push_notifications,
          privacy_level: preferencesData.privacy_level,
          preferred_job_types: preferencesData.preferred_job_types || [],
          preferred_locations: preferencesData.preferred_locations || [],
        })
      }
    } catch (err) {
      console.error('Error loading user data:', err)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSave = async () => {
    if (!user || !supabase) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const profileData = {
        user_id: user.id,
        ...formData,
      }

      let result
      if (profile) {
        // Update existing profile
        result = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('id', profile.id)
      } else {
        // Create new profile
        result = await supabase
          .from('user_profiles')
          .insert([profileData])
      }

      if (result.error) throw result.error

      setSuccess('Profile saved successfully!')
      await loadUserData() // Reload data
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePreferencesSave = async () => {
    if (!user || !supabase) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const preferencesData = {
        user_id: user.id,
        ...preferencesForm,
      }

      let result
      if (preferences) {
        // Update existing preferences
        result = await supabase
          .from('user_preferences')
          .update(preferencesData)
          .eq('id', preferences.id)
      } else {
        // Create new preferences
        result = await supabase
          .from('user_preferences')
          .insert([preferencesData])
      }

      if (result.error) throw result.error

      setSuccess('Preferences saved successfully!')
      await loadUserData() // Reload data
    } catch (err) {
      console.error('Error saving preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal and professional information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://your-website.com"
                />
              </div>
            </div>

            {/* Location */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Enter your city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Enter your state"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Enter your country"
                />
              </div>
            </div>

            {/* Professional Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_company">Current Company</Label>
                <Input
                  id="current_company"
                  value={formData.current_company}
                  onChange={(e) => setFormData({ ...formData, current_company: e.target.value })}
                  placeholder="Enter your current company"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_title">Current Title</Label>
                <Input
                  id="current_title"
                  value={formData.current_title}
                  onChange={(e) => setFormData({ ...formData, current_title: e.target.value })}
                  placeholder="Enter your current job title"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="years_experience">Years of Experience</Label>
                <Input
                  id="years_experience"
                  type="number"
                  value={formData.years_experience}
                  onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  max="50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remote_preference">Remote Preference</Label>
                <Input
                  id="remote_preference"
                  value={formData.remote_preference}
                  onChange={(e) => setFormData({ ...formData, remote_preference: e.target.value as any })}
                  placeholder="flexible, remote_only, hybrid, on_site"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself, your skills, and what you're looking for..."
                rows={4}
              />
            </div>

            {/* Social Links */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/your-profile"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github_url">GitHub URL</Label>
                <Input
                  id="github_url"
                  value={formData.github_url}
                  onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                  placeholder="https://github.com/your-username"
                />
              </div>
            </div>

            {/* Salary Preferences */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="desired_salary_min">Minimum Salary</Label>
                <Input
                  id="desired_salary_min"
                  type="number"
                  value={formData.desired_salary_min}
                  onChange={(e) => setFormData({ ...formData, desired_salary_min: parseInt(e.target.value) || 0 })}
                  placeholder="50000"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desired_salary_max">Maximum Salary</Label>
                <Input
                  id="desired_salary_max"
                  type="number"
                  value={formData.desired_salary_max}
                  onChange={(e) => setFormData({ ...formData, desired_salary_max: parseInt(e.target.value) || 0 })}
                  placeholder="100000"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="willing_to_relocate">Willing to Relocate</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="willing_to_relocate"
                  checked={formData.willing_to_relocate}
                  onChange={(e) => setFormData({ ...formData, willing_to_relocate: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="willing_to_relocate">Yes</Label>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleProfileSave}
              disabled={saving}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* User Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences & Settings</CardTitle>
          <CardDescription>
            Manage your job search preferences and notification settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            {/* Notification Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Notification Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="job_alerts">Job Alerts</Label>
                    <p className="text-sm text-gray-500">Receive notifications about new job opportunities</p>
                  </div>
                  <input
                    type="checkbox"
                    id="job_alerts"
                    checked={preferencesForm.job_alerts}
                    onChange={(e) => setPreferencesForm({ ...preferencesForm, job_alerts: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_notifications">Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive email updates about your applications</p>
                  </div>
                  <input
                    type="checkbox"
                    id="email_notifications"
                    checked={preferencesForm.email_notifications}
                    onChange={(e) => setPreferencesForm({ ...preferencesForm, email_notifications: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="push_notifications">Push Notifications</Label>
                    <p className="text-sm text-gray-500">Receive push notifications on your device</p>
                  </div>
                  <input
                    type="checkbox"
                    id="push_notifications"
                    checked={preferencesForm.push_notifications}
                    onChange={(e) => setPreferencesForm({ ...preferencesForm, push_notifications: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Privacy Settings</h3>
              <div className="space-y-2">
                <Label htmlFor="privacy_level">Profile Visibility</Label>
                <Input
                  id="privacy_level"
                  value={preferencesForm.privacy_level}
                  onChange={(e) => setPreferencesForm({ ...preferencesForm, privacy_level: e.target.value as any })}
                  placeholder="public, private, connections_only"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handlePreferencesSave}
              disabled={saving}
              className="w-full"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error and Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
          {success}
        </div>
      )}
    </div>
  )
}
