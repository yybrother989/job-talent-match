-- Clean Database Schema for Brave Job Matching Platform
-- Run this in your Supabase SQL Editor

-- Step 1: Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Drop existing tables if they exist (be careful with this in production!)
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS resumes CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Step 3: Create user_profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    location TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'US',
    timezone TEXT,
    bio TEXT,
    website TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    years_experience INTEGER,
    current_company TEXT,
    current_title TEXT,
    desired_salary_min INTEGER,
    desired_salary_max INTEGER,
    willing_to_relocate BOOLEAN DEFAULT false,
    remote_preference TEXT CHECK (remote_preference IN ('remote_only', 'hybrid', 'on_site', 'flexible')) DEFAULT 'flexible',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Step 4: Create resumes table
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    parsed_text TEXT,
    skills TEXT[] DEFAULT '{}',
    experience_summary TEXT,
    education_summary TEXT,
    certifications TEXT[] DEFAULT '{}',
    languages TEXT[] DEFAULT '{}',
    is_primary BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    location TEXT NOT NULL,
    remote_option TEXT CHECK (remote_option IN ('remote_only', 'hybrid', 'on_site', 'flexible')) DEFAULT 'flexible',
    job_type TEXT CHECK (job_type IN ('full_time', 'part_time', 'contract', 'internship', 'freelance')) DEFAULT 'full_time',
    experience_level TEXT CHECK (experience_level IN ('entry', 'junior', 'mid', 'senior', 'lead', 'executive')) DEFAULT 'mid',
    description TEXT NOT NULL,
    requirements TEXT[] DEFAULT '{}',
    responsibilities TEXT[] DEFAULT '{}',
    benefits TEXT[] DEFAULT '{}',
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency TEXT DEFAULT 'USD',
    application_deadline DATE,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create job_applications table
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    cover_letter TEXT,
    status TEXT CHECK (status IN ('applied', 'reviewing', 'interviewing', 'offered', 'rejected', 'withdrawn')) DEFAULT 'applied',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, applicant_id)
);

-- Step 7: Create matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    skill_match_score DECIMAL(5,2),
    experience_match_score DECIMAL(5,2),
    location_match_score DECIMAL(5,2),
    explanation TEXT NOT NULL,
    is_viewed BOOLEAN DEFAULT false,
    is_contacted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, resume_id)
);

-- Step 8: Create user_preferences table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_alerts BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT false,
    privacy_level TEXT CHECK (privacy_level IN ('public', 'private', 'connections_only')) DEFAULT 'public',
    preferred_job_types TEXT[] DEFAULT '{}',
    preferred_locations TEXT[] DEFAULT '{}',
    salary_preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Step 9: Create indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_location ON user_profiles(location);
CREATE INDEX idx_user_profiles_experience ON user_profiles(years_experience);
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_skills ON resumes USING GIN(skills);
CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX idx_jobs_remote_option ON jobs(remote_option);
CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_applicant_id ON job_applications(applicant_id);
CREATE INDEX idx_matches_job_id ON matches(job_id);
CREATE INDEX idx_matches_resume_id ON matches(resume_id);
CREATE INDEX idx_matches_score ON matches(score);

-- Step 10: Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS Policies
-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Resumes policies
CREATE POLICY "Users can view their own resumes" ON resumes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resumes" ON resumes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resumes" ON resumes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes" ON resumes
    FOR DELETE USING (auth.uid() = user_id);

-- Jobs policies
CREATE POLICY "Employers can view their own jobs" ON jobs
    FOR SELECT USING (auth.uid() = employer_id);

CREATE POLICY "Employers can insert their own jobs" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = employer_id);

CREATE POLICY "Employers can update their own jobs" ON jobs
    FOR UPDATE USING (auth.uid() = employer_id);

CREATE POLICY "Employers can delete their own jobs" ON jobs
    FOR DELETE USING (auth.uid() = employer_id);

-- Public can view active jobs
CREATE POLICY "Public can view active jobs" ON jobs
    FOR SELECT USING (is_active = true);

-- Job applications policies
CREATE POLICY "Users can view their own applications" ON job_applications
    FOR SELECT USING (auth.uid() = applicant_id);

CREATE POLICY "Employers can view applications for their jobs" ON job_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs WHERE id = job_applications.job_id AND employer_id = auth.uid()
        )
    );

CREATE POLICY "Users can apply to jobs" ON job_applications
    FOR INSERT WITH CHECK (auth.uid() = applicant_id);

-- Matches policies
CREATE POLICY "Users can view matches involving their resumes" ON matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM resumes WHERE id = matches.resume_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Employers can view matches involving their jobs" ON matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs WHERE id = matches.job_id AND employer_id = auth.uid()
        )
    );

-- User preferences policies
CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Step 12: Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 13: Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 14: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Step 15: Verify tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'resumes', 'jobs', 'job_applications', 'matches', 'user_preferences')
ORDER BY table_name;
