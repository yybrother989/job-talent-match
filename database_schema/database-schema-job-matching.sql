-- Job Matching Database Schema for Brave Platform
-- Supports bidirectional matching: candidates to jobs AND jobs to candidates

-- Jobs table to store job postings
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    remote_work BOOLEAN DEFAULT false,
    job_type VARCHAR(50) CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship', 'freelance')),
    experience_level VARCHAR(50) CHECK (experience_level IN ('entry', 'junior', 'mid', 'senior', 'lead', 'executive')),
    
    -- Job Requirements (AI-extracted and structured)
    required_skills JSONB NOT NULL DEFAULT '{}',
    preferred_skills JSONB NOT NULL DEFAULT '{}',
    required_experience_years INTEGER DEFAULT 0,
    required_education_level VARCHAR(100),
    required_certifications TEXT[],
    
    -- Job Details
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(3) DEFAULT 'USD',
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    benefits TEXT,
    
    -- Matching Preferences
    skill_match_threshold INTEGER DEFAULT 60, -- Minimum skill match percentage
    experience_match_threshold INTEGER DEFAULT 70, -- Minimum experience match percentage
    
    -- Job Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed', 'draft')),
    is_featured BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes for performance
    CONSTRAINT valid_salary_range CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min)
);

-- Job Applications table to track candidate interest
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    
    -- Application Status
    status VARCHAR(20) DEFAULT 'applied' CHECK (status IN ('applied', 'reviewing', 'interviewing', 'offered', 'rejected', 'withdrawn')),
    
    -- Matching Scores (calculated by algorithm)
    skill_match_score INTEGER CHECK (skill_match_score >= 0 AND skill_match_score <= 100),
    experience_match_score INTEGER CHECK (experience_match_score >= 0 AND experience_match_score <= 100),
    overall_match_score INTEGER CHECK (overall_match_score >= 0 AND overall_match_score <= 100),
    
    -- Application Details
    cover_letter TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate applications
    UNIQUE(job_id, candidate_id)
);

-- Job Matches table for storing calculated matches (both directions)
CREATE TABLE IF NOT EXISTS job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    
    -- Match Direction
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('candidate_to_job', 'job_to_candidate', 'bidirectional')),
    
    -- Detailed Match Scores
    skill_match_score INTEGER CHECK (skill_match_score >= 0 AND skill_match_score <= 100),
    experience_match_score INTEGER CHECK (experience_match_score >= 0 AND experience_match_score <= 100),
    education_match_score INTEGER CHECK (education_match_score >= 0 AND education_match_score <= 100),
    certification_match_score INTEGER CHECK (certification_match_score >= 0 AND certification_match_score <= 100),
    location_match_score INTEGER CHECK (location_match_score >= 0 AND location_match_score <= 100),
    salary_match_score INTEGER CHECK (salary_match_score >= 0 AND salary_match_score <= 100),
    
    -- Overall Match Score
    overall_match_score INTEGER CHECK (overall_match_score >= 0 AND overall_match_score <= 100),
    
    -- Match Details
    matched_skills TEXT[], -- Skills that matched
    missing_skills TEXT[], -- Skills the candidate lacks
    experience_gap INTEGER, -- Years of experience difference
    salary_gap INTEGER, -- Salary expectation difference
    
    -- Match Status
    is_viewed BOOLEAN DEFAULT false,
    is_contacted BOOLEAN DEFAULT false,
    match_quality VARCHAR(20) CHECK (match_quality IN ('excellent', 'good', 'fair', 'poor')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(job_id, candidate_id, match_type)
);

-- Candidate Job Preferences for better matching
CREATE TABLE IF NOT EXISTS candidate_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Job Preferences
    preferred_job_types TEXT[],
    preferred_locations TEXT[],
    preferred_remote_work BOOLEAN,
    preferred_salary_min INTEGER,
    preferred_salary_max INTEGER,
    preferred_salary_currency VARCHAR(3) DEFAULT 'USD',
    preferred_experience_levels TEXT[],
    
    -- Skill Preferences
    must_have_skills TEXT[],
    nice_to_have_skills TEXT[],
    skill_importance_weights JSONB, -- Custom weights for different skill categories
    
    -- Industry Preferences
    preferred_industries TEXT[],
    preferred_company_sizes TEXT[],
    
    -- Notification Preferences
    email_notifications BOOLEAN DEFAULT true,
    job_match_threshold INTEGER DEFAULT 70, -- Only notify for matches above this score
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Search History for analytics and improvement
CREATE TABLE IF NOT EXISTS job_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    search_query TEXT,
    filters_applied JSONB,
    jobs_viewed UUID[],
    jobs_applied_to UUID[],
    search_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_search_history ENABLE ROW LEVEL SECURITY;

-- Jobs policies
CREATE POLICY "Employers can manage their own jobs" ON jobs
    FOR ALL USING (auth.uid() = employer_id);

CREATE POLICY "Anyone can view active jobs" ON jobs
    FOR SELECT USING (status = 'active');

-- Job applications policies
CREATE POLICY "Candidates can view their own applications" ON job_applications
    FOR ALL USING (auth.uid() = candidate_id);

CREATE POLICY "Employers can view applications for their jobs" ON job_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.employer_id = auth.uid()
        )
    );

-- Job matches policies
CREATE POLICY "Candidates can view their own matches" ON job_matches
    FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "Employers can view matches for their jobs" ON job_matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs WHERE jobs.id = job_matches.job_id AND jobs.employer_id = auth.uid()
        )
    );

-- Candidate preferences policies
CREATE POLICY "Candidates can manage their own preferences" ON candidate_preferences
    FOR ALL USING (auth.uid() = candidate_id);

-- Job search history policies
CREATE POLICY "Candidates can view their own search history" ON job_search_history
    FOR ALL USING (auth.uid() = candidate_id);

-- Indexes for performance
CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);

CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_candidate_id ON job_applications(candidate_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);

CREATE INDEX idx_job_matches_job_id ON job_matches(job_id);
CREATE INDEX idx_job_matches_candidate_id ON job_matches(candidate_id);
CREATE INDEX idx_job_matches_overall_score ON job_matches(overall_match_score DESC);
CREATE INDEX idx_job_matches_type ON job_matches(match_type);

CREATE INDEX idx_candidate_preferences_candidate_id ON candidate_preferences(candidate_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_matches_updated_at BEFORE UPDATE ON job_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_preferences_updated_at BEFORE UPDATE ON candidate_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO candidate_preferences (candidate_id, preferred_job_types, preferred_locations, preferred_remote_work, preferred_salary_min, preferred_salary_max)
VALUES 
    ('4d6a1508-183a-46e8-a713-40808aee8451', ARRAY['full-time', 'contract'], ARRAY['Toronto', 'Remote'], true, 60000, 120000)
ON CONFLICT DO NOTHING;
