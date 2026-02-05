-- COMPREHENSIVE MULTI-TENANT AUDIT & FIX (FIXED VERSION)
-- This script safely checks if tables exist before modifying them

-- ============================================================
-- PHASE 1: ADD ORGANIZATION_ID TO TABLES THAT EXIST
-- ============================================================

-- 1.1 Targets table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'targets') THEN
        ALTER TABLE public.targets ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
        
        -- Backfill from owner's profile
        UPDATE public.targets t
        SET organization_id = (
            SELECT organization_id FROM public.profiles WHERE id = t.owner_id
        )
        WHERE t.organization_id IS NULL AND t.owner_id IS NOT NULL;
        
        -- Enable RLS and create policies
        ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_targets_org ON targets(organization_id);
        
        RAISE NOTICE 'Targets table updated successfully';
    ELSE
        RAISE NOTICE 'Targets table does not exist - skipping';
    END IF;
END $$;

-- 1.2 Lead Activities table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_activities') THEN
        ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
        
        -- Backfill from lead
        UPDATE public.lead_activities la
        SET organization_id = (
            SELECT org_id FROM public.leads WHERE id = la.lead_id
        )
        WHERE la.organization_id IS NULL AND la.lead_id IS NOT NULL;
        
        -- Enable RLS
        ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Lead activities table updated successfully';
    ELSE
        RAISE NOTICE 'Lead activities table does not exist - skipping';
    END IF;
END $$;

-- ============================================================
-- PHASE 2: CREATE INDEXES FOR EXISTING TABLES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(org_id);
CREATE INDEX IF NOT EXISTS idx_calls_org ON calls(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_org ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);

-- ============================================================
-- PHASE 3: VERIFY ALL CORE TABLES HAVE RLS ENABLED
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PHASE 4: VERIFICATION QUERIES
-- ============================================================

-- Show all tables with organization_id
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('organization_id', 'org_id')
ORDER BY table_name;

-- Refresh PostgREST
NOTIFY pgrst, 'reload schema';
