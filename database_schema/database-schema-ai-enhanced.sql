-- AI-Enhanced Database Schema for Brave Job Matching Platform
-- This schema supports ChatGPT API resume parsing with comprehensive data extraction
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

-- Step 3: Create user_profiles table (comprehensive profile data)
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

-- Step 4: Create AI-enhanced resumes table
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- File Information
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    
    -- AI Parsing Results
    parsed_text TEXT, -- Raw extracted text from file
    parsing_confidence DECIMAL(3,2) DEFAULT 0.0, -- AI parsing confidence score
    last_parsed_at TIMESTAMP WITH TIME ZONE, -- When AI parsing was last performed
    
    -- Technical Skills (AI-extracted, structured)
    technical_skills JSONB DEFAULT '{}', -- {
        -- "programming_languages": ["JavaScript", "Python"],
        -- "frameworks": ["React", "Node.js"],
        -- "databases": ["PostgreSQL", "MongoDB"],
        -- "cloud_platforms": ["AWS", "Azure"],
        -- "tools": ["Git", "Docker"],
        -- "methodologies": ["Agile", "Scrum"]
    -- }
    
    -- Soft Skills (AI-extracted)
    soft_skills TEXT[] DEFAULT '{}',
    
    -- Domain Knowledge (AI-extracted)
    domain_knowledge TEXT[] DEFAULT '{}',
    
    -- Education Details (AI-extracted, structured)
    education JSONB DEFAULT '[]', -- [{
        -- "degree": "Bachelor of Science",
        -- "field_of_study": "Computer Science",
        -- "institution": "University Name",
        -- "graduation_year": 2020,
        -- "gpa": 3.8,
        -- "honors": ["Summa Cum Laude"]
    -- }]
    
    -- Certifications (AI-extracted, structured)
    certifications JSONB DEFAULT '[]', -- [{
        -- "name": "AWS Certified Developer",
        -- "issuing_organization": "Amazon Web Services",
        -- "issue_date": "2023-01-15",
        -- "expiry_date": "2026-01-15",
        -- "credential_id": "ABC123",
        -- "level": "Associate"
    -- }]
    
    -- Experience Details (AI-extracted, structured)
    experience_details JSONB DEFAULT '[]', -- [{
        -- "company": "Tech Company",
        -- "title": "Software Engineer",
        -- "start_date": "2020-06-01",
        -- "end_date": "2023-01-01",
        -- "description": "Developed web applications using React and Node.js",
        -- "key_achievements": ["Led team of 5 developers", "Improved performance by 40%"],
        -- "technologies_used": ["React", "Node.js", "PostgreSQL"],
        -- "impact_metrics": ["Reduced load time by 40%", "Increased user engagement by 25%"],
        -- "team_size": 5,
        -- "budget_managed": 50000
    -- }]
    
    -- Legacy fields for backward compatibility (will be populated from AI data)
    skills TEXT[] DEFAULT '{}', -- Deprecated: use technical_skills.programming_languages instead
    experience_summary TEXT, -- Deprecated: use experience_details[0].description instead
    education_summary TEXT, -- Deprecated: use education[0].degree instead
    languages TEXT[] DEFAULT '{}', -- Will be populated from AI parsing if available
    
    -- Resume Metadata
    is_primary BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    version TEXT DEFAULT '1.0', -- Resume version/iteration
    ai_parsing_status TEXT CHECK (ai_parsing_status IN ('pending', 'completed', 'failed', 'not_attempted')) DEFAULT 'not_attempted',
    ai_parsing_error TEXT, -- Store any AI parsing errors for debugging
    
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

-- Step 7: Create matches table (AI-powered matching)
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    
    -- Detailed matching scores
    skill_match_score DECIMAL(5,2), -- Technical skills compatibility
    experience_match_score DECIMAL(5,2), -- Experience level alignment
    location_match_score DECIMAL(5,2), -- Location preferences
    education_match_score DECIMAL(5,2), -- Education requirements
    certification_match_score DECIMAL(5,2), -- Certification alignment
    
    -- AI-generated explanation
    explanation TEXT NOT NULL,
    
    -- Match metadata
    is_viewed BOOLEAN DEFAULT false,
    is_contacted BOOLEAN DEFAULT false,
    match_algorithm_version TEXT DEFAULT '1.0', -- Track which AI algorithm generated this match
    
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
    salary_preferences JSONB, -- {
        -- "min_salary": 50000,
        -- "max_salary": 100000,
        -- "currency": "USD",
        -- "negotiable": true
    -- }
    ai_matching_preferences JSONB DEFAULT '{}', -- {
        -- "skill_weight": 0.4,
        -- "experience_weight": 0.3,
        -- "location_weight": 0.2,
        -- "education_weight": 0.1
    -- }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Step 9: Create indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_location ON user_profiles(location);
CREATE INDEX idx_user_profiles_experience ON user_profiles(years_experience);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_ai_parsing_status ON resumes(ai_parsing_status);
CREATE INDEX idx_resumes_technical_skills ON resumes USING GIN(technical_skills);
CREATE INDEX idx_resumes_soft_skills ON resumes USING GIN(soft_skills);
CREATE INDEX idx_resumes_education ON resumes USING GIN(education);
CREATE INDEX idx_resumes_certifications ON resumes USING GIN(certifications);
CREATE INDEX idx_resumes_experience_details ON resumes USING GIN(experience_details);

CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX idx_jobs_remote_option ON jobs(remote_option);
CREATE INDEX idx_jobs_requirements ON jobs USING GIN(requirements);

CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_applicant_id ON job_applications(applicant_id);

CREATE INDEX idx_matches_job_id ON matches(job_id);
CREATE INDEX idx_matches_resume_id ON matches(resume_id);
CREATE INDEX idx_matches_score ON matches(score);
CREATE INDEX idx_matches_skill_score ON matches(skill_match_score);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

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

-- Step 15: Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Step 16: Create storage policies for resumes
CREATE POLICY "Users can upload their own resumes" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'resumes' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own resumes" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'resumes' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own resumes" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'resumes' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Step 17: Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'resumes', 'jobs', 'job_applications', 'matches', 'user_preferences')
ORDER BY table_name;

-- Step 18: Verify resume table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'resumes' 
ORDER BY ordinal_position;
