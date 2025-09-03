-- Enhanced Database Schema for Hybrid Job-Talent Matching
-- Combines traditional matching with semantic search and vector embeddings

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS job_matches CASCADE;
DROP TABLE IF EXISTS user_events CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS skills_dictionary CASCADE;

-- Create skills dictionary first (referenced by other tables)
CREATE TABLE IF NOT EXISTS skills_dictionary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_skill VARCHAR(255) UNIQUE NOT NULL,
    aliases TEXT[] NOT NULL DEFAULT '{}',
    category VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table with enhanced fields for hybrid matching
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic job information
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    city VARCHAR(100),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    remote_work BOOLEAN DEFAULT false,
    
    -- Job details
    job_type VARCHAR(50) CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship', 'freelance')),
    experience_level VARCHAR(50) CHECK (experience_level IN ('entry', 'junior', 'mid', 'senior', 'lead', 'executive')),
    seniority_years INTEGER DEFAULT 0,
    
    -- Salary information
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(3) DEFAULT 'USD',
    
    -- Skills (structured)
    must_have_skills TEXT[] NOT NULL DEFAULT '{}',
    nice_to_have_skills TEXT[] NOT NULL DEFAULT '{}',
    
    -- Rich content for semantic search
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    benefits TEXT,
    
    -- Full-text search vector
    search_vector tsvector,
    
    -- Semantic embedding vector (384 dimensions)
    embedding vector(384),
    
    -- Matching preferences
    skill_match_threshold INTEGER DEFAULT 60,
    experience_match_threshold INTEGER DEFAULT 70,
    
    -- Job status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed', 'draft')),
    is_featured BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_salary_range CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min),
    CONSTRAINT valid_coordinates CHECK ((lat IS NULL AND lng IS NULL) OR (lat IS NOT NULL AND lng IS NOT NULL))
);

-- Enhanced user profiles for hybrid matching
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic profile
    headline VARCHAR(255),
    summary TEXT,
    location VARCHAR(255),
    city VARCHAR(100),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    
    -- Professional details
    years_experience INTEGER DEFAULT 0,
    education_level VARCHAR(100),
    job_title VARCHAR(255),
    industry VARCHAR(255),
    
    -- Skills (structured)
    skills TEXT[] NOT NULL DEFAULT '{}',
    technical_skills JSONB NOT NULL DEFAULT '{}',
    soft_skills TEXT[] NOT NULL DEFAULT '{}',
    
    -- Rich content for semantic search
    resume_text TEXT,
    bio TEXT,
    
    -- Full-text search vector
    search_vector tsvector,
    
    -- Semantic embedding vector (384 dimensions)
    embedding vector(384),
    
    -- Preferences
    salary_expectation INTEGER,
    remote_preference BOOLEAN DEFAULT false,
    preferred_locations TEXT[],
    preferred_job_types TEXT[],
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_coordinates CHECK ((lat IS NULL AND lng IS NULL) OR (lat IS NOT NULL AND lng IS NOT NULL))
);

-- Enhanced job matches with hybrid scoring
CREATE TABLE IF NOT EXISTS job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Match direction
    match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('candidate_to_job', 'job_to_candidate', 'bidirectional')),
    
    -- Hybrid scoring components
    bm25_score DECIMAL(10, 4),           -- Lexical search score
    bm25_normalized DECIMAL(10, 4),      -- Normalized BM25 (0-1)
    cosine_similarity DECIMAL(10, 4),    -- Semantic similarity (0-1)
    skill_overlap DECIMAL(10, 4),        -- Jaccard similarity on skills
    must_have_compliance BOOLEAN,        -- All must-have skills present
    
    -- Traditional matching scores
    skill_match_score INTEGER CHECK (skill_match_score >= 0 AND skill_match_score <= 100),
    experience_match_score INTEGER CHECK (experience_match_score >= 0 AND experience_match_score <= 100),
    education_match_score INTEGER CHECK (education_match_score >= 0 AND education_match_score <= 100),
    location_match_score INTEGER CHECK (location_match_score >= 0 AND location_match_score <= 100),
    salary_match_score INTEGER CHECK (salary_match_score >= 0 AND salary_match_score <= 100),
    
    -- Final blended score
    final_score DECIMAL(10, 4),
    match_quality VARCHAR(20) CHECK (match_quality IN ('excellent', 'good', 'fair', 'poor')),
    
    -- Match details
    matched_skills TEXT[],
    missing_skills TEXT[],
    matched_keywords TEXT[],
    experience_gap INTEGER,
    salary_gap INTEGER,
    
    -- Status
    is_viewed BOOLEAN DEFAULT false,
    is_contacted BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(job_id, candidate_id, match_type)
);

-- User interaction events for ML training
CREATE TABLE IF NOT EXISTS user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('impression', 'click', 'save', 'apply', 'dismiss')),
    item_id UUID NOT NULL, -- job_id or candidate_id
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('job', 'candidate')),
    
    -- Context for ML features
    query_text TEXT,           -- Search query if applicable
    match_score DECIMAL(10, 4), -- Match score at time of event
    position INTEGER,           -- Position in results list
    session_id UUID,            -- User session identifier
    
    -- Event metadata
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    
    -- Additional context
    context JSONB DEFAULT '{}'
);

-- Job applications with enhanced tracking
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    
    -- Application details
    status VARCHAR(20) DEFAULT 'applied' CHECK (status IN ('applied', 'reviewing', 'interviewing', 'offered', 'rejected', 'withdrawn')),
    cover_letter TEXT,
    
    -- Match information at application time
    match_score_at_apply DECIMAL(10, 4),
    match_quality_at_apply VARCHAR(20),
    
    -- Timestamps
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(job_id, candidate_id)
);

-- Indexes for performance
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_experience_level ON jobs(experience_level);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_remote ON jobs(remote_work);

-- Full-text search indexes
CREATE INDEX idx_jobs_search_vector ON jobs USING GIN(search_vector);
CREATE INDEX idx_profiles_search_vector ON user_profiles USING GIN(search_vector);

-- Vector similarity indexes
CREATE INDEX idx_jobs_embedding ON jobs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_profiles_embedding ON user_profiles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Trigram indexes for fuzzy matching
CREATE INDEX idx_jobs_title_trgm ON jobs USING GIN(title gin_trgm_ops);
CREATE INDEX idx_jobs_company_trgm ON jobs USING GIN(company_name gin_trgm_ops);
CREATE INDEX idx_profiles_headline_trgm ON user_profiles USING GIN(headline gin_trgm_ops);

-- Composite indexes for common queries
CREATE INDEX idx_jobs_location_status ON jobs(location, status);
CREATE INDEX idx_jobs_skills ON jobs USING GIN(must_have_skills);
CREATE INDEX idx_profiles_skills ON user_profiles USING GIN(skills);

-- Match performance indexes
CREATE INDEX idx_job_matches_score ON job_matches(final_score DESC);
CREATE INDEX idx_job_matches_quality ON job_matches(match_quality);
CREATE INDEX idx_job_matches_job_candidate ON job_matches(job_id, candidate_id);

-- Event tracking indexes
CREATE INDEX idx_user_events_user_time ON user_events(user_id, timestamp);
CREATE INDEX idx_user_events_type_time ON user_events(event_type, timestamp);
CREATE INDEX idx_user_events_item ON user_events(item_type, item_id);

-- Triggers for search vector updates
CREATE OR REPLACE FUNCTION update_jobs_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.must_have_skills, ' '), '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.nice_to_have_skills, ' '), '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.requirements, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_profiles_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.headline, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.skills, ' '), '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.resume_text, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER jobs_search_vector_update 
    BEFORE INSERT OR UPDATE ON jobs 
    FOR EACH ROW EXECUTE FUNCTION update_jobs_search_vector();

CREATE TRIGGER profiles_search_vector_update 
    BEFORE INSERT OR UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_profiles_search_vector();

-- Create RPC functions for hybrid matching

-- Function for lexical search (BM25-like)
CREATE OR REPLACE FUNCTION search_jobs_lexical(
  search_query TEXT,
  result_limit INTEGER DEFAULT 200
)
RETURNS TABLE(
  id UUID,
  bm25_score FLOAT,
  search_vector tsvector
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    ts_rank(j.search_vector, plainto_tsquery('english', search_query)) as bm25_score,
    j.search_vector
  FROM jobs j
  WHERE j.status = 'active'
    AND j.search_vector IS NOT NULL
    AND plainto_tsquery('english', search_query) @@ j.search_vector
  ORDER BY bm25_score DESC
  LIMIT result_limit;
END;
$$;

-- Function for semantic search (vector similarity)
CREATE OR REPLACE FUNCTION search_jobs_semantic(
  query_embedding vector(384),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INTEGER DEFAULT 200
)
RETURNS TABLE(
  id UUID,
  cosine_similarity FLOAT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    1 - (j.embedding <=> query_embedding) as cosine_similarity
  FROM jobs j
  WHERE j.status = 'active'
    AND j.embedding IS NOT NULL
    AND 1 - (j.embedding <=> query_embedding) >= match_threshold
  ORDER BY cosine_similarity DESC
  LIMIT match_count;
END;
$$;

-- Function to update job embeddings when job data changes
CREATE OR REPLACE FUNCTION update_job_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- This would call your embedding service to generate new embeddings
  -- For now, we'll set it to NULL to indicate it needs updating
  NEW.embedding = NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update embeddings when job data changes
CREATE TRIGGER jobs_embedding_update
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_job_embedding();

-- Function to update user profile embeddings when profile data changes
CREATE OR REPLACE FUNCTION update_profile_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- This would call your embedding service to generate new embeddings
  -- For now, we'll set it to NULL to indicate it needs updating
  NEW.embedding = NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update embeddings when profile data changes
CREATE TRIGGER profiles_embedding_update
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_embedding();

-- Insert sample skills dictionary
INSERT INTO skills_dictionary (canonical_skill, aliases, category) VALUES
('JavaScript', ARRAY['JS', 'ECMAScript', 'ES6'], 'programming_language'),
('React', ARRAY['React.js', 'ReactJS', 'React Native'], 'framework'),
('Node.js', ARRAY['NodeJS', 'Node', 'Node.js'], 'runtime'),
('Python', ARRAY['Python3', 'Python 3', 'Py'], 'programming_language'),
('Machine Learning', ARRAY['ML', 'AI', 'Artificial Intelligence'], 'domain'),
('Data Science', ARRAY['Data Analysis', 'Analytics', 'Big Data'], 'domain'),
('AWS', ARRAY['Amazon Web Services', 'Amazon AWS'], 'cloud_platform'),
('Docker', ARRAY['Containerization', 'Containers'], 'tool'),
('Git', ARRAY['Version Control', 'Source Control'], 'tool'),
('SQL', ARRAY['Structured Query Language', 'Database Query'], 'language')
ON CONFLICT DO NOTHING;

-- Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active jobs" ON jobs FOR SELECT USING (status = 'active');
CREATE POLICY "Employers can manage their own jobs" ON jobs FOR ALL USING (auth.uid() = employer_id);

CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own matches" ON job_matches FOR SELECT USING (auth.uid() = candidate_id);
CREATE POLICY "Employers can view matches for their jobs" ON job_matches FOR SELECT USING (
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_matches.job_id AND jobs.employer_id = auth.uid())
);

CREATE POLICY "Users can view their own events" ON user_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own events" ON user_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications" ON job_applications FOR SELECT USING (auth.uid() = candidate_id);
CREATE POLICY "Employers can view applications for their jobs" ON job_applications FOR SELECT USING (
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.employer_id = auth.uid())
);
