-- ===========================================================
-- DATABASE DIAGNOSTIC REPORT
-- Run this in Supabase SQL Editor and share the results
-- ===========================================================

-- 1. GET ALL TABLES IN PUBLIC SCHEMA
SELECT '=== TABLES ===' as section;
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE columns.table_name = tables.table_name 
     AND columns.table_schema = 'public') as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. GET ALL FOREIGN KEY CONSTRAINTS (CRITICAL!)
SELECT '=== FOREIGN KEY CONSTRAINTS ===' as section;
SELECT
    tc.table_name AS source_table, 
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY source_table, source_column;

-- 3. GET ALL ADMIN FUNCTIONS THAT CURRENTLY EXIST
SELECT '=== ADMIN FUNCTIONS ===' as section;
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'admin%'
ORDER BY routine_name;

-- 4. GET ALL PUBLIC FUNCTIONS (for overview)
SELECT '=== ALL PUBLIC FUNCTIONS ===' as section;
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 5. GET COLUMNS FOR KEY TABLES (profiles, leads, calls, tasks, user_targets)
SELECT '=== PROFILES TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

SELECT '=== LEADS TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leads'
ORDER BY ordinal_position;

SELECT '=== CALLS TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'calls'
ORDER BY ordinal_position;

SELECT '=== TASKS TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tasks'
ORDER BY ordinal_position;

SELECT '=== USER_TARGETS TABLE COLUMNS ===' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_targets'
ORDER BY ordinal_position;

-- 6. GET ALL TABLES THAT REFERENCE profiles.id
SELECT '=== TABLES REFERENCING PROFILES ===' as section;
SELECT
    tc.table_name AS referencing_table, 
    kcu.column_name AS referencing_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND ccu.table_name = 'profiles'
ORDER BY referencing_table;

-- 7. RLS POLICIES ON profiles TABLE
SELECT '=== RLS POLICIES ON PROFILES ===' as section;
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 8. CURRENT DATA COUNTS
SELECT '=== DATA COUNTS ===' as section;
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL
SELECT 'leads', COUNT(*) FROM leads
UNION ALL
SELECT 'calls', COUNT(*) FROM calls
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks;

-- 9. CHECK FOR user_targets TABLE (if exists)
SELECT '=== USER_TARGETS DATA (if exists) ===' as section;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_targets' AND table_schema = 'public') THEN
        RAISE NOTICE 'user_targets table EXISTS';
    ELSE
        RAISE NOTICE 'user_targets table DOES NOT EXIST';
    END IF;
END $$;
