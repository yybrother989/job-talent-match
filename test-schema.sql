-- Test script to verify the hybrid matching schema
-- Run this after applying the main schema to check for any issues

-- Test 1: Check if tables exist
SELECT 
    table_name,
    CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_name IN ('jobs', 'user_profiles', 'job_matches', 'user_events', 'job_applications', 'skills_dictionary')
AND table_schema = 'public';

-- Test 2: Check jobs table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 3: Check if status column exists in jobs table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND table_schema = 'public'
AND column_name = 'status';

-- Test 4: Check if extensions are enabled
SELECT 
    extname,
    CASE WHEN extname IS NOT NULL THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status
FROM pg_extension 
WHERE extname IN ('vector', 'pg_trgm');

-- Test 5: Check if RPC functions exist
SELECT 
    routine_name,
    routine_type,
    CASE WHEN routine_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.routines 
WHERE routine_name IN ('search_jobs_lexical', 'search_jobs_semantic')
AND routine_schema = 'public';

-- Test 6: Insert a test job to verify table works
INSERT INTO jobs (
    employer_id,
    title,
    company_name,
    location,
    description,
    requirements,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- dummy UUID
    'Test Job',
    'Test Company',
    'Test Location',
    'This is a test job description',
    'These are test requirements',
    'active'
) ON CONFLICT DO NOTHING;

-- Test 7: Verify the test job was inserted
SELECT 
    id,
    title,
    company_name,
    status,
    created_at
FROM jobs 
WHERE title = 'Test Job';

-- Test 8: Clean up test data
DELETE FROM jobs WHERE title = 'Test Job';

-- Test 9: Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('jobs', 'user_profiles', 'job_matches');

-- Test 10: Summary
SELECT 'Schema verification complete!' as message;
